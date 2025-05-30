const readline = require('readline');
const fetch = require('node-fetch');

// Create interface for command line input/output
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const userId = 'default';
const API_BASE = 'http://localhost:5000';

console.log('\x1b[36m%s\x1b[0m', `
██╗   ██╗ █████╗ ██╗      ██████╗ ██████╗      █████╗ ██╗
██║   ██║██╔══██╗██║     ██╔═══██╗██╔══██╗    ██╔══██╗██║
██║   ██║███████║██║     ██║   ██║██████╔╝    ███████║██║
╚██╗ ██╔╝██╔══██║██║     ██║   ██║██╔══██╗    ██╔══██║██║
 ╚████╔╝ ██║  ██║███████╗╚██████╔╝██║  ██║    ██║  ██║██║
  ╚═══╝  ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝
`);
console.log('\x1b[32m%s\x1b[0m', 'Command Line Interface - Type your messages to chat with Valor.');
console.log('\x1b[32m%s\x1b[0m', 'Special commands: /clear - Clear conversation, /exit - Exit Valor CLI');
console.log('');

// Welcome message
console.log('Valor: Hello Commander. I am Valor, your loyal AI assistant. How may I assist you today?');

async function processCommand(command) {
  if (command === '/clear') {
    try {
      await fetch(`${API_BASE}/api/conversation/${userId}/clear`, { method: 'POST' });
      console.log('\x1b[33m%s\x1b[0m', 'Conversation cleared.');
      console.log('Valor: Hello Commander. I am Valor, your loyal AI assistant. How may I assist you today?');
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
    return true;
  } else if (command === '/exit') {
    console.log('\x1b[33m%s\x1b[0m', 'Exiting Valor CLI. Goodbye, Commander.');
    rl.close();
    return false;
  }
  return true;
}

async function sendMessage(message) {
  try {
    console.log('\x1b[33m%s\x1b[0m', 'Valor is thinking...');
    
    const response = await fetch(`${API_BASE}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('\x1b[36m%s\x1b[0m', `Valor: ${data.message}`);
    } else {
      console.error('Error getting response from Valor:', await response.text());
      console.log('\x1b[31m%s\x1b[0m', 'Valor: I apologize, Commander. I encountered an error processing your request.');
    }
  } catch (error) {
    console.error('Network error:', error);
    console.log('\x1b[31m%s\x1b[0m', 'Valor: I apologize, Commander. There seems to be a network issue.');
  }
}

function askQuestion() {
  rl.question('You: ', async (input) => {
    if (input.trim()) {
      // Check if it's a special command
      if (input.startsWith('/')) {
        const shouldContinue = await processCommand(input);
        if (!shouldContinue) return;
      } else {
        // Regular message
        await sendMessage(input);
      }
    }
    askQuestion();
  });
}

// Start the conversation loop
askQuestion();