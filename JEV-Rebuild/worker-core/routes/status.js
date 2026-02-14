// status 路由

import { getAllConnections } from '../modules/ws_manager.js';
import { ok } from '../utils/response.js';

export const statusHandler = async (request) => {
  const connections = getAllConnections();
  
  return ok(request, {
    timestamp: Date.now(),
    connections: connections.length,
    uptime: Date.now() - globalThis.workerStartTimestamp
  });
};
