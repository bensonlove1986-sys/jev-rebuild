// KV 读写模块

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
