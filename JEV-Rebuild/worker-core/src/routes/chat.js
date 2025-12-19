import { json } from '../utils/response.js';

export async function handleChatSend(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }
  return json({
    reply: '消息已收到',
    intent: 'inquiry',
    lang: 'en',
    next_action: 'ask_product'
  }, 200);
}