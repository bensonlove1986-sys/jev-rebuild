// Test WebSocket connection to the test worker's /stream endpoint
const WebSocket = require('ws');

const wsUrl = 'wss://jev-test-worker.bensonlove1986.workers.dev/stream';
console.log(`Testing WebSocket connection to test worker: ${wsUrl}`);
console.log('=======================================');

// Create a WebSocket client
const ws = new WebSocket(wsUrl, {
  timeout: 10000,
  headers: {
    'Origin': 'http://localhost:3000'
  }
});

// Connection opened
ws.on('open', function open() {
  console.log('✅ WebSocket connection successful!');
  console.log('Connection state: OPEN');
  
  // Send a test message
  const message = 'Hello from Node.js!';
  ws.send(message);
  console.log(`✅ Test message sent: ${message}`);
});

// Receive message
ws.on('message', function incoming(data) {
  console.log(`✅ Received message: ${data}`);
  
  // Close the connection after receiving a message
  ws.close();
});

// Connection error
ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  console.error('Error details:', err);
});

// Connection closed
ws.on('close', function close(code, reason) {
  console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
  console.log('=======================================');
  console.log('Test completed');
});

// Connection timeout
setTimeout(function() {
  if (ws.readyState === WebSocket.CONNECTING) {
    console.error('❌ WebSocket connection timeout after 10 seconds');
    ws.close();
  }
}, 10000);
