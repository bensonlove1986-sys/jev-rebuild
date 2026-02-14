/**
 * Fixed Worker with Durable Objects
 * This version fixes module import issues and ensures proper export
 */

// Response utility functions
function getCorsHeaders(request) {
  const origin = (request.headers.get('Origin') || '').trim();
  const headers = new Headers();
  const corsOrigin = origin || '*';
  headers.set('Access-Control-Allow-Origin', corsOrigin);
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Credentials', 'true');
  return headers;
}

function createResponse(request, body, status = 200, additionalHeaders = {}) {
  const headers = getCorsHeaders(request);
  headers.set('Content-Type', 'application/json');
  for (const [key, value] of Object.entries(additionalHeaders)) {
    headers.set(key, value);
  }
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}

function ok(request, data, additionalHeaders = {}, status = 200) {
  return createResponse(request, {
    ok: true,
    ...data
  }, status, additionalHeaders);
}

function fail(request, error, status = 400, additionalData = {}, additionalHeaders = {}) {
  return createResponse(request, {
    ok: false,
    error,
    ...additionalData
  }, status, additionalHeaders);
}

function options(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

// WhatsAppChatDO Class
class WhatsAppChatDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.clients = new Set();
    this.processedMessageIds = new Set();
    this.customerIndex = new Map();
  }

  // Handle WebSocket connection
  handleWebSocketConnection(webSocket) {
    try {
      webSocket.accept();
      this.clients.add(webSocket);
      console.log('[MODULE_D_WS_CLIENT_CONNECTED] Total clients:', this.clients.size);
      
      webSocket.send(JSON.stringify({ 
        type: 'connected', 
        message: 'WebSocket connected successfully',
        timestamp: Date.now()
      }));
      
      webSocket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[MODULE_D_WS_CLIENT_MESSAGE]', data);
          
          if (data.type === 'ping') {
            webSocket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (error) {
          console.error('[MODULE_D_WS_PARSE_ERROR]', error);
          webSocket.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid JSON format',
            timestamp: Date.now()
          }));
        }
      });
      
      webSocket.addEventListener('close', () => {
        this.clients.delete(webSocket);
        console.log('[MODULE_D_WS_CLIENT_DISCONNECTED] Total clients:', this.clients.size);
      });
      
      webSocket.addEventListener('error', (error) => {
        console.error('[MODULE_D_WS_ERROR]', error);
        this.clients.delete(webSocket);
      });
    } catch (error) {
      console.error('[MODULE_D_WS_CONNECTION_ERROR]', error);
      try {
        webSocket.close();
      } catch (closeError) {
        console.error('[MODULE_D_WS_CLOSE_ERROR]', closeError);
      }
    }
  }

  // Broadcast message to all clients
  broadcast(message) {
    let payload;
    if (message.type) {
      payload = message;
    } else {
      payload = {
        type: 'message',
        data: message,
        timestamp: Date.now()
      };
    }
    
    const messageString = JSON.stringify(payload);
    let disconnectedClients = [];
    
    for (const client of this.clients) {
      try {
        client.send(messageString);
      } catch (error) {
        console.error('[MODULE_D_WS_SEND_ERROR]', error);
        disconnectedClients.push(client);
      }
    }
    
    for (const client of disconnectedClients) {
      this.clients.delete(client);
    }
    
    console.log('[MODULE_D_WS_BROADCAST] Message broadcasted to', this.clients.size, 'clients');
  }

  // Check if message is unique
  async isMessageUnique(payload) {
    const messageId = payload.data?.message_id;
    if (!messageId) return true;
    
    if (this.processedMessageIds.has(messageId)) {
      return false;
    }
    
    this.processedMessageIds.add(messageId);
    if (this.processedMessageIds.size > 1000) {
      const ids = Array.from(this.processedMessageIds);
      for (let i = 0; i < 500; i++) {
        this.processedMessageIds.delete(ids[i]);
      }
    }
    
    return true;
  }

  // Mark message as processed
  async markMessageAsProcessed(payload) {
    const messageId = payload.data?.message_id;
    if (messageId) {
      this.processedMessageIds.add(messageId);
    }
  }

  // Initialize in background
  async initializeInBackground() {
    try {
      console.log('[MODULE_D_BACKGROUND_INIT_START]');
      await this.initializeMessageIds();
      await this.initializeCustomerIndex();
      console.log('[MODULE_D_BACKGROUND_INIT_COMPLETE] Background initialization completed');
    } catch (error) {
      console.error('[MODULE_D_BACKGROUND_INIT_ERROR]', error);
    }
  }

  // Initialize message IDs
  async initializeMessageIds() {
    try {
      console.log('[MODULE_D_INIT_MESSAGE_IDS] Initializing message IDs');
    } catch (error) {
      console.error('[MODULE_D_INIT_MESSAGE_IDS_ERROR]', error);
    }
  }

  // Initialize customer index
  async initializeCustomerIndex() {
    try {
      console.log('[MODULE_D_INIT_CUSTOMER_INDEX] Initializing customer index');
    } catch (error) {
      console.error('[MODULE_D_INIT_CUSTOMER_INDEX_ERROR]', error);
    }
  }

  // Main fetch method
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };

    // Handle OPTIONS request
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // Handle WebSocket connection request
    if (method === 'GET' && path === '/api/ws/chat' && request.headers.get('Upgrade') === 'websocket') {
      const webSocketPair = new WebSocketPair();
      const client = webSocketPair[0];
      const server = webSocketPair[1];
      
      this.handleWebSocketConnection(server);
      
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: corsHeaders
      });
    }

    // Handle broadcast request
    if (method === 'POST' && path === '/broadcast') {
      try {
        const payload = await request.json();
        
        if (!await this.isMessageUnique(payload)) {
          console.warn('[MESSAGE_DUPLICATE] Dropping duplicate message:', payload.data?.message_id);
          return new Response('OK', {
            headers: corsHeaders
          });
        }
        
        await this.markMessageAsProcessed(payload);
        this.broadcast(payload);
        
        return new Response('OK', {
          headers: corsHeaders
        });
      } catch (error) {
        console.error('[WA_BROADCAST_ERROR]', error);
        return new Response('Broadcast Error', {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // Handle check-duplicate request
    if (method === 'POST' && path === '/check-duplicate') {
      try {
        const payload = await request.json();
        const isDuplicate = !await this.isMessageUnique(payload);
        
        console.log('[DUPLICATE_CHECK] Message ID:', payload.data?.message_id, 'is duplicate:', isDuplicate);
        
        return new Response(JSON.stringify({ duplicate: isDuplicate }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('[DUPLICATE_CHECK_ERROR]', error);
        return new Response(JSON.stringify({ duplicate: false }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Default response
    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'WhatsAppChatDO is running' 
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

// ChatMemoryDO Class
class ChatMemoryDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const body = await request.json();
    const { type, message } = body;

    let summary = await this.state.storage.get("summary") || "";
    let recent = await this.state.storage.get("recent") || [];

    if (type === "append") {
      recent.push(message);
    }

    await this.state.storage.put("summary", summary);
    await this.state.storage.put("recent", recent);

    return new Response(JSON.stringify({ summary, recent }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// JEV_STATE Class
class JEV_STATE {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') {
      return options(request);
    }

    return ok(request, {
      ok: true,
      message: "JEV_STATE is running"
    });
  }
}

// Main handleRequest function
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle OPTIONS request
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  // WebSocket chat endpoint
  if (path === '/api/ws/chat') {
    console.log('[WEBSOCKET_ROUTE_HIT]');
    try {
      const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
      const doStub = env.WHATSAPP_CHAT_DO.get(doId);
      return doStub.fetch(request);
    } catch (error) {
      console.error('[WEBSOCKET_ERROR]', error.message);
      return new Response('WebSocket connection error', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }

  // Health check endpoint
  if (method === "GET" && path === "/api/health") {
    console.log('[HEALTH_ROUTE_HIT]');
    return ok(request, {
      ok: true,
      service: "jev-rebuild-worker"
    });
  }

  // Default response
  return ok(request, {
    ok: true,
    message: "Worker is running"
  });
}

// Cloudflare Workers ES Module syntax
export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};

// Export Durable Object classes
export { WhatsAppChatDO, ChatMemoryDO, JEV_STATE };
