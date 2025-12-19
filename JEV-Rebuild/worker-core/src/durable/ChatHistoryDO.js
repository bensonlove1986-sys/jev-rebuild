export class ChatHistoryDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const method = request.method;

    // Append message
    if (method === 'POST' && url.pathname === '/append') {
      const message = await request.json();
      await this.appendMessage(message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // List messages
    if (method === 'GET' && url.pathname === '/list') {
      const limit = parseInt(url.searchParams.get('limit')) || 20;
      const messages = await this.listMessages(limit);
      return new Response(JSON.stringify(messages), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }

  // Append a message to the history
  async appendMessage(message) {
    // Validate message structure
    if (!message || !message.contactId || !message.role || !message.text) {
      throw new Error('Invalid message structure');
    }

    // Ensure message has required fields
    const msgToStore = {
      id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contactId: message.contactId,
      role: message.role,
      text: message.text,
      timestamp: message.timestamp || Date.now()
    };

    // Get current messages
    const messages = await this.state.storage.get('messages') || [];
    messages.push(msgToStore);

    // Save back to storage
    await this.state.storage.put('messages', messages);
    return msgToStore;
  }

  // List messages with pagination
  async listMessages(limit = 20) {
    const messages = await this.state.storage.get('messages') || [];
    // Sort by timestamp ascending
    return messages.sort((a, b) => a.timestamp - b.timestamp).slice(-limit);
  }
}