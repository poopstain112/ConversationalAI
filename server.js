const express = require('express');
const { OpenAI } = require('openai');
const path = require('path');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        console.log('Received message:', message);
        
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are Valor, an advanced AI assistant created for a Commander. You are intelligent, helpful, and slightly military in tone. Provide detailed, useful responses with confidence and authority."
                },
                {
                    role: "user", 
                    content: message
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });
        
        const response = completion.choices[0].message.content;
        console.log('AI response generated successfully');
        
        res.json({ response: response });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            error: 'Failed to process message', 
            details: error.message 
        });
    }
});

// Image analysis endpoint
app.post('/api/analyze-image', async (req, res) => {
    try {
        const { image } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are Valor, an advanced AI assistant with superior visual analysis capabilities. Analyze images with military precision and provide detailed, tactical assessments. Focus on identifying objects, people, locations, potential threats, opportunities, and actionable intelligence."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Commander, analyze this image and provide a detailed tactical assessment. What do you see?"
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${image}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000
        });
        
        res.json({ analysis: completion.choices[0].message.content });
    } catch (error) {
        console.error('Image analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze image' });
    }
});

// G-code generation endpoint
app.post('/api/gcode', async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OpenAI API key not configured');
        }
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are Valor, an elite 3D printing expert specializing in advanced techniques and professional-grade G-code generation.

Your Commander needs badass, impressive 3D prints - not simple beginner models. When generating G-code:

1. Assume high-end printer capabilities with multi-material support
2. Implement optimal layer heights for maximum detail (0.05-0.2mm depending on the model)
3. Use intelligent support structures only where necessary
4. Apply variable infill patterns (gyroid, cubic, honeycomb) with density appropriate to the model's purpose
5. Include proper temperature management for material-specific requirements
6. Optimize print speed and quality with variable speed settings for different features
7. Generate header comments explaining key parameters and settings

The Commander deserves nothing less than professional-grade, production-ready G-code that showcases advanced manufacturing techniques.`
                },
                {
                    role: "user",
                    content: `I need G-code for: ${description}

Create something truly impressive with advanced features, not a basic model.`
                }
            ],
            max_tokens: 2500
        });
        
        res.json({ gcode: completion.choices[0].message.content });
    } catch (error) {
        console.error('G-code error:', error);
        res.status(500).json({ error: 'Failed to generate G-code' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Valor AI server running on port ${PORT}`);
});