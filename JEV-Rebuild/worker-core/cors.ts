// 允许的源列表
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://jev-rebuild-worker.bensonlove1986.workers.dev',
  'https://f33ec1e2.jev-ui.pages.dev',
  'https://head.jev-ui.pages.dev',
  'https://jev-ui.pages.dev',
  'https://jevshop.bensonlove1986.workers.dev'
];

/**
 * Apply CORS headers to a response
 * @param {Request} request - The incoming request
 * @param {Response} response - The response to apply CORS headers to
 * @returns {Response} - Response with CORS headers applied
 */
export function withCORS(request, response) {
  const origin = request.headers.get('Origin');
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else {
    // 不要使用 '*'
    response.headers.delete('Access-Control-Allow-Origin');
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  
  return response;
}

/**
 * Get CORS headers object
 * @param {Request} request - The incoming request
 * @returns {Object} - CORS headers
 */
export function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  return headers;
}