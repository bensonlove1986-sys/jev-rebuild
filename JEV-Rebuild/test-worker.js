// Minimal WebSocket test worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Handle WebSocket connections
  if (url.pathname === '/stream' && request.headers.get('Upgrade') === 'websocket') {
    console.log('[TEST_WORKER] Handling WebSocket connection to /stream');
    
    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    
    // Accept the connection
    server.accept();
    console.log('[TEST_WORKER] Accepted WebSocket connection');
    
    // Add message handler
    server.addEventListener('message', event => {
      console.log('[TEST_WORKER] Received message:', event.data);
      server.send(event.data);
      console.log('[TEST_WORKER] Echoed message:', event.data);
    });
    
    // Add close handler
    server.addEventListener('close', event => {
      console.log('[TEST_WORKER] WebSocket closed:', event.code, event.reason);
    });
    
    // Add error handler
    server.addEventListener('error', event => {
      console.error('[TEST_WORKER] WebSocket error:', event.error);
    });
    
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };
    
    // Return the WebSocket response
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: corsHeaders
    });
  }
  
  // Handle other requests
  return new Response('Test worker is running', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
