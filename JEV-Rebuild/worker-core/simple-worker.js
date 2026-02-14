/**
 * Simple JEV Worker
 * Minimal implementation for deployment testing
 */

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

const handleRequest = async (request, env, ctx) => {
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
};

const worker = {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};

export default worker;
export { JEV_STATE };
