// trace_id / 日志模块

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
