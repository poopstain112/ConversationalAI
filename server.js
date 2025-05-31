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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valor AI</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh; overflow: hidden;
        }
        
        .header {
            background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);
            padding: 1rem; display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid rgba(255,255,255,0.3);
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
        }
        
        .logo {
            font-size: 1.4rem; font-weight: 700; 
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        
        .menu-btn {
            background: rgba(255,255,255,0.8); border: none; color: #333; 
            font-size: 1.3rem; cursor: pointer; width: 40px; height: 40px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 12px; transition: all 0.3s ease;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .menu-btn:hover { background: rgba(255,255,255,1); transform: translateY(-1px); }
        
        .dropdown {
            position: absolute; top: calc(100% + 0.5rem); right: 1rem; 
            background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);
            border-radius: 16px; min-width: 180px; 
            box-shadow: 0 8px 32px rgba(0,0,0,0.2); display: none; z-index: 2000; 
            overflow: hidden; border: 1px solid rgba(255,255,255,0.3);
        }
        .dropdown.show { display: block; }
        
        .dropdown-item { 
            padding: 12px 16px; color: #333; cursor: pointer; 
            transition: all 0.2s ease; font-size: 0.95rem;
        }
        .dropdown-item:hover { background: rgba(102,126,234,0.1); color: #667eea; }
        
        .chat-container { 
            height: calc(100vh - 140px); display: flex; flex-direction: column;
        }
        
        .messages { 
            flex: 1; padding: 1.5rem; overflow-y: auto; display: flex; 
            flex-direction: column; gap: 1rem; max-width: 800px; margin: 0 auto; width: 100%;
        }
        
        .message { 
            padding: 1.2rem 1.8rem; border-radius: 20px; position: relative;
            word-wrap: break-word; line-height: 1.6; font-size: 1rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1); backdrop-filter: blur(10px);
        }
        
        .message.user { 
            align-self: flex-end; background: rgba(255,255,255,0.9); color: #333;
            max-width: 75%; margin-left: auto; border-bottom-right-radius: 8px;
            border: 1px solid rgba(255,255,255,0.3);
        }
        
        .message.assistant { 
            align-self: flex-start; background: rgba(255,255,255,0.95); color: #333;
            max-width: 85%; border-bottom-left-radius: 8px;
            border: 1px solid rgba(255,255,255,0.3);
        }
        
        .message-actions {
            display: flex; gap: 0.8rem; margin-top: 1rem; opacity: 0.8;
        }
        
        .message-actions button {
            background: linear-gradient(135deg, #667eea, #764ba2); border: none; color: #fff;
            padding: 0.6rem 1rem; border-radius: 12px; cursor: pointer;
            font-size: 0.85rem; transition: all 0.3s ease; font-weight: 500;
            box-shadow: 0 2px 10px rgba(102,126,234,0.3);
        }
        
        .message-actions button:hover {
            transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102,126,234,0.4);
        }
        
        .input-area { 
            padding: 1.5rem; background: transparent;
        }
        
        .input-container { 
            display: flex; gap: 0.8rem; align-items: flex-end;
            background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);
            border-radius: 25px; padding: 0.8rem; max-width: 800px; margin: 0 auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.3);
        }
        
        .file-upload { 
            background: linear-gradient(135deg, #667eea, #764ba2); border: none; color: #fff; 
            border-radius: 50%; width: 44px; height: 44px; display: flex; 
            align-items: center; justify-content: center; cursor: pointer; 
            transition: all 0.3s ease; font-size: 1.1rem; flex-shrink: 0;
            box-shadow: 0 4px 15px rgba(102,126,234,0.3);
        }
        .file-upload:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.4); }
        
        .message-input { 
            flex: 1; background: transparent; border: none; color: #333; 
            padding: 0.8rem 1.2rem; border-radius: 20px; outline: none;
            resize: none; min-height: 44px; max-height: 120px; font-size: 1rem;
        }
        .message-input::placeholder { color: #888; }
        
        .send-button { 
            background: linear-gradient(135deg, #667eea, #764ba2); border: none; color: #fff; 
            width: 44px; height: 44px; border-radius: 50%; cursor: pointer; 
            display: flex; align-items: center; justify-content: center;
            transition: all 0.3s ease; flex-shrink: 0; font-size: 1.1rem;
            box-shadow: 0 4px 15px rgba(102,126,234,0.3);
        }
        .send-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.4); }
        .send-button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">Valor AI</div>
        <div style="position: relative;">
            <button class="menu-btn" onclick="toggleMenu()">⋮</button>
            <div class="dropdown" id="dropdown">
                <div class="dropdown-item" onclick="clearChat()">Clear Chat</div>
                <div class="dropdown-item" onclick="checkStatus()">API Status</div>
                <div class="dropdown-item" onclick="exportChat()">Export Chat</div>
            </div>
        </div>
    </div>
    
    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="message assistant">
                Hello! I am Valor, your advanced AI assistant. I'm ready to help you with any questions or tasks. How can I assist you today?
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
                placeholder="Ask anything..."
                onkeydown="handleKeyPress(event)"
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
                    '<button onclick="speakMessage(this)">🔊 Speak</button>' +
                    '</div>';
            }
            
            messagesDiv.appendChild(messageDiv);
            
            // WORKING AUTO-SCROLL
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 50);
        }
        
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
        
        function speakMessage(button) {
            const messageDiv = button.closest('.message');
            const text = messageDiv.textContent.replace(/📋 Copy🔊 Speak/g, '').trim();
            
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.85;
                utterance.pitch = 1.2;
                window.speechSynthesis.speak(utterance);
                
                button.textContent = '🔇';
                utterance.onend = () => {
                    button.innerHTML = '🔊 Speak';
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
                'Chat cleared. How can I help you?' +
                '<div class="message-actions">' +
                '<button onclick="copyMessage(this)">📋 Copy</button>' +
                '<button onclick="speakMessage(this)">🔊 Speak</button>' +
                '</div></div>';
            
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 50);
            
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
                text += msg.textContent.replace(/📋 Copy🔊 Speak/g, '').trim() + '\n\n';
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
    </script>
</body>
</html>`);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Valor AI server running on port ${port}`);
});