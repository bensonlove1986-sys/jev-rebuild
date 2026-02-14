// Message Normalization V2 - 全局唯一消息裁决单点
// 严格执行消息角色、方向、来源的强制规则

/**
 * normalizeMessageV2 - 全局唯一消息裁决函数
 * @param {Object} raw - 原始消息对象
 * @param {Object} ctx - 上下文信息
 * @param {string} ctx.kind - 消息类型: 'INBOUND' | 'OUTBOUND_MANUAL' | 'OUTBOUND_AI'
 * @param {string} ctx.platform - 平台: 'whatsapp' | 'instagram' | 'unknown'
 * @param {number} ctx.channel_id - 通道ID
 * @param {string} ctx.customer_id - 客户ID
 * @returns {Object} 标准化后的消息对象
 */
export function normalizeMessageV2(raw, ctx) {
  // 确保raw是对象
  const message = typeof raw === 'object' && raw !== null ? { ...raw } : {};
  
  // 生成稳定唯一的message_id
  const generateMessageId = () => {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };
  
  // 合并所有可能的text来源
  let text = message.text;
  if (!text) {
    // 从不同字段中获取text
    text = message.payload?.text || 
           message.body || 
           message.message || 
           message.content;
  }
  
  // 如果text是对象，尝试从中提取文本
  if (typeof text === 'object' && text !== null) {
    text = text.text || JSON.stringify(text);
  }
  
  // 确保text是字符串
  text = String(text || '');
  
  // 检查是否为媒体消息
  const isMedia = (
    !!message.image_url || 
    !!message.media_url ||
    !!message.attachments?.length ||
    !!message.attachments?.some(a => a.type === 'image' || a.type === 'media') ||
    message.type === 'image'
  );
  
  // 生成基础normalized对象
  let normalized = {
    // 基础字段
    message_id: message.message_id || message.id || generateMessageId(),
    customer_id: ctx.customer_id,
    channel_id: ctx.channel_id,
    platform: ctx.platform,
    timestamp: message.timestamp || Date.now(),
    text: text.trim(),
    image_url: message.image_url || message.media_url || null,
    
    // 保留附件信息
    attachments: message.attachments || [],
    hasAttachments: message.hasAttachments || message.attachments?.length > 0 || isMedia,
    
    // 默认值，将被后续规则覆盖
    role: '',
    direction: '',
    source: '',
    allowContext: false,
    type: isMedia ? 'media' : 'text', // 根据是否有媒体确定消息类型
    stable: false // 初始标记为不稳定
  };
  
  // 增强：确保附件信息完整
  if (isMedia && normalized.attachments.length === 0) {
    normalized.attachments = [{
      type: 'image',
      source: ctx.platform,
      messageId: normalized.message_id,
      preview: null,
      url: normalized.image_url
    }];
    normalized.hasAttachments = true;
  }
  
  // 🔴 WhatsApp 图片消息特殊处理：要么稳定，要么降级
  if (ctx.channel_id === 19) {
    const isImageMessage = normalized.type === 'media' || message.type === 'image' || normalized.hasAttachments;
    
    if (isImageMessage) {
      console.log('[WHATSAPP_IMAGE_MESSAGE_DETECTED]', {
        messageId: normalized.message_id,
        hasUrl: !!normalized.image_url,
        hasAttachments: normalized.attachments.length > 0
      });
      
      // 检查是否有有效的图片URL
      // 统一URL验证规则，允许更多有效的URL前缀，包括Cloudflare R2 URL
      // 确保与全局URL验证规则一致
      const hasValidUrl = !!normalized.attachments.some(att => 
        att.url && (att.url.startsWith('http://') || att.url.startsWith('https://') || att.url.startsWith('blob:') || 
        att.url.includes('cloudflare.com') || att.url.includes('r2.cloudflarestorage.com'))
      );
      
      // 检查是否存在image_url，无论attachments.url是否有效
      const hasImageUrl = !!normalized.image_url;
      
      if (hasValidUrl || hasImageUrl) {
        // 方案A：有有效URL或image_url，标记为稳定图片消息
        normalized.stable = true;
        console.log('[WHATSAPP_IMAGE_HANDLED]', {
          messageId: normalized.message_id,
          channel_id: ctx.channel_id,
          finalType: 'image',
          hasUrl: hasValidUrl,
          hasImageUrl: hasImageUrl,
          stable: true
        });
      } else {
        // 方案B：无有效URL且无image_url，降级为文本消息
        console.log('[ASSERT_WHATSAPP_IMAGE_NO_URL] true - Downgrading to text message');
        normalized.type = 'text';
        normalized.text = '[Image received – media not available]';
        normalized.attachments = [];
        normalized.hasAttachments = false;
        normalized.image_url = null;
        normalized.stable = true;
        
        console.log('[WHATSAPP_IMAGE_HANDLED]', {
          messageId: normalized.message_id,
          channel_id: ctx.channel_id,
          finalType: 'text',
          hasUrl: false,
          hasImageUrl: false,
          stable: true
        });
      }
    }
  }
  
  // 根据ctx.kind执行严格的裁决规则
  switch (ctx.kind) {
    case 'INBOUND':
      normalized = {
        ...normalized,
        role: 'customer',
        direction: 'inbound',
        source: ctx.platform,
        allowContext: true
      };
      break;
      
    case 'OUTBOUND_MANUAL':
      normalized = {
        ...normalized,
        role: 'operator', // 🔴 修复：所有outbound消息角色应为operator
        direction: 'outbound',
        source: 'manual',
        allowContext: false
      };
      break;
      
    case 'OUTBOUND_AI':
      normalized = {
        ...normalized,
        role: 'operator', // 🔴 修复：所有outbound消息角色应为operator
        direction: 'outbound',
        source: 'ai',
        allowContext: false
      };
      break;
      
    default:
      // 未知类型，使用最安全的默认值
      normalized = {
        ...normalized,
        role: 'customer',
        direction: 'inbound',
        source: 'unknown',
        allowContext: false
      };
      break;
  }
  
  // 移除raw中可能存在的冲突字段，确保标准化结果的纯净性
  delete normalized.id; // 使用统一的message_id
  
  // 自证日志
  console.log('[MSG_NORM_V2]', {
    kind: ctx.kind,
    customer_id: normalized.customer_id,
    channel_id: normalized.channel_id,
    role: normalized.role,
    direction: normalized.direction,
    source: normalized.source,
    allowContext: normalized.allowContext,
    hasText: !!normalized.text,
    hasImage: !!normalized.image_url
  });
  
  // 添加INBOUND_MESSAGE_NORMALIZED日志
  if (ctx.kind === 'INBOUND') {
    console.log('[INBOUND_MESSAGE_NORMALIZED]', {
      id: normalized.message_id,
      customer_id: normalized.customer_id,
      text_length: normalized.text.length,
      source: normalized.source,
      channel: normalized.channel_id,
      type: normalized.type
    });
    
    // 检查是否可渲染
    const isRenderable = !!normalized.text && normalized.text.trim() !== '';
    console.log('[INBOUND_MESSAGE_RENDERABLE]', {
      id: normalized.message_id,
      customer_id: normalized.customer_id,
      renderable: isRenderable,
      reason: isRenderable ? 'Has valid text' : 'Empty text'
    });
  }
  
  return normalized;
}

/**
 * assertMessageInvariant - 消息不变量断言，拒绝脏数据写入
 * @param {Object} msg - 标准化后的消息对象
 * @returns {boolean} 是否通过断言
 * @throws {Error} 断言失败时抛出错误
 */
export function assertMessageInvariant(msg) {
  // 验证必要字段存在
  const requiredFields = ['role', 'direction', 'source', 'allowContext', 'message_id', 'customer_id', 'channel_id', 'platform', 'timestamp', 'type'];
  for (const field of requiredFields) {
    if (msg[field] === undefined) {
      const errorMsg = `Missing required field: ${field}`;
      console.error('[MSG_INVARIANT_BLOCKED]', {
        reason: errorMsg,
        msgSummary: {
          message_id: msg.message_id || 'unknown',
          customer_id: msg.customer_id || 'unknown',
          role: msg.role || 'unknown',
          direction: msg.direction || 'unknown'
        }
      });
      throw new Error(errorMsg);
    }
  }
  
  // 验证text字段非空（inbound消息），但允许媒体消息文本为空
  // 允许带有附件或image_url的消息文本为空
  if (msg.direction === 'inbound' && (!msg.text || msg.text.trim() === '') && msg.attachments?.length === 0 && !msg.image_url) {
    const errorMsg = `Inbound message must have non-empty text`;
    console.error('[MSG_INVARIANT_BLOCKED]', {
      reason: errorMsg,
      msgSummary: {
        message_id: msg.message_id,
        customer_id: msg.customer_id,
        role: msg.role,
        direction: msg.direction,
        text_length: msg.text ? msg.text.length : 0,
        hasAttachments: msg.attachments?.length > 0,
        hasImage: !!msg.image_url
      }
    });
    throw new Error(errorMsg);
  }
  
  // 1. 角色与方向必须匹配
  if (msg.role === 'customer' && msg.direction !== 'inbound') {
    const errorMsg = `Customer message must have inbound direction: ${msg.direction}`;
    console.error('[MSG_INVARIANT_BLOCKED]', {
      reason: errorMsg,
      msgSummary: {
        message_id: msg.message_id,
        customer_id: msg.customer_id,
        role: msg.role,
        direction: msg.direction
      }
    });
    throw new Error(errorMsg);
  }
  
  if ((msg.role === 'agent' || msg.role === 'ai') && msg.direction !== 'outbound') {
    const errorMsg = `Agent/AI message must have outbound direction: ${msg.direction}`;
    console.error('[MSG_INVARIANT_BLOCKED]', {
      reason: errorMsg,
      msgSummary: {
        message_id: msg.message_id,
        customer_id: msg.customer_id,
        role: msg.role,
        direction: msg.direction
      }
    });
    throw new Error(errorMsg);
  }
  
  // 2. allowContext只能在customer/inbound为true，其余必须false
  if (msg.allowContext === true && (msg.role !== 'customer' || msg.direction !== 'inbound')) {
    const errorMsg = `Only customer inbound messages can have allowContext=true`;
    console.error('[MSG_INVARIANT_BLOCKED]', {
      reason: errorMsg,
      msgSummary: {
        message_id: msg.message_id,
        customer_id: msg.customer_id,
        role: msg.role,
        direction: msg.direction,
        allowContext: msg.allowContext
      }
    });
    throw new Error(errorMsg);
  }
  
  if (msg.allowContext !== true && msg.allowContext !== false) {
    const errorMsg = `allowContext must be boolean: ${msg.allowContext}`;
    console.error('[MSG_INVARIANT_BLOCKED]', {
      reason: errorMsg,
      msgSummary: {
        message_id: msg.message_id,
        customer_id: msg.customer_id,
        allowContext: msg.allowContext
      }
    });
    throw new Error(errorMsg);
  }
  
  // 3. 验证source与角色的一致性
  if (msg.role === 'customer' && !['whatsapp', 'instagram', 'unknown'].includes(msg.source)) {
    const errorMsg = `Customer message source must be platform-specific: ${msg.source}`;
    console.error('[MSG_INVARIANT_BLOCKED]', {
      reason: errorMsg,
      msgSummary: {
        message_id: msg.message_id,
        customer_id: msg.customer_id,
        role: msg.role,
        source: msg.source
      }
    });
    throw new Error(errorMsg);
  }
  
  if (msg.role === 'agent' && msg.source !== 'manual') {
    const errorMsg = `Agent message source must be 'manual': ${msg.source}`;
    console.error('[MSG_INVARIANT_BLOCKED]', {
      reason: errorMsg,
      msgSummary: {
        message_id: msg.message_id,
        customer_id: msg.customer_id,
        role: msg.role,
        source: msg.source
      }
    });
    throw new Error(errorMsg);
  }
  
  if (msg.role === 'ai' && msg.source !== 'ai') {
    const errorMsg = `AI message source must be 'ai': ${msg.source}`;
    console.error('[MSG_INVARIANT_BLOCKED]', {
      reason: errorMsg,
      msgSummary: {
        message_id: msg.message_id,
        customer_id: msg.customer_id,
        role: msg.role,
        source: msg.source
      }
    });
    throw new Error(errorMsg);
  }
  
  // 所有断言通过
  return true;
}