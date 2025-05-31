const express = require('express');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Valor, an advanced AI assistant created for a Commander. You are intelligent, helpful, and slightly military in tone. You have vision capabilities and can analyze images when provided.'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 1000
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            res.json({ response: data.choices[0].message.content });
        } else {
            throw new Error('Invalid API response');
        }
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'AI service temporarily unavailable' });
    }
});

app.post('/api/speak', async (req, res) => {
    try {
        const { text } = req.body;
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: 'nova',
                response_format: 'mp3'
            })
        });
        
        if (!response.ok) {
            throw new Error('TTS request failed');
        }
        
        const audioBuffer = await response.arrayBuffer();
        
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.byteLength
        });
        
        res.send(Buffer.from(audioBuffer));
        
    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'Text-to-speech failed' });
    }
});

app.post('/api/analyze-image', async (req, res) => {
    try {
        const { image } = req.body;
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + process.env.OPENAI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Valor, an advanced AI assistant with superior visual analysis capabilities. Analyze images with military precision and provide detailed, tactical assessments. Focus on identifying objects, people, locations, potential threats, opportunities, and actionable intelligence.'
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Commander, analyze this image and provide a detailed tactical assessment. What do you see?'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000
            })
        });
        
        const data = await response.json();
        
        if (data.choices && data.choices[0]) {
            res.json({ analysis: data.choices[0].message.content });
        } else {
            throw new Error('Invalid API response');
        }
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Image analysis failed' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('Valor AI with high-quality voice running on port ' + PORT);
});