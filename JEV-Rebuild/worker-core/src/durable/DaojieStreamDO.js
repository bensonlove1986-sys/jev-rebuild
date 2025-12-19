export class DaojieStreamDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.clients = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);

    // ✅ WebSocket 连接
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const client = pair[1];
      client.accept();

      this.clients.add(client);
      client.addEventListener('close', () => {
        this.clients.delete(client);
      });

      return new Response(null, {
        status: 101,
        webSocket: pair[0]
      });
    }

    // ✅ 内部广播 RPC
    if (url.pathname === '/broadcast') {
      const data = await request.json();
      const msg = JSON.stringify(data);

      for (const ws of this.clients) {
        try {
          ws.send(msg);
        } catch {}
      }

      return new Response('ok');
    }

    return new Response('Not found', { status: 404 });
  }
}