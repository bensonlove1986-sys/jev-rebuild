// Remote WebSocket test script
const WebSocket = require('ws');

// Test remote WebSocket connection
const ws = new WebSocket('wss://jev-rebuild-worker.bensonlove1986.workers.dev/api/ws/chat');

console.log('🔗 Testing remote WebSocket connection...');
console.log('📡 Connecting to:', 'wss://jev-rebuild-worker.bensonlove1986.workers.dev/api/ws/chat');

ws.on('open', function open() {
  console.log('✅ Remote WebSocket connection established');
  // Send ping message
  ws.send(JSON.stringify({ type: 'ping' }));
});

ws.on('message', function incoming(data) {
  console.log('📩 Received message from remote:', data);
  const message = JSON.parse(data);
  if (message.type === 'pong') {
    console.log('✅ Pong received, remote connection is working');
  } else if (message.type === 'connected') {
    console.log('✅ Connected message received:', message.message);
  }
});

ws.on('close', function close(code, reason) {
  console.log('❌ Remote WebSocket connection closed:', code, reason.toString());
  console.log('🔍 Error code explanation:');
  console.log('   - 1000: Normal closure');
  console.log('   - 1006: Abnormal closure (network issue or server error)');
  console.log('   - 1008: Policy violation');
  console.log('   - 1011: Internal server error');
});

ws.on('error', function error(err) {
  console.error('❌ Remote WebSocket connection error:', err);
  console.error('🔍 Error details:', err.message);
  console.error('🔍 Error stack:', err.stack);
});

// Keep the script running
setTimeout(() => {
  console.log('⏰ Test completed, closing connection');
  ws.close();
}, 10000);
