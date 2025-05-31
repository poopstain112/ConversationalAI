const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// OpenAI setup
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Memory storage
const conversations = new Map();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
app.get('/api/check-api-key', (req, res) => {
    const hasKey = !!process.env.OPENAI_API_KEY;
    res.json({ valid: hasKey });
});

app.get('/api/conversation/:userId', (req, res) => {
    const userId = req.params.userId;
    const conversation = conversations.get(userId) || { userId, messages: [] };
    res.json(conversation);
});

app.post('/api/conversation/:userId/clear', (req, res) => {
    const userId = req.params.userId;
    conversations.set(userId, { userId, messages: [] });
    res.json({ success: true });
});

app.post('/api/chat', upload.single('image'), async (req, res) => {
    try {
        const { message, userId = 'default' } = req.body;
        
        // Get or create conversation
        let conversation = conversations.get(userId) || { userId, messages: [] };
        
        // Add user message
        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
        
        // Prepare messages for OpenAI
        const messages = [
            {
                role: 'system',
                content: 'You are Valor, an advanced AI assistant. You are helpful, knowledgeable, and speak with confidence. Keep responses concise but informative.'
            },
            ...conversation.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))
        ];
        
        // Handle image if provided
        if (req.file) {
            const base64Image = req.file.buffer.toString('base64');
            messages[messages.length - 1].content = [
                { type: 'text', text: message },
                {
                    type: 'image_url',
                    image_url: { url: `data:${req.file.mimetype};base64,${base64Image}` }
                }
            ];
        }
        
        // Get AI response
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: 1000
        });
        
        const aiResponse = completion.choices[0].message.content;
        
        // Add AI response to conversation
        conversation.messages.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString()
        });
        
        // Store conversation
        conversations.set(userId, conversation);
        
        res.json({ response: aiResponse });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

// Serve the main HTML page
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valor AI - Your Advanced Assistant</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a; color: #fff; height: 100vh; overflow: hidden;
        }
        
        .header {
            background: #1c1c1e; padding: 0.8rem 1rem;
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid #333; position: relative; z-index: 100;
        }
        
        .header-info {
            display: flex; align-items: center; gap: 0.8rem;
        }
        
        .avatar {
            width: 40px; height: 40px; border-radius: 50%;
            background: linear-gradient(135deg, #007AFF, #5856D6);
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; font-size: 1.1rem; color: #fff;
        }
        
        .contact-info h3 {
            font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 2px;
        }
        
        .contact-info p {
            font-size: 0.85rem; color: #8e8e93;
        }
        
        .nav-menu { position: relative; }
        .menu-button { 
            background: none; border: none; color: #007AFF; 
            font-size: 1.3rem; cursor: pointer; width: 40px; height: 40px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 20px; transition: background 0.2s ease;
        }
        .menu-button:hover { background: rgba(0,122,255,0.1); }
        
        .dropdown { 
            position: absolute; top: calc(100% + 0.5rem); right: 0; 
            background: #2c2c2e; border-radius: 12px; min-width: 180px; 
            box-shadow: 0 8px 30px rgba(0,0,0,0.5); display: none; z-index: 2000; overflow: hidden;
        }
        .dropdown.show { display: block; animation: fadeIn 0.2s ease; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        
        .dropdown-item { 
            padding: 12px 16px; color: #fff; cursor: pointer; 
            transition: background 0.2s ease; font-size: 0.95rem;
        }
        .dropdown-item:hover { background: #3a3a3c; }
        
        .chat-container { 
            height: calc(100vh - 140px); display: flex; flex-direction: column;
            background: #000;
        }
        
        .messages { 
            flex: 1; padding: 8px 16px; overflow-y: auto; display: flex; 
            flex-direction: column; gap: 2px;
        }
        
        .message { 
            max-width: 75%; padding: 12px 16px; border-radius: 18px; position: relative;
            word-wrap: break-word; line-height: 1.4; margin-bottom: 2px;
            font-size: 0.95rem;
        }
        
        .message.user { 
            align-self: flex-end; background: #007AFF; color: #fff;
            border-bottom-right-radius: 4px; margin-left: 25%;
        }
        
        .message.assistant { 
            align-self: flex-start; background: #1c1c1e; color: #fff;
            border-bottom-left-radius: 4px; margin-right: 25%;
        }
        
        .message-actions {
            display: flex; gap: 8px; margin-top: 8px; opacity: 0.8;
        }
        
        .message-actions button {
            background: rgba(0,122,255,0.15); border: none; color: #007AFF;
            padding: 6px 12px; border-radius: 12px; cursor: pointer;
            font-size: 0.8rem; transition: all 0.2s ease; font-weight: 500;
        }
        
        .message-actions button:hover {
            background: rgba(0,122,255,0.25); transform: scale(1.05);
        }
        
        .input-area { 
            padding: 8px 16px; background: #1c1c1e;
            border-top: 1px solid #333; position: relative; z-index: 50;
        }
        
        .input-container { 
            display: flex; gap: 8px; align-items: flex-end;
            background: #2c2c2e; border-radius: 20px; padding: 8px;
        }
        
        .file-upload { 
            background: #007AFF; border: none; color: #fff; border-radius: 50%;
            width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: all 0.2s ease; font-size: 1rem; flex-shrink: 0;
        }
        .file-upload:hover { background: #0056CC; }
        
        .message-input { 
            flex: 1; background: transparent; border: none;
            color: #fff; padding: 8px 12px; border-radius: 16px; outline: none;
            resize: none; min-height: 32px; max-height: 120px; font-size: 0.95rem;
            line-height: 1.4;
        }
        .message-input::placeholder { color: #8e8e93; }
        
        .send-button { 
            background: #007AFF; border: none; color: #fff; 
            width: 32px; height: 32px; border-radius: 50%; cursor: pointer; 
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s ease; flex-shrink: 0; font-size: 0.9rem;
        }
        .send-button:hover { background: #0056CC; }
        .send-button:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .timestamp {
            font-size: 0.75rem; color: #8e8e93; margin-top: 4px; text-align: right;
        }
        
        .message.assistant .timestamp {
            text-align: left;
        }
        
        @media (max-width: 768px) {
            .message { max-width: 85%; font-size: 0.9rem; }
            .header { padding: 0.6rem 1rem; }
            .input-area { padding: 6px 12px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-info">
            <div class="avatar">V</div>
            <div class="contact-info">
                <h3>Valor AI</h3>
                <p>Online • AI Assistant</p>
            </div>
        </div>
        <div class="nav-menu">
            <button class="menu-button" onclick="toggleDropdown()">⋮</button>
            <div class="dropdown" id="dropdown">
                <div class="dropdown-item" onclick="clearChat()">Clear Chat</div>
                <div class="dropdown-item" onclick="checkStatus()">API Status</div>
                <div class="dropdown-item" onclick="exportChat()">Export Chat</div>
                <div class="dropdown-item" onclick="showAbout()">About Valor</div>
            </div>
        </div>
    </div>
    
    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="message assistant">
                Hello Commander! I am Valor, your advanced AI assistant. I'm ready to help you with any questions or tasks. How can I assist you today?
                <div class="message-actions">
                    <button onclick="copyMessage(this)">📋 Copy</button>
                    <button onclick="speakMessage(this)">🔊 Speak</button>
                </div>
            </div>
        </div>
    </div>
    
    <div class="input-area">
        <div class="input-container">
            <label class="file-upload" for="fileInput">📎</label>
            <input type="file" id="fileInput" accept="image/*" style="display: none;">
            <textarea 
                id="messageInput" 
                class="message-input" 
                placeholder="Message..."
                onkeydown="handleKeyPress(event)"
            ></textarea>
            <button id="sendButton" class="send-button" onclick="sendMessage()">↑</button>
        </div>
    </div>

    <script>
        let selectedFile = null;
        
        // Handle file selection
        document.getElementById('fileInput').addEventListener('change', function(e) {
            selectedFile = e.target.files[0];
            if (selectedFile) {
                console.log('File selected:', selectedFile.name);
            }
        });
        
        // Handle key press
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }
        
        // Send message function
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const button = document.getElementById('sendButton');
            const messagesDiv = document.getElementById('messages');
            
            const message = input.value.trim();
            if (!message && !selectedFile) return;
            
            // Add user message
            addMessage(message || 'Image uploaded', true);
            
            // Clear input
            input.value = '';
            button.disabled = true;
            button.textContent = 'Sending...';
            
            try {
                // Prepare form data
                const formData = new FormData();
                formData.append('message', message);
                formData.append('userId', 'default');
                
                if (selectedFile) {
                    formData.append('image', selectedFile);
                    selectedFile = null;
                    document.getElementById('fileInput').value = '';
                }
                
                // Send to API
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.response) {
                    addMessage(data.response, false);
                } else {
                    addMessage('Sorry, I encountered an error. Please try again.', false);
                }
                
            } catch (error) {
                console.error('Error:', error);
                addMessage('Sorry, I encountered an error. Please try again.', false);
            }
            
            button.disabled = false;
            button.textContent = 'Send';
            input.focus();
        }
        
        // Add message to chat
        function addMessage(content, isUser) {
            const messagesDiv = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + (isUser ? 'user' : 'assistant');
            
            if (isUser) {
                messageDiv.innerHTML = content;
            } else {
                messageDiv.innerHTML = content + 
                    '<div class="message-actions">' +
                    '<button onclick="copyMessage(this)">📋 Copy</button>' +
                    '<button onclick="speakMessage(this)">🔊 Speak</button>' +
                    '</div>';
            }
            
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // Copy message function
        function copyMessage(button) {
            const messageDiv = button.closest('.message');
            const text = messageDiv.textContent.replace(/📋 Copy🔊 Speak/g, '').trim();
            
            navigator.clipboard.writeText(text).then(() => {
                button.textContent = '✅';
                setTimeout(() => {
                    button.innerHTML = '📋 Copy';
                }, 2000);
            });
        }
        
        // Speak message function
        function speakMessage(button) {
            const messageDiv = button.closest('.message');
            const text = messageDiv.textContent.replace(/📋 Copy🔊 Speak/g, '').trim();
            
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                
                // Try to find a female voice with Russian accent or similar
                const voices = window.speechSynthesis.getVoices();
                const russianVoice = voices.find(voice => 
                    voice.lang.includes('ru') && voice.name.toLowerCase().includes('female')
                ) || voices.find(voice => 
                    voice.name.toLowerCase().includes('elena') || 
                    voice.name.toLowerCase().includes('katya') ||
                    voice.name.toLowerCase().includes('russian')
                ) || voices.find(voice => voice.gender === 'female');
                
                if (russianVoice) {
                    utterance.voice = russianVoice;
                }
                
                utterance.rate = 0.85;
                utterance.pitch = 1.2;
                window.speechSynthesis.speak(utterance);
                
                button.textContent = '🔇';
                utterance.onend = () => {
                    button.innerHTML = '🔊 Speak';
                };
            }
        }
        
        // Toggle dropdown
        function toggleDropdown() {
            const dropdown = document.getElementById('dropdown');
            dropdown.classList.toggle('show');
        }
        
        // Clear chat
        function clearChat() {
            fetch('/api/conversation/default/clear', { method: 'POST' });
            document.getElementById('messages').innerHTML = 
                '<div class="message assistant">' +
                '<strong>Valor:</strong> Chat cleared. How can I help you?' +
                '<div class="message-actions">' +
                '<button onclick="copyMessage(this)">📋 Copy</button>' +
                '<button onclick="speakMessage(this)">🔊 Speak</button>' +
                '</div></div>';
            toggleDropdown();
        }
        
        // Check API status
        async function checkStatus() {
            try {
                const response = await fetch('/api/check-api-key');
                const data = await response.json();
                const status = data.valid ? 'API Connected ✅' : 'API Connection Issue ❌';
                addMessage('System Status: ' + status, false);
            } catch (error) {
                addMessage('System Status: Connection Error ❌', false);
            }
            toggleDropdown();
        }
        
        // Export chat
        function exportChat() {
            const messages = document.querySelectorAll('.message');
            let text = 'Valor AI Conversation Export\\n\\n';
            messages.forEach(msg => {
                text += msg.textContent.replace(/📋 Copy🔊 Speak/g, '').trim() + '\\n\\n';
            });
            
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'valor-chat-' + new Date().toISOString().split('T')[0] + '.txt';
            a.click();
            URL.revokeObjectURL(url);
            toggleDropdown();
        }
        
        // Show about
        function showAbout() {
            addMessage('Valor AI v1.0 - Advanced AI Assistant powered by OpenAI GPT-4o. Features conversation memory, image analysis, and voice synthesis.', false);
            toggleDropdown();
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('dropdown');
            const menu = document.querySelector('.nav-menu');
            if (!menu.contains(event.target)) {
                dropdown.classList.remove('show');
            }
        });
        
        // Focus input on load
        window.addEventListener('load', function() {
            document.getElementById('messageInput').focus();
        });
    </script>
</body>
</html>
    `);
});

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
}

app.listen(port, '0.0.0.0', () => {
    console.log(`Valor AI server running on port ${port}`);
});