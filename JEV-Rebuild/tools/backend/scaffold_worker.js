#!/usr/bin/env node
// Worker 目录与模块生成工具

import fs from 'fs';
import path from 'path';

// 定义目录路径
const WORKER_CORE_DIR = 'D:/PDF转网页/JEV-Rebuild/worker-core';
const ROUTES_DIR = path.join(WORKER_CORE_DIR, 'routes');
const MODULES_DIR = path.join(WORKER_CORE_DIR, 'modules');
const CONFIG_DIR = path.join(WORKER_CORE_DIR, 'config');

console.log('=== Worker Scaffolding Tool ===');

// 确保目录存在
function ensureDirectory(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    } else {
      console.log(`✓ Directory already exists: ${dir}`);
    }
  } catch (error) {
    console.error(`✗ Failed to create directory ${dir}:`, error.message);
    process.exit(1);
  }
}

// 写入文件
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Created file: ${filePath}`);
  } catch (error) {
    console.error(`✗ Failed to create file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// 主函数
function main() {
  // 创建目录结构
  console.log('\n1. Creating directory structure...');
  ensureDirectory(WORKER_CORE_DIR);
  ensureDirectory(ROUTES_DIR);
  ensureDirectory(MODULES_DIR);
  ensureDirectory(CONFIG_DIR);

  // 生成配置文件
  console.log('\n2. Generating configuration files...');
  const constantsContent = `// Worker 常量配置

// WebSocket 相关配置
export const WS_CONFIG = {
  CONNECTION_TIMEOUT: 30000,
  MESSAGE_MAX_SIZE: 1024 * 1024, // 1MB
};

// KV 相关配置
export const KV_CONFIG = {
  CONNECTIONS_NAMESPACE: 'CONNECTIONS',
  MESSAGES_NAMESPACE: 'MESSAGES',
};

// 日志相关配置
export const LOG_CONFIG = {
  LEVEL: 'info',
  MAX_LENGTH: 500,
};

// 路由配置
export const ROUTES = {
  PING: '/api/ping',
  STATUS: '/api/status',
  WEBSOCKET: '/api/ws',
};
`;
  writeFile(path.join(CONFIG_DIR, 'constants.js'), constantsContent);

  // 生成模块文件
  console.log('\n3. Generating module files...');
  
  // trace.js - trace_id / 日志模块
  const traceContent = `// trace_id / 日志模块

import { LOG_CONFIG } from '../config/constants.js';

// 生成 trace_id
export function generateTraceId() {
  return crypto.randomUUID();
}

// 记录日志
export function log(level, message, metadata = {}) {
  if (LOG_CONFIG.LEVEL === 'debug' || (LOG_CONFIG.LEVEL === 'info' && level !== 'debug')) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...metadata
    };
    console.log(JSON.stringify(logEntry));
  }
}

// 记录调试日志
export function debug(message, metadata = {}) {
  log('debug', message, metadata);
}

// 记录信息日志
export function info(message, metadata = {}) {
  log('info', message, metadata);
}

// 记录错误日志
export function error(message, metadata = {}) {
  log('error', message, metadata);
}
`;
  writeFile(path.join(MODULES_DIR, 'trace.js'), traceContent);

  // kv_store.js - KV 读写模块
  const kvStoreContent = `// KV 读写模块

import { KV_CONFIG } from '../config/constants.js';
import { error, debug } from './trace.js';

// 写入 KV
export async function putKV(namespace, key, value, options = {}) {
  try {
    const kvNamespace = getKVNamespace(namespace);
    await kvNamespace.put(key, typeof value === 'object' ? JSON.stringify(value) : value, options);
    debug('KV put success', { namespace, key });
    return true;
  } catch (err) {
    error('KV put failed', { namespace, key, error: err.message });
    return false;
  }
}

// 读取 KV
export async function getKV(namespace, key, options = {}) {
  try {
    const kvNamespace = getKVNamespace(namespace);
    const value = await kvNamespace.get(key, options);
    debug('KV get success', { namespace, key, found: !!value });
    return value;
  } catch (err) {
    error('KV get failed', { namespace, key, error: err.message });
    return null;
  }
}

// 删除 KV
export async function deleteKV(namespace, key) {
  try {
    const kvNamespace = getKVNamespace(namespace);
    await kvNamespace.delete(key);
    debug('KV delete success', { namespace, key });
    return true;
  } catch (err) {
    error('KV delete failed', { namespace, key, error: err.message });
    return false;
  }
}

// 获取 KV 命名空间
function getKVNamespace(namespace) {
  // 在 Cloudflare Worker 中，KV 命名空间通过环境变量访问
  // 这里使用全局对象模拟，实际部署时会被替换
  if (globalThis[namespace]) {
    return globalThis[namespace];
  }
  
  // 开发环境模拟 KV
  debug('Using mock KV for namespace', { namespace });
  return {
    async put(key, value) {
      debug('Mock KV put', { namespace, key, value });
    },
    async get(key) {
      debug('Mock KV get', { namespace, key });
      return null;
    },
    async delete(key) {
      debug('Mock KV delete', { namespace, key });
    }
  };
}
`;
  writeFile(path.join(MODULES_DIR, 'kv_store.js'), kvStoreContent);

  // ws_manager.js - WebSocket 连接管理
  const wsManagerContent = `// WebSocket 连接管理

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
`;
  writeFile(path.join(MODULES_DIR, 'ws_manager.js'), wsManagerContent);

  // 生成路由文件
  console.log('\n4. Generating route files...');
  
  // ping.js
  const pingContent = `// ping 路由

export const pingHandler = async (request) => {
  return new Response(JSON.stringify({
    success: true,
    timestamp: Date.now(),
    message: 'pong'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
`;
  writeFile(path.join(ROUTES_DIR, 'ping.js'), pingContent);

  // status.js
  const statusContent = `// status 路由

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
`;
  writeFile(path.join(ROUTES_DIR, 'status.js'), statusContent);

  // websocket.js
  const websocketContent = `// WebSocket 路由

import { addConnection, removeConnection } from '../modules/ws_manager.js';
import { generateTraceId, info, debug } from '../modules/trace.js';
import { putKV } from '../modules/kv_store.js';
import { KV_CONFIG } from '../config/constants.js';

export const websocketHandler = async (request) => {
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
`;
  writeFile(path.join(ROUTES_DIR, 'websocket.js'), websocketContent);

  // 生成 index.js
  console.log('\n5. Generating index.js...');
  const indexContent = `// Worker 入口文件 - 只做路由注册

import { ROUTES } from './config/constants.js';
import { pingHandler } from './routes/ping.js';
import { statusHandler } from './routes/status.js';
import { websocketHandler } from './routes/websocket.js';
import { info } from './modules/trace.js';

// 记录 Worker 启动时间
globalThis.workerStartTimestamp = Date.now();

// 路由映射
const routeMap = new Map();
routeMap.set(ROUTES.PING, { handler: pingHandler, methods: ['GET'] });
routeMap.set(ROUTES.STATUS, { handler: statusHandler, methods: ['GET'] });
routeMap.set(ROUTES.WEBSOCKET, { handler: websocketHandler, methods: ['GET'] });

// 处理请求
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 查找路由
  const route = routeMap.get(path);
  if (route) {
    // 检查方法
    if (!route.methods.includes(request.method)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed',
        allowedMethods: route.methods
      }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 处理请求
    return route.handler(request);
  }
  
  // 404
  return new Response(JSON.stringify({
    success: false,
    error: 'Not found'
  }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// 添加 CORS 处理
function handleCors(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  return null;
}

// Worker 入口
export default {
  async fetch(request) {
    // 处理 CORS
    const corsResponse = handleCors(request);
    if (corsResponse) {
      return corsResponse;
    }
    
    try {
      return await handleRequest(request);
    } catch (error) {
      info('Unhandled error', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
`;
  writeFile(path.join(WORKER_CORE_DIR, 'index.js'), indexContent);

  // 生成 package.json
  const packageJsonContent = `{
  "name": "jev-worker-core",
  "version": "1.0.0",
  "description": "JEV Worker Core - Cloudflare Modules Worker",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "preview": "wrangler preview"
  },
  "keywords": ["worker", "cloudflare", "websocket"],
  "author": "",
  "license": "MIT"
}
`;
  writeFile(path.join(WORKER_CORE_DIR, 'package.json'), packageJsonContent);

  // 生成 wrangler.toml
  const wranglerTomlContent = `name = "jev-worker-core"
type = "module"

[[kv_namespaces]]
binding = "CONNECTIONS"
id = "" # 填写实际的 KV 命名空间 ID
preview_id = "" # 填写预览环境的 KV 命名空间 ID

[[kv_namespaces]]
binding = "MESSAGES"
id = "" # 填写实际的 KV 命名空间 ID
preview_id = "" # 填写预览环境的 KV 命名空间 ID

route = "" # 填写实际的路由
zone_id = "" # 填写实际的区域 ID

compatibility_date = "2025-12-14"
compatibility_flags = ["nodejs_compat"]
`;
  writeFile(path.join(WORKER_CORE_DIR, 'wrangler.toml'), wranglerTomlContent);

  console.log('\n=== Worker Scaffolding Completed ===');
  console.log('所有 Worker 文件已成功生成！');
  console.log('\n生成的文件结构：');
  console.log(`${WORKER_CORE_DIR}/`);
  console.log(`├─ index.js              # 只做路由注册`);
  console.log(`├─ package.json          # 项目配置`);
  console.log(`├─ wrangler.toml         # Wrangler 配置`);
  console.log(`├─ routes/`);
  console.log(`│  ├─ ping.js           # ping 路由`);
  console.log(`│  ├─ status.js         # 状态路由`);
  console.log(`│  └─ websocket.js      # WebSocket 路由`);
  console.log(`├─ modules/`);
  console.log(`│  ├─ trace.js          # trace_id / 日志模块`);
  console.log(`│  ├─ kv_store.js       # KV 读写模块`);
  console.log(`│  └─ ws_manager.js     # WebSocket 连接管理`);
  console.log(`└─ config/`);
  console.log(`   └─ constants.js      # 常量配置`);
}

// 执行主函数
console.log('Executing main function...');
main();

export { main };