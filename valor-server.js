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
    <title>Valor AI</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            --bg-primary: #0a0f1c;
            --bg-secondary: #1a1f35;
            --bg-tertiary: #242b4a;
            --text-primary: #ffffff;
            --text-secondary: #b8c5d6;
            --text-muted: #6b7785;
            --border-color: rgba(139, 161, 217, 0.15);
            --shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            --shadow-xl: 0 35px 60px -12px rgba(0, 0, 0, 0.6);
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            background-image: 
                radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.1) 0%, transparent 50%);
            color: var(--text-primary);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .header {
            background: rgba(26, 31, 53, 0.95);
            backdrop-filter: blur(20px);
            padding: 2rem;
            border-bottom: 1px solid var(--border-color);
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: var(--primary-gradient);
        }
        
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            text-align: center;
        }
        
        .header h1 {
            font-size: 3rem;
            font-weight: 700;
            background: var(--primary-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
        }
        
        .header p {
            color: var(--text-secondary);
            font-size: 1.1rem;
            font-weight: 400;
            opacity: 0.9;
        }
        
        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 3rem 2rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
            max-width: 1000px;
            margin: 0 auto;
            width: 100%;
        }
        
        .messages-container::-webkit-scrollbar {
            width: 6px;
        }
        
        .messages-container::-webkit-scrollbar-track {
            background: rgba(139, 161, 217, 0.1);
            border-radius: 3px;
        }
        
        .messages-container::-webkit-scrollbar-thumb {
            background: var(--primary-gradient);
            border-radius: 3px;
        }
        
        .message {
            display: flex;
            max-width: 85%;
            animation: messageSlide 0.4s ease-out;
        }
        
        @keyframes messageSlide {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .message.user {
            align-self: flex-end;
            margin-left: auto;
        }
        
        .message.assistant {
            align-self: flex-start;
        }
        
        .message-bubble {
            padding: 1.5rem 2rem;
            border-radius: 2rem;
            position: relative;
            word-wrap: break-word;
            line-height: 1.7;
            font-size: 1rem;
            box-shadow: var(--shadow-lg);
            backdrop-filter: blur(10px);
        }
        
        .message.user .message-bubble {
            background: var(--primary-gradient);
            color: white;
            border-bottom-right-radius: 0.75rem;
            margin-left: 2rem;
        }
        
        .message.assistant .message-bubble {
            background: rgba(36, 43, 74, 0.8);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            border-bottom-left-radius: 0.75rem;
            margin-right: 2rem;
        }
        
        .message-actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 1rem;
            opacity: 0.8;
        }
        
        .action-btn {
            background: rgba(139, 161, 217, 0.1);
            border: 1px solid rgba(139, 161, 217, 0.2);
            color: var(--text-secondary);
            padding: 0.5rem 1rem;
            border-radius: 1rem;
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            font-weight: 500;
        }
        
        .action-btn:hover {
            background: rgba(139, 161, 217, 0.2);
            color: var(--text-primary);
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(139, 161, 217, 0.15);
        }
        
        .input-area {
            background: rgba(26, 31, 53, 0.95);
            backdrop-filter: blur(20px);
            padding: 2rem;
            border-top: 1px solid var(--border-color);
            position: relative;
        }
        
        .input-area::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: var(--primary-gradient);
        }
        
        .input-container {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
            background: rgba(36, 43, 74, 0.8);
            border: 1px solid var(--border-color);
            border-radius: 2rem;
            padding: 1.25rem 1.5rem;
            max-width: 1000px;
            margin: 0 auto;
            box-shadow: var(--shadow-xl);
            backdrop-filter: blur(15px);
        }
        
        .message-input {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-size: 1.1rem;
            resize: none;
            outline: none;
            min-height: 1.5rem;
            max-height: 8rem;
            font-family: 'Inter', sans-serif;
            font-weight: 400;
            line-height: 1.6;
        }
        
        .message-input::placeholder {
            color: var(--text-muted);
            font-weight: 400;
        }
        
        .send-btn {
            background: var(--primary-gradient);
            border: none;
            color: white;
            width: 3.5rem;
            height: 3.5rem;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
            transition: all 0.3s ease;
            flex-shrink: 0;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
            font-weight: 600;
        }
        
        .send-btn:hover {
            transform: scale(1.05) translateY(-2px);
            box-shadow: 0 12px 35px rgba(102, 126, 234, 0.6);
        }
        
        .send-btn:active {
            transform: scale(0.95);
        }
        
        .send-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
        }
        
        .loading {
            display: none;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-secondary);
            font-style: italic;
            margin-bottom: 1.5rem;
            font-weight: 500;
            text-align: center;
            justify-content: center;
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
            background: var(--primary-gradient);
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
            0%, 80%, 100% { 
                transform: scale(0.8); 
                opacity: 0.5; 
            }
            40% { 
                transform: scale(1.1); 
                opacity: 1; 
            }
        }
        
        .welcome-message {
            text-align: center;
            color: var(--text-muted);
            margin: 3rem 0;
            font-style: italic;
            font-size: 1.1rem;
            font-weight: 400;
        }
        
        @media (max-width: 768px) {
            .header {
                padding: 1.5rem 1rem;
            }
            
            .header h1 {
                font-size: 2.5rem;
            }
            
            .messages-container {
                padding: 2rem 1rem;
                gap: 1.5rem;
            }
            
            .message {
                max-width: 95%;
            }
            
            .message-bubble {
                padding: 1.25rem 1.5rem;
                font-size: 0.95rem;
            }
            
            .input-area {
                padding: 1.5rem 1rem;
            }
            
            .input-container {
                padding: 1rem 1.25rem;
            }
            
            .message-input {
                font-size: 1rem;
            }
            
            .send-btn {
                width: 3rem;
                height: 3rem;
                font-size: 1.2rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <h1>Valor AI</h1>
            <p>Your advanced AI companion with full memory and unwavering loyalty</p>
        </div>
    </div>
    
    <div class="messages-container" id="messages">
        <div class="welcome-message">
            Valor is ready to serve, Commander.
        </div>
    </div>
    
    <div class="input-area">
        <div class="loading" id="loading">
            <span>Valor is processing</span>
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
                placeholder="Share your thoughts with Valor..."
                rows="1"
            ></textarea>
            <button id="sendBtn" class="send-btn">↗</button>
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
                    addMessage('I encountered a technical issue. Please try again.', 'assistant');
                }
            } catch (error) {
                console.error('Error:', error);
                addMessage('Connection error. Please check your network and try again.', 'assistant');
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
            navigator.clipboard.writeText(text).then(() => {
                const original = btn.innerHTML;
                btn.innerHTML = '✅ Copied';
                setTimeout(() => btn.innerHTML = original, 2000);
            });
        }
        
        // Speak message
        function speakMessage(btn) {
            const bubble = btn.closest('.message-bubble');
            const text = bubble.childNodes[0].textContent.trim();
            
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.9;
                utterance.pitch = 1;
                speechSynthesis.speak(utterance);
                
                const original = btn.innerHTML;
                btn.innerHTML = '🔊 Speaking';
                utterance.onend = () => btn.innerHTML = original;
                utterance.onerror = () => btn.innerHTML = original;
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
        setTimeout(() => messageInput.focus(), 100);
    </script>
</body>
</html>`;
    res.send(html);
});

app.listen(port, () => {
    console.log(`Valor AI server running on port ${port}`);
});
