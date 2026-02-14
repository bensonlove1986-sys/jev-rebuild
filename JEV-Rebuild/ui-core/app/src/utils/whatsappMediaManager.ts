// WhatsApp Media Manager
// 智能管理WhatsApp媒体消息，实现基于时间和数量的清理策略

interface MediaCleanupConfig {
  // 保留的最大媒体消息数量
  maxMediaCount: number;
  // 媒体消息的最长保留时间（毫秒）
  maxRetentionTime: number;
  // 清理间隔（毫秒）
  cleanupInterval: number;
}

interface MediaMessage {
  id: string;
  customer_id: string;
  timestamp: number;
  attachments: Array<{
    url: string;
    type: string;
  }>;
}

class WhatsAppMediaManager {
  private config: MediaCleanupConfig;
  private mediaMessages: Map<string, MediaMessage[]> = new Map(); // customer_id -> messages
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private isEnabled: boolean = true;

  constructor(config: Partial<MediaCleanupConfig> = {}) {
    // 默认配置
    this.config = {
      maxMediaCount: 50,
      maxRetentionTime: 24 * 60 * 60 * 1000, // 24小时
      cleanupInterval: 30 * 60 * 1000, // 30分钟
      ...config
    };

    // 启动定期清理
    this.startPeriodicCleanup();

    console.log('[WHATSAPP_MEDIA_MANAGER] Initialized with config:', this.config);
  }

  // 启用清理
  enable(): void {
    this.isEnabled = true;
    console.log('[WHATSAPP_MEDIA_MANAGER] Enabled');
  }

  // 禁用清理
  disable(): void {
    this.isEnabled = false;
    console.log('[WHATSAPP_MEDIA_MANAGER] Disabled');
  }

  // 添加媒体消息
  addMediaMessage(message: MediaMessage): void {
    if (!this.isEnabled) return;

    // 确保customer_id存在
    if (!message.customer_id) {
      console.warn('[WHATSAPP_MEDIA_MANAGER] Skipping message without customer_id');
      return;
    }

    // 确保消息包含媒体附件
    if (!message.attachments || message.attachments.length === 0) {
      return;
    }

    // 确保至少有一个附件是blob URL
    const hasBlobAttachment = message.attachments.some(attach => attach.url.startsWith('blob:'));
    if (!hasBlobAttachment) {
      return;
    }

    // 添加到对应客户的媒体消息列表
    const customerMessages = this.mediaMessages.get(message.customer_id) || [];
    customerMessages.push(message);
    this.mediaMessages.set(message.customer_id, customerMessages);

    console.log('[WHATSAPP_MEDIA_MANAGER] Added media message for customer:', message.customer_id);

    // 立即执行一次清理，确保不超过最大数量
    this.cleanupForCustomer(message.customer_id);
  }

  // 为特定客户清理媒体消息
  cleanupForCustomer(customerId: string): void {
    if (!this.isEnabled) return;

    const customerMessages = this.mediaMessages.get(customerId);
    if (!customerMessages || customerMessages.length === 0) {
      return;
    }

    const now = Date.now();
    const maxAge = now - this.config.maxRetentionTime;

    // 1. 按时间过滤：只保留在最大保留时间内的消息
    let filteredMessages = customerMessages.filter(msg => msg.timestamp > maxAge);

    // 2. 按数量过滤：只保留最新的N条消息
    if (filteredMessages.length > this.config.maxMediaCount) {
      // 按时间降序排序，保留最新的消息
      filteredMessages.sort((a, b) => b.timestamp - a.timestamp);
      filteredMessages = filteredMessages.slice(0, this.config.maxMediaCount);
      // 恢复为升序排序
      filteredMessages.sort((a, b) => a.timestamp - b.timestamp);
    }

    // 计算需要清理的消息
    const messagesToClean = customerMessages.filter(
      msg => !filteredMessages.some(filteredMsg => filteredMsg.id === msg.id)
    );

    // 清理需要删除的消息的媒体URL
    this.cleanupMediaUrls(messagesToClean);

    // 更新客户的媒体消息列表
    this.mediaMessages.set(customerId, filteredMessages);

    if (messagesToClean.length > 0) {
      console.log(
        '[WHATSAPP_MEDIA_MANAGER] Cleaned up', messagesToClean.length, 
        'media messages for customer:', customerId,
        'Remaining:', filteredMessages.length
      );
    }
  }

  // 清理媒体URL
  private cleanupMediaUrls(messages: MediaMessage[]): void {
    messages.forEach(message => {
      message.attachments.forEach(attachment => {
        // 只清理blob URL
        if (attachment.url.startsWith('blob:')) {
          try {
            // 释放blob URL
            URL.revokeObjectURL(attachment.url);
            console.log('[WHATSAPP_MEDIA_MANAGER] Revoked blob URL:', attachment.url);
          } catch (error) {
            console.error(
              '[WHATSAPP_MEDIA_MANAGER] Error revoking blob URL:', 
              attachment.url, error
            );
          }
        }
      });
    });
  }

  // 清理所有客户的媒体消息
  cleanupAll(): void {
    if (!this.isEnabled) return;

    console.log('[WHATSAPP_MEDIA_MANAGER] Starting full cleanup');

    // 遍历所有客户，执行清理
    for (const customerId of this.mediaMessages.keys()) {
      this.cleanupForCustomer(customerId);
    }
  }

  // 启动定期清理
  startPeriodicCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    this.cleanupIntervalId = setInterval(() => {
      this.cleanupAll();
    }, this.config.cleanupInterval);

    console.log(
      '[WHATSAPP_MEDIA_MANAGER] Started periodic cleanup every', 
      this.config.cleanupInterval / 1000, 'seconds'
    );
  }

  // 停止定期清理
  stopPeriodicCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
      console.log('[WHATSAPP_MEDIA_MANAGER] Stopped periodic cleanup');
    }
  }

  // 获取特定客户的媒体消息数量
  getMediaCount(customerId: string): number {
    return this.mediaMessages.get(customerId)?.length || 0;
  }

  // 获取所有客户的媒体消息统计
  getStats(): Array<{
    customer_id: string;
    mediaCount: number;
  }> {
    const stats = [];
    for (const [customerId, messages] of this.mediaMessages.entries()) {
      stats.push({
        customer_id: customerId,
        mediaCount: messages.length
      });
    }
    return stats;
  }

  // 更新配置
  updateConfig(config: Partial<MediaCleanupConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[WHATSAPP_MEDIA_MANAGER] Updated config:', this.config);
    // 重启清理间隔
    this.startPeriodicCleanup();
  }

  // 关闭管理器，清理资源
  close(): void {
    this.stopPeriodicCleanup();
    this.cleanupAll();
    this.mediaMessages.clear();
    console.log('[WHATSAPP_MEDIA_MANAGER] Closed and cleaned up all resources');
  }
}

// 创建全局单例
let mediaManagerInstance: WhatsAppMediaManager | null = null;

export function getWhatsAppMediaManager(config?: Partial<MediaCleanupConfig>): WhatsAppMediaManager {
  if (!mediaManagerInstance) {
    mediaManagerInstance = new WhatsAppMediaManager(config);
  } else if (config) {
    mediaManagerInstance.updateConfig(config);
  }
  return mediaManagerInstance;
}

// 默认导出单例
export const whatsappMediaManager = getWhatsAppMediaManager();
