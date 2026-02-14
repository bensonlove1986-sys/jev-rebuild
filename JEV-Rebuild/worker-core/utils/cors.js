// CORS utilities for consistent API responses
export function applyCorsHeaders(headers, origin) {
  headers.set('Access-Control-Allow-Origin', origin);
  if (origin !== '*') {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  headers.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
}