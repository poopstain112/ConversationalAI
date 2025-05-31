const express = require('express');
const app = express();

app.use(express.json());
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
                        content: 'You are Valor, an advanced AI assistant created for a Commander. You are intelligent, helpful, and slightly military in tone.'
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('Valor AI running on port ' + PORT);
});