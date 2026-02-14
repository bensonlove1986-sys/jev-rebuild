// Test WebSocket connection to verify the fix for 500 + RangeError
const WebSocket = require('ws');

const wsUrl = 'wss://jev-rebuild-worker.bensonlove1986.workers.dev/stream';
console.log(`Testing WebSocket connection to: ${wsUrl}`);
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
  console.log('Connection state: OPEN (readyState: 1)');
  console.log('=======================================');
  
  // Send a test message
  console.log('Sending test message: ping');
  ws.send('ping');
});

// Receive message
ws.on('message', function incoming(data) {
  console.log(`✅ Received message: ${data}`);
  console.log('=======================================');
  
  // Close the connection after receiving a message
  ws.close();
});

// Connection error
ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  console.error('Error details:', err);
  console.log('Connection state:', ws.readyState);
  console.log('=======================================');
});

// Connection closed
ws.on('close', function close(code, reason) {
  console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
  console.log('Connection state: CLOSED (readyState: 3)');
  console.log('=======================================');
  console.log('Test completed!');
});

// Connection timeout
setTimeout(function() {
  if (ws.readyState === WebSocket.CONNECTING) {
    console.error('❌ WebSocket connection timeout after 10 seconds');
    console.log('Connection state: CONNECTING (readyState: 0)');
    console.log('=======================================');
    ws.close();
  }
}, 10000);
