// 简化版测试 Worker，只包含 Media Proxy 功能

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  
  // Twilio MediaUrl 代理路由
  if (pathname.startsWith("/api/proxy/twilio/media/") && (method === "GET" || method === "HEAD")) {
    try {
      // 硬编码 Twilio 凭证
      const TWILIO_ACCOUNT_SID = "ACee45c048bea1ac15047eab84b39f8147";
      const TWILIO_AUTH_TOKEN = "55f1dfc50eb7063806400b5a9acfb1c3";
      
      // 提取 MediaUrl 部分
      const mediaPath = pathname.replace("/api/proxy/twilio/media/", "");
      if (!mediaPath) {
        console.error('[TWILIO_MEDIA_ERROR] Missing mediaPath');
        return new Response("PROXY_UPSTREAM_ERROR", { status: 502 });
      }
      
      // 还原完整的 MediaUrl（仅解码一次）
      const decodedMediaUrl = decodeURIComponent(mediaPath);
      console.log('[TWILIO_MEDIA_DEBUG] Decoded Media URL:', decodedMediaUrl);
      
      // 检测 proxy → proxy 递归调用（禁止）
      if (decodedMediaUrl.includes("/api/proxy/twilio/media/")) {
        console.error('[TWILIO_MEDIA_ERROR] Proxy recursion detected');
        return new Response("PROXY_RECURSION_ERROR", { status: 400 });
      }
      
      // 构建认证头
      const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
      
      // 增加诊断日志
      console.log("[TWILIO_MEDIA_AUTH_DEBUG]", {
        hasSid: true,
        hasToken: true,
        sidPrefix: TWILIO_ACCOUNT_SID.slice(0, 4),
        authPreview: auth.slice(0, 8),
        mediaUrl: decodedMediaUrl
      });
      
      // 直接请求 Twilio Media
      console.log('[TWILIO_MEDIA_FETCH_START]', decodedMediaUrl);
      const res = await fetch(decodedMediaUrl, {
        method: 'GET',
        headers: {
          "Authorization": `Basic ${auth}`,
          "Accept": "*/*"
        },
        redirect: 'follow'
      });
      
      console.log('[TWILIO_MEDIA_FETCH_RESPONSE]', {
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('content-type')
      });
      
      // 直接透传流
      return new Response(method === "HEAD" ? null : res.body, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("content-type") || "application/octet-stream",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    } catch (error) {
      console.error('[TWILIO_MEDIA_FETCH_ERROR]', {
        message: error.message,
        stack: error.stack
      });
      return new Response("PROXY_UPSTREAM_ERROR", { status: 502 });
    }
  }
  
  // 健康检查路由
  if (pathname === "/health") {
    return new Response(JSON.stringify({
      status: "ok",
      timestamp: Date.now(),
      service: "test-media-proxy"
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  // 404 路由
  return new Response("Not Found", { status: 404 });
}

// 导出 Worker 处理函数
export default {
  async fetch(request) {
    return handleRequest(request);
  }
};
