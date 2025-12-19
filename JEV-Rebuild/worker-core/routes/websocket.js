// WebSocket 路由

import { addConnection, removeConnection } from '../modules/ws_manager.js';
import { generateTraceId, info, debug } from '../modules/trace.js';
import { putKV } from '../modules/kv_store.js';
import { KV_CONFIG } from '../config/constants.js';

export const websocketHandler = async (request) => {
  // 强制冻结 WebSocket 连接
  return new Response('WS disabled by freeze', { status: 410 });
  
  // 以下代码已被冻结，不会执行
  // 检查是否为 WebSocket 请求
  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('Expected Upgrade: websocket', {
      status: 426,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }

  // 接受 WebSocket 连接
  const { 0: client, 1: server } = new WebSocketPair();
  
  // 添加连接到管理器
  const connectionInfo = addConnection(server, {
    userAgent: request.headers.get('User-Agent') || '',
    remoteAddress: request.headers.get('X-Forwarded-For') || 'unknown'
  });
  
  const { connectionId, traceId } = connectionInfo;
  
  // 处理 WebSocket 事件
  server.addEventListener('message', async (event) => {
    try {
      // 生成消息 trace_id
      const messageTraceId = generateTraceId();
      debug('WebSocket message received', {
        connectionId,
        traceId: messageTraceId,
        messageSize: event.data.length
      });
      
      // 解析消息
      let messageData = event.data;
      if (typeof messageData === 'string') {
        try {
          messageData = JSON.parse(messageData);
        } catch (e) {
          // 保持原样
        }
      }
      
      // 附加 trace_id 并返回
      const response = {
        originalMessage: messageData,
        traceId: messageTraceId,
        connectionId,
        timestamp: Date.now()
      };
      
      server.send(JSON.stringify(response));
      debug('WebSocket message sent', {
        connectionId,
        traceId: messageTraceId
      });
      
      // 写入消息到 KV
      await putKV(KV_CONFIG.MESSAGES_NAMESPACE, connectionId + ':' + Date.now(), {
        connectionId,
        traceId: messageTraceId,
        timestamp: Date.now(),
        message: messageData,
        direction: 'received'
      });
    } catch (error) {
      info('WebSocket message error', {
        connectionId,
        traceId,
        error: error.message
      });
      server.send(JSON.stringify({
        error: 'Internal server error',
        traceId
      }));
    }
  });
  
  // 处理连接关闭
  server.addEventListener('close', () => {
    removeConnection(connectionId);
  });
  
  // 处理连接错误
  server.addEventListener('error', (error) => {
    info('WebSocket error', {
      connectionId,
      traceId,
      error: error.message
    });
    removeConnection(connectionId);
  });
  
  // 返回 WebSocket 响应
  return new Response(null, {
    status: 101,
    webSocket: client
  });
};
