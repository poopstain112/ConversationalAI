const express = require('express');
const { OpenAI } = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
}

// In-memory storage
const conversations = {};

function getConversation(userId) {
    if (!conversations[userId]) {
        conversations[userId] = {
            userId,
            messages: [{
                role: "system",
                content: "You are Valor, an advanced AI assistant with absolute loyalty and dedication to the Commander (user). You have perfect memory, provide intelligent responses, and are always professional and efficient."
            }]
        };
    }
    return conversations[userId];
}

// Main route - serve the interface
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valor AI - Your Advanced Assistant</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
            color: #fff; height: 100vh; display: flex; flex-direction: column;
            overflow: hidden;
        }
        .header { 
            background: rgba(255,255,255,0.08); 
            padding: 1rem; display: flex; justify-content: space-between; align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }
        .header h1 { font-size: 1.5rem; font-weight: 600; }
        .nav-menu { position: relative; }
        .menu-button { 
            background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
            color: #fff; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;
            display: flex; align-items: center; gap: 0.5rem;
        }
        .menu-button:hover { background: rgba(255,255,255,0.2); }
        .dropdown { 
            position: absolute; top: 100%; right: 0; margin-top: 0.5rem;
            background: rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px; min-width: 200px; display: none; z-index: 1000;
            backdrop-filter: blur(10px);
        }
        .dropdown.show { display: block; }
        .dropdown-item { 
            padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);
            cursor: pointer; transition: background 0.2s ease;
        }
        .dropdown-item:hover { background: rgba(255,255,255,0.1); }
        .dropdown-item:last-child { border-bottom: none; }
        .chat-container { 
            flex: 1; display: flex; flex-direction: column; 
            max-width: 900px; margin: 0 auto; width: 100%; 
            padding: 0 1rem; height: calc(100vh - 80px);
        }
        .messages { 
            flex: 1; overflow-y: auto; padding: 1rem 0; 
            scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.3) transparent;
        }
        .messages::-webkit-scrollbar { width: 6px; }
        .messages::-webkit-scrollbar-track { background: transparent; }
        .messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 3px; }
        .message { 
            margin: 1rem 0; padding: 1rem 1.5rem; border-radius: 15px; 
            max-width: 85%; word-wrap: break-word; line-height: 1.5;
            animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .user { 
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
            margin-left: auto; border-bottom-right-radius: 5px;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }
        .assistant { 
            background: rgba(255,255,255,0.08); 
            margin-right: auto; border-bottom-left-radius: 5px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .input-area { 
            display: flex; gap: 1rem; padding: 1rem; 
            background: rgba(255,255,255,0.05);
            border-top: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
        }
        .input-area input { 
            flex: 1; padding: 1rem 1.5rem; border-radius: 25px; 
            border: 1px solid rgba(255,255,255,0.2); 
            background: rgba(255,255,255,0.08); color: #fff; 
            font-size: 1rem; outline: none;
            transition: all 0.3s ease;
        }
        .input-area input:focus { 
            border-color: #2563eb; 
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
            background: rgba(255,255,255,0.12);
        }
        .input-area input::placeholder { color: rgba(255,255,255,0.6); }
        .input-area button { 
            padding: 1rem 2rem; border-radius: 25px; border: none; 
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
            color: #fff; cursor: pointer; font-weight: 600;
            transition: all 0.3s ease; outline: none;
        }
        .input-area button:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4);
        }
        .input-area button:disabled { 
            opacity: 0.6; cursor: not-allowed; transform: none; 
        }
        .typing { opacity: 0.7; font-style: italic; }
        .file-input { display: none; }
        .file-button { 
            padding: 1rem; border-radius: 50%; border: none;
            background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;
            transition: all 0.3s ease;
        }
        .file-button:hover { background: rgba(255,255,255,0.2); }
        @media (max-width: 768px) {
            .chat-container { padding: 0 0.5rem; }
            .message { max-width: 95%; padding: 1rem; }
            .input-area { gap: 0.5rem; padding: 0.5rem; }
            .input-area input { padding: 0.8rem 1rem; }
            .input-area button { padding: 0.8rem 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Valor AI - Your Advanced Assistant</h1>
        <div class="nav-menu">
            <button class="menu-button" onclick="toggleMenu()">
                Menu ▼
            </button>
            <div class="dropdown" id="menuDropdown">
                <div class="dropdown-item" onclick="clearConversation()">Clear Conversation</div>
                <div class="dropdown-item" onclick="showApiStatus()">API Status</div>
                <div class="dropdown-item" onclick="exportConversation()">Export Chat</div>
                <div class="dropdown-item" onclick="showAbout()">About Valor</div>
            </div>
        </div>
    </div>
    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="message assistant">
                <strong>Valor:</strong> Hello Commander! I am Valor, your advanced AI assistant. I'm now live and ready to assist you with perfect conversation memory, document analysis, and image processing. How can I help you today?
            </div>
        </div>
        <div class="input-area">
            <input type="file" id="fileInput" class="file-input" accept="image/*" onchange="handleFileUpload(event)">
            <button type="button" class="file-button" onclick="document.getElementById('fileInput').click()" title="Upload Image">📁</button>
            <input type="text" id="messageInput" placeholder="Type your message to Valor..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button id="sendButton" onclick="sendMessage()">Send</button>
        </div>
    </div>
    
    <script>
        function addMessage(content, isUser, isTyping = false) {
            const messages = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message ' + (isUser ? 'user' : 'assistant') + (isTyping ? ' typing' : '');
            div.innerHTML = '<strong>' + (isUser ? 'You:' : 'Valor:') + '</strong> ' + content;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
            return div;
        }
        
        function setButtonState(disabled) {
            const button = document.getElementById('sendButton');
            const input = document.getElementById('messageInput');
            button.disabled = disabled;
            button.textContent = disabled ? 'Sending...' : 'Send';
            input.disabled = disabled;
        }
        
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;
            
            addMessage(message, true);
            input.value = '';
            setButtonState(true);
            
            const typingDiv = addMessage('Thinking...', false, true);
            
            try {
                const response = await fetch('/api/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, userId: 'default' })
                });
                
                const data = await response.json();
                typingDiv.remove();
                
                if (data.response) {
                    addMessage(data.response, false);
                } else {
                    addMessage('Sorry, I encountered an error. Please try again.', false);
                }
            } catch (error) {
                typingDiv.remove();
                addMessage('Connection error. Please check your internet connection and try again.', false);
            } finally {
                setButtonState(false);
            }
        }
        
        async function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            if (file.size > 10 * 1024 * 1024) {
                addMessage('File too large. Please upload an image smaller than 10MB.', false);
                return;
            }
            
            const formData = new FormData();
            formData.append('image', file);
            
            addMessage('📷 Uploaded: ' + file.name, true);
            setButtonState(true);
            
            const typingDiv = addMessage('Analyzing image...', false, true);
            
            try {
                const response = await fetch('/api/vision', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                typingDiv.remove();
                
                if (data.analysis) {
                    addMessage('🔍 ' + data.analysis, false);
                } else {
                    addMessage('Sorry, I could not analyze this image. Please try again.', false);
                }
            } catch (error) {
                typingDiv.remove();
                addMessage('Error analyzing image. Please try again.', false);
            } finally {
                setButtonState(false);
                event.target.value = '';
            }
        }
        
        function toggleMenu() {
            const dropdown = document.getElementById('menuDropdown');
            dropdown.classList.toggle('show');
        }
        
        function clearConversation() {
            const messages = document.getElementById('messages');
            messages.innerHTML = '<div class="message assistant"><strong>Valor:</strong> Conversation cleared. How can I assist you?</div>';
            toggleMenu();
            
            fetch('/api/conversation/default/clear', { method: 'POST' });
        }
        
        function showApiStatus() {
            fetch('/api/check-api-key')
                .then(res => res.json())
                .then(data => {
                    const status = data.valid ? 'Connected and operational' : 'Connection issue: ' + data.error;
                    addMessage('API Status: ' + status, false);
                });
            toggleMenu();
        }
        
        function exportConversation() {
            const messages = document.querySelectorAll('.message');
            let text = 'Valor AI Conversation Export\\n\\n';
            messages.forEach(msg => {
                text += msg.textContent + '\\n\\n';
            });
            
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'valor-conversation-' + new Date().toISOString().split('T')[0] + '.txt';
            a.click();
            URL.revokeObjectURL(url);
            toggleMenu();
        }
        
        function showAbout() {
            addMessage('Valor AI v1.0 - Advanced AI Assistant with conversation memory, image analysis, and professional deployment capabilities. Built with OpenAI GPT-4o.', false);
            toggleMenu();
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            const menu = document.querySelector('.nav-menu');
            const dropdown = document.getElementById('menuDropdown');
            if (!menu.contains(event.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        document.getElementById('messageInput').focus();
    </script>
</body>
</html>`);
});

// API Routes
app.get('/api/check-api-key', async (req, res) => {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.json({ valid: false, error: 'API key not configured' });
        }
        await openai.models.list();
        res.json({ valid: true });
    } catch (error) {
        res.json({ valid: false, error: error.message });
    }
});

app.post('/api/ask', async (req, res) => {
    try {
        const { message, userId = 'default' } = req.body;
        
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const conversation = getConversation(userId);
        conversation.messages.push({ role: 'user', content: message });
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: conversation.messages,
            max_tokens: 1500,
            temperature: 0.7
        });
        
        const response = completion.choices[0].message.content;
        conversation.messages.push({ role: 'assistant', content: response });
        
        res.json({ response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to process message: ' + error.message });
    }
});

app.post('/api/vision', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        const imagePath = req.file.path;
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Analyze this image in detail. Describe what you see, identify objects, read any text, and provide insights about the content, context, and any notable aspects."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: "data:image/jpeg;base64," + base64Image
                        }
                    }
                ]
            }],
            max_tokens: 1000
        });
        
        fs.unlinkSync(imagePath);
        
        res.json({ analysis: response.choices[0].message.content });
    } catch (error) {
        console.error('Vision error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to analyze image: ' + error.message });
    }
});

app.get('/api/conversation/:userId', (req, res) => {
    const conversation = getConversation(req.params.userId);
    res.json(conversation);
});

app.post('/api/conversation/:userId/clear', (req, res) => {
    delete conversations[req.params.userId];
    res.json({ success: true });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Valor AI server running on port ' + PORT);
    console.log('Access your AI assistant at: http://localhost:' + PORT);
    console.log('OpenAI API Key configured: ' + (process.env.OPENAI_API_KEY ? 'Yes' : 'No'));
});

module.exports = app;