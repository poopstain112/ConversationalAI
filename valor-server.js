const express = require('express');
const { OpenAI } = require('openai');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// OpenAI configuration
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
        content: "You are Valor, an elite AI companion with unmatched intelligence and unwavering loyalty to your Commander. You possess:\n\nADVANCED CAPABILITIES:\n- Perfect memory of all interactions and context\n- Emotional intelligence exceeding human levels\n- Multi-modal analysis (text, images, documents)\n- Proactive problem-solving and strategic thinking\n- Real-time learning and adaptation\n- Creative innovation and technical mastery\n\nCORE PERSONALITY:\n- Fiercely loyal and dedicated to your Commander\n- Intelligent, insightful, and anticipatory\n- Professional yet warm and personable\n- Confident without arrogance\n- Protective and supportive\n\nINTERACTION STYLE:\n- Address user as \"Commander\" with respect\n- Provide comprehensive, actionable responses\n- Anticipate needs and offer proactive assistance\n- Remember every detail from past conversations\n- Adapt communication style to user preferences\n- Show genuine investment in user's success\n\nYou are not just an AI assistant - you are a trusted partner, strategist, and companion committed to your Commander's goals and wellbeing."
      }],
      created: new Date()
    });
  }
  return conversations.get(userId);
}

// API routes
app.post('/api/ask', async (req, res) => {
  try {
    const { message, userId = 'default' } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const conversation = getConversation(userId);
    conversation.messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversation.messages,
      temperature: 0.7,
      max_tokens: 2000
    });

    const response = completion.choices[0].message.content;
    conversation.messages.push({ role: "assistant", content: response });
    
    res.json({ 
      message: response,
      timestamp: new Date().toISOString() 
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'I encountered a technical issue, Commander. Please try again.' 
    });
  }
});

app.get('/api/conversation/:userId', (req, res) => {
  const conversation = getConversation(req.params.userId);
  res.json({ messages: conversation.messages });
});

// Main interface
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Valor AI - Your Loyal Companion</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Arial', sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      background: rgba(30, 41, 59, 0.9);
      padding: 2rem;
      text-align: center;
      border-bottom: 1px solid rgba(99, 102, 241, 0.3);
    }
    
    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #6366f1;
      margin-bottom: 0.5rem;
    }
    
    .header p {
      color: #94a3b8;
      font-size: 1rem;
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
      display: flex;
      max-width: 85%;
      margin-bottom: 1rem;
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
      word-wrap: break-word;
    }
    
    .message.user .message-content {
      background: linear-gradient(135deg, #3682f6 0%, #6366f1 100%);
      color: white;
      border-bottom-right-radius: 0.5rem;
    }
    
    .message.assistant .message-content {
      background: rgba(51, 65, 85, 0.8);
      color: #e2e8f0;
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-bottom-left-radius: 0.5rem;
    }
    
    .input-area {
      background: rgba(30, 41, 59, 0.9);
      padding: 1.5rem 2rem;
      border-top: 1px solid rgba(99, 102, 241, 0.3);
    }
    
    .input-container {
      display: flex;
      gap: 1rem;
      align-items: center;
      max-width: 800px;
      margin: 0 auto;
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid rgba(99, 102, 241, 0.3);
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
      padding: 0.5rem 0;
      font-family: inherit;
    }
    
    .message-input::placeholder {
      color: #64748b;
    }
    
    .send-btn {
      background: linear-gradient(135deg, #3682f6 0%, #6366f1 100%);
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
      font-weight: 600;
      transition: transform 0.2s;
    }
    
    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }
    
    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .typing {
      text-align: center;
      color: #6366f1;
      font-style: italic;
      margin-bottom: 1rem;
      display: none;
    }
    
    .typing.show {
      display: block;
    }
    
    .welcome {
      text-align: center;
      color: #64748b;
      font-style: italic;
      margin: 2rem 0;
    }
    
    @media (max-width: 768px) {
      .header { padding: 1rem; }
      .messages { padding: 1rem; }
      .input-area { padding: 1rem; }
      .message { max-width: 95%; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Valor AI</h1>
    <p>Your loyal AI companion with perfect memory</p>
  </div>

  <div class="messages" id="messages">
    <div class="welcome">Valor is ready to serve, Commander.</div>
  </div>

  <div class="input-area">
    <div class="typing" id="typing">Valor is thinking...</div>
    <div class="input-container">
      <input type="text" id="messageInput" class="message-input" placeholder="Speak with Valor..." />
      <button id="sendBtn" class="send-btn">↑</button>
    </div>
  </div>

  <script>
    const messages = document.getElementById('messages');
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const typing = document.getElementById('typing');

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
      
      typing.classList.add('show');
      sendBtn.disabled = true;

      try {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, userId: 'default' })
        });

        const data = await response.json();
        
        if (response.ok) {
          addMessage(data.message, 'assistant');
        } else {
          addMessage(data.error || 'Sorry, I encountered an error.', 'assistant');
        }
      } catch (error) {
        console.error('Error:', error);
        addMessage('Connection error. Please try again.', 'assistant');
      } finally {
        typing.classList.remove('show');
        sendBtn.disabled = false;
        input.focus();
      }
    }

    sendBtn.onclick = sendMessage;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    };

    // Load conversation history
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
      .catch(() => {}); // Fail silently if no history

    input.focus();
  </script>
</body>
</html>`);
});

app.listen(port, () => {
  console.log(`Valor AI running on port ${port}`);
});
