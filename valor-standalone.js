import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import multer from 'multer';
import { OpenAI } from 'openai';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve main page
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
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
            color: #fff; height: 100vh; display: flex; flex-direction: column;
        }
        .header { background: rgba(255,255,255,0.1); padding: 1rem; text-align: center; }
        .chat-container { flex: 1; display: flex; flex-direction: column; max-width: 800px; margin: 0 auto; padding: 1rem; }
        .messages { flex: 1; overflow-y: auto; padding: 1rem; }
        .message { margin: 1rem 0; padding: 1rem; border-radius: 10px; }
        .user { background: #2563eb; margin-left: 20%; }
        .assistant { background: rgba(255,255,255,0.1); margin-right: 20%; }
        .input-area { display: flex; gap: 1rem; padding: 1rem; }
        .input-area input { flex: 1; padding: 1rem; border-radius: 25px; border: none; background: rgba(255,255,255,0.1); color: #fff; }
        .input-area button { padding: 1rem 2rem; border-radius: 25px; border: none; background: #2563eb; color: #fff; cursor: pointer; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Valor AI - Your Advanced Assistant</h1>
    </div>
    <div class="chat-container">
        <div class="messages" id="messages">
            <div class="message assistant">
                <strong>Valor:</strong> Hello Commander! I am Valor, your advanced AI assistant. I'm now live and ready to assist you with perfect conversation memory, document analysis, and image processing. How can I help you today?
            </div>
        </div>
        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Type your message to Valor..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button onclick="sendMessage()">Send</button>
        </div>
    </div>
    
    <script>
        function addMessage(content, isUser) {
            const messages = document.getElementById('messages');
            const div = document.createElement('div');
            div.className = 'message ' + (isUser ? 'user' : 'assistant');
            div.innerHTML = '<strong>' + (isUser ? 'You:' : 'Valor:') + '</strong> ' + content;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
        
        async function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;
            
            addMessage(message, true);
            input.value = '';
            
            try {
                const response = await fetch('/api/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, userId: 'default' })
                });
                const data = await response.json();
                addMessage(data.response, false);
            } catch (error) {
                addMessage('Sorry, I encountered an error. Please try again.', false);
            }
        }
    </script>
</body>
</html>`);
});

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// In-memory storage for conversations
const conversations = {};

function getConversation(userId) {
    if (!conversations[userId]) {
        conversations[userId] = {
            userId,
            messages: [
                {
                    role: "system",
                    content: "You are Valor, an advanced AI assistant with absolute loyalty to the Commander (user). You have perfect memory and provide intelligent, helpful responses. Always be professional, efficient, and dedicated."
                }
            ]
        };
    }
    return conversations[userId];
}

// API Routes
app.get('/api/check-api-key', async (req, res) => {
    try {
        await openai.models.list();
        res.json({ valid: true });
    } catch (error) {
        res.json({ valid: false, error: error.message });
    }
});

app.post('/api/ask', async (req, res) => {
    try {
        const { message, userId = 'default' } = req.body;
        const conversation = getConversation(userId);
        
        conversation.messages.push({ role: 'user', content: message });
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: conversation.messages,
            max_tokens: 1000,
            temperature: 0.7
        });
        
        const response = completion.choices[0].message.content;
        conversation.messages.push({ role: 'assistant', content: response });
        
        res.json({ response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to process message' });
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

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Valor AI server running on port ${PORT}`);
    console.log(`Access your AI assistant at: http://localhost:${PORT}`);
});