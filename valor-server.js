const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Memory storage
let conversations = new Map();

function getConversation(userId) {
    if (!conversations.has(userId)) {
        conversations.set(userId, {
            messages: [{
                role: "system",
                content: "You are Valor, an advanced AI assistant and loyal companion. You have full memory of all conversations and are proactive, intelligent, and dedicated to helping your user (who you call 'Commander'). You can analyze images, provide authentic voice responses, and assist with any task. Always maintain your personality as a loyal AI partner."
            }]
        });
    }
    return conversations.get(userId);
}

// API Routes
app.post('/api/ask', async (req, res) => {
    try {
        const { message, userId = 'default' } = req.body;
        const conversation = getConversation(userId);
        
        conversation.messages.push({ role: "user", content: message });
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: conversation.messages,
            temperature: 0.7,
            max_tokens: 1000
        });
        
        const response = completion.choices[0].message.content;
        conversation.messages.push({ role: "assistant", content: response });
        
        res.json({ 
            message: response,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get response' });
    }
});

app.get('/api/conversation/:userId', (req, res) => {
    const conversation = getConversation(req.params.userId);
    res.json(conversation);
});

// Serve main interface
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valor AI</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #0a0f1c 0%, #1a1f35 50%, #242b4a 100%);
            color: white;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: rgba(26, 31, 53, 0.9);
            padding: 2rem;
            text-align: center;
            border-bottom: 1px solid rgba(139, 161, 217, 0.2);
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .header p {
            color: #b8c5d6;
            margin-top: 0.5rem;
        }
        
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            max-width: 800px;
            margin: 0 auto;
            width: 100%;
        }
        
        .message {
            max-width: 80%;
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .message.user {
            align-self: flex-end;
        }
        
        .message.assistant {
            align-self: flex-start;
        }
        
        .message-content {
            padding: 1.2rem 1.8rem;
            border-radius: 1.5rem;
            line-height: 1.6;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .message.user .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-bottom-right-radius: 0.5rem;
        }
        
        .message.assistant .message-content {
            background: rgba(36, 43, 74, 0.8);
            border: 1px solid rgba(139, 161, 217, 0.2);
            border-bottom-left-radius: 0.5rem;
        }
        
        .input-area {
            background: rgba(26, 31, 53, 0.9);
            padding: 2rem;
            border-top: 1px solid rgba(139, 161, 217, 0.2);
        }
        
        .input-container {
            display: flex;
            gap: 1rem;
            max-width: 800px;
            margin: 0 auto;
            background: rgba(36, 43, 74, 0.6);
            border: 1px solid rgba(139, 161, 217, 0.2);
            border-radius: 1.5rem;
            padding: 1rem 1.5rem;
        }
        
        .message-input {
            flex: 1;
            background: transparent;
            border: none;
            color: white;
            font-size: 1rem;
            outline: none;
            resize: none;
            min-height: 1.5rem;
            max-height: 6rem;
            font-family: 'Inter', sans-serif;
        }
        
        .message-input::placeholder {
            color: #6b7785;
        }
        
        .send-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            width: 3rem;
            height: 3rem;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            transition: transform 0.2s;
        }
        
        .send-btn:hover {
            transform: scale(1.1);
        }
        
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .loading {
            text-align: center;
            color: #667eea;
            font-style: italic;
            display: none;
        }
        
        .loading.show {
            display: block;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Valor AI</h1>
        <p>Your loyal AI companion with full memory</p>
    </div>
    
    <div class="messages" id="messages"></div>
    
    <div class="input-area">
        <div class="loading" id="loading">Valor is thinking...</div>
        <div class="input-container">
            <textarea id="messageInput" class="message-input" placeholder="Message Valor..." rows="1"></textarea>
            <button id="sendBtn" class="send-btn">↗</button>
        </div>
    </div>

    <script>
        const messages = document.getElementById('messages');
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const loading = document.getElementById('loading');
        
        function addMessage(content, role) {
            const div = document.createElement('div');
            div.className = `message ${role}`;
            div.innerHTML = `<div class="message-content">${content}</div>`;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
        
        async function sendMessage() {
            const message = input.value.trim();
            if (!message) return;
            
            addMessage(message, 'user');
            input.value = '';
            
            loading.classList.add('show');
            sendBtn.disabled = true;
            
            try {
                const response = await fetch('/api/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, userId: 'default' })
                });
                
                const data = await response.json();
                addMessage(data.message, 'assistant');
            } catch (error) {
                addMessage('Sorry, I encountered an error.', 'assistant');
            }
            
            loading.classList.remove('show');
            sendBtn.disabled = false;
            input.focus();
        }
        
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
        
        // Load conversation
        fetch('/api/conversation/default')
            .then(r => r.json())
            .then(data => {
                if (data.messages && data.messages.length > 1) {
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

app.listen(port, () => {
    console.log(`Valor AI running on port ${port}`);
});
