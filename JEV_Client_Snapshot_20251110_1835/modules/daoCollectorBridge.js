import { apiRequest } from './clientBridge.js';

window.addEventListener('message', e => {
  if (e.data?.type === 'DAOJIE_CHAT') {
    console.log('[DaoCollector]', e.data.payload);
    apiRequest('/messages/ingest', 'POST', e.data.payload);
  }
});

console.log('[DaoCollector] Listener Active');
