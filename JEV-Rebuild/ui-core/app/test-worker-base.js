// Test script to check WORKER_BASE value
import { WORKER_BASE } from './config/constants.js';

console.log('[TEST] WORKER_BASE:', WORKER_BASE);
console.log('[TEST] WORKER_BASE length:', WORKER_BASE.length);
console.log('[TEST] WORKER_BASE includes itself:', WORKER_BASE.includes(WORKER_BASE + WORKER_BASE));

// Test URL construction
const url = `${WORKER_BASE}/api/inbox/customers`;
console.log('[TEST] Constructed URL:', url);
console.log('[TEST] URL includes double base:', url.includes(WORKER_BASE + WORKER_BASE));
