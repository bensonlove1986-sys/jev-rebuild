// Health and Status endpoint

// 导入统一响应工具
import { ok } from '../utils/response.js';

// Local BUILD_ID with timestamp - matches index.js pattern
const BUILD_TIME = Date.now();
const BUILD_ID = `jev-rebuild-${BUILD_TIME}`;

export async function handleHealth(request, env) {
  // 部署启动自检
  const ENV_STATUS = {
    deepseek: !!env.DEEPSEEK_API_KEY,
    pit: !!env.PIT_JWT,
    location: !!env.DAIJIE_LOCATION_ID
  };
  console.log("[ENV_BOOT_CHECK]", ENV_STATUS);

  return ok(request, {
    "service": "jev-rebuild-worker",
    "build_id": BUILD_ID,
    "build_time": new Date().toISOString(),
    "env_loaded": true,
    "runtime": {
      kv_bound: !!env.MESSAGES_KV,
      now: Date.now()
    },
    "env_status": ENV_STATUS,
    "world_fingerprint": "PROD_WORKER_V1" // 世界指纹 - 必须与UI匹配
  }, {
    'X-World-Fingerprint': 'PROD_WORKER_V1' // 添加自定义header
  });
};

// World Lock 3: Health Fingerprint Lock (HTTP layer)
export async function handleWorldCheck(request) {
  return ok(request, {
    build_id: BUILD_ID,
    build_time: new Date().toISOString(),
    entry: "worker-core/index.js",
    now: Date.now(),
    "world": "PROD_WORKER_V1" // 世界指纹 - 必须与UI匹配
  });
};