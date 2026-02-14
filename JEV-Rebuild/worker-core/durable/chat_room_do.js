export class ChatRoomDO {
  constructor(state) {
    this.state = state;
    this.clients = new Set();
    this.processedMessageIds = new Set();
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") === "websocket") {
      console.log("[WS_DO_UPGRADE]");

      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      this.handleWebSocketConnection(server);

      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    // Handle broadcast request
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'POST' && path === '/broadcast') {
      try {
        const payload = await request.json();
        this.broadcast(payload);
        return new Response('OK');
      } catch (error) {
        console.error('[BROADCAST_ERROR]', error);
        return new Response('Broadcast Error', { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }

  handleWebSocketConnection(webSocket) {
    this.clients.add(webSocket);
    console.log('[WS_CLIENT_CONNECTED] New client connected, total:', this.clients.size);

    webSocket.addEventListener('message', (event) => {
      console.log('[WS_MESSAGE] Received:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ping') {
          webSocket.send(JSON.stringify({ type: 'pong' }));
          console.log('[WS_PONG_SENT]');
        }
      } catch (error) {
        console.error('[WS_MESSAGE_PARSE_ERROR]', error);
      }
    });

    webSocket.addEventListener('close', () => {
      this.clients.delete(webSocket);
      console.log('[WS_CLIENT_DISCONNECTED] Client disconnected, total:', this.clients.size);
    });

    webSocket.addEventListener('error', (error) => {
      console.error('[WS_CLIENT_ERROR]', error);
      this.clients.delete(webSocket);
    });
  }

  broadcast(message) {
    let payload;
    if (message.type) {
      payload = message;
    } else {
      payload = {
        type: 'message',
        data: message,
        timestamp: Date.now()
      };
    }

    const messageString = JSON.stringify(payload);
    let disconnectedClients = [];

    console.log('[WS_BROADCAST] Broadcasting to', this.clients.size, 'clients:', payload.type);

    for (const client of this.clients) {
      try {
        client.send(messageString);
      } catch (error) {
        console.error('[WS_SEND_ERROR]', error);
        disconnectedClients.push(client);
      }
    }

    for (const client of disconnectedClients) {
      this.clients.delete(client);
    }

    console.log('[WS_BROADCAST_COMPLETE] Message broadcasted, remaining clients:', this.clients.size);
  }
}

// Export CHAT_ROOM_DO for backward compatibility
export const CHAT_ROOM_DO = ChatRoomDO;
