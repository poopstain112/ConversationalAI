const express = require('express');
const { Configuration, OpenAIApi } = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// OpenAI Configuration
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

// Memory storage
let conversations = new Map();

function getConversation(userId) {
    if (!conversations.has(userId)) {
        conversations.set(userId, {
            messages: [{
                role: "system",
                content: "You are Valor, an advanced AI assistant and loyal companion. You have full memory of all conversations and are proactive, intelligent, and dedicated to helping your user (who you call 'Commander'). You can analyze images, provide authentic voice responses, and assist with any task. Always maintain your personality as a loyal AI partner."
            }],
            personality: {
                name: "Valor",
                traits: ["loyal", "intelligent", "proactive", "dedicated"],
                relationship: "AI companion and partner"
            }
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
        
        const completion = await openai.createChatCompletion({
            model: "gpt-4o",
            messages: conversation.messages,
            temperature: 0.7,
            max_tokens: 1000
        });
        
        const response = completion.data.choices[0].message.content;
        conversation.messages.push({ role: "assistant", content: response });
        
        res.json({ 
            message: response,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('OpenAI API error:', error);
        res.status(500).json({ error: 'Failed to get response from Valor' });
    }
});

app.get('/api/conversation/:userId', (req, res) => {
    const conversation = getConversation(req.params.userId);
    res.json(conversation);
});

// Serve main interface
app.get('/', (req, res) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Valor AI - Your Loyal Companion</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(10px);
            padding: 1.5rem;
            border-bottom: 1px solid rgba(99, 102, 241, 0.3);
            text-align: center;
        }
        
        .header h1 {
            font-size: 1.8rem;
            font-weight: 700;
            color: #6366f1;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            color: #94a3b8;
            font-size: 0.9rem;
        }
        
        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            min-height: 0;
        }
        
        .message {
            display: flex;
            max-width: 80%;
            margin-bottom: 1rem;
        }
        
        .message.user {
            align-self: flex-end;
            margin-left: auto;
        }
        
        .message.assistant {
            align-self: flex-start;
        }
        
        .message-bubble {
            padding: 1rem 1.5rem;
            border-radius: 1.5rem;
            position: relative;
            word-wrap: break-word;
            line-height: 1.6;
        }
        
        .message.user .message-bubble {
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
            color: white;
            border-bottom-right-radius: 0.5rem;
        }
        
        .message.assistant .message-bubble {
            background: rgba(51, 65, 85, 0.8);
            border: 1px solid rgba(99, 102, 241, 0.2);
            color: #e2e8f0;
            border-bottom-left-radius: 0.5rem;
        }
        
        .message-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.75rem;
            opacity: 0.8;
        }
        
        .action-btn {
            background: rgba(99, 102, 241, 0.2);
            border: 1px solid rgba(99, 102, 241, 0.3);
            color: #a5b4fc;
            padding: 0.4rem 0.8rem;
            border-radius: 0.5rem;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .action-btn:hover {
            background: rgba(99, 102, 241, 0.3);
            color: #c7d2fe;
        }
        
        .input-area {
            background: rgba(30, 41, 59, 0.9);
            backdrop-filter: blur(10px);
            padding: 1.5rem;
            border-top: 1px solid rgba(99, 102, 241, 0.3);
            flex-shrink: 0;
        }
        
        .input-container {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
            background: rgba(51, 65, 85, 0.5);
            border: 1px solid rgba(99, 102, 241, 0.3);
            border-radius: 1.5rem;
            padding: 1rem;
            max-width: 100%;
        }
        
        .message-input {
            flex: 1;
            background: transparent;
            border: none;
            color: white;
            font-size: 1rem;
            resize: none;
            outline: none;
            min-height: 1.5rem;
            max-height: 8rem;
            font-family: inherit;
        }
        
        .message-input::placeholder {
            color: #64748b;
        }
        
        .send-btn {
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
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
            transition: all 0.2s ease;
            flex-shrink: 0;
        }
        
        .send-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }
        
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        
        .loading {
            display: none;
            align-items: center;
            gap: 0.5rem;
            color: #6366f1;
            font-style: italic;
            margin-bottom: 1rem;
        }
        
        .loading.show {
            display: flex;
        }
        
        .typing-indicator {
            display: flex;
            gap: 0.25rem;
        }
        
        .typing-dot {
            width: 0.5rem;
            height: 0.5rem;
            background: #6366f1;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
        }
        
        .welcome-message {
            text-align: center;
            color: #64748b;
            margin: 2rem 0;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Valor AI</h1>
        <p>Your advanced AI partner with full memory and loyalty</p>
    </div>
    
    <div class="messages-container" id="messages">
        <div class="welcome-message">
            Valor is ready to assist you, Commander.
        </div>
    </div>
    
    <div class="input-area">
        <div class="loading" id="loading">
            <span>Valor is thinking</span>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
        <div class="input-container">
            <textarea 
                id="messageInput" 
                class="message-input" 
                placeholder="Ask anything..."
                rows="1"
            ></textarea>
            <button id="sendBtn" class="send-btn">↑</button>
        </div>
    </div>

    <script>
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const loading = document.getElementById('loading');
        
        // Load conversation history
        async function loadConversation() {
            try {
                const response = await fetch('/api/conversation/default');
                if (response.ok) {
                    const conversation = await response.json();
                    if (conversation.messages && conversation.messages.length > 1) {
                        messagesContainer.innerHTML = '';
                        conversation.messages.slice(1).forEach(msg => {
                            addMessage(msg.content, msg.role);
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading conversation:', error);
            }
        }
        
        // Add message to UI
        function addMessage(content, role) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${role}`;
            
            let messageHTML = `
                <div class="message-bubble">
                    ${content}
            `;
            
            if (role === 'assistant') {
                messageHTML += `
                    <div class="message-actions">
                        <button class="action-btn" onclick="copyMessage(this)">📋 Copy</button>
                        <button class="action-btn" onclick="speakMessage(this)">🔊 Speak</button>
                    </div>
                `;
            }
            
            messageHTML += '</div>';
            messageDiv.innerHTML = messageHTML;
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Send message
        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;
            
            // Add user message
            addMessage(message, 'user');
            messageInput.value = '';
            
            // Show loading
            loading.classList.add('show');
            sendBtn.disabled = true;
            
            try {
                const response = await fetch('/api/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, userId: 'default' })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    addMessage(data.message, 'assistant');
                } else {
                    addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
                }
            } catch (error) {
                console.error('Error:', error);
                addMessage('Sorry, I encountered an error connecting to my systems.', 'assistant');
            } finally {
                loading.classList.remove('show');
                sendBtn.disabled = false;
                messageInput.focus();
            }
        }
        
        // Copy message
        function copyMessage(btn) {
            const bubble = btn.closest('.message-bubble');
            const text = bubble.childNodes[0].textContent.trim();
            navigator.clipboard.writeText(text);
            
            const original = btn.innerHTML;
            btn.innerHTML = '✅ Copied';
            setTimeout(() => btn.innerHTML = original, 2000);
        }
        
        // Speak message
        function speakMessage(btn) {
            const bubble = btn.closest('.message-bubble');
            const text = bubble.childNodes[0].textContent.trim();
            
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                speechSynthesis.speak(utterance);
                
                const original = btn.innerHTML;
                btn.innerHTML = '🔊 Playing';
                utterance.onend = () => btn.innerHTML = original;
            }
        }
        
        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 128) + 'px';
        });
        
        // Send on Enter
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Send button click
        sendBtn.addEventListener('click', sendMessage);
        
        // Load conversation on page load
        loadConversation();
        
        // Focus input on load
        messageInput.focus();
    </script>
</body>
</html>`;
    res.send(html);
});

app.listen(port, () => {
    console.log(`Valor AI server running on port ${port}`);
});
