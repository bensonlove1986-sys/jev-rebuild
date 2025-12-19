// WebSocket 连接管理

import { generateTraceId, info, debug, error } from './trace.js';
import { putKV } from './kv_store.js';
import { KV_CONFIG } from '../config/constants.js';

// WebSocket 连接映射
const connections = new Map();

// 记录连接信息
export function addConnection(connection, metadata = {}) {
  const connectionId = crypto.randomUUID();
  const traceId = generateTraceId();
  
  const connectionInfo = {
    connectionId,
    traceId,
    createdAt: Date.now(),
    metadata,
    connection
  };
  
  connections.set(connectionId, connectionInfo);
  debug('WebSocket connection added', { connectionId, traceId });
  
  // 写入 KV
  putKV(KV_CONFIG.CONNECTIONS_NAMESPACE, connectionId, {
    connectionId,
    traceId,
    createdAt: connectionInfo.createdAt,
    status: 'connected',
    metadata
  });
  
  return connectionInfo;
}

// 移除连接
export function removeConnection(connectionId) {
  const connectionInfo = connections.get(connectionId);
  if (connectionInfo) {
    connections.delete(connectionId);
    info('WebSocket connection removed', { connectionId });
    
    // 写入 KV
    putKV(KV_CONFIG.CONNECTIONS_NAMESPACE, connectionId, {
      connectionId,
      traceId: connectionInfo.traceId,
      createdAt: connectionInfo.createdAt,
      closedAt: Date.now(),
      status: 'disconnected'
    });
    
    return true;
  }
  return false;
}

// 获取连接
export function getConnection(connectionId) {
  return connections.get(connectionId);
}

// 获取所有连接
export function getAllConnections() {
  return [...connections.values()];
}

// 广播消息
export function broadcast(message) {
  let sentCount = 0;
  for (const [connectionId, connectionInfo] of connections.entries()) {
    try {
      connectionInfo.connection.send(JSON.stringify(message));
      sentCount++;
    } catch (err) {
      error('Failed to broadcast message', { connectionId, error: err.message });
      removeConnection(connectionId);
    }
  }
  debug('Broadcast message sent', { sentCount, totalConnections: connections.size });
  return sentCount;
}
