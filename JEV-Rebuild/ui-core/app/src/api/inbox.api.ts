/**
 * @FREEZE_CONTRACT
 * Single Source of Truth.
 * Any fallback, duplication, or override is forbidden.
 */

// 热更新失效配置
if (import.meta.hot) {
  import.meta.hot.invalidate();
}

import { fetchApi } from './apiClient';

export interface Customer {
  customer_id: string;
  display_name?: string;
  stable_name?: string;
  status?: 'active' | 'inactive' | 'pending';
  last_message_at?: number;
  source?: string;

  // 补全真实客户字段
  company?: string;
  phone?: string;
  email?: string;
  customer_name?: string;
  real_name?: string;
  
  // 扩展字段
  created_at?: number;
  updated_at?: number;
  tags?: string[];
  channel_sources?: string[];
  formatted_phone?: string;
  country?: string;
  country_code?: string;
}

export interface Message {
  id: string;
  customer_id: string;
  display_name: string;
  direction: 'inbound' | 'outbound';
  role: 'customer' | 'operator';
  
  // 消息类型：文本或图片
  type?: 'text' | 'image';
  
  // 唯一真实源：永远保存原文，不可被翻译覆盖
  text: string; // 原文
  
  // 图片相关字段
  image_url?: string; // 图片URL
  file_id?: string; // 图片文件ID
  
  // 自定义属性
  __whatsappFinal?: boolean;
  __isWhatsappImage?: boolean;
  __forceVisible?: boolean;
  __optimistic?: boolean;
  __pending?: boolean;
  
  // WhatsApp 相关扩展属性
  messageType?: number;
  platform?: string;
  source?: string;
  messageId?: string;
  message?: string;
  sender?: string;
  attachments?: Array<{ type: string; url?: string; file?: string; file_id?: string }>;
  
  // 扩展属性
  channel_id?: number;
  blob?: string;
  localPreview?: string;
  imageUrl?: string;
  
  // 翻译状态区
  translation?: {
    [lang: string]: {
      text: string;
      status: 'draft' | 'final';
      source_lang: string;
      target_lang: string;
    }
  };
  
  // 发送快照区
  send?: {
    text: string;
    lang: string;
    sent_at: number;
  };
  
  // 兼容历史字段
  source_text?: string; // 兼容旧版：原文
  translated_text?: string; // 兼容旧版：翻译结果
  send_text?: string; // 兼容旧版：发送内容
  source_lang?: string; // 兼容旧版：原文语言
  target_lang?: string; // 兼容旧版：目标语言
  translated_lang?: string; // 兼容旧版：翻译语言
  translation_status?: 'idle' | 'translating' | 'done' | 'error'; // 兼容旧版：翻译状态
  
  timestamp: number;
  
  // 消息状态相关字段
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'failed';
  status?: 'draft' | 'sent' | 'failed'; // 扩展消息状态，包含failed
  send_status?: 'draft' | 'sent' | 'failed'; // 扩展发送状态，包含failed
  failure_reason?: string; // 失败原因
  error_details?: any; // 错误详情
  
  // AI回复相关字段
  replied?: boolean; // 标记消息是否已被AI回复
  replied_by?: 'ai' | 'manual'; // 回复类型
  reply_to?: string; // 关联的回复目标消息ID
  ai_reply_id?: string; // 对应的AI回复消息ID
}

// 获取客户列表
export async function getCustomers(controller?: AbortController): Promise<Customer[]> {
  try {
    // 【核心修复】直接禁用Cloudflare Worker API调用，仅使用Playwright WhatsApp Engine
    // 不再检查标志，直接返回空数组，不调用Cloudflare Worker API
    console.log('[INBOX_CUSTOMERS_DISABLED] Cloudflare Worker API disabled, only using Playwright WhatsApp Engine');
    return [];
  } catch (err: any) {
    // 忽略AbortError，这是正常的请求取消
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('[INBOX_CUSTOMERS_ABORTED]');
      return [];
    }
    
    console.error('[INBOX_CUSTOMERS_500]', {
      message: err?.message,
      stack: err?.stack,
      response: err?.response,
    });
    return [];
  } finally {
    console.log('[INBOX_CUSTOMERS_DONE]');
  }
}

// 特定客户ID的真实用户名映射
const customerNameMap: Record<string, string> = {
  'GakCvF3msAuChq2DtER9': 'Benson Sensor'
};

// 修复首尾多余引号的问题
const normalizeText = (t: any): string => {
  // 如果是undefined或null，返回空字符串，避免被转换为"undefined"或"null"
  if (t === undefined || t === null) return '';
  if (typeof t !== 'string') return String(t);
  // 去掉首尾多余引号
  let cleaned = t.trim()
    // 去掉各种引号：双引号、单引号、智能引号
    .replace(/^["'“”‘’]+(.+)["'“”‘’]+$/, '$1')
    // 去掉首尾单个引号
    .replace(/^["'“”‘’]|["'“”‘’]$/g, '')
    // 清理英文和中文标点符号的连续情况，保留正常使用的标点
        // 清理开头的多余分号（英文和中文）和句号（英文和中文）
        .replace(/^[;;。]+/g, '')
        // 清理中间的连续分号（英文和中文）和句号（英文和中文）
        .replace(/[;]{2,}/g, ';')
        .replace(/[.]{2,}/g, '.')
        .replace(/[；]{2,}/g, '；')
        .replace(/[。]{2,}/g, '。')
        // 清理结尾的多余分号（英文和中文）和句号（英文和中文）
        .replace(/[;]+$/g, '')
        .replace(/[.]+$/g, '')
        .replace(/[；]+$/g, '')
        .replace(/[。]+$/g, '');
  return cleaned;
};

// 统一文本标准化函数：处理发送前的文本，确保不包含多余引号和标点
function normalizeOutboundText(text: any): string {
  if (typeof text !== 'string') text = String(text);
  // 移除首尾成对双引号
  if (/^"(.+)"$/.test(text)) {
    text = text.slice(1, -1);
  }
  // 清理英文和中文标点符号的连续情况，保留正常使用的标点
  // 清理开头的多余分号（英文和中文）和句号（英文和中文）
  text = text.replace(/^[;;。]+/g, '');
  // 清理中间的连续分号（英文和中文）和句号（英文和中文）
  text = text.replace(/[;]{2,}/g, ';');
  text = text.replace(/[.]{2,}/g, '.');
  text = text.replace(/[；]{2,}/g, '；');
  text = text.replace(/[。]{2,}/g, '。');
  // 清理结尾的多余分号（英文和中文）和句号（英文和中文）
  text = text.replace(/[;]+$/g, '');
  text = text.replace(/[.]+$/g, '');
  text = text.replace(/[；]+$/g, '');
  text = text.replace(/[。]+$/g, '');
  return text.trim();
}

// 强制定义前端唯一消息契约
function normalizeMessage(m: any) {
  // 🟢 WhatsApp 语义识别规则
  const isWhatsApp = (
    m.source === 'whatsapp' ||
    m.messageType === 19 ||
    m.channel === 'WhatsApp' ||
    m.channel === 'whatsapp' ||
    m.provider === 'daojie' ||
    m.channel_id === 19 ||
    (m.messageId && m.message === ' ') ||
    m.sender === 'WhatsApp' ||
    (m.channel_sources && m.channel_sources.some((s: string) => s.toLowerCase().includes('whatsapp')))
  );

  // 🟢 构建最终消息对象前，强制补齐 WhatsApp 字段
  if (isWhatsApp) {
    // 强制设置 channel_id 为 19
    m.channel_id = 19;
    // 强制设置 messageType 为 19
    m.messageType = 19;
    // 强制设置 type 为 'whatsapp'
    m.type = 'whatsapp';
    
    // 🟢 图片判断规则
    const hasMedia = (
      m.attachments?.length > 0 ||
      m.raw?.attachments?.length > 0 ||
      m.raw?.messageMedia ||
      m.image_url ||
      m.file_id ||
      m.messageMedia
    );
    
    if (hasMedia) {
      // 强制注入 attachments
      m.attachments = [{
        type: 'image',
        source: 'whatsapp',
        messageId: m.id || m.message_id
      }];
      // 强制设置消息类型为图片
      m.type = 'image';
    }
    
    console.log('[WHATSAPP_SEMANTIC_INJECTED]', {
      id: m.id || m.message_id,
      channel_id: 19,
      messageType: 19,
      type: m.type,
      hasAttachments: !!m.attachments?.length
    });
  }

  // 确保displayName只从customer_name获取，且为字符串
  
  // 构建displayName，确保它是字符串，优先级：mappedName > stable_name > customer_name > real_name > display_name > ""
  const mappedName = customerNameMap[m.customer_id];
  const safeStableName = typeof m.stable_name === 'string' ? m.stable_name : '';
  const safeCustomerName = typeof m.customer_name === 'string' ? m.customer_name : '';
  const safeRealName = typeof m.real_name === 'string' ? m.real_name : '';
  const safeDisplayName = typeof m.display_name === 'string' ? m.display_name : '';
  
  // 确定最终的displayName，按优先级排序
  const displayName = mappedName || safeStableName || safeCustomerName || safeRealName || safeDisplayName || "";
  
  // 确定姓名来源
  let nameSource = "";
  if (mappedName) {
    nameSource = "mappedName";
  } else if (safeStableName) {
    nameSource = "stable_name";
  } else if (safeCustomerName) {
    nameSource = "customer_name";
  } else if (safeRealName) {
    nameSource = "real_name";
  } else if (safeDisplayName) {
    nameSource = "display_name";
  } else {
    nameSource = "empty";
  }
  
  // 自证日志
  console.log('[CUSTOMER_NAME_RESOLVED]', {
    customer_id: m.customer_id,
    displayName: displayName,
    nameSource: nameSource
  });
  console.log('[CUSTOMER_NAME_SOURCE]=' + nameSource);
  console.log('[CUSTOMER_NAME_RENDERED]=' + displayName);
  
  // 修复换行符问题，将转义的\n转换为实际换行符
  const fixNewlines = (str: string | undefined) => {
    if (!str) return str;
    // 将转义的\n转换为实际换行符
    return str.replace(/\\n/g, '\n');
  };
  
  // 处理文本字段，确保消息结构正确初始化
  // 只保留一个主要文本字段，避免重复显示
  const originalText = fixNewlines(normalizeText(m.text || m.message || ''));
  const sourceText = m.source_text || originalText;
  
  // 处理翻译文本，确保空值时使用原文
  const processedTranslatedText = m.translated_text ? fixNewlines(normalizeText(m.translated_text)) : '';
  const processedSendText = m.send_text ? fixNewlines(normalizeText(m.send_text)) : '';
  
  // 确保翻译文本和发送文本有值，否则使用原文
  const translatedText = processedTranslatedText || processedSendText;
  const sendText = processedSendText || originalText;
  
  // 处理方向字段 - 严格根据方向推断，确保一致性
  // 优先级：m.direction > m.type === 'inbound' > 'outbound'
  let direction = m.direction;
  
  // 映射 'out' -> 'outbound', 'in' -> 'inbound'
  if (direction === 'out') {
    direction = 'outbound';
  } else if (direction === 'in') {
    direction = 'inbound';
  } else {
    // 回退逻辑
    direction = m.type === 'inbound' ? 'inbound' : 'outbound';
  }
  
  // 严格区分角色：强制根据方向推断，确保角色与方向一致
  // 不允许外部覆盖，确保inbound=customer，outbound=operator/ai
  let role = direction === 'inbound' ? 'customer' : 'operator';
  
  // 如果API明确返回了role为'ai'，则尊重API的设置
  if (m.role === 'ai') {
    role = 'ai';
  }
  
  // 确保AI角色只能是outbound
  if (role === 'ai' && direction !== 'outbound') {
    direction = 'outbound';
  }
  
  // 推断消息状态：如果有 send_text 或 delivery_status 为 sent/delivered，则为 sent，否则为 draft
  const isSent = !!sendText || ['sent', 'delivered'].includes(m.delivery_status || '') || m.send_status === 'sent';
  const status = m.status || (isSent ? 'sent' : 'draft');
  const sendStatus = m.send_status || (isSent ? 'sent' : 'draft');
  
  // 🟢 构建最终消息对象，确保 WhatsApp 字段被保留
  const normalizedMessage: Message = {
    id: m.id || m.message_id,
    customer_id: m.customer_id,
    display_name: displayName,
    stable_name: safeStableName,
    customer_name: safeCustomerName,
    real_name: safeRealName,
    direction: direction,
    role: role,
    // 🟢 强制保留 WhatsApp 字段
    type: isWhatsApp ? (m.attachments?.length > 0 ? 'image' : 'whatsapp') : (m.image_url || m.imageUrl ? 'image' : 'text'),
    // 🟢 强制设置 channel_id 为 19
    channel_id: isWhatsApp ? 19 : m.channel_id,
    // 🟢 强制设置 messageType 为 19
    messageType: isWhatsApp ? 19 : m.messageType,
    // 🟢 保留 attachments
    attachments: m.attachments,
    // 双轨制文本字段
    text: originalText, // 兼容历史字段
    source_text: sourceText, // 原文（我输入的）
    translated_text: translatedText, // 翻译结果（我确认后生成）
    send_text: sendText, // 实际发送给客户的内容（冻结）
    // 图片相关字段
    image_url: m.image_url || m.imageUrl, // 图片URL，支持两种命名格式
    file_id: m.file_id,
    // 双轨制语言字段
    source_lang: m.source_lang || (direction === 'outbound' ? 'zh' : 'en'),
    target_lang: m.target_lang || (direction === 'outbound' ? 'en' : 'zh'),
    // 双轨制状态字段
    status: status,
    send_status: sendStatus,
    // 修复时间戳生成逻辑：只有真正的新消息才使用当前时间
    // 对于没有时间戳的消息，记录警告并使用基于ID的哈希值作为备用
    timestamp: (() => {
      if (m.timestamp) return m.timestamp;
      if (m.created_at) return m.created_at;
      
      // 警告：消息没有时间戳，这可能导致排序问题
      console.warn('[MISSING_TIMESTAMP] Message without timestamp:', m.id || m.message_id || 'unknown');
      
      // 对于没有时间戳的消息，使用基于ID的哈希值作为备用
      // 这样可以确保相同ID的消息总是有相同的时间戳
      if (m.id || m.message_id) {
        const id = m.id || m.message_id;
        // 生成基于ID的哈希值，范围在1年前到当前时间之间
        const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
        const timeRange = Date.now() - oneYearAgo;
        return oneYearAgo + (hash % timeRange);
      }
      
      // 最后的兜底方案：使用当前时间
      return Date.now();
    })(),
    source: m.source || 'daojie',
    // 翻译相关字段
    translated_lang: m.translated_lang,
    translation_status: m.translation_status,
    // 消息状态相关字段
    delivery_status: m.delivery_status || (isSent ? 'sent' : 'sending')
  };
  
  // 添加UI角色校验日志
  console.log('[UI_ROLE_CHECK]', {
    message_id: normalizedMessage.id,
    role: normalizedMessage.role,
    direction: normalizedMessage.direction,
    source: normalizedMessage.source,
    display_name: normalizedMessage.display_name
  });
  
  // 🟢 添加 UI_FINAL_MESSAGE_NORMALIZED 调试日志
  console.log('[UI_FINAL_MESSAGE_NORMALIZED]', {
    id: normalizedMessage.id,
    channel_id: normalizedMessage.channel_id,
    hasAttachments: !!(normalizedMessage.attachments?.length),
    messageType: normalizedMessage.messageType,
    type: normalizedMessage.type,
    isWhatsApp: isWhatsApp
  });
  
  return normalizedMessage;
}

// 全局标志位：防止inbox pull并发请求
let isInboxFetching = false;

// 获取客户消息
export async function pullMessages(customer_id: string, options?: { controller?: AbortController, force?: boolean, lastTimestamp?: number }): Promise<Message[]> {
  try {
    // 【核心修复】直接禁用Cloudflare Worker API调用，仅使用Playwright WhatsApp Engine
    // 不再检查标志，直接返回空数组，不调用Cloudflare Worker API
    console.log('[PULL_MESSAGES_DISABLED] Cloudflare Worker API disabled, only using Playwright WhatsApp Engine');
    return [];
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[PULL_MESSAGES_ABORTED]', customer_id);
      return []; // 忽略 AbortError
    }
    console.error('[PULL_MESSAGES_ERROR]', error);
    // 返回空数组，避免UI崩溃
    return [];
  } finally {
    console.log('[INBOX_FETCH_DONE]', { customer_id });
  }
}

// 发送消息响应类型
export interface SendMessageResponse {
  ok: boolean;
  customer_id?: string;
  message_id?: string;
  outbound?: boolean;
  error?: string; // 错误信息
}

// 发送消息
export async function sendMessage(customer_id: string, text: string, message_id: string, source_text?: string, translated_text?: string, base64Image?: string, image_url?: string, controller?: AbortController, media_source?: { type: 'dataUrl' | 'remoteUrl'; dataUrl?: string; remoteUrl?: string }): Promise<SendMessageResponse> {
  // 插入[TRACE_SEND_ENTRY]日志，记录sendMessage函数入口第一行
  console.log('[TRACE_SEND_ENTRY]', {
    rawText: text,
    typeofRawText: typeof text,
    rawTextLength: text.length,
    customer_id: customer_id,
    isRawTextEqualCustomerId: text === customer_id,
    callPoint: 'sendMessage_entry',
    media_source: media_source
  });
  
  // 确保 customer_id 和 message_id 存在，不存在则返回失败
  if (!customer_id) {
    console.log('[API_SEND_MESSAGE_SKIP] customer_id missing, skipping');
    return { ok: false, error: 'customer_id missing', message_id };
  }
  if (!message_id) {
    console.log('[API_SEND_MESSAGE_SKIP] message_id missing, skipping');
    return { ok: false, error: 'message_id missing', message_id };
  }
  
  // 重新定义isImageMessage判定（核心修复规则1️⃣）
  const isImageMessage = !!image_url || !!base64Image;
  
  // 统一标准化所有文本字段，确保不包含多余引号
  const normalizedSourceText = normalizeOutboundText(source_text || text);
  const normalizedTranslatedText = normalizeOutboundText(translated_text || text);
  
  // 核心修复规则4️⃣：严禁fake text，不允许自动塞入空格或占位文本
  let finalMessage = text;
  
  // UI层防污染：禁止customerId作为fallback text
  if (finalMessage === customer_id) {
    finalMessage = "";
  }
  
  // 🚫 发送前硬校验：禁止发送空内容消息
  // 核心修复：hasImage的判断条件必须包含image_url存在且非空
  const image_base64 = base64Image || (isImageMessage ? image_url : undefined);
  // hasImage的判断条件必须包含：image_url存在且非空
  const hasImage = Boolean(image_url && image_url.trim() !== '') || Boolean(base64Image) || Boolean(image_base64 && image_base64.trim() !== '');
  
  // 核心修复规则2️⃣：若isImageMessage===true，绝对不允许进入EMPTY_MESSAGE_BLOCKED
  // 核心修复规则3️⃣：图片消息text允许为空字符串
  if (
    (!finalMessage || finalMessage.trim() === '') &&
    !hasImage &&
    !isImageMessage
  ) {
    console.warn('[SEND_MESSAGE_SKIPPED_EMPTY_PAYLOAD]', { customer_id, message_id, finalMessage, isImageMessage, image_url, image_base64, hasImage });
    return {
      ok: false,
      blocked: true,
      reason: 'EMPTY_PAYLOAD_SKIPPED',
      error: 'Empty message content',
      message_id
    };
  }
  
  // 核心修复规则5️⃣：增加致命校验
  if (isImageMessage === true && !hasImage) {
    console.error('[IMAGE_BASE_LOST_IN_OUTBOUND]', { customer_id, message_id, isImageMessage, image_url, image_base64, hasImage });
    throw new Error('IMAGE_BASE_LOST_IN_OUTBOUND');
  }
  
  // 动态获取channel_id：尝试从全局状态获取客户信息，根据channel_sources或其他平台标识设置channel_id
  let channel_id = 19; // 默认值为WhatsApp
  
  // 尝试从window对象获取客户信息（如果在浏览器环境中）
  if (typeof window !== 'undefined') {
    try {
      const customersStore = window['__CUSTOMERS_STORE__'];
      if (customersStore) {
        const customer = customersStore.getState().getCustomerById(customer_id);
        if (customer) {
          const channelSources = customer.channel_sources || [];
          const source = customer.source || '';
          
          console.log('[API_SEND_MESSAGE_CUSTOMER_INFO]', { customer_id, channelSources, source });
          
          if (channelSources.some(s => s.toLowerCase().includes('instagram') || s.toLowerCase().includes('ig')) || 
              source.toLowerCase().includes('instagram') || source.toLowerCase().includes('ig')) {
            channel_id = 29; // Instagram的channel_id
            console.log('[API_SEND_MESSAGE_CHANNEL_ID_SET]', { channel_id: 29, reason: 'Instagram detected' });
          } else {
            channel_id = 19; // WhatsApp的channel_id（默认）
            console.log('[API_SEND_MESSAGE_CHANNEL_ID_SET]', { channel_id: 19, reason: 'WhatsApp (default) or unknown' });
          }
        }
      }
    } catch (error) {
      console.error('[API_SEND_MESSAGE_GET_CUSTOMER_ERROR]', error);
      channel_id = 19;
    }
  }
  
  // 构造 payload - 严格区分消息类型
  const payload: any = {
    message_id,
    customer_id,
    contactId: customer_id,
    channel_id
  };
  
  if (isImageMessage) {
    // 核心修复规则1️⃣：明确使用单一真源字段payload.image_base64
    // 核心修复规则3️⃣：当isImageMessage===true时，强制写入image_base64
    payload.type = "image";
    payload.image_base64 = image_base64; // 统一使用image_base64作为最终outbound字段
    
    // 添加 media_source 字段
    if (media_source) {
      payload.media_source = media_source;
    }
    
    // 图片消息：使用WhatsApp要求的media message格式
    payload.image = {
      link: image_base64, // 使用image_base64作为图片链接
      caption: finalMessage // 可为空，但字段必须存在
    };
    
    // 支持attachments格式，使用image_base64
    payload.attachments = [
      {
        type: 'image',
        url: image_base64 // 使用image_base64作为附件URL
      }
    ];
    
    // 同时兼容旧的file_id格式，避免Worker报错
    payload.file_id = `temp_${Date.now()}_${image_base64?.slice(0, 20) || 'no_url'}`;
  } else {
    // 文本消息：使用text payload
    payload.type = "text";
    payload.text = {
      body: finalMessage
    };
    // 兼容旧的message字段
    payload.message = finalMessage;
  }
  
  // 增强日志记录，便于调试
  console.log("[UI_FINAL_OUTBOUND_PAYLOAD_DETAILS]", {
    channel_id,
    has_attachments: isImageMessage,
    attachment_count: isImageMessage ? 1 : 0,
    has_image_url: !!image_url,
    has_media_source: !!media_source,
    payload_keys: Object.keys(payload),
    isImageMessage,
    message_type: isImageMessage ? 'image' : 'text',
    finalMessage_length: finalMessage.length,
    timestamp: Date.now()
  });
  
  console.log("[UI_FINAL_OUTBOUND_PAYLOAD]", {
    channel_id,
    has_attachments: isImageMessage,
    has_image_url: !!image_url,
    has_media_source: !!media_source,
    message_type: isImageMessage ? 'image' : 'text',
    payload,
    original_body: { base64Image, image_url, text, message_id, customer_id, channel_id, media_source },
    finalMessage
  });
  
  try {
    const response = await fetchApi<SendMessageResponse>('/api/outbound/daojie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit'
    }, controller);
    
    console.log('[OUTBOUND_UI_SEND_SUCCESS]', response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('[OUTBOUND_UI_SEND_ABORTED]', customer_id, message_id);
      // 返回失败响应，而不是抛出错误，确保 sendMessage 函数能正常处理
      return { ok: false, error: 'Request aborted', customer_id, message_id };
    }
    console.error('[OUTBOUND_UI_ERROR]', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error', customer_id, message_id };
  }
}
