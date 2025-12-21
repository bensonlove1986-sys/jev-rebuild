/**
 * 安全的fetch封装，用于处理API请求
 * 避免"Unexpected token < / W / JSON parse error"
 */

/**
 * ⚠️ JEV API 路由稳定护栏
 * 任何功能修复不得绕过 resolveApiUrl
 * 只允许通过 API_MODE 切换行为
 * 未经授权禁止修改此文件结构
 */

// 唯一全局开关（⚠️ 之后任何人、任何修复，只允许改这一行）
const API_MODE = "HYBRID";  
// 可选值：PROD | LOCAL | HYBRID

// 生产Worker地址
const PROD_API = "https://jev-rebuild-worker.bensonlove1986.workers.dev";

// 统一API路径解析函数（禁止拆分）
function resolveApiUrl(url) {
  if (!url.startsWith("/api/")) return url;

  if (API_MODE === "PROD") {
    return PROD_API + url;
  }

  if (API_MODE === "LOCAL") {
    return url; // 全走 Vite → localhost
  }

  // HYBRID（当前默认生产模式）
  if (url.startsWith("/api/translate")) {
    return url; // 翻译只走本地
  }

  return PROD_API + url; // 其它全部走生产
}

export async function fetchJsonSafe(url, options = {}) {
  try {
    // 强制通过resolveApiUrl发请求
    const finalUrl = resolveApiUrl(url);
    console.log(`[FETCH_REQUEST] ${finalUrl}`);
    
    const res = await fetch(finalUrl, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });
    
    console.log(`[FETCH_RESPONSE] ${url} status=${res.status}`);
    
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    console.log(`[FETCH_CONTENT_TYPE] ${url} ct=${ct}`);
    
    if (ct.includes('application/json')) {
      const data = await res.json().catch(async (jsonError) => {
        console.error(`[JSON_PARSE_ERROR] ${url} error=${jsonError.message}`);
        const text = await res.text().catch(() => '');
        console.error(`[JSON_PARSE_ERROR_BODY] ${url} body=${text.slice(0, 200)}`);
        throw new Error(`JSON_PARSE_FAIL status=${res.status} body=${text.slice(0, 200)}`);
      });
      
      if (!res.ok) {
        console.error(`[HTTP_ERROR] ${url} status=${res.status} data=${JSON.stringify(data).slice(0, 200)}`);
        throw new Error(`HTTP_${res.status} ${JSON.stringify(data).slice(0, 200)}`);
      }
      
      console.log(`[FETCH_SUCCESS] ${url} data=${JSON.stringify(data).slice(0, 200)}`);
      return { ok: true, status: res.status, data };
    } else {
      const text = await res.text().catch(() => '');
      console.error(`[NON_JSON_RESPONSE] ${url} status=${res.status} body=${text.slice(0, 200)}`);
      throw new Error(`NON_JSON status=${res.status} body=${text.slice(0, 200)}`);
    }
  } catch (error) {
    console.error(`[FETCH_ERROR] ${url} error=${error.message}`);
    throw error;
  }
}
