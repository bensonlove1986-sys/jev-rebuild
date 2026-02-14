// WhatsApp  outbound 服务
// 用于发送消息到 WhatsApp 联系人

import { createLogger } from '../utils/structuredLogger';
import { API_BASE } from '../config/api';

// 创建 logger 实例
const logger = createLogger('WhatsAppOutboundService');

// WhatsApp outbound 服务类
class WhatsAppOutboundService {
  /**
   * 发送 WhatsApp 消息
   * @param to 目标手机号（如：+8613800138000）
   * @param text 消息内容
   * @returns Promise<string> 返回 twilio_sid
   */
  public async sendMessage(to: string, text: string): Promise<string> {
    if (!to || !text) {
      logger.error('[WHATSAPP_SEND_ERROR] Missing required parameters');
      throw new Error('Missing required parameters');
    }

    // 构建请求 URL
    const url = `${API_BASE}/api/outbound/whatsapp`;
    const formattedTo = `whatsapp:${to.replace(/^whatsapp:/, '')}`;

    logger.info(`[WHATSAPP_SEND] Sending message to ${formattedTo}`);

    // 发送请求到后端接口
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedTo,
        text: text
      })
    });

    if (!response.ok) {
      // 处理 HTTP 错误
      const errorData = await response.json().catch(() => ({}));
      logger.error('[WHATSAPP_SEND_ERROR] HTTP Error:', response.status, errorData);
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.twilio_sid) {
      logger.error('[WHATSAPP_SEND_ERROR] Missing twilio_sid in response');
      throw new Error('NO_TWILIO_SID');
    }

    logger.info('[WHATSAPP_SEND_SUCCESS] Message sent successfully to', formattedTo, 'with sid:', data.twilio_sid);
    return data.twilio_sid;
  }
}

// 创建单例实例
export const whatsappOutboundService = new WhatsAppOutboundService();
