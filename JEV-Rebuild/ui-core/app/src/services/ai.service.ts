// 构造AI请求函数，只生成建议，不发送
import { fetchApi } from "../api/apiClient";

export function generateAISuggestion(
  customerId: string, 
  messages: Array<{ text: string; direction?: string; role?: string; timestamp?: number; from?: string }>
) {
  const context = messages.map(m => ({
    role: m.from === 'customer' || m.direction === 'inbound' ? 'user' : 'assistant',
    content: String(m.text || '')
  }));

  // 添加系统规则：拟人化强约束
  const systemRule = {
    role: 'system' as const,
    content: `你是一个真实的人类外贸销售。
语气自然、简短、不营销、不夸张。
禁止自称 AI。
禁止一次性给方案。
像 WhatsApp/微信真人一样回复。`
  };

  // 将系统规则放在首位
  const fullContext = [systemRule, ...context];

  return fetchApi('/api/ai/suggest', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customerId,
      messages: fullContext,
      mode: 'assistant_only'
    })
  });
}