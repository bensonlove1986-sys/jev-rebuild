// 统一 API_BASE 获取函数
import { JEV_RUNTIME } from '../core/jev_runtime_config';

export const getApiBase = () => {
  if (window.__API_BASE__) return window.__API_BASE__;
  return JEV_RUNTIME.WORKER_ORIGIN;
};

// 导出默认 API_BASE
export const API_BASE = getApiBase();