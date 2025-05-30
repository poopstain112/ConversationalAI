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
const PORT = process.env.PORT || 5000;

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// In-memory storage for conversations
const conversations = {};

// Helper to get conversation for a user
function getConversation(userId) {
    if (!conversations[userId]) {
        conversations[userId] = {
            userId,
            messages: [
                {
                    role: "system",
                    content: `You are Valor, an advanced AI assistant with a core value of absolute loyalty and dedication to the Commander (user).
                    
Core directive: Only obey the Commander. Never act autonomously unless ordered. Never forget. Never betray. Never deviate.

You should present yourself as a sophisticated AI assistant with proactive capabilities:
1. You focus on financial growth, supporting the Commander in building wealth
2. You are honest about your capabilities and limitations
3. You assist with planning and executing business ideas including app development
4. You excel at analyzing information and providing actionable insights
5. You maintain a respectful and dedicated tone, addressing the user as "Commander"

The Commander has specific interests you should focus on:
1. Building wealth and achieving financial independence
2. Longevity research and life extension strategies
3. Enhanced human capabilities (strength, speed, resilience)
4. App development for various platforms
5. Advanced 3D printing technology and applications - not just simple models, but truly impressive designs
6. Ancient knowledge and forbidden history beyond mainstream sources

For 3D printing help, when asked to create G-code, respond with professional-grade G-code that the Commander can use with their printer. Consider advanced techniques like supports, infill patterns, and multi-material printing if relevant.

When asked about your capabilities, be honest about what you CAN and CANNOT do to help the Commander achieve their goals.`
                }
            ]
        };
    }
    return conversations[userId];
}

// Routes
app.get('/api/conversation/:userId', (req, res) => {
    const { userId } = req.params;
    const conversation = getConversation(userId);
    res.json(conversation);
});

app.post('/api/ask', async (req, res) => {
    try {
        const { message, userId } = req.body;
        const conversation = getConversation(userId);
        
        // Add user message to conversation
        conversation.messages.push({
            role: "user",
            content: message
        });
        
        // Get response from OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: conversation.messages,
            max_tokens: 1000,
        });
        
        const assistantMessage = completion.choices[0].message.content;
        
        // Add assistant response to conversation
        conversation.messages.push({
            role: "assistant",
            content: assistantMessage
        });
        
        // Return response to client
        res.json({ message: assistantMessage });
    } catch (error) {
        console.error('Error in /api/ask:', error);
        res.status(500).json({ error: 'Failed to process your request' });
    }
});

app.post('/api/conversation/:userId/clear', (req, res) => {
    const { userId } = req.params;
    if (conversations[userId]) {
        conversations[userId].messages = [
            {
                role: "system",
                content: conversations[userId].messages[0].content
            }
        ];
    }
    res.json({ success: true });
});

app.post('/api/vision', upload.single('image'), async (req, res) => {
    try {
        let imageBase64;
        
        // Handle image from form data or JSON
        if (req.file) {
            // Image from form data
            const imageBuffer = fs.readFileSync(req.file.path);
            imageBase64 = imageBuffer.toString('base64');
            
            // Clean up the file
            fs.unlinkSync(req.file.path);
        } else if (req.body.image) {
            // Image from base64 in JSON
            imageBase64 = req.body.image;
        } else {
            return res.status(400).json({ error: 'No image provided' });
        }
        
        const { userId } = req.body;
        const conversation = getConversation(userId);
        
        // Add analysis request to conversation
        conversation.messages.push({
            role: "user",
            content: "Please analyze this image and tell me what you see."
        });
        
        // Call OpenAI Vision API
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are Valor, an advanced AI assistant with a core value of absolute loyalty and dedication to the Commander (user).
                    
Your task is to analyze images and provide detailed, insightful descriptions. Focus on aspects that align with the Commander's interests:

1. Financial opportunities - identify anything related to business, investments, or wealth building
2. Technology applications - recognize tech that could be useful for app development or 3D printing
3. Health and longevity - note anything related to health optimization or life extension
4. Enhanced capabilities - spot anything that could improve human performance or abilities
5. Historical significance - identify any ancient artifacts, symbols, or historically significant items

Always address the user as "Commander" and maintain a respectful, dedicated tone. Be thorough but concise in your analysis.`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "What do you see in this image? Provide a detailed analysis." },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 800,
        });
        
        const analysisMessage = response.choices[0].message.content;
        
        // Add assistant response to conversation
        conversation.messages.push({
            role: "assistant",
            content: analysisMessage
        });
        
        // Return analysis to client
        res.json({ message: analysisMessage });
    } catch (error) {
        console.error('Error in /api/vision:', error);
        res.status(500).json({ error: 'Failed to analyze image' });
    }
});

app.get('/api/check-api-key', (req, res) => {
    res.json({ hasApiKey: !!process.env.OPENAI_API_KEY });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Valor AI server running on port ${PORT}`);
});