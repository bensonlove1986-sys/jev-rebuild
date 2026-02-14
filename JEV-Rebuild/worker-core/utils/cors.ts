export function applyCorsHeaders(headers: Headers, origin: string) {
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
}