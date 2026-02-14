// Import utility functions
import { isTechId } from "../src/utils/user";

// Import unified response utilities
import { ok, fail } from '../utils/response.js';

// 🔴 导入唯一消息裁决模块 V2
import { normalizeMessageV2, assertMessageInvariant } from '../utils/normalizeMessageV2.js';
// 保留旧版normalizeMessage用于兼容现有代码
import { normalizeMessage, validateMessageFields } from '../utils/message_normalization.js';

// Import channel constants for hard isolation
import { CHANNEL, getChannelName, getPlatformName, VALID_CHANNEL_IDS } from '../constants/channel.js';

// Import deal stage awareness module
import { runDealStageDecision } from '../modules/deal_stage_awareness.js';

// Build Fingerprint - used for world alignment
const BUILD_TIME = Date.now();
const BUILD_ID = `jev-rebuild-${BUILD_TIME}`;

// 安全值处理函数：将null、undefined、空字符串和"null"字符串视为缺失
const safe = (v) => (v === null || v === undefined || v === '' || v === 'null') ? '' : String(v);

// 新增：最终名锁定函数 - 增强版，支持更多字段来源
function resolveCustomerName(payload) {
  // 安全获取值，避免空字符串、null、undefined
  const getSafe = (value) => {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
      return null;
    }
    return String(value);
  };
  
  // 尝试从多个层级和字段名中提取客户名称
  const possibleNames = [
    // WhatsApp 特定字段
    getSafe(payload?.from?.name),
    getSafe(payload?.sender?.name),
    getSafe(payload?.user?.name),
    getSafe(payload?.profile?.name),
    
    // 主要联系人字段
    getSafe(payload?.contact?.name),
    getSafe(payload?.contact?.full_name),
    getSafe(payload?.contact?.real_name),
    getSafe(payload?.contact?.display_name),
    getSafe(payload?.contact?.username),
    getSafe(payload?.contact?.nickname),
    
    // 顶层字段
    getSafe(payload?.username),
    getSafe(payload?.name),
    getSafe(payload?.full_name),
    getSafe(payload?.real_name),
    getSafe(payload?.display_name),
    getSafe(payload?.contact_name),
    getSafe(payload?.customer_name),
    getSafe(payload?.user_name),
    
    // 自定义值字段
    getSafe(payload?.custom_values?.real_name),
    getSafe(payload?.custom_values?.name),
    getSafe(payload?.custom_values?.username),
    getSafe(payload?.custom_values?.display_name),
    
    // 客户资料字段
    getSafe(payload?.profile?.full_name),
    getSafe(payload?.profile?.real_name),
    getSafe(payload?.profile?.display_name),
    getSafe(payload?.profile?.username),
    
    // 其他可能的字段
    getSafe(payload?.lead?.name),
    getSafe(payload?.contact_info?.name),
    getSafe(payload?.contact_details?.name),
    
    // 渠道特定字段
    getSafe(payload?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name), // WhatsApp webhook
    getSafe(payload?.entry?.[0]?.messaging?.[0]?.sender?.name), // Facebook/Instagram webhook
    getSafe(payload?.contact?.first_name) + ' ' + getSafe(payload?.contact?.last_name), // WhatsApp contact
    getSafe(payload?.first_name) + ' ' + getSafe(payload?.last_name) // 通用名和姓字段
  ];
  
  // 筛选出第一个有效的名称
  const resolvedName = possibleNames.find(name => name !== null);
  
  // 日志记录，方便调试
  console.log(
    "[NAME_RESOLUTION_DETAILS]",
    JSON.stringify({
      resolvedName: resolvedName,
      triedFields: possibleNames.filter(n => n !== null),
      contactExists: !!payload?.contact,
      profileExists: !!payload?.profile,
      fromExists: !!payload?.from,
      senderExists: !!payload?.sender,
      entryExists: !!payload?.entry
    })
  );
  
  return resolvedName;
}

// 提取 company 的函数
function extractCompany(raw) {
  const company = (
    safe(raw.company) ||
    safe(raw.organization) ||
    safe(raw.profile?.company) ||
    safe(raw.contact?.company) ||
    safe(raw.from?.company) ||
    safe(raw.sender?.company) ||
    ""
  );
  return company ? company : null;
}

// 新增：提取完整客户信息的函数
function extractCustomerInfo(payload) {
  // 安全获取值，避免空字符串、null、undefined
  const getSafe = (value) => {
    if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
      return null;
    }
    return String(value);
  };
  
  // 提取客户信息
  const customerInfo = {
    // 基本信息
    name: resolveCustomerName(payload),
    nickname: getSafe(payload?.contact?.nickname) || getSafe(payload?.from?.nickname) || getSafe(payload?.sender?.nickname) || getSafe(payload?.profile?.nickname),
    username: getSafe(payload?.contact?.username) || getSafe(payload?.from?.username) || getSafe(payload?.sender?.username) || getSafe(payload?.profile?.username),
    first_name: getSafe(payload?.contact?.first_name) || getSafe(payload?.from?.first_name) || getSafe(payload?.sender?.first_name) || getSafe(payload?.profile?.first_name),
    last_name: getSafe(payload?.contact?.last_name) || getSafe(payload?.from?.last_name) || getSafe(payload?.sender?.last_name) || getSafe(payload?.profile?.last_name),
    
    // 联系方式
    phone: getSafe(payload?.phone) || getSafe(payload?.contact_phone) || getSafe(payload?.mobile) || getSafe(payload?.mobile_phone) || getSafe(payload?.phone_number) || getSafe(payload?.contact?.phone) || getSafe(payload?.from?.phone) || getSafe(payload?.sender?.phone) || getSafe(payload?.profile?.phone),
    email: getSafe(payload?.email) || getSafe(payload?.userEmail) || getSafe(payload?.contact?.email) || getSafe(payload?.from?.email) || getSafe(payload?.sender?.email) || getSafe(payload?.profile?.email),
    
    // 其他信息
    country: getSafe(payload?.country) || getSafe(payload?.contact?.country) || getSafe(payload?.from?.country) || getSafe(payload?.sender?.country) || getSafe(payload?.profile?.country),
    language: getSafe(payload?.language) || getSafe(payload?.contact?.language) || getSafe(payload?.from?.language) || getSafe(payload?.sender?.language) || getSafe(payload?.profile?.language),
    company: extractCompany(payload),
    
    // WhatsApp 特定信息
    wa_id: getSafe(payload?.from?.wa_id) || getSafe(payload?.sender?.wa_id) || getSafe(payload?.contact?.wa_id),
    profile_picture_url: getSafe(payload?.profile?.picture_url) || getSafe(payload?.contact?.profile_picture_url) || getSafe(payload?.from?.profile_picture_url) || getSafe(payload?.sender?.profile_picture_url),
    
    // 渠道特定信息
    channel_specific: {
      whatsapp: {
        wa_id: getSafe(payload?.from?.wa_id) || getSafe(payload?.sender?.wa_id) || getSafe(payload?.contact?.wa_id),
        profile_picture: getSafe(payload?.profile?.picture_url) || getSafe(payload?.contact?.profile_picture_url) || getSafe(payload?.from?.profile_picture_url) || getSafe(payload?.sender?.profile_picture_url)
      },
      instagram: {
        instagram_id: getSafe(payload?.entry?.[0]?.messaging?.[0]?.sender?.id) || getSafe(payload?.sender?.id)
      },
      facebook: {
        facebook_id: getSafe(payload?.entry?.[0]?.messaging?.[0]?.sender?.id) || getSafe(payload?.sender?.id)
      }
    }
  };
  
  // 日志记录，方便调试
  console.log(
    "[CUSTOMER_INFO_EXTRACTED]",
    JSON.stringify({
      name: customerInfo.name,
      phone: customerInfo.phone,
      email: customerInfo.email,
      country: customerInfo.country,
      language: customerInfo.language,
      company: customerInfo.company,
      hasWhatsappInfo: !!customerInfo.wa_id || !!customerInfo.profile_picture_url,
      payloadKeys: Object.keys(payload || {})
    })
  );
  
  return customerInfo;
}

export async function handleInboundDaojie(request, env) {
  // Daojie 路由已被软删除，返回 410 Gone
  console.log("[DAOJIE_ROUTE_GONE] Daojie inbound route has been disabled");
  return new Response('Gone', {
    status: 410,
    headers: {
      'Content-Type': 'text/plain'
    }
  });
  
  // 以下是已禁用的旧代码
  console.log("[INBOUND_ROUTE_HIT]");
  
  // Parse request body
  const body = await request.json();
  console.log("[INBOUND_RAW_BODY]", body);
  
  // 临时添加：用于验证 Daojie 实际字段
  console.log("[INBOUND_DAOJIE_RAW_KEYS]", {
    topLevelKeys: Object.keys(body || {}),
    contactKeys: body?.contact ? Object.keys(body.contact) : null
  });
  
  // [INBOUND_RAW_META] 日志：只打印字段摘要
  console.log("[INBOUND_RAW_META]", {
    platform: body?.platform || body?.source || null,
    source: body?.source || body?.channel || null,
    channel: body?.channel || null,
    channel_id: body?.channel_id || body?.source_id || null,
    source_id: body?.source_id || body?.sender_id || null,
    provider: body?.provider || null,
    object: body?.object || (body?.entry?.[0]?.object || null),
    entry: Array.isArray(body?.entry) ? body.entry.length : null,
    messaging: body?.messaging ? true : false,
    messages: body?.messages ? true : false,
    sender_id: body?.sender?.id || body?.sender_id || null,
    recipient_id: body?.recipient?.id || body?.recipient_id || null,
    message_type: body?.message?.type || body?.type || null,
    text_length: body?.message?.text?.length || body?.text?.length || 0,
    hasMedia: !!body?.message?.attachments || !!body?.attachments || false,
    hasImageUrl: !!body?.image_url || !!body?.message?.image_url || !!body?.attachments?.[0]?.image_url || !!body?.message?.attachments?.[0]?.image_url,
    hasMediaUrl: !!body?.media_url || !!body?.message?.media_url || !!body?.attachments?.[0]?.media_url || !!body?.message?.attachments?.[0]?.media_url,
    hasAttachments: !!body?.attachments || !!body?.message?.attachments,
    imageUrl: body?.image_url || body?.message?.image_url || body?.attachments?.[0]?.image_url || body?.message?.attachments?.[0]?.image_url,
    mediaUrl: body?.media_url || body?.message?.media_url || body?.attachments?.[0]?.media_url || body?.message?.attachments?.[0]?.media_url,
    attachmentsCount: body?.attachments?.length || body?.message?.attachments?.length || 0
  });
  
  // Step 1｜修复 sender_id 根因（必做）
  // 统一解析，兜底不为空
  const sender_id = 
    body.sender_id || 
    body.from || 
    body.user_id || 
    body.contact_id || 
    body.chat_id || 
    body.session_id || 
    body.contactId || 
    body.customer_id || 
    body.userId || 
    null;
  
  if (!sender_id) {
    console.error('[INBOUND_ERROR] sender_id missing', body);
    return fail(request, 'SENDER_ID_MISSING', 400);
  }
  
  // Step 2｜规范 customer_id 生成（稳定且一致）
  // 使用sender_id作为customer_id，确保幂等
  const customer_id = String(sender_id);
  
  // 1. 执行最终名锁定函数（在任何 customer 对象创建或更新之前）
  const resolvedName = resolveCustomerName(body);
  
  console.log(
    "[DAOJIE_NAME_RESOLVED]",
    resolvedName,
    JSON.stringify({
      contact: body?.contact,
      custom_values: body?.custom_values
    })
  );
  
  // 2. 处理 resolvedName === null 的情况
  if (resolvedName === null) {
    console.log("[DAOJIE_NAME_STILL_NULL]", JSON.stringify(body));
  }
  
  // 3. 提取完整客户信息
  const customerInfo = extractCustomerInfo(body);
  
  // 4. 直接从 body 中提取字段，不依赖不存在的 extractCustomerNames 函数
  const real_name = resolvedName;
  const display_name = resolvedName || body?.phone || customer_id || "未知客户";
  const customer_name = resolvedName;
  const company = customerInfo.company;
  
  // 结构化诊断日志 - 阶段1只读扫描
  console.log("[INBOUND_DIAGNOSTICS]", {
    channel_type: "daojie",
    source: "webhook",
    contactId: sender_id,
    customer_id: customer_id,
    display_name: display_name,
    real_name: real_name,
    customer_name: customer_name,
    resolvedName: resolvedName,
    has_contact_object: !!body.contact,
    has_profile_object: !!body.profile,
    has_from_object: !!body.from,
    has_sender_object: !!body.sender,
    field_existence: {
      "raw.contact?.name": !!body.contact?.name,
      "raw.contact?.full_name": !!body.contact?.full_name,
      "raw.profile?.name": !!body.profile?.name,
      "raw.profile?.full_name": !!body.profile?.full_name,
      "raw.company": !!body.company,
      "raw.phone": !!body.phone,
      "raw.name": !!body.name,
      "raw.full_name": !!body.full_name,
      "raw.nickname": !!body.nickname,
      "raw.username": !!body.username,
      "raw.customer_name": !!body.customer_name,
      "raw.from?.name": !!body.from?.name,
      "raw.sender?.name": !!body.sender?.name
    }
  });
  
  // 调试日志
  console.log("[DAOJIE_NAME_EXTRACT]", {
    raw: body,
    display_name: display_name,
    real_name: real_name,
    customer_name: customer_name,
    company: company,
    extractedInfo: customerInfo
  });
  
  const standardBody = {
    source: "daojie",
    type: "inbound",
    customer_id: customer_id,
    display_name: display_name,
    real_name: real_name,
    customer_name: resolvedName ?? customer_name ?? null,
    phone: customerInfo.phone || body.phone || body.contact_phone || body.mobile || body.mobile_phone || body.phone_number || "",
    email: customerInfo.email || body.email || body.userEmail || "",
    company: company,
    text: body.message || body.text || "",
    timestamp: Number(body.timestamp) || Date.now()
  };
  
  // 强制断言：必须有 customer_id
  if (!standardBody.customer_id) {
    console.error('[INBOUND_ERROR] Missing customer_id');
    return fail(request, 'customer_id_required', 400);
  }
  
  const customerId = String(standardBody.customer_id);
  const timestamp = standardBody.timestamp;
  const uuid = crypto.randomUUID();
  
  // Step 3: 硬校验 - 对于 WhatsApp 消息，允许文本为空（图片消息）
  const text = standardBody.text;
  // 注意：channel_id 还未定义，将在后面定义，因此需要移到后面进行检查
  
  /**
   * @FREEZE_RULE
   * Inbox role is decided ONLY by is_self.
   * No source / operator / system inference allowed.
   */
  
  // Step 2: 强制修复 role 归类规则（最终一刀）
  // Daojie 入站消息都是客户发来的，所以 is_self 为 false
  const is_self = false;
  const source = 'daojie';
  
  // 唯一规则：只要不是自己发的，一律 customer
  const role = is_self === true ? 'operator' : 'customer';
  
  // 强制写入 inbox 前断言
  if (role !== 'customer') {
    console.log('[INBOUND_NON_CUSTOMER]', { 
      sender_id, 
      source, 
      is_self, 
      textPreview: text?.slice(0, 20),
      customerId: customerId
    });
  } else {
    console.log('[INBOUND_CUSTOMER_MESSAGE]', { 
      sender_id, 
      source, 
      is_self, 
      textPreview: text?.slice(0, 20),
      customerId: customerId
    });
  }
  
  // Step 3: 禁止 system / event 冒充 customer
  if (role === 'system' || role === 'event') {
    console.log('[INBOUND_DROP_NON_CUSTOMER]', { 
      message: standardBody, 
      role: role, 
      source: source 
    });
    return ok(request, { dropped: 'non_customer_role' });
  }
  
  // 识别消息来源平台
  let platform = 'whatsapp'; // 默认 WhatsApp
  let channel_id = CHANNEL.WHATSAPP; // 默认 WhatsApp channel_id
  
  // 检查是否为 Instagram 消息
  const isInstagram = body?.platform === 'instagram' || 
                      body?.source === 'instagram' || 
                      body?.channel === 'instagram' || 
                      body?.provider === 'ig' || 
                      body?.object === 'instagram' ||
                      (body?.entry?.[0]?.object === 'instagram') ||
                      body?.entry?.[0]?.messaging?.[0]?.message?.type?.includes('instagram');
  
  // 如果是 Instagram 消息，使用 IG channel_id
  if (isInstagram) {
    platform = 'instagram';
    channel_id = CHANNEL.INSTAGRAM; // IG channel_id
  }
  
  // 验证 channel_id 是否有效
  if (!VALID_CHANNEL_IDS.includes(channel_id)) {
    console.warn(`[INBOUND_INVALID_CHANNEL] channel_id=${channel_id} is not valid. Using default WhatsApp channel_id=${CHANNEL.WHATSAPP}`);
    channel_id = CHANNEL.WHATSAPP;
    platform = 'whatsapp';
  }
  
  // 确保 platform 和 channel 名称正确
  const channel_name = getChannelName(channel_id);
  const platform_name = getPlatformName(channel_id);
  
  // 更新 platform 为标准化名称
  platform = platform_name;
  
  // Step 3: 硬校验 - 对于 WhatsApp 消息，允许文本为空（图片消息）
  // 现在 channel_id 已经定义，可以进行检查了
  if ((!text || !text.trim()) && !(channel_id === CHANNEL.WHATSAPP || channel_id === CHANNEL.INSTAGRAM)) {
    console.log('[INBOUND_DROP_EMPTY]', { customer_id: customerId, source: 'daojie', channel_id: channel_id });
    return ok(request, { dropped: 'empty_message' });
  }
  
  // 增强：从所有可能的字段中提取媒体信息
  const hasMedia = (
    !!body?.image_url || 
    !!body?.message?.image_url || 
    !!body?.media_url ||
    !!body?.message?.media_url ||
    !!body?.attachments?.length || 
    !!body?.message?.attachments?.length
  );
  
  // 构建完整的 attachments 数组
  let attachments = [];
  if (hasMedia) {
    // 检查是否有现有的 attachments
    const existingAttachments = body?.attachments || body?.message?.attachments || [];
    
    if (existingAttachments.length > 0) {
      // 使用现有的 attachments
      attachments = existingAttachments.map(attachment => ({
        ...attachment,
        source: 'whatsapp',
        messageId: uuid
      }));
    } else {
      // 构造新的 attachments
      attachments = [{
        type: "image",
        source: "whatsapp",
        messageId: uuid,
        preview: null,
        // 添加可能的媒体URL
        url: body?.image_url || body?.message?.image_url || body?.media_url || body?.message?.media_url || null
      }];
    }
  }
  
  // 构建基础消息对象
  const baseMessage = {
    id: uuid,
    message_id: uuid,
    customer_id: customerId,
    text: text,
    type: 'inbound',
    channel: channel_name, // 使用标准化 channel 名称
    channel_id: channel_id, // 使用标准化 channel_id
    platform: platform_name, // 使用标准化 platform 名称
    sender_id: sender_id,
    is_self: is_self,
    role: 'customer', // 明确标记为客户消息
    direction: 'inbound', // 明确标记为入站消息
    created_at: timestamp,
    timestamp: timestamp,
    attachments: attachments, // 完整保留附件信息
    hasAttachments: attachments.length > 0, // 添加 hasAttachments 标志
    // 添加媒体相关字段
    image_url: body?.image_url || body?.message?.image_url || null,
    media_url: body?.media_url || body?.message?.media_url || null
  };
  
  // 添加要求的日志
  console.log(`[INBOUND_MSG_ACCEPTED] channel_id=${channel_id} hasAttachments=${attachments.length > 0} attachments_count=${attachments.length}`);
  
  // 🔴 V2 唯一裁决入口：所有写入inbox的消息必须经过normalizeMessageV2
  // 传递正确的上下文信息，确保消息被严格标准化
  const messagePayload = normalizeMessageV2(baseMessage, {
    kind: 'INBOUND',
    platform: platform_name,
    channel_id: channel_id,
    customer_id: customerId
  });
  
  // 🔴 V2 脏数据拒绝写入：在写入前执行断言检查
  assertMessageInvariant(messagePayload);
  
  // [INBOUND_NORMALIZED_META] 日志：normalize 之后、写入 inbox 之前
  console.log("[INBOUND_NORMALIZED_META]", {
    normalized_channel_id: channel_id,
    normalized_platform: platform,
    normalized_source: source,
    normalized_customer_id: customerId,
    normalized_type: 'inbound',
    normalized_text_length: text.length,
    normalized_media_count: 0 // 目前不支持媒体
  });
  
  // 添加用户要求的[INBOUND_RAW]日志
  console.log('[INBOUND_RAW]', {
    source: 'daojie',
    customer_id: customerId,
    text: text,
    timestamp: timestamp
  });
  
  console.log("[INBOUND_PROCESSED_MESSAGE]", messagePayload);
  
  // Store customer in INBOX_KV (使用新的 KV Key 规范)
  if (env.INBOX_KV) {
    try {
          // 使用 customer:{customer_id} 作为 Key
          const customerKey = `customer:${customerId}`;
          
          // 先尝试读取现有客户数据
          let existingCustomerData = null;
          try {
            const existingRaw = await env.INBOX_KV.get(customerKey);
            if (existingRaw) {
              existingCustomerData = JSON.parse(existingRaw);
              console.log(`[EXISTING_CUSTOMER_DATA]`, existingCustomerData);
            }
          } catch (e) {
            console.error(`[EXISTING_CUSTOMER_READ_ERROR]`, e.message);
          }
          
          // 原子 Upsert 逻辑
          const now = timestamp;
          
          // 构建新的客户数据
          let customerData = {
            customer_id: customerId,
            // 🔴 修复：优先使用提取的客户名称，然后是已有的display_name，最后是customerId
            display_name: customerInfo.name || resolvedName || existingCustomerData?.display_name || standardBody.display_name || customerId,
            real_name: customerInfo.name || real_name || existingCustomerData?.real_name || '',
            nickname: customerInfo.nickname || existingCustomerData?.nickname || '',
            username: customerInfo.username || existingCustomerData?.username || '',
            first_name: customerInfo.first_name || existingCustomerData?.first_name || '',
            last_name: customerInfo.last_name || existingCustomerData?.last_name || '',
            // 使用不可覆盖写入规则：customer_name 只能被设置，不能被置空
            customer_name: existingCustomerData?.customer_name ?? customerInfo.name ?? resolvedName ?? standardBody.customer_name ?? null,
            // 🔴 修复：添加 stable_name 字段，确保前端能正确显示用户名
            stable_name: customerInfo.name || resolvedName || existingCustomerData?.stable_name || existingCustomerData?.customer_name || existingCustomerData?.display_name || customerId,
            phone: customerInfo.phone || standardBody.phone || existingCustomerData?.phone || '',
            email: customerInfo.email || standardBody.email || existingCustomerData?.email || '',
            country: customerInfo.country || existingCustomerData?.country || null,
            language: customerInfo.language || existingCustomerData?.language || null,
            company: customerInfo.company || standardBody.company || existingCustomerData?.company || null,
            // WhatsApp 特定信息
            wa_id: customerInfo.wa_id || existingCustomerData?.wa_id || null,
            profile_picture_url: customerInfo.profile_picture_url || existingCustomerData?.profile_picture_url || null,
            // 渠道特定信息
            channel_specific: {
              ...existingCustomerData?.channel_specific,
              ...customerInfo.channel_specific
            },
            source: 'daojie',
            last_message_at: now,
            last_message_preview: text.slice(0, 100), // 保存最后一条消息预览
            // 🔴 修复：只有customer消息才会增加unread_count
            // 当前消息是入站消息，role=customer，所以增加unread_count
            unread_count: (existingCustomerData?.unread_count || 0) + 1, // 新客户消息，未读数+1
            stage: existingCustomerData?.stage || 'CHAT', // 默认阶段为CHAT
            created_at: existingCustomerData?.created_at || now,
            updated_at: now
          };
          
          // 🔴 新增：为“未命名客户”生成合法displayName
          // 仅在displayName === '未命名客户'时生效，且只执行一次（首次消息）
          const DEFAULT_ANONYMOUS_NAME = '未命名客户';
          if (customerData.display_name === DEFAULT_ANONYMOUS_NAME || customerData.display_name === customerId) {
            // 根据channel_id生成命名
            let channelBasedName;
            switch (channel_id) {
              case CHANNEL.WHATSAPP:
                channelBasedName = 'WhatsApp 客户';
                break;
              case CHANNEL.INSTAGRAM:
                channelBasedName = 'Instagram 客户';
                break;
              default:
                channelBasedName = '新客户';
                break;
            }
            
            console.log('[DISPLAY_NAME_GENERATED]', {
              customerId: customerId,
              oldDisplayName: customerData.display_name,
              newDisplayName: channelBasedName,
              channelId: channel_id,
              channelName: channel_name,
              platform: platform
            });
            
            // 将生成的displayName写入display_name和stable_name（优先）
            customerData.stable_name = channelBasedName;
            customerData.display_name = channelBasedName;
          }
          
          // 应用用户指定的不可覆盖写入规则
          customerData.customer_name =
            customerData.customer_name ??
            resolvedName ??
            customerData.customer_name ??
            null;
          
          // 断言：禁止把 "null" 字符串当合法值写入存储
          if (!customerData.display_name || customerData.display_name === "null") {
            customerData.display_name = customerData.phone || customerData.customer_id;
          }
          
          // 防御性校验：确保 display_name 是字符串类型
          customerData.display_name = String(customerData.display_name);
          
          // 在写入 KV 前，强制再执行一次保护
          if (!customerData.customer_name && resolvedName) {
            customerData.customer_name = resolvedName;
            console.log("[DAOJIE_NAME_FORCED_WRITE]", resolvedName);
          }
          
          // 写入 KV（幂等）
          await env.INBOX_KV.put(
            customerKey,
            JSON.stringify(customerData)
          );
          
          // 打印要求的日志
          console.log(`[INBOUND_WRITE_KEY] key=${customerKey}`);
          console.log(`[INBOUND_WRITE_WORLD] scriptVersion.id=${BUILD_ID}`);
          console.log(`[CUSTOMER_INDEX_UPSERT_OK]`);
          
          // 写入消息到 KV，使用正确的 key 格式：message:{customer_id}:{timestamp}:{uuid}
          const messageKey = `message:${customerId}:${timestamp}:${uuid}`;
          await env.INBOX_KV.put(
            messageKey,
            JSON.stringify(messagePayload)
          );
          console.log(`[KV_MESSAGE_WRITE] ${messageKey}`);
          console.log(`[INBOUND_MESSAGE_STORED] customer_id=${customerId} message_key=${messageKey}`);
          console.log(`[INBOX_WRITE_OK] ${messageKey} ${messagePayload.message_id}`);
          console.log(`[INBOUND_MESSAGE_STORED] customer_id=${customerId} message_key=${messageKey}`);
          
          // ===== 实现强一致索引 =====
          // 1. 读取现有索引
          let customerIndex = [];
          try {
            const indexRaw = await env.INBOX_KV.get("customers:index");
            if (indexRaw) {
              customerIndex = JSON.parse(indexRaw);
              console.log(`[CUSTOMER_INDEX_READ] found ${customerIndex.length} customers`);
            }
          } catch (e) {
            console.error(`[CUSTOMER_INDEX_READ_ERROR]`, e.message);
          }
          
          // 2. 更新索引：
          // - 把当前 customer_id 放到数组头部
          // - 去重
          // - 截断到最多 2000 个
          const updatedIndex = [
            customerId, // 置顶
            ...customerIndex.filter(id => id !== customerId) // 去重
          ].slice(0, 2000); // 截断到最多 2000 个
          
          // 3. 写入更新后的索引
          await env.INBOX_KV.put(
            "customers:index",
            JSON.stringify(updatedIndex)
          );
          console.log(`[CUSTOMER_INDEX_UPDATED] new length: ${updatedIndex.length}`);
          
          // ===== 成交阶段感知裁决模块 V1 =====
          // 调用裁决模块，判断客户当前所处阶段
          // 只在消息成功写入inbox后触发
          await runDealStageDecision(
            env,
            customerId,
            messagePayload.channel_id,
            messagePayload.platform,
            messagePayload.text
          );
      
    } catch (kvError) {
      console.error("[KV_WRITE_ERROR]", kvError.message);
      // Continue execution, return 200 to platform
    }
  } else {
    console.error("[KV_WRITE_ERROR] INBOX_KV binding is undefined");
    // KV 绑定缺失，但不影响主流程
    // 返回成功，即使 KV 写失败
    return ok(request, {
      delivered: true,
      kv_saved: false
    });
  }
  
  console.log('[INBOUND_OK]', { customer_id: customerId, message_id: messagePayload.message_id, source: source });
  
  // ===== 自动回复逻辑（AUTO_REPLY_PIPELINE_V1）=====
  try {
    // 触发条件检查
    // 1. 收到“客户消息”（非 self）
    const isCustomerMessage = role === 'customer' && !messagePayload.is_self;
    // 2. 消息类型为：text
    const isSupportedType = messagePayload.text && messagePayload.text.trim().length > 0;
    // 3. AI 助手开关 = ON（默认ON）
    const aiAssistantEnabled = true;
    // 4. 自动发送开关 = ON（默认ON）
    const autoSendEnabled = true;
    // 5. 当前客户未被人工接管（no human typing / no manual lock）
    const isHumanLocked = false;
    // 6. channel_id ∈ {19, 29}（有效通道）
    const isChannelValid = VALID_CHANNEL_IDS.includes(messagePayload.channel_id);
    
    // 检查是否为媒体消息
    const isMediaMessage = !!body?.image_url || !!body?.message?.image_url || !!body?.attachments || !!body?.message?.attachments;
    
    console.log('[AUTO_REPLY_TRIGGER_CHECK]', {
      isCustomerMessage,
      isSupportedType,
      aiAssistantEnabled,
      autoSendEnabled,
      isHumanLocked,
      isChannelValid,
      channel_id: messagePayload.channel_id,
      platform: messagePayload.platform,
      isMediaMessage,
      hasText: !!messagePayload.text,
      textLength: messagePayload.text?.length || 0
    });
    
    // 媒体消息检测日志
    if (isMediaMessage) {
      console.log('[INBOUND_MEDIA_DETECTED]', {
        customer_id: customerId,
        hasImageUrl: !!body?.image_url || !!body?.message?.image_url,
        hasAttachments: !!body?.attachments || !!body?.message?.attachments,
        mediaType: body?.message?.type || body?.type || 'unknown',
        isTextEmpty: !messagePayload.text || !messagePayload.text.trim()
      });
    }
    
    if (isCustomerMessage && isSupportedType && aiAssistantEnabled && autoSendEnabled && !isHumanLocked && isChannelValid) {
      console.log('[AUTO_REPLY_TRIGGERED] customer_id=' + customerId + ', channel_id=' + messagePayload.channel_id + ', platform=' + messagePayload.platform);
      
      // 获取上下文消息（最近5条客户消息）
        let contextMessages = [];
        let totalMessages = 0;
        let blockedMessages = 0;
        
        if (env.INBOX_KV) {
          // list KV keys with prefix message:{customer_id}:
          const prefix = `message:${customerId}:`;
          const keysResult = await env.INBOX_KV.list({
            prefix: prefix,
            limit: 20 // 获取最近20条消息，用于筛选客户消息
          });
          
          totalMessages = keysResult.keys.length;
          
          // 按 key 中的 timestamp 排序（降序，最新的在前）
          const messageKeys = [...keysResult.keys].sort((a, b) => {
            const aParts = a.name.split(':');
            const bParts = b.name.split(':');
            const aTimestamp = aParts.length >= 4 ? Number(aParts[2]) : 0;
            const bTimestamp = bParts.length >= 4 ? Number(bParts[2]) : 0;
            return bTimestamp - aTimestamp;
          });
          
          // 读取消息并筛选出客户消息
          for (const key of messageKeys) {
            const raw = await env.INBOX_KV.get(key.name);
            if (raw) {
              const message = JSON.parse(raw);
              totalMessages++;
              
              // 强制规则：仅使用 role==='customer' && direction==='inbound' && allowContext===true
              // 任何 agent/ai/outbound 绝对不进入上下文
              if (message.role === 'customer' && message.direction === 'inbound' && message.allowContext === true) {
                contextMessages.push(message);
              } else {
                blockedMessages++;
              }
              
              // 最多只需要5条客户消息
              if (contextMessages.length >= 5) {
                break;
              }
            }
          }
          
          // 按时间排序，确保对话顺序正确（升序，最早的在前）
          contextMessages.sort((a, b) => a.timestamp - b.timestamp);
          
          // 强制日志：AI上下文构建详情
          console.log('[AI_CTX_BUILD]', {
            total: totalMessages,
            allowed: contextMessages.length,
            blocked: blockedMessages,
            customer_id: customerId,
            messages: contextMessages.map(m => ({
              message_id: m.message_id,
              role: m.role,
              direction: m.direction,
              allowContext: m.allowContext,
              text_preview: m.text.slice(0, 20) + (m.text.length > 20 ? '...' : '')
            }))
          });
        }
      
      // 调用 AI 生成回复
      const aiResponse = await fetch(`${env.JEV_WORKER_URL || 'https://api.jevtools.org'}/api/ai/reply/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.AI_API_KEY || 'default'}`
        },
        body: JSON.stringify({
          customerId: customerId,
          contextMessages: contextMessages,
          scene: 'CHAT',
          targetLang: 'en'
        })
      });
      
      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        console.log('[AUTO_REPLY_AI_RESULT]', aiResult);
        
        // 检查 AI 生成结果
        // 1. 置信度 >= 设定阈值（如 0.7）
        const confidenceThreshold = 0.7;
        const hasHighConfidence = aiResult.confidence >= confidenceThreshold;
        // 2. 回复内容非空
        const hasContent = aiResult.reply && aiResult.reply.trim().length > 0;
        // 3. 未命中敏感/不支持类型
        const isSafeReply = !aiResult.reply?.includes('[SYSTEM]') && !aiResult.reply?.includes('[ERROR]');
        
        console.log('[AUTO_REPLY_AI_CHECK]', {
          hasHighConfidence,
          hasContent,
          isSafeReply,
          confidence: aiResult.confidence,
          threshold: confidenceThreshold
        });
        
        if (hasHighConfidence && hasContent && isSafeReply) {
          console.log('[AUTO_REPLY_SEND_TRIGGERED] customer_id=' + customerId);
          
          // 生成AI回复的message_id和timestamp
          const aiReplyTimestamp = Date.now();
          const aiReplyMessageId = `msg-${aiReplyTimestamp}-${Math.random().toString(36).substr(2, 9)}`;
          
          // 构建AI回复的消息对象
          const aiReplyMessage = {
            id: aiReplyMessageId,
            message_id: aiReplyMessageId,
            customer_id: customerId,
            text: aiResult.reply,
            type: 'outbound',
            source: 'ai',
            channel: messagePayload.channel,
            channel_id: messagePayload.channel_id,
            platform: messagePayload.platform,
            sender_id: 'ai-assistant',
            is_self: true,
            role: 'ai',
            direction: 'outbound',
            created_at: aiReplyTimestamp,
            timestamp: aiReplyTimestamp
          };
          
          // 🔴 V2 唯一裁决入口：所有写入inbox的消息必须经过normalizeMessageV2
          const normalizedAIReply = normalizeMessageV2(aiReplyMessage, {
            kind: 'OUTBOUND_AI',
            platform: messagePayload.platform,
            channel_id: messagePayload.channel_id,
            customer_id: customerId
          });
          
          // 🔴 V2 脏数据拒绝写入：在写入前执行断言检查
          assertMessageInvariant(normalizedAIReply);
          
          // 写入AI回复到inbox存储
          if (env.INBOX_KV) {
            const aiReplyKey = `message:${customerId}:${aiReplyTimestamp}:${aiReplyMessageId.split('-').pop()}`;
            try {
              await env.INBOX_KV.put(aiReplyKey, JSON.stringify(normalizedAIReply));
              console.log(`[AI_REPLY_WRITTEN] Written AI reply to INBOX_KV: ${aiReplyKey}`);
            } catch (e) {
              console.error(`[AI_REPLY_WRITE_ERROR] Failed to write AI reply to INBOX_KV: ${e.message}`);
              // 写入失败时继续执行，不中断发送流程
            }
          }
          
          // 调用发送接口发送回复
          const sendResponse = await fetch(`${env.JEV_WORKER_URL || 'https://api.jevtools.org'}/api/daojie/pit/reply`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contactId: customerId,
              message: aiResult.reply,
              locationId: env.DAOJIE_LOCATION_ID
            })
          });
          
          const sendResult = await sendResponse.json();
          console.log('[AUTO_REPLY_SEND_RESULT]', sendResult);
        }
      }
    }
  } catch (error) {
    console.error('[AUTO_REPLY_ERROR]', error.message);
    // 自动回复失败不影响主流程
  }
  
  return ok(request, {});
};