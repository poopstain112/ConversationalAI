import readline from 'readline';
import fetch from 'node-fetch';

// Create interface for command line input/output
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const userId = 'default';

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

async function sendPostRequest(path, data) {
  try {
    const response = await fetch(`http://localhost:5000${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    return await response.json();
  } catch (error) {
    console.error('Network error in POST request:', error);
    throw error;
  }
}

async function sendGetRequest(path) {
  try {
    const response = await fetch(`http://localhost:5000${path}`);
    return await response.json();
  } catch (error) {
    console.error('Network error in GET request:', error);
    throw error;
  }
}

async function processCommand(command) {
  if (command === '/clear') {
    try {
      await sendPostRequest(`/api/conversation/${userId}/clear`, {});
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
    
    const data = await sendPostRequest('/api/ask', { message, userId });
    
    if (data && data.message) {
      console.log('\x1b[36m%s\x1b[0m', `Valor: ${data.message}`);
    } else {
      console.error('Error: Unexpected response format');
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