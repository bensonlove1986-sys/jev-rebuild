// JEV Runtime Configuration
// 唯一配置源，禁止任何地方再次 hardcode 或 replace URL
export const JEV_RUNTIME = {
  WORKER_ORIGIN: "https://jev-rebuild-worker.bensonlove1986.workers.dev",
  API_BASE: "https://jev-rebuild-worker.bensonlove1986.workers.dev",
  WS_BASE: "wss://jev-rebuild-worker.bensonlove1986.workers.dev/stream",
  MEDIA_PROXY: "/api/media/r2",
  REMOTE_WORKER_ORIGIN: "https://jev-rebuild-worker.bensonlove1986.workers.dev",
  REMOTE_API_BASE: "https://jev-rebuild-worker.bensonlove1986.workers.dev",
};

// 运行时锁定验证
export function validateRuntimeConfig() {
  console.log('[JEv_RUNTIME_LOCKED] WORKER_ORIGIN=', JEV_RUNTIME.WORKER_ORIGIN);
  console.log('[URL_BUILD_SAFE] Using runtime config');
  console.log('[NO_GUESS_MODE_ENABLED]');
  
  // 验证所有配置项
  const requiredFields = ['WORKER_ORIGIN', 'API_BASE', 'WS_BASE', 'MEDIA_PROXY'];
  for (const field of requiredFields) {
    if (!JEV_RUNTIME[field]) {
      throw new Error(`Missing required runtime configuration: ${field}`);
    }
  }
  
  return true;
}

// 导出默认配置
export default JEV_RUNTIME;

// 导出获取运行时配置的函数
export function getJevRuntimeConfig() {
  validateRuntimeConfig();
  return {
    workerOrigin: JEV_RUNTIME.WORKER_ORIGIN,
    apiBase: JEV_RUNTIME.API_BASE,
    wsBase: JEV_RUNTIME.WS_BASE
  };
}