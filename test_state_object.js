// 简化的StateManager测试文件
export class StateManager {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const key = url.searchParams.get("key");

    if (method === "POST" && url.pathname === "/set") {
      const body = await request.json();
      await this.state.storage.put(body.key, body.value);
      return Response.json({ success: true, key: body.key, value: body.value });
    }

    if (method === "GET" && url.pathname === "/get") {
      const value = await this.state.storage.get(key);
      return Response.json({ success: true, key, value });
    }

    if (method === "GET" && url.pathname === "/list") {
      const list = await this.state.storage.list();
      const keys = list.keys.map(k => k.name);
      return Response.json({ success: true, list: keys });
    }

    return new Response("Not Found", { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    const id = env.JEV_STATE.idFromName("global");
    const stub = env.JEV_STATE.get(id);
    return stub.fetch(request);
  }
};