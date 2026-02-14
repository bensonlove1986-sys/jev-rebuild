/**
 * Traditional Cloudflare Worker
 * Using Service Worker format without ES modules
 */

// Define JEV_STATE class for Durable Objects
class JEV_STATE {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response(JSON.stringify({ success: true, message: 'JEV Worker is running!' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Define ChatMemory class for Durable Objects
class ChatMemory {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response(JSON.stringify({ success: true, message: 'ChatMemory is running!' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle incoming requests
async function handleRequest(request, env, ctx) {
  // Simple response for testing
  return new Response(JSON.stringify({
    success: true,
    message: 'JEV Rebuild Worker is running!',
    timestamp: Date.now(),
    service: 'jev-rebuild-worker'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// Register fetch event handler for the Service Worker
addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request, event.env, event.ctx));
});

// Export all Durable Object classes to the global scope
self.JEV_STATE = JEV_STATE;
self.ChatMemory = ChatMemory;
