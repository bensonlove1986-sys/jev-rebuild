import { fail } from '../utils/response.js';

export function notFound(request, path) {
  console.log(`[404] Route not found: ${path}`);
  return fail(request, "NOT_FOUND", 404, { path: path });
};