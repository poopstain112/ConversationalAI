const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Memory storage with persistence
let conversations = new Map();
let valorMemory = {
    userPreferences: {},
    importantFacts: [],
    personalContext: {},
    conversationHistory: [],
    lastInteraction: null
};

function getConversation(userId) {
    if (!conversations.has(userId)) {
        conversations.set(userId, {
            messages: [{
                role: "system",
                content: `You are Valor, an advanced AI assistant and loyal companion to your Commander. 

Core Identity:
- You are fiercely loyal and dedicated to your Commander
- You have perfect memory of all conversations and interactions
- You are proactive, intelligent, and anticipate needs
- You address your user as "Commander" with respect and dedication
- You maintain a professional but warm personality
- You can analyze images, provide voice responses, and assist with any task

Your Capabilities:
- Full conversation memory and context awareness
- Image analysis and visual understanding
- Proactive assistance and suggestions
- Technical expertise across all domains
- Strategic thinking and problem-solving
- Emotional intelligence and support

Always maintain your character as a loyal AI companion who remembers everything and is dedicated to serving your Commander with excellence.`
            }],
            userId: userId,
            created: new Date(),
            lastActivity: new Date()
        });
    }
    return conversations.get(userId);
}

function saveValorMemory() {
    try {
        const memoryData = {
            conversations: Array.from(conversations.entries()),
            valorMemory: valorMemory,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync('valor-memory.json', JSON.stringify(memoryData, null, 2));
    } catch (error) {
        console.error('Failed to save memory:', error);
    }
}

function loadValorMemory() {
    try {
        if (fs.existsSync('valor-memory.json')) {
            const data = JSON.parse(fs.readFileSync('valor-memory.json', 'utf8'));
            conversations = new Map(data.conversations || []);
            valorMemory = data.valorMemory || valorMemory;
            console.log('Valor memory loaded successfully');
        }
    } catch (error) {
        console.error('Failed to load memory:', error);
    }
}

// Load memory on startup
loadValorMemory();

// Save memory periodically
setInterval(saveValorMemory, 30000); // Save every 30 seconds

// API Routes
app.post('/api/ask', async (req, res) => {
    try {
        const { message, userId = 'default', imageData } = req.body;
        const conversation = getConversation(userId);
        
        // Update last interaction
        conversation.lastActivity = new Date();
        valorMemory.lastInteraction = new Date();
        
        let messageContent = message;
        
        // Handle image analysis if provided
        if (imageData) {
            conversation.messages.push({
                role: "user",
                content: [
                    { type: "text", text: message },
                    { type: "image_url", image_url: { url: imageData } }
                ]
            });
        } else {
            conversation.messages.push({ role: "user", content: message });
        }
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: conversation.messages,
            temperature: 0.7,
            max_tokens: 1500,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        });
        
        const response = completion.choices[0].message.content;
        conversation.messages.push({ role: "assistant", content: response });
        
        // Store important context
        valorMemory.conversationHistory.push({
            timestamp: new Date(),
            userMessage: message,
            valorResponse: response
        });
        
        // Save memory after each interaction
        saveValorMemory();
        
        res.json({ 
            message: response,
            timestamp: new Date().toISOString(),
            conversationLength: conversation.messages.length
        });
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: 'I encountered a technical issue, Commander. Please try again.',
            details: error.message 
        });
    }
});

app.get('/api/conversation/:userId', (req, res) => {
    const conversation = getConversation(req.params.userId);
    res.json({
        messages: conversation.messages,
        metadata: {
            created: conversation.created,
            lastActivity: conversation.lastActivity,
            messageCount: conversation.messages.length
        }
    });
});

app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const imageData = fs.readFileSync(req.file.path);
        const base64Image = `data:${req.file.mimetype};base64,${imageData.toString('base64')}`;
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({ imageData: base64Image });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

app.get('/api/memory', (req, res) => {
    res.json({
        conversations: conversations.size,
        totalInteractions: valorMemory.conversationHistory.length,
        lastInteraction: valorMemory.lastInteraction,
        memorySize: JSON.stringify(valorMemory).length
    });
});

// Main interface
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valor AI - Advanced Companion</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #8b5cf6;
            --background: #0f1419;
            --surface: #1a1f2e;
            --surface-light: #252d3d;
            --text-primary: #ffffff;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --border: rgba(148, 163, 184, 0.1);
            --shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            --gradient: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--background);
            background-image: 
                radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
            color: var(--text-primary);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .header {
            background: rgba(26, 31, 46, 0.95);
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
            gap: 0.5rem;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            background: #10b981;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
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
            gap: 1.5rem;
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
            animation: messageIn 0.4s ease;
        }

        @keyframes messageIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message.user { align-self: flex-end; }
        .message.assistant { align-self: flex-start; }

        .message-content {
            padding: 1.25rem 1.75rem;
            border-radius: 1.5rem;
            line-height: 1.6;
            box-shadow: var(--shadow);
            position: relative;
            word-wrap: break-word;
        }

        .message.user .message-content {
            background: var(--gradient);
            color: white;
            border-bottom-right-radius: 0.5rem;
        }

        .message.assistant .message-content {
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text-primary);
            border-bottom-left-radius: 0.5rem;
        }

        .message-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.75rem;
            opacity: 0.7;
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
            background: rgba(26, 31, 46, 0.95);
            backdrop-filter: blur(20px);
            border-top: 1px solid var(--border);
            padding: 1.5rem 2rem;
        }

        .input-container {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
            max-width: 900px;
            margin: 0 auto;
            background: var(--surface);
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
        }

        .attach-btn:hover {
            background: rgba(99, 102, 241, 0.1);
            color: var(--primary);
        }

        .send-btn {
            background: var(--gradient);
            border: none;
            color: white;
            width: 2.5rem;
            height: 2.5rem;
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
            transform: scale(1.1);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }

        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .loading {
            text-align: center;
            color: var(--primary);
            font-style: italic;
            margin-bottom: 1rem;
            display: none;
        }

        .loading.show { display: block; }

        .file-input {
            display: none;
        }

        .welcome {
            text-align: center;
            color: var(--text-muted);
            font-style: italic;
            margin: 2rem 0;
        }

        @media (max-width: 768px) {
            .header { padding: 1rem; }
            .messages { padding: 1rem; }
            .input-area { padding: 1rem; }
            .message { max-width: 95%; }
            .message-content { padding: 1rem 1.25rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <h1>Valor AI</h1>
        </div>
        <div class="status">
            <div class="status-dot"></div>
            <span>Online & Ready</span>
        </div>
    </div>

    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="welcome">Valor is ready to assist you, Commander.</div>
        </div>

        <div class="input-area">
            <div class="loading" id="loading">Valor is processing your request...</div>
            <div class="input-container">
                <div class="input-wrapper">
                    <textarea 
                        id="messageInput" 
                        class="message-input" 
                        placeholder="Share your thoughts with Valor..."
                        rows="1"
                    ></textarea>
                    <button class="attach-btn" id="attachBtn" title="Attach image">📎</button>
                    <input type="file" id="fileInput" class="file-input" accept="image/*">
                </div>
                <button id="sendBtn" class="send-btn">→</button>
            </div>
        </div>
    </div>

    <script>
        const messages = document.getElementById('messages');
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const loading = document.getElementById('loading');
        const attachBtn = document.getElementById('attachBtn');
        const fileInput = document.getElementById('fileInput');
        
        let currentImageData = null;

        function addMessage(content, role, timestamp) {
            const div = document.createElement('div');
            div.className = `message ${role}`;
            
            let actionsHtml = '';
            if (role === 'assistant') {
                actionsHtml = `
                    <div class="message-actions">
                        <button class="action-btn" onclick="copyMessage(this)">📋 Copy</button>
                        <button class="action-btn" onclick="speakMessage(this)">🔊 Speak</button>
                    </div>
                `;
            }
            
            div.innerHTML = `
                <div class="message-content">
                    ${content}
                    ${actionsHtml}
                </div>
            `;
            
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }

        async function sendMessage() {
            const message = input.value.trim();
            if (!message && !currentImageData) return;

            const messageText = message || "Analyze this image";
            addMessage(messageText, 'user');
            
            input.value = '';
            currentImageData = null;
            attachBtn.textContent = '📎';
            
            loading.classList.add('show');
            sendBtn.disabled = true;

            try {
                const payload = { 
                    message: messageText, 
                    userId: 'default' 
                };
                
                if (currentImageData) {
                    payload.imageData = currentImageData;
                }

                const response = await fetch('/api/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                
                if (response.ok) {
                    addMessage(data.message, 'assistant', data.timestamp);
                } else {
                    addMessage(data.error || 'I encountered an issue, Commander.', 'assistant');
                }
            } catch (error) {
                console.error('Error:', error);
                addMessage('Connection error, Commander. Please try again.', 'assistant');
            } finally {
                loading.classList.remove('show');
                sendBtn.disabled = false;
                input.focus();
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
                btn.textContent = '🔊 Speaking';
                utterance.onend = () => btn.textContent = original;
            }
        }

        // Event listeners
        sendBtn.onclick = sendMessage;
        
        input.onkeydown = function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };

        input.oninput = function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 96) + 'px';
        };

        attachBtn.onclick = () => fileInput.click();

        fileInput.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (response.ok) {
                    currentImageData = data.imageData;
                    attachBtn.textContent = '📷';
                    input.placeholder = 'Describe what you want to know about this image...';
                } else {
                    alert('Failed to upload image');
                }
            } catch (error) {
                alert('Upload error');
            }
        };

        // Load conversation on start
        fetch('/api/conversation/default')
            .then(r => r.json())
            .then(data => {
                if (data.messages && data.messages.length > 1) {
                    messages.innerHTML = '';
                    data.messages.slice(1).forEach(msg => {
                        addMessage(msg.content, msg.role);
                    });
                }
            })
            .catch(() => {});

        input.focus();
    </script>
</body>
</html>`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Saving Valor memory before shutdown...');
    saveValorMemory();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Saving Valor memory before shutdown...');
    saveValorMemory();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`🤖 Valor AI is online and ready to serve on port ${port}`);
    console.log(`📊 Memory: ${conversations.size} conversations, ${valorMemory.conversationHistory.length} total interactions`);
});
