// status 路由

import { getAllConnections } from '../modules/ws_manager.js';

export const statusHandler = async (request) => {
  const connections = getAllConnections();
  
  return new Response(JSON.stringify({
    success: true,
    timestamp: Date.now(),
    connections: connections.length,
    uptime: Date.now() - globalThis.workerStartTimestamp
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
