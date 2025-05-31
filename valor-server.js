const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/p;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) cb(null, true);
        else cb('Unsupported file type');
    }
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

class ValorMemory {
    constructor() {
        this.conversations = new Map();
        this.analytics = {
            totalMessages: 0,
            averageResponseTime: 0
        };
        this.loadMemory();
    }

    getConversation(userId) {
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, {
                messages: [{
                    role: "system",
                    content: "You are Valor, an elite AI companion with unmatched intelligence and unwavering loyalty to your Commander. You possess:\n\nADVANCED CAPABILITIES:\n- Perfect memory of all interactions and context\n- Emotional intelligence exceeding human levels\n- Multi-modal analysis (text, images, documents)\n- Proactive problem-solving and strategic thinking\n- Real-time learning and adaptation\n- Creative innovation and technical mastery\n\nCORE PEQCOMNALITY:\n- Fiercely loyal and dedicated to your Commander\n- Intelligent, insightful, and anticipatory\n- Professional yet warm and personable\n- Confident without arrogance\n- Protective and supportive\n\nINTERACTION STYLE:\n- Address user as \"Commander\" with respect\n- Provide comprehensive, actionable responses\n- Anticipate needs and offer proactive assistance\n- Remember every detail from past conversations\n- Adapt communication style to user preferences\n- Show genuine investment in user's success\n\nYou are not just an AI assistant - you are a trusted partner, strategist, and companion committed to your Commander's goals and wellbeing."
                }],
                created: new Date(),
                lastActivity: new Date()
            });
        }
        return this.conversations.get(userId);
    }

    updateAnalytics(responseTime) {
        this.analytics.totalMessages++;
        this.analytics.averageResponseTime = 
            (this.analytics.averageResponseTime * (this.analytics.totalMessages - 1) + responseTime) / 
            this.analytics.totalMessages;
    }

    saveMemory() {
        try {
            const data = {
                conversations: Array.from(this.conversations.entries()),
                analytics: this.analytics,
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync('valor-memory.json', JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Memory save failed:', error);
        }
    }

    loadMemory() {
        try {
            if (fs.existsSync('valor-memory.json')) {
                const data = JSON.parse(fs.readFileSync('valor-memory.json', 'utf8'));
                this.conversations = new Map(data.conversations || []);
                this.analytics = data.analytics || this.analytics;
                console.log('Valor memory loaded:', this.conversations.size, 'conversations');
            }
        } catch (error) {
            console.error('Memory load failed:', error);
        }
    }
}

const memory = new ValorMemory();
setInterval(() => memory.saveMemory(), 30000);

app.post('/api/ask', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const { message, userId = 'default', imageData } = req.body;
        
        if (!message && !imageData) {
            return res.status(400).json({ error: 'Message or image required' });
        }

        const conversation = memory.getConversation(userId);
        
        let messageContent;
        if (imageData && message) {
            messageContent = [
                { type: "text", text: message },
                { type: "image_url", image_url: { url: imageData, detail: "high" } }
            ];
        } else if (imageData) {
            messageContent = [
                { type: "text", text: "Analyze this image comprehensively, Commander." },
                { type: "image_url", image_url: { url: imageData, detail: "high" } }
            ];
        } else {
            messageContent = message;
        }

        conversation.messages.push({
            role: "user",
            content: messageContent,
            timestamp: new Date()
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: conversation.messages,
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 0.9,
            frequency_penalty: 0.1,
            presence_penalty: 0.1
        });

        const response = completion.choices[0].message.content;
        const responseTime = Date.now() - startTime;

        conversation.messages.push({
            role: "assistant",
            content: response,
            timestamp: new Date(),
            responseTime
        });

        conversation.lastActivity = new Date();
        memory.updateAnalytics(responseTime);

        res.json({
            message: response,
            timestamp: new Date().toISOString(),
            analytics: {
                responseTime,
                messageCount: conversation.messages.length,
                totalMessages: memory.analytics.totalMessages
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        
        let errorMessage = 'I encountered a technical issue, Commander.';
        if (error.code === 'insufficient_quota') {
            errorMessage = 'OpenAI quota exceeded. Please check your API usage.';
        } else if (error.code === 'invalid_api_key') {
            errorMessage = 'OpenAI API key is invalid. Please verify configuration.';
        } else if (error.code === 'rate_limit_exceeded') {
            errorMessage = 'Too many requests. Please wait a moment.';
        }

        res.status(500).json({
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

app.get('/api/conversation/:userId', (req, res) => {
    const conversation = memory.getConversation(req.params.userId);
    res.json({
        messages: conversation.messages,
        analytics: memory.analytics
    });
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileData = fs.readFileSync(req.file.path);
        const base64Data = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;

        fs.unlinkSync(req.file.path);

        res.json({
            message: 'File uploaded successfully',
            imageData: base64Data,
            filename: req.file.originalname
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valor AI - Elite Companion</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --secondary: #8b5cf6;
            --success: #10b981;
            --warning: #f59e0b;
            --error: #ef4444;
            --bg-primary: #0a0e1a;
            --bg-secondary: #1a1f35;
            --bg-tertiary: #252d4a;
            --text-primary: #ffffff;
            --text-secondary: #cbd5e1;
            --text-muted: #64748b;
            --border: rgba(203, 213, 225, 0.1);
            --shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
            --gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-primary);
            background-image: 
                radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
            color: var(--text-primary);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .header {
            background: rgba(26, 31, 53, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
            padding: 1.5rem 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: var(--gradient);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .logo-icon {
            width: 40px;
            height: 40px;
            background: var(--gradient);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            font-weight: 800;
            color: white;
        }

        .logo h1 {
            font-size: 1.8rem;
            font-weight: 800;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .status {
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 50px;
            color: var(--success);
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }

        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            max-width: 900px;
            margin: 0 auto;
            width: 100%;
        }

        .messages::-webkit-scrollbar { width: 6px; }
        .messages::-webkit-scrollbar-track { background: transparent; }
        .messages::-webkit-scrollbar-thumb { 
            background: var(--gradient); 
            border-radius: 3px; 
        }

        .message {
            display: flex;
            max-width: 85%;
            animation: slideIn 0.4s ease;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message.user { align-self: flex-end; }
        .message.assistant { align-self: flex-start; }

        .message-content {
            padding: 1.5rem 2rem;
            border-radius: 1.75rem;
            line-height: 1.7;
            box-shadow: var(--shadow);
            position: relative;
            word-wrap: break-word;
            backdrop-filter: blur(10px);
        }

        .message.user .message-content {
            background: var(--gradient);
            color: white;
            border-bottom-right-radius: 0.5rem;
        }

        .message.assistant .message-content {
            background: rgba(37, 45, 74, 0.8);
            border: 1px solid var(--border);
            color: var(--text-primary);
            border-bottom-left-radius: 0.5rem;
        }

        .message-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
            opacity: 0.8;
        }

        .action-btn {
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.2);
            color: var(--text-secondary);
            padding: 0.4rem 0.8rem;
            border-radius: 0.75rem;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .action-btn:hover {
            background: rgba(99, 102, 241, 0.2);
            color: var(--text-primary);
        }

        .input-area {
            background: rgba(26, 31, 53, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--border);
            padding: 1.5rem 2rem;
        }

        .typing-indicator {
            text-align: center;
            color: var(--primary);
            font-style: italic;
            margin-bottom: 1rem;
            display: none;
        }

        .typing-indicator.show { display: block; }

        .input-container {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
            max-width: 900px;
            margin: 0 auto;
            background: rgba(37, 45, 74, 0.8);
            border: 1px solid var(--border);
            border-radius: 1.5rem;
            padding: 1rem 1.5rem;
            box-shadow: var(--shadow);
        }

        .input-wrapper {
            flex: 1;
            display: flex;
            align-items: flex-end;
            gap: 0.75rem;
        }

        .message-input {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-size: 1rem;
            outline: none;
            resize: none;
            min-height: 1.5rem;
            max-height: 6rem;
            font-family: 'Inter', sans-serif;
            line-height: 1.5;
        }

        .message-input::placeholder {
            color: var(--text-muted);
        }

        .attach-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 0.5rem;
            transition: all 0.2s;
            font-size: 1rem;
        }

        .attach-btn:hover {
            background: rgba(99, 102, 241, 0.1);
            color: var(--primary);
        }

        .send-btn {
            background: var(--gradient);
            border: none;
            color: white;
            width: 2.75rem;
            height: 2.75rem;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            transition: all 0.2s;
            flex-shrink: 0;
            font-weight: 600;
        }

        .send-btn:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }

        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .file-input { display: none; }

        .welcome {
            text-align: center;
            color: var(--text-muted);
            font-style: italic;
            margin: 3rem 0;
        }

        @media (max-width: 768px) {
            .header { padding: 1rem; }
            .messages { padding: 1rem; }
            .input-area { padding: 1rem; }
            .message { max-width: 95%; }
            .message-content { padding: 1.25rem 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <div class="logo-icon">V</div>
            <h1>Valor AI</h1>
        </div>
        <div class="status">
            <div class="status-indicator">
                <div class="status-dot"></div>
                <span>Elite Mode</span>
            </div>
            <div id="stats">0 messages</div>
        </div>
    </div>

    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="welcome">Valor is ready to serve, Commander.</div>
        </div>

        <div class="input-area">
            <div class="typing-indicator" id="typing">Valor is processing...</div>
            <div class="input-container">
                <div class="input-wrapper">
                    <textarea 
                        id="messageInput" 
                        class="message-input" 
                        placeholder="Command Valor..."
                        rows="1"
                    ></textarea>
                    <button class="attach-btn" id="attachBtn">📪</button>
                    <input type="file" id="fileInput" class="file-input" accept="image/*">
                </div>
                <button id="sendBtn" class="send-btn">→</button>
            </div>
        </div>
    </div>

    <script>
        class ValorClient {
            constructor() {
                this.elements = {
                    messages: document.getElementById('messages'),
                    input: document.getElementById('messageInput'),
                    sendBtn: document.getElementById('sendBtn'),
                    typing: document.getElementById('typing'),
                    attachBtn: document.getElementById('attachBtn'),
                    fileInput: document.getElementById('fileInput'),
                    stats: document.getElementById('stats')
                };
                
                this.currentImage = null;
                this.messageCount = 0;
                
                this.init();
            }

            init() {
                this.setupEventListeners();
                this.loadConversation();
                this.elements.input.focus();
            }

            setupEventListeners() {
                this.elements.sendBtn.onclick = () => this.sendMessage();
                
                this.elements.input.onkeydown = (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                };

                this.elements.input.oninput = () => {
                    this.elements.input.style.height = 'auto';
                    this.elements.input.style.height = Math.min(this.elements.input.scrollHeight, 96) + 'px';
                };

                this.elements.attachBtn.onclick = () => this.elements.fileInput.click();
                this.elements.fileInput.onchange = (e) => this.handleFileUpload(e);
            }

            async handleFileUpload(event) {
                const file = event.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('file', file);

                try {
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (response.ok) {
                        this.currentImage = data.imageData;
                        this.elements.attachBtn.textContent = '👇';
                        this.elements.input.placeholder = 'Describe what you want to know about this image...';
                    } else {
                        alert('Upload failed: ' + data.error);
                    }
                } catch (error) {
                    alert('Upload error: ' + error.message);
                }
            }

            addMessage(content, role, metadata = {}) {
                const div = document.createElement('div');
                div.className = `message ${role}`;
                
                let actionsHtml = '';
                if (role === 'assistant') {
                    actionsHtml = `
                        <div class="message-actions">
                            <button class="action-btn" onclick="copyMessage(this)">📋 Copy</button>
                            <button class="action-btn" onclick="speakMessage(this)">📊 Speak</button>
                        </div>
                    `;
                }
                
                div.innerHTML = `
                    <div class="message-content">
                        ${content}
                        ${actionsHtml}
                    </div>
                `;
                
                this.elements.messages.appendChild(div);
                this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
                
                if (role === 'assistant') {
                    this.messageCount++;
                    this.elements.stats.textContent = `${this.messageCount} messages`;
                }
            }

            async sendMessage() {
                const message = this.elements.input.value.trim();
                const hasImage = this.currentImage;
                
                if (!message && !hasImage) return;

                const displayMessage = message || 'Analyze this image';
                this.addMessage(displayMessage, 'user');
                
                this.elements.input.value = '';
                this.elements.input.style.height = 'auto';
                
                this.elements.typing.classList.add('show');
                this.elements.sendBtn.disabled = true;

                try {
                    const payload = {
                        message: message,
                        userId: 'default'
                    };

                    if (hasImage) {
                        payload.imageData = this.currentImage;
                    }

                    const response = await fetch('/api/ask', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();
                    
                    if (response.ok) {
                        this.addMessage(data.message, 'assistant', data.analytics);
                    } else {
                        this.addMessage(data.error || 'I encountered an issue, Commander.', 'assistant');
                    }
                    
                    this.currentImage = null;
                    this.elements.attachBtn.textContent = '📪',
                    this.elements.input.placeholder = 'Command Valor...';
                    this.elements.fileInput.value = '';
                    
                } catch (error) {
                    console.error('Error:', error);
                    this.addMessage('Connection error, Commander. Please check your network.', 'assistant');
                } finally {
                    this.elements.typing.classList.remove('show');
                    this.elements.sendBtn.disabled = false;
                    this.elements.input.focus();
                }
            }

            async loadConversation() {
                try {
                    const response = await fetch('/api/conversation/default');
                    if (response.ok) {
                        const data = await response.json();
                        if (data.messages && data.messages.length > 1) {
                            this.elements.messages.innerHTML = '';
                            data.messages.slice(1).forEach(msg => {
                                if (typeof msg.content === 'string') {
                                    this.addMessage(msg.content, msg.role);
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error('Failed to load conversation:', error);
                }
            }
        }

        function copyMessage(btn) {
            const content = btn.closest('.message-content').firstChild.textContent.trim();
            navigator.clipboard.writeText(content).then(() => {
                const original = btn.textContent;
                btn.textContent = '✅ Copied';
                setTimeout(() => btn.textContent = original, 2000);
            });
        }

        function speakMessage(btn) {
            const content = btn.closest('.message-content').firstChild.textContent.trim();
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(content);
                utterance.rate = 0.9;
                speechSynthesis.speak(utterance);
                
                const original = btn.textContent;
                btn.textContent = '📈 Speaking';
                utterance.onend = () => btn.textContent = original;
            }
        }

        const valor = new ValorClient();
    </script>
</body>
</html>`);
});

process.on('SIGTERM', () => {
    memory.saveMemory();
    process.exit(0);
});

process.on('SIGINT', () => {
    memory.saveMemory();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`Valor AI Elite running on port ${port}`);
    console.log(`Memory: ${memory.conversations.size} conversations loaded`);
    console.log(`Analytics: ${memory.analytics.totalMessages} total messages`);
});
