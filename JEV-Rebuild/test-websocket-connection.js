// Test WebSocket connection to check if the route is hit and DO is called
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
});

// Connection error
ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  console.log('Connection state:', ws.readyState);
  console.log('=======================================');
});

// Connection closed
ws.on('close', function close(code, reason) {
  console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
  console.log('Connection state: CLOSED (readyState: 3)');
  console.log('=======================================');
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
