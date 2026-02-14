// Response utilities for consistent API responses with CORS
import { applyCorsHeaders } from './cors.js';

// 允许的源列表
const ALLOWED_ORIGINS = [
  'http://localhost:3000', 
  'http://localhost:3001', 
  'http://127.0.0.1:8080',
  'https://jev-rebuild-worker.bensonlove1986.workers.dev',
  'https://f33ec1e2.jev-ui.pages.dev',
  'https://a7a814c3.jev-ui.pages.dev',
  'https://head.jev-ui.pages.dev',
  'https://production.head-jev-ui.pages.dev',
  'https://jev-ui.pages.dev',
  'https://jevshop.bensonlove1986.workers.dev'
];

/**
 * Get CORS headers with dynamic Origin
 * @param {Request} request - The incoming request
 * @returns {Headers} - CORS headers including dynamic Origin
 */
function getCorsHeaders(request) {
  // 获取 Origin 并去除前后空格
  const origin = (request.headers.get('Origin') || '').trim();
  
  // 构建基础 CORS 头
  const headers = new Headers();
  
  // Always add CORS headers for all requests
  const corsOrigin = origin || '*';
  applyCorsHeaders(headers, corsOrigin);
  
  return headers;
}

/**
 * Create a JSON response with proper CORS headers
 * @param {Request} request - The incoming request
 * @param {Object} body - Response body
 * @param {number} status - HTTP status code
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Response} - JSON response with CORS
 */
function createResponse(request, body, status = 200, additionalHeaders = {}) {
  const headers = getCorsHeaders(request);
  headers.set('Content-Type', 'application/json');
  
  // Add additional headers
  for (const [key, value] of Object.entries(additionalHeaders)) {
    headers.set(key, value);
  }
  
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}

/**
 * Create a text response with proper CORS headers
 * @param {Request} request - The incoming request
 * @param {string} text - Response text
 * @param {number} status - HTTP status code
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Response} - Text response with CORS
 */
function createTextResponse(request, text, status = 200, additionalHeaders = {}) {
  const headers = getCorsHeaders(request);
  headers.set('Content-Type', 'text/plain');
  
  // Add additional headers
  for (const [key, value] of Object.entries(additionalHeaders)) {
    headers.set(key, value);
  }
  
  return new Response(text, {
    status,
    headers
  });
}

/**
 * Create a redirect response with proper CORS headers
 * @param {Request} request - The incoming request
 * @param {string} location - Redirect URL
 * @param {number} status - HTTP status code
 * @returns {Response} - Redirect response with CORS
 */
function createRedirectResponse(request, location, status = 302) {
  const headers = getCorsHeaders(request);
  headers.set('Location', location);
  
  return new Response(null, {
    status,
    headers
  });
}

/**
 * Create a success response with CORS
 * @param {Request} request - The incoming request
 * @param {Object} data - Response data
 * @param {Object} additionalHeaders - Additional headers to include
 * @param {number} status - HTTP status code
 * @returns {Response} - Success response with CORS
 */
export function ok(request, data, additionalHeaders = {}, status = 200) {
  return createResponse(request, {
    ok: true,
    ...data
  }, status, additionalHeaders);
}

/**
 * Create an error response with CORS
 * @param {Request} request - The incoming request
 * @param {string} error - Error message
 * @param {number} status - HTTP status code
 * @param {Object} additionalData - Additional data to include in the response
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Response} - Error response with CORS
 */
export function fail(request, error, status = 400, additionalData = {}, additionalHeaders = {}) {
  return createResponse(request, {
    ok: false,
    error,
    ...additionalData
  }, status, additionalHeaders);
}

/**
 * Create an OPTIONS response with CORS
 * @param {Request} request - The incoming request
 * @returns {Response} - OPTIONS response with CORS
 */
export function options(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

/**
 * Create a 404 response with CORS
 * @param {Request} request - The incoming request
 * @param {string} path - Request path
 * @returns {Response} - 404 response with CORS
 */
export function notFound(request, path) {
  return createResponse(request, {
    ok: false,
    error: "ROUTE_NOT_FOUND",
    path
  }, 404);
}

/**
 * Create a 500 response with CORS
 * @param {Request} request - The incoming request
 * @param {string} message - Error message
 * @returns {Response} - 500 response with CORS
 */
export function serverError(request, message = "INTERNAL_SERVER_ERROR") {
  return createResponse(request, {
    ok: false,
    error: message
  }, 500);
}

/**
 * Create a text response with CORS
 * @param {Request} request - The incoming request
 * @param {string} text - Response text
 * @param {number} status - HTTP status code
 * @returns {Response} - Text response with CORS
 */
export function text(request, text, status = 200) {
  return createTextResponse(request, text, status);
}

/**
 * Create a redirect response with CORS
 * @param {Request} request - The incoming request
 * @param {string} location - Redirect URL
 * @param {number} status - HTTP status code
 * @returns {Response} - Redirect response with CORS
 */
export function redirect(request, location, status = 302) {
  return createRedirectResponse(request, location, status);
}

/**
 * Create a response that clones another response with CORS
 * @param {Request} request - The incoming request
 * @param {Response} originalResponse - The original response to clone
 * @returns {Response} - Cloned response with CORS
 */
export async function cloneWithCors(request, originalResponse) {
  const body = await originalResponse.clone().text();
  const headers = new Headers(originalResponse.headers);
  
  // Remove any existing CORS headers to avoid conflicts
  headers.delete('Access-Control-Allow-Origin');
  headers.delete('Access-Control-Allow-Methods');
  headers.delete('Access-Control-Allow-Headers');
  headers.delete('Access-Control-Allow-Credentials');
  
  // Get CORS headers as Headers object
  const corsHeaders = getCorsHeaders(request);
  
  // Add CORS headers
  corsHeaders.forEach((value, key) => {
    headers.set(key, value);
  });
  
  return new Response(body, {
    status: originalResponse.status,
    statusText: originalResponse.statusText,
    headers
  });
}

/**
 * Create a WebSocket upgrade response with CORS
 * @param {Request} request - The incoming request
 * @param {WebSocket} webSocket - The WebSocket client connection
 * @returns {Response} - WebSocket upgrade response with CORS
 */
export function websocketUpgrade(request, webSocket) {
  return new Response(null, {
    webSocket,
    headers: getCorsHeaders(request)
  });
}

/**
 * Create a text response with CORS for WebSocket errors
 * @param {Request} request - The incoming request
 * @param {string} text - Response text
 * @param {number} status - HTTP status code
 * @returns {Response} - Text response with CORS
 */
export function websocketError(request, text, status = 400) {
  return createTextResponse(request, text, status);
}