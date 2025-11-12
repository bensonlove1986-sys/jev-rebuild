// 简化的StateManager实现，仅包含必要功能
export class StateManager {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    const method = request.method.toUpperCase();

    if (method === "POST" && url.pathname === "/set") {
      const body = await request.json();
      await this.state.storage.put(body.key, body.value);
      return new Response(JSON.stringify({
        success: true,
        key: body.key,
        value: body.value,
        timestamp: Date.now()
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (method === "GET" && url.pathname === "/get") {
      const value = await this.state.storage.get(key);
      return new Response(JSON.stringify({
        success: true,
        key,
        value,
        timestamp: Date.now()
      }), { headers: { "Content-Type": "application/json" } });
    }

    if (method === "DELETE" && url.pathname === "/delete") {
      await this.state.storage.delete(key);
      return new Response(JSON.stringify({ success: true, key, deleted: true }), { headers: { "Content-Type": "application/json" } });
    }

    if (method === "GET" && url.pathname === "/list") {
      const list = await this.state.storage.list();
      const keys = Array.from(list.keys, entry => entry.name);
      return new Response(JSON.stringify({ 
        success: true, 
        list: keys, 
        count: keys.length 
      }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not Found", { status: 404 });
  }
}

// 默认导出的fetch处理函数
export default {
  async fetch(request, env) {
    // 处理Durable Object请求
    const url = new URL(request.url);
    
    // 支持直接的状态API路径
    if (["/set", "/get", "/delete", "/list"].includes(url.pathname)) {
      const id = env.JEV_STATE.idFromName("global");
      const stub = env.JEV_STATE.get(id);
      return stub.fetch(request);
    }
    
    // 简单的健康检查端点
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ 
        status: "ok", 
        timestamp: Date.now() 
      }), { headers: { "Content-Type": "application/json" } });
    }
    
    return new Response("Not Found", { status: 404 });
  }
};