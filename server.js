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
            background: #f7f7f8; height: 100vh; overflow: hidden;
        }
        
        .header {
            background: #fff; padding: 1rem; display: flex; align-items: center; 
            justify-content: space-between; border-bottom: 1px solid #e5e7eb;
        }
        
        .logo { font-size: 1.25rem; font-weight: 600; color: #111827; }
        
        .menu-btn {
            background: none; border: none; color: #374151; font-size: 1.25rem;
            cursor: pointer; padding: 0.5rem; border-radius: 0.375rem;
            transition: background 0.2s;
        }
        .menu-btn:hover { background: #f3f4f6; }
        
        .dropdown {
            position: absolute; top: 100%; right: 1rem; background: #fff;
            border-radius: 0.5rem; min-width: 10rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            display: none; z-index: 1000; border: 1px solid #e5e7eb;
        }
        .dropdown.show { display: block; }
        
        .dropdown-item { 
            padding: 0.75rem 1rem; color: #374151; cursor: pointer; 
            transition: background 0.2s; font-size: 0.875rem;
        }
        .dropdown-item:hover { background: #f3f4f6; }
        
        .chat-container { 
            height: calc(100vh - 5rem); display: flex; flex-direction: column;
            padding-bottom: 5rem;
        }
        
        .messages { 
            flex: 1; padding: 1rem; overflow-y: auto; display: flex; 
            flex-direction: column; gap: 1rem;
        }
        
        .message { 
            padding: 1rem; border-radius: 0.75rem; word-wrap: break-word; 
            line-height: 1.5; max-width: 80%;
        }
        
        .message.user { 
            align-self: flex-end; background: #e5e7eb; color: #111827;
        }
        
        .message.assistant { 
            align-self: flex-start; background: #fff; color: #111827;
            border: 1px solid #e5e7eb;
        }
        
        .message-actions {
            display: flex; gap: 0.5rem; margin-top: 0.75rem; opacity: 0.7;
        }
        
        .message-actions button {
            background: #f3f4f6; border: none; color: #6b7280;
            padding: 0.375rem 0.75rem; border-radius: 0.375rem; cursor: pointer;
            font-size: 0.75rem; transition: all 0.2s;
        }
        .message-actions button:hover { background: #e5e7eb; color: #374151; }
        
        .input-area { 
            padding: 0.75rem; background: #fff; border-top: 1px solid #e5e7eb;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
        }
        
        .input-container { 
            display: flex; gap: 0.5rem; align-items: flex-end;
            background: #f9fafb; border-radius: 1.5rem; padding: 0.5rem;
            border: 1px solid #d1d5db;
        }
        
        .file-upload { 
            background: #e5e7eb; border: none; color: #6b7280; 
            width: 2.5rem; height: 2.5rem; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: background 0.2s; flex-shrink: 0;
        }
        .file-upload:hover { background: #d1d5db; }
        
        .message-input { 
            flex: 1; background: transparent; border: none; color: #111827; 
            padding: 0.75rem; outline: none; resize: none; 
            min-height: 2.5rem; max-height: 8rem; font-size: 1rem;
        }
        .message-input::placeholder { color: #9ca3af; }
        
        .send-button { 
            background: #111827; border: none; color: #fff; 
            width: 2.5rem; height: 2.5rem; border-radius: 50%;
            cursor: pointer; display: flex; align-items: center; 
            justify-content: center; transition: background 0.2s; flex-shrink: 0;
        }
        .send-button:hover { background: #374151; }
        .send-button:disabled { opacity: 0.5; cursor: not-allowed; }
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
                Hello! I'm Valor, your advanced AI assistant. I can help you with questions, analysis, writing, and much more. What would you like to explore today?
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
            
            // Immediate scroll
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Delayed scroll to ensure content is rendered
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 50);
        }
        
        function copyMessage(button) {
            const messageDiv = button.closest('.message');
            const text = messageDiv.textContent.replace(/📋 Copy🔊 Speak/g, '').trim();
            
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
            const text = messageDiv.textContent.replace(/📋 Copy🔊 Speak/g, '').trim();
            
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
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
                '<button onclick="speakMessage(this)">🔊 Speak</button>' +
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
        });
    </script>
</body>
</html>`);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Valor AI server running on port ${port}`);
});