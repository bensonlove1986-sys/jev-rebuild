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
  // 只允许真实的 KV 命名空间，禁止任何模拟或回退
  if (globalThis[namespace]) {
    return globalThis[namespace];
  }
  
  // 禁止 KV miss，直接抛出错误
  throw new Error(`KV namespace ${namespace} not found`);
}
