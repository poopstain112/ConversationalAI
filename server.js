const express = require('express');
const multer = require('multer');
const { OpenAI } = require('openai');

const app = express();
const port = 5000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const conversations = new Map();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

app.get('/api/check-api-key', (req, res: any) => {
    res.json({ valid: !!process.env.OPENAI_API_KEY });
});

app.get('/api/conversation/:userId', (req: any, res: any) => {
    const userId = req.params.userId;
    const conversation = conversations.get(userId) || { userId, messages: [] };
    res.json(conversation);
});

app.post('/api/conversation/:userId/clear', (req: any, res: any) => {
    const userId = req.params.userId;
    conversations.set(userId, { userId, messages: [] });
    res.json({ success: true });
});

app.post('/api/chat', upload.single('image'), async (req: any, res: any) => {
    try {
        const { message, userId = 'default' } = req.body;
        
        let conversation = conversations.get(userId) || { userId, messages: [] };
        
        conversation.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });
        
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        const messages = [
            {
                role: 'system',
                content: 'You are Valor, an advanced AI assistant with a core value of absolute loyalty and dedication to the Commander (user). You are helpful, knowledgeable, and speak with confidence. Keep responses concise but informative. Address the user as "Commander" when appropriate.'
            },
            ...conversation.messages.map((msg: any) => ({
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

app.get('/', (req: any, res: any) => {
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
            background: #f7f7f8; height: 100vh; display: flex; flex-direction: column;
        }
        
        .header {
            background: #fff; padding: 1rem; display: flex; align-items: center; 
            justify-content: space-between; border-bottom: 1px solid #e5e7eb;
            flex-shrink: 0;
        }
        
        .logo { font-size: 1.25rem; font-weight: 600; color: #111827; }
        
        .menu-btn {
            background: none; border: none; color: #374151; font-size: 1.25rem;
            cursor: pointer; padding: 0.5rem; border-radius: 0.375rem;
            transition: background 0.2s; position: relative;
        }
        .menu-btn:hover { background: #f3f4f6; }
        
        .dropdown {
            position: absolute; top: 100%; right: 0; background: #fff;
            border-radius: 0.5rem; min-width: 10rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: none; z-index: 1000; border: 1px solid #e5e7eb;
        }
        .dropdown.show { display: block; }
        
        .dropdown-item { 
            padding: 0.75rem 1rem; color: #374151; cursor: pointer; 
            transition: background 0.2s; font-size: 0.875rem;
        }
        .dropdown-item:hover { background: #f3f4f6; }
        
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
            padding: 1rem; background: #fff; border-top: 1px solid #e5e7eb;
            flex-shrink: 0;
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
            <button class="menu-btn" id="menuBtn">⋮</button>
            <div class="dropdown" id="dropdown">
                <div class="dropdown-item" id="clearChat">Clear Chat</div>
                <div class="dropdown-item" id="openCamera">📹 Camera</div>
                <div class="dropdown-item" id="bluetoothConnect">🔵 Bluetooth</div>
                <div class="dropdown-item" id="toggleVoiceMode">🎤 Voice Mode</div>
                <div class="dropdown-item" id="checkStatus">API Status</div>
                <div class="dropdown-item" id="exportChat">Export Chat</div>
            </div>
        </div>
    </div>
    
    <div class="messages" id="messages">
        <div class="message assistant">
            Hello! I'm Valor, your advanced AI assistant. I can help you with questions, analysis, writing, and much more. What would you like to explore today?
            <div class="message-actions">
                <button onclick="copyMessage(this)">📋 Copy</button>
                <button onclick="speakMessage(this)">🔊 Speak</button>
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
            ></textarea>
            <button id="sendButton" class="send-button">↑</button>
        </div>
    </div>

    <script>
        console.log('Valor AI JavaScript loaded');
        
        let selectedFile = null;
        
        // Menu functionality
        document.getElementById('menuBtn').addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('dropdown');
            dropdown.classList.toggle('show');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function() {
            document.getElementById('dropdown').classList.remove('show');
        });
        
        // File input
        document.getElementById('fileInput').addEventListener('change', function(e) {
            selectedFile = e.target.files[0];
            console.log('File selected:', selectedFile?.name);
        });
        
        // Send button
        document.getElementById('sendButton').addEventListener('click', sendMessage);
        
        // Enter key
        document.getElementById('messageInput').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Menu items
        document.getElementById('clearChat').addEventListener('click', clearChat);
        document.getElementById('openCamera').addEventListener('click', openCamera);
        document.getElementById('bluetoothConnect').addEventListener('click', connectBluetooth);
        document.getElementById('toggleVoiceMode').addEventListener('click', toggleVoiceMode);
        document.getElementById('checkStatus').addEventListener('click', checkStatus);
        document.getElementById('exportChat').addEventListener('click', exportChat);
        
        let voiceModeActive = false;
        let recognition = null;
        
        async function sendMessage() {
            console.log('Send message called');
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
            console.log('Adding message:', content);
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
            
            // Force immediate scroll
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Multiple scroll attempts for reliability
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 10);
            
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 100);
            
            setTimeout(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }, 300);
            
            // Use requestAnimationFrame for smooth scrolling
            requestAnimationFrame(() => {
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            });
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
                
                // Wait for voices to load
                const speakWithVoice = () => {
                    const voices = window.speechSynthesis.getVoices();
                    const utterance = new SpeechSynthesisUtterance(text);
                    
                    // Look for better female voices (avoid robotic ones)
                    const preferredVoice = voices.find(voice => 
                        (voice.name.includes('Female') || 
                         voice.name.includes('Samantha') ||
                         voice.name.includes('Victoria') ||
                         voice.name.includes('Karen') ||
                         voice.name.includes('Zira')) &&
                        voice.lang.startsWith('en')
                    ) || voices.find(voice => 
                        voice.name.includes('Google') && 
                        voice.lang.startsWith('en') && 
                        voice.name.includes('female')
                    ) || voices.find(voice => 
                        voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')
                    );
                    
                    if (preferredVoice) {
                        utterance.voice = preferredVoice;
                    }
                    
                    utterance.rate = 0.85;
                    utterance.pitch = 1.0;
                    utterance.volume = 0.9;
                    
                    window.speechSynthesis.speak(utterance);
                    
                    const originalText = button.innerHTML;
                    button.innerHTML = '🔇 Stop';
                    utterance.onend = () => {
                        button.innerHTML = originalText;
                    };
                };
                
                if (window.speechSynthesis.getVoices().length === 0) {
                    window.speechSynthesis.addEventListener('voiceschanged', speakWithVoice, { once: true });
                } else {
                    speakWithVoice();
                }
            }
        }
        
        async function openCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' }, 
                    audio: false 
                });
                
                // Create video element for camera feed
                const video = document.createElement('video');
                video.srcObject = stream;
                video.autoplay = true;
                video.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:#000;';
                
                // Create capture button
                const captureBtn = document.createElement('button');
                captureBtn.innerHTML = '📸 Capture';
                captureBtn.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);z-index:10000;padding:1rem 2rem;background:#111;color:#fff;border:none;border-radius:2rem;font-size:1.1rem;cursor:pointer;';
                
                // Create close button
                const closeBtn = document.createElement('button');
                closeBtn.innerHTML = '✕';
                closeBtn.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:10000;padding:0.5rem;background:#111;color:#fff;border:none;border-radius:50%;font-size:1.5rem;cursor:pointer;width:3rem;height:3rem;';
                
                document.body.appendChild(video);
                document.body.appendChild(captureBtn);
                document.body.appendChild(closeBtn);
                
                // Capture functionality
                captureBtn.addEventListener('click', () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    
                    canvas.toBlob(blob => {
                        selectedFile = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
                        addMessage('Camera image captured - ready to analyze', true);
                        
                        // Clean up
                        stream.getTracks().forEach(track => track.stop());
                        document.body.removeChild(video);
                        document.body.removeChild(captureBtn);
                        document.body.removeChild(closeBtn);
                    }, 'image/jpeg', 0.8);
                });
                
                // Close functionality
                closeBtn.addEventListener('click', () => {
                    stream.getTracks().forEach(track => track.stop());
                    document.body.removeChild(video);
                    document.body.removeChild(captureBtn);
                    document.body.removeChild(closeBtn);
                });
                
            } catch (error) {
                console.error('Camera access error:', error);
                addMessage('Camera access denied. Please enable camera permissions in your browser settings.', false);
            }
            document.getElementById('dropdown').classList.remove('show');
        }
        
        async function connectBluetooth() {
            try {
                if (!navigator.bluetooth) {
                    addMessage('Bluetooth not supported on this device.', false);
                    document.getElementById('dropdown').classList.remove('show');
                    return;
                }
                
                const device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: ['battery_service', 'device_information']
                });
                
                addMessage('Bluetooth device connected: ' + device.name, false);
                console.log('Connected to Bluetooth device:', device.name);
                
                // Store device reference for future use
                window.connectedBluetoothDevice = device;
                
            } catch (error) {
                console.error('Bluetooth connection error:', error);
                addMessage('Bluetooth connection failed. Make sure device is in pairing mode.', false);
            }
            document.getElementById('dropdown').classList.remove('show');
        }
        
        function toggleVoiceMode() {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                addMessage('Voice recognition not supported on this device.', false);
                document.getElementById('dropdown').classList.remove('show');
                return;
            }
            
            if (voiceModeActive) {
                // Turn off voice mode
                if (recognition) {
                    recognition.stop();
                }
                voiceModeActive = false;
                document.getElementById('toggleVoiceMode').innerHTML = '🎤 Voice Mode';
                addMessage('Voice mode deactivated.', false);
            } else {
                // Turn on voice mode
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognition = new SpeechRecognition();
                
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';
                
                recognition.onstart = () => {
                    voiceModeActive = true;
                    document.getElementById('toggleVoiceMode').innerHTML = '🔴 Voice Active';
                    addMessage('Voice mode activated. Say "Hey Valor" to start conversation.', false);
                };
                
                recognition.onresult = (event) => {
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        }
                    }
                    
                    if (finalTranscript) {
                        const lowercaseTranscript = finalTranscript.toLowerCase();
                        if (lowercaseTranscript.includes('hey valor') || lowercaseTranscript.includes('valor')) {
                            const message = finalTranscript.replace(/hey valor|valor/gi, '').trim();
                            if (message.length > 0) {
                                document.getElementById('messageInput').value = message;
                                sendMessage();
                            }
                        }
                    }
                };
                
                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    addMessage('Voice recognition error: ' + event.error, false);
                };
                
                recognition.onend = () => {
                    if (voiceModeActive) {
                        recognition.start(); // Restart recognition
                    }
                };
                
                recognition.start();
            }
            
            document.getElementById('dropdown').classList.remove('show');
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
            document.getElementById('dropdown').classList.remove('show');
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
            document.getElementById('dropdown').classList.remove('show');
        }
        
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
            document.getElementById('dropdown').classList.remove('show');
        }
        
        // Focus input on load
        window.addEventListener('load', function() {
            document.getElementById('messageInput').focus();
        });
        
        console.log('All event listeners attached');
    </script>
</body>
</html>`);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Valor AI server running on port ${port}`);
});