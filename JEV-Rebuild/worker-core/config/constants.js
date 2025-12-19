// Worker 常量配置

// Daojie API 相关配置
export const DAOJIE_CONFIG = {
  API_BASE_URL: 'https://api.gohighlevel.com/v1',
  API_VERSION: '2021-07-28',
  ALLOWED_CHANNELS: ['SMS', 'WhatsApp', 'LiveChat'],
};

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
  DAOJIE_INBOUND: '/api/inbound/daojie',
  DAOJIE_CONVERSATIONS: '/api/daojie/conversations',
  AI_DRAFT_REPLY: '/api/ai/draft-reply',
};

// CORS 相关配置
export const CORS_CONFIG = {
  ALLOWED_ORIGINS: ['http://localhost:3000', 'https://your-ui-domain.com'],
  ALLOWED_METHODS: 'GET, POST, PUT, DELETE, OPTIONS',
  ALLOWED_HEADERS: '*',
  MAX_AGE: 86400,
};
