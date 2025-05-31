const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const conversations = new Map();

app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

app.get('/api/check-api-key', (req, res) => {
    res.json({ valid: !!process.env.OPENAI_API_KEY });
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
        
        let conversation = conversations.get(userId) || { userId, messages: [] };
        
        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
        
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
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: 1000
        });
        
        const aiResponse = completion.choices[0].message.content;
        
        conversation.messages.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString()
        });
        
        conversations.set(userId, conversation);
        
        res.json({ response: aiResponse });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process chat request' });
    }
});

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Valor AI</title>
    <meta name="theme-color" content="#ffffff">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #ffffff; color: #374151; 
            height: 100vh; overflow: hidden; position: relative;
        }
        
        .header {
            background: #ffffff; padding: 0.75rem 1rem;
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 100;
        }
        
        .header-left {
            display: flex; align-items: center; gap: 0.75rem;
        }
        
        .menu-icon {
            font-size: 1.25rem; color: #374151; cursor: pointer;
            padding: 0.5rem; border-radius: 0.5rem; transition: background 0.2s;
        }
        .menu-icon:hover { background: #f3f4f6; }
        
        .logo {
            font-size: 1.125rem; font-weight: 600; color: #374151;
        }
        
        .header-right {
            display: flex; align-items: center; gap: 0.5rem;
        }
        
        .new-chat-btn {
            background: none; border: none; color: #374151; font-size: 1.125rem;
            cursor: pointer; padding: 0.5rem; border-radius: 0.5rem;
            transition: background 0.2s;
        }
        .new-chat-btn:hover { background: #f3f4f6; }
        
        .menu-btn {
            background: none; border: none; color: #374151; 
            font-size: 1.125rem; cursor: pointer; padding: 0.5rem;
            border-radius: 0.5rem; transition: background 0.2s;
        }
        .menu-btn:hover { background: #f3f4f6; }
        
        .dropdown {
            position: absolute; top: calc(100% + 0.5rem); right: 1rem; 
            background: #ffffff; border-radius: 0.5rem; min-width: 12rem; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            display: none; z-index: 2000; border: 1px solid #e5e7eb;
        }
        .dropdown.show { display: block; }
        
        .dropdown-item { 
            padding: 0.75rem 1rem; color: #374151; cursor: pointer; 
            transition: background 0.2s; font-size: 0.875rem;
        }
        .dropdown-item:hover { background: #f3f4f6; }
        
        .chat-container { 
            height: calc(100vh - 4rem); display: flex; flex-direction: column;
            background: #ffffff;
        }
        
        .messages { 
            flex: 1; padding: 1rem; overflow-y: auto; display: flex; 
            flex-direction: column; gap: 1rem; max-width: 48rem; margin: 0 auto; width: 100%;
        }
        
        .messages::-webkit-scrollbar { width: 4px; }
        .messages::-webkit-scrollbar-track { background: transparent; }
        .messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 2px; }
        
        .message { 
            padding: 0.75rem 1rem; border-radius: 0.75rem; position: relative;
            word-wrap: break-word; line-height: 1.6; font-size: 0.875rem;
            max-width: 100%;
        }
        
        .message.user { 
            align-self: flex-end; background: #f3f4f6; color: #374151;
            max-width: 70%; margin-left: auto;
        }
        
        .message.assistant { 
            align-self: flex-start; background: transparent; color: #374151;
            max-width: 100%; padding-left: 0; padding-right: 0;
        }
        
        .message-actions {
            display: flex; gap: 0.5rem; margin-top: 0.75rem; opacity: 0.6;
        }
        
        .message-actions button {
            background: #f3f4f6; border: none; color: #6b7280;
            padding: 0.375rem 0.5rem; border-radius: 0.375rem; cursor: pointer;
            font-size: 0.75rem; transition: all 0.2s; display: flex;
            align-items: center; gap: 0.25rem;
        }
        
        .message-actions button:hover {
            background: #e5e7eb; color: #374151;
        }
        
        .input-area { 
            padding: 1rem; background: #ffffff; border-top: 1px solid #e5e7eb;
            position: sticky; bottom: 0; z-index: 50;
        }
        
        .input-container { 
            display: flex; gap: 0.5rem; align-items: flex-end;
            background: #ffffff; border-radius: 1.5rem; padding: 0.5rem;
            border: 1px solid #d1d5db; max-width: 48rem; margin: 0 auto;
        }
        
        .file-upload { 
            background: #f3f4f6; border: none; color: #6b7280; border-radius: 50%;
            width: 2rem; height: 2rem; display: flex; 
            align-items: center; justify-content: center; cursor: pointer; 
            transition: all 0.2s; font-size: 0.875rem; flex-shrink: 0;
        }
        .file-upload:hover { background: #e5e7eb; }
        
        .message-input { 
            flex: 1; background: transparent; border: none; color: #374151; 
            padding: 0.5rem 0.75rem; border-radius: 1rem; outline: none;
            resize: none; min-height: 2rem; max-height: 8rem; font-size: 1rem;
            line-height: 1.5;
        }
        .message-input::placeholder { color: #9ca3af; }
        
        .send-button { 
            background: #000000; border: none; color: #ffffff; 
            width: 2rem; height: 2rem; border-radius: 50%; cursor: pointer; 
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s; flex-shrink: 0; font-size: 0.875rem;
        }
        .send-button:hover { background: #374151; }
        .send-button:disabled { opacity: 0.5; cursor: not-allowed; background: #9ca3af; }
        
        @media (max-width: 768px) {
            .chat-container { height: calc(100vh - 3.5rem); }
            .header { padding: 0.5rem 1rem; }
            .messages { padding: 0.75rem; gap: 0.75rem; }
            .message { font-size: 0.875rem; }
            .input-area { padding: 0.75rem; }
        }
        
        @media (max-height: 600px) {
            .chat-container { height: calc(100vh - 3rem); }
            .header { padding: 0.375rem 1rem; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="menu-icon">☰</div>
            <div class="logo">Valor AI</div>
        </div>
        <div class="header-right">
            <button class="new-chat-btn" onclick="clearChat()" title="New Chat">✏️</button>
            <div style="position: relative;">
                <button class="menu-btn" onclick="toggleMenu()">⋮</button>
                <div class="dropdown" id="dropdown">
                    <div class="dropdown-item" onclick="clearChat()">Clear Chat</div>
                    <div class="dropdown-item" onclick="checkStatus()">API Status</div>
                    <div class="dropdown-item" onclick="exportChat()">Export Chat</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="message assistant">
                Hello! I'm Valor, your advanced AI assistant. I can help you with questions, analysis, writing, and much more. What would you like to explore today?
                <div class="message-actions">
                    <button onclick="copyMessage(this)">📋 Copy</button>
                    <button onclick="speakMessage(this)">🔊 Read</button>
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
                placeholder="Ask anything..."
                onkeydown="handleKeyPress(event)"
                rows="1"
            ></textarea>
            <button id="sendButton" class="send-button" onclick="sendMessage()">↑</button>
        </div>
    </div>

    <script>
        let selectedFile = null;
        
        document.getElementById('fileInput').addEventListener('change', function(e) {
            selectedFile = e.target.files[0];
        });
        
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }
        
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const button = document.getElementById('sendButton');
            
            const message = input.value.trim();
            if (!message && !selectedFile) return;
            
            addMessage(message || 'Image uploaded', true);
            
            input.value = '';
            button.disabled = true;
            button.textContent = '...';
            
            try {
                const formData = new FormData();
                formData.append('message', message);
                formData.append('userId', 'default');
                
                if (selectedFile) {
                    formData.append('image', selectedFile);
                    selectedFile = null;
                    document.getElementById('fileInput').value = '';
                }
                
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
            button.textContent = '↑';
            input.focus();
        }
        
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
                    '<button onclick="speakMessage(this)">🔊 Read</button>' +
                    '</div>';
            }
            
            messagesDiv.appendChild(messageDiv);
            
            // Enhanced auto-scroll with multiple attempts
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                requestAnimationFrame(() => {
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                });
            }, 10);
        }
        
        function copyMessage(button) {
            const messageDiv = button.closest('.message');
            const text = messageDiv.textContent.replace(/📋 Copy🔊 Read/g, '').trim();
            
            navigator.clipboard.writeText(text).then(() => {
                const originalText = button.innerHTML;
                button.innerHTML = '✅ Copied';
                setTimeout(() => {
                    button.innerHTML = originalText;
                }, 2000);
            });
        }
        
        function speakMessage(button) {
            const messageDiv = button.closest('.message');
            const text = messageDiv.textContent.replace(/📋 Copy🔊 Read/g, '').trim();
            
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                
                const voices = window.speechSynthesis.getVoices();
                const femaleVoice = voices.find(voice => 
                    voice.lang.includes('en') && 
                    (voice.name.toLowerCase().includes('female') || 
                     voice.name.toLowerCase().includes('samantha') ||
                     voice.name.toLowerCase().includes('karen'))
                ) || voices.find(voice => voice.gender === 'female');
                
                if (femaleVoice) {
                    utterance.voice = femaleVoice;
                }
                
                utterance.rate = 0.9;
                utterance.pitch = 1.1;
                window.speechSynthesis.speak(utterance);
                
                const originalText = button.innerHTML;
                button.innerHTML = '🔇 Stop';
                utterance.onend = () => {
                    button.innerHTML = originalText;
                };
            }
        }
        
        function toggleMenu() {
            const dropdown = document.getElementById('dropdown');
            dropdown.classList.toggle('show');
        }
        
        function clearChat() {
            fetch('/api/conversation/default/clear', { method: 'POST' });
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = 
                '<div class="message assistant">' +
                'Chat cleared. What would you like to explore?' +
                '<div class="message-actions">' +
                '<button onclick="copyMessage(this)">📋 Copy</button>' +
                '<button onclick="speakMessage(this)">🔊 Read</button>' +
                '</div></div>';
            
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            toggleMenu();
        }
        
        async function checkStatus() {
            try {
                const response = await fetch('/api/check-api-key');
                const data = await response.json();
                const status = data.valid ? 'API Connected ✅' : 'API Connection Issue ❌';
                addMessage('System Status: ' + status, false);
            } catch (error) {
                addMessage('System Status: Connection Error ❌', false);
            }
            toggleMenu();
        }
        
        function exportChat() {
            const messages = document.querySelectorAll('.message');
            let text = 'Valor AI Conversation Export\n\n';
            messages.forEach(msg => {
                text += msg.textContent.replace(/📋 Copy🔊 Read/g, '').trim() + '\n\n';
            });
            
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'valor-chat-' + new Date().toISOString().split('T')[0] + '.txt';
            a.click();
            URL.revokeObjectURL(url);
            toggleMenu();
        }
        
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('dropdown');
            const menu = event.target.closest('.menu-btn');
            if (!menu) {
                dropdown.classList.remove('show');
            }
        });
        
        window.addEventListener('load', function() {
            document.getElementById('messageInput').focus();
            const messagesDiv = document.getElementById('messages');
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 100);
        });
        
        // Add scroll observer for better reliability
        if (window.ResizeObserver) {
            const messagesDiv = document.getElementById('messages');
            const resizeObserver = new ResizeObserver(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            });
            resizeObserver.observe(messagesDiv);
        }
        
        // Auto-resize textarea
        const textarea = document.getElementById('messageInput');
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 128) + 'px';
        });
    </script>
</body>
</html>`);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Valor AI server running on port ${port}`);
});