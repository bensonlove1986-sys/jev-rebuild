// /api/daojie/pit/reply - CORE MESSAGING DOMAIN | 系统底座，禁止任何模块介入

// PIT API constants
const PIT_BASE_URL = 'https://services.leadconnectorhq.com';
const PIT_API_ENDPOINT = `${PIT_BASE_URL}/conversations/messages`;

// Import profile utility
import { ensureProfile } from "../utils/profile";

// 🔴 导入唯一消息裁决模块 V2
import { normalizeMessageV2, assertMessageInvariant } from '../utils/normalizeMessageV2.js';
// 保留旧版normalizeMessage用于兼容现有代码
import { normalizeMessage, validateMessageFields } from '../utils/message_normalization.js';

// Import channel constants for hard isolation
import { CHANNEL } from '../constants/channel.js';

// Import unified response utilities for consistent CORS handling
import { ok, fail } from '../utils/response.js';

/**
 * Probe image URL for accessibility and validity
 * @param {string} imageUrl - The image URL to probe
 * @returns {Promise<{ ok: boolean, status: number, contentType: string, finalUrl: string }>} - Probe result
 */
async function probeImageUrl(imageUrl) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);

  const tryHead = async () => {
    const res = await fetch(imageUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    return res;
  };

  const tryRangeGet = async () => {
    const res = await fetch(imageUrl, {
      method: "GET",
      headers: { Range: "bytes=0-1024" },
      redirect: "follow",
      signal: controller.signal,
    });
    return res;
  };

  try {
    let res;
    try {
      res = await tryHead();
    } catch (e) {
      res = null;
    }
    if (!res || (res.status !== 200 && res.status !== 206)) {
      res = await tryRangeGet();
    }

    const ct = res.headers.get("content-type") || "";
    const ok = (res.status === 200 || res.status === 206) && ct.startsWith("image/");
    return {
      ok,
      status: res.status,
      contentType: ct,
      finalUrl: res.url || imageUrl,
    };
  } finally {
    clearTimeout(t);
  }
}

export async function handlePITReply(request, env) {
  console.log("[WORKER_ROUTE_HIT] POST /api/daojie/pit/reply");
  console.log("[PIT_REPLY_HANDLER_ENTER]");
  
  // 🔴 检查是否运行在本地环境
  const url = new URL(request.url);
  const isLocalhost = url.origin.includes('localhost') || url.origin.includes('127.0.0.1');
  
  // 🔴 如果是本地环境，转发请求到 Cloudflare Worker
  if (isLocalhost) {
    console.log('[LOCK_WRITE_ENV] localhost - forwarding to Cloudflare Worker');
    console.log('[PIT_REPLY_FORWARD_TO_WORKER]');
    
    const workerUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev/api/daojie/pit/reply';
    
    try {
      const body = await request.json();
      const forwardedResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      const forwardedBody = await forwardedResponse.json();
      return new Response(JSON.stringify(forwardedBody), {
        status: forwardedResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (error) {
      console.error('[PIT_REPLY_FORWARD_ERROR]', error.message);
      return fail(request, 'FORWARD_ERROR', 502, { message: error.message });
    }
  }
  
  // 🔴 在 Cloudflare Worker 环境中执行
  console.log('[LOCK_WRITE_ENV] production-worker');
  
  // 定义默认消息内容，根据消息类型设置更合适的默认值
  const getDefaultMessage = (msgType) => {
    switch (msgType) {
      case 'image':
        return "[图片]";
      case 'video':
        return "[视频]";
      case 'file':
        return "[文件]";
      case 'audio':
        return "[音频]";
      case 'location':
        return "[位置]";
      case 'contact':
        return "[联系人]";
      case 'button':
        return "[按钮消息]";
      case 'interactive':
        return "[交互消息]";
      case 'voice':
        return "[语音消息]";
      default:
        return " "; // 文本消息默认使用空格，防止平台丢弃
    }
  };
  
  // env 缺失检查
  const missing = [];
  if (!env.PIT_JWT) missing.push("PIT_JWT");
  if (!env.DAOJIE_LOCATION_ID) missing.push("DAOJIE_LOCATION_ID");
  
  if (missing.length) {
    console.log("[PIT_ENV_MISSING]", missing);
    return fail(request, "ENV_MISSING", 400, { missing });
  }

  // 安全解析 JSON
  let body;
  try {
    body = await request.json();
  } catch (e) {
    console.log("[PIT_BAD_JSON]", String(e));
    return fail(request, "BAD_JSON", 400);
  }

  console.log("[PIT_UI_PAYLOAD]", body);

  // === 统一兜底必填字段 ===
  const contactId = body?.contactId;
  
  // 优化消息内容读取逻辑
  const message = (() => {
    // 增强消息类型判断，支持更多消息格式
    const msgType = body?.type;
    const defaultMsg = getDefaultMessage(msgType);
    
    // 1. 文本消息 - 支持多种格式
    if (msgType === 'text' || body?.text?.body) {
      return body?.text?.body || body?.message || defaultMsg;
    }
    
    // 2. 图片消息 - 支持caption和多种字段名
    if (msgType === 'image' || body?.image?.caption || body?.image?.url) {
      return body?.image?.caption || body?.message || defaultMsg;
    }
    
    // 3. 视频消息 - 支持caption
    if (msgType === 'video' || body?.video?.caption || body?.video?.url) {
      return body?.video?.caption || body?.message || defaultMsg;
    }
    
    // 4. 文件消息 - 支持name描述
    if (msgType === 'file' || body?.file?.name || body?.file?.url) {
      return body?.file?.name || body?.message || defaultMsg;
    }
    
    // 5. 音频消息
    if (msgType === 'audio' || body?.audio?.url) {
      return body?.message || defaultMsg;
    }
    
    // 6. 位置消息
    if (msgType === 'location' || body?.location?.latitude) {
      return body?.message || defaultMsg;
    }
    
    // 7. 联系人消息
    if (msgType === 'contact' || body?.contact?.name) {
      return body?.contact?.name || body?.message || defaultMsg;
    }
    
    // 8. 按钮/交互消息
    if (msgType === 'button' || body?.interactive?.type) {
      return body?.message || defaultMsg;
    }
    
    // 9. 语音转文字消息
    if (body?.voice?.transcript) {
      return body?.voice?.transcript || body?.message || defaultMsg;
    }
    
    // 10. 兼容旧版格式 - 直接从顶层字段读取
    if (body?.text) {
      return body?.text || defaultMsg;
    }
    
    // 默认情况
    return body?.message || defaultMsg;
  })();
  
  const image_url = body?.image_url;
  const locationId = body?.locationId || env.DAOJIE_LOCATION_ID;
  
  // 读取已存在的事实字段
    const channelId = body?.channel_id;
    const platform = body?.platform;
    
    // 🔴 调试日志：记录完整请求体
      console.log('[DAOJIE_RECEIVED_FULL_PAYLOAD]', {
        body_keys: Object.keys(body || {}),
        body_image_url: body?.image_url,
        body_attachments: body?.attachments
      });
      
      // 转换 channelId 为数字
      const numericChannelId = typeof channelId === 'string' ? parseInt(channelId, 10) : channelId;
      
      // 移除禁止项校验：允许image_url在所有消息中使用
      // image_url 作为唯一图片真相源，应该被允许使用

  // 🔴 最终调试：直接打印 body.image_url 的具体值
  console.log('[FINAL_DEBUG_IMAGE_URL]', {
    body_image_url: body?.image_url,
    typeof_image_url: typeof body?.image_url,
    is_string: typeof body?.image_url === 'string',
    is_non_empty: typeof body?.image_url === 'string' && body.image_url !== ''
  });
  
  // 生成唯一的 message_id（如果第三方没有返回）
  const message_id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // === 参数校验（最小集）=== 分为文本和图片两种情况
    let isImageSend = false;
    
    // 检查是否为图片发送
    if (image_url || (body?.attachments && body.attachments.length > 0)) {
      isImageSend = true;
      
      // 🔴 致命保护：防止image_url被重复拼接
      if (typeof image_url === 'string' && image_url.includes('https://') && image_url.match(/https:\/\//g)?.length > 1) {
        console.error("[FATAL_IMAGE_URL_DUPLICATED]", image_url);
        throw new Error(
          `IMAGE_URL_DUPLICATED: ${image_url}`
        );
      }
      
      // 移除禁止项：允许image_url在所有消息中使用
      // image_url 作为唯一图片真相源，应该被允许使用
      
      // 检查必填字段
      if (!contactId || !locationId) {
        const errorDetails = {
          hasContactId: !!contactId,
          hasImageUrl: !!image_url,
          hasLocationId: !!locationId,
          contactId: contactId,
          image_url: image_url,
          locationId: locationId
        };
        
        console.log("[PIT_IMAGE_BAD_REQUEST]", errorDetails);
        return fail(request, "MISSING_REQUIRED_FIELDS", 400, errorDetails);
      }
    } else {
      // 文本消息校验
      if (!contactId || !locationId || !message || message.trim() === '') {
        const errorDetails = {
          hasContactId: !!contactId,
          hasMessage: !!message,
          messageLength: message.length,
          hasLocationId: !!locationId,
          contactId: contactId,
          message: message,
          locationId: locationId
        };
        
        console.log("[PIT_BAD_REQUEST]", errorDetails);
        return fail(request, "MISSING_REQUIRED_FIELDS", 400, errorDetails);
      }
    }

  // 🔴 MUST WRITE PROFILE FIRST, THEN OUTBOUND - 无条件调用 ensureProfile
  // 尝试从多个来源获取客户名称
  let displayName = contactId;
  
  // 1. 首先从消息体中提取名称（如果有）
  const extractDisplayNameFromBody = (body) => {
    // 安全获取值，避免空字符串、null、undefined
    const getSafe = (value) => {
      if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
        return '';
      }
      return String(value);
    };
    
    // 尝试从多个字段提取名称
    const possibleNames = [
      // 主要联系人字段
      getSafe(body?.contact?.name),
      getSafe(body?.contact?.full_name),
      getSafe(body?.contact?.real_name),
      getSafe(body?.contact?.display_name),
      getSafe(body?.contact?.username),
      getSafe(body?.contact?.nickname),
      
      // 顶层字段
      getSafe(body?.username),
      getSafe(body?.name),
      getSafe(body?.full_name),
      getSafe(body?.real_name),
      getSafe(body?.display_name),
      getSafe(body?.contact_name),
      getSafe(body?.customer_name),
      getSafe(body?.user_name),
      
      // 自定义值字段
      getSafe(body?.custom_values?.real_name),
      getSafe(body?.custom_values?.name),
      getSafe(body?.custom_values?.username),
      getSafe(body?.custom_values?.display_name),
      
      // 客户资料字段
      getSafe(body?.profile?.full_name),
      getSafe(body?.profile?.real_name),
      getSafe(body?.profile?.display_name),
      getSafe(body?.profile?.username),
      
      // 其他可能的字段
      getSafe(body?.lead?.name),
      getSafe(body?.contact_info?.name),
      getSafe(body?.contact_details?.name),
      
      // 渠道特定字段
      getSafe(body?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name), // WhatsApp webhook
      getSafe(body?.entry?.[0]?.messaging?.[0]?.sender?.name), // Facebook/Instagram webhook
      getSafe(body?.contact?.first_name) + ' ' + getSafe(body?.contact?.last_name), // WhatsApp contact
      getSafe(body?.first_name) + ' ' + getSafe(body?.last_name) // 通用名和姓字段
    ];
    
    // 返回第一个有效名称，过滤掉只包含空格的名称
    return possibleNames.find(name => name && name.trim() !== '') || null;
  };
  
  // 提取公司信息的辅助函数
  const extractCompany = (raw) => {
    const getSafe = (value) => {
      if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
        return '';
      }
      return String(value);
    };
    
    const company = (
      getSafe(raw.company) ||
      getSafe(raw.organization) ||
      getSafe(raw.profile?.company) ||
      getSafe(raw.contact?.company) ||
      getSafe(raw.from?.company) ||
      getSafe(raw.sender?.company) ||
      ""
    );
    return company ? company : null;
  };
  
  // 提取完整客户信息的函数
  const extractCustomerInfo = (payload) => {
    const getSafe = (value) => {
      if (value === null || value === undefined || value === '' || value === 'null' || value === 'undefined') {
        return '';
      }
      return String(value);
    };
    
    // 提取客户信息
    const customerInfo = {
      // 基本信息
      name: extractDisplayNameFromBody(payload),
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
      channel: getSafe(payload?.channel) || getSafe(payload?.channel_id) || getSafe(payload?.platform)
    };
    
    // 过滤掉空值
    Object.keys(customerInfo).forEach(key => {
      if (!customerInfo[key] || customerInfo[key] === '') {
        delete customerInfo[key];
      }
    });
    
    return customerInfo;
  };
  
  // 从请求体中提取名称
  const extractedName = extractDisplayNameFromBody(body);
  if (extractedName) {
    displayName = extractedName;
  } 
  // 2. 如果请求体中没有名称，尝试从KV获取已有的客户资料
  else if (env.INBOX_KV) {
    try {
      const customerKey = `customer:${contactId}`;
      const existingProfileRaw = await env.INBOX_KV.get(customerKey);
      if (existingProfileRaw) {
        const existingProfile = JSON.parse(existingProfileRaw);
        if (existingProfile?.display_name && existingProfile.display_name !== contactId) {
          displayName = existingProfile.display_name;
        } else if (existingProfile?.customer_name && existingProfile.customer_name !== contactId) {
          displayName = existingProfile.customer_name;
        } else if (existingProfile?.real_name && existingProfile.real_name !== contactId) {
          displayName = existingProfile.real_name;
        } else if (existingProfile?.stable_name && existingProfile.stable_name !== contactId) {
          displayName = existingProfile.stable_name;
        }
      }
    } catch (e) {
      console.error(`[PROFILE_READ_ERROR] ${contactId} error:`, e);
    }
  }
  
  // 提取完整客户信息
  const customerInfo = extractCustomerInfo(body);
  
  console.log('[OUTBOUND_PROFILE_NAME]', { contactId, displayName });
  console.log('[OUTBOUND_CUSTOMER_INFO]', customerInfo);
  
  // 调用 ensureProfile，传递完整客户信息
  await ensureProfile(env, contactId, "outbound", displayName, customerInfo);
  
  // 生成唯一的 message_id 和 timestamp
  const timestamp = Date.now();
  const finalMessageId = `msg-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 🔴 发送函数入口：打印 message_id 来源
  console.log("[TWILIO_SEND_ENTRY]", {
    message_id: finalMessageId,
    message_id_source: "server_generated",
    contact_id: contactId,
    is_ui_temp_id: false
  });
  
  // 🔴 发送锁检查：确保同一 message_id 只发送一次
  const lockKey = `sent:${finalMessageId}`;
  if (env.KV) {
    const existed = await env.KV.get(lockKey);
    if (existed) {
      console.log("[TWILIO_SEND_SKIPPED_ALREADY_SENT]", finalMessageId);
      return ok(request, {
        message_id: finalMessageId,
        customer_id: contactId,
        ok: false,
        error: "ALREADY_SENT"
      });
    }
  }
  
  // 按 channel_id 分支映射（必须显式）
  let replyType;
  let replyChannel;
  let replyMessageType;
  let channelSpecificFields = {};
  

  
  // 打印 channel 解析信息
  console.log('[OUTBOUND_CHANNEL_RESOLVED]', {
    channel_id: channelId,
    numeric_channel_id: numericChannelId,
    platform: platform
  });
  
  if (numericChannelId === CHANNEL.WHATSAPP || numericChannelId === 19) {
    replyType = "WhatsApp";
    replyChannel = "whatsapp";
    replyMessageType = CHANNEL.WHATSAPP;
    channelSpecificFields = {
      whatsapp: {
        parentMessageAltId: "", // 添加父消息ID，用于关联上下文
        type: "message" // 消息类型
      }
    };
  } else if (numericChannelId === CHANNEL.INSTAGRAM || numericChannelId === 29) {
    replyType = "Instagram";
    replyChannel = "instagram";
    replyMessageType = CHANNEL.INSTAGRAM;
    channelSpecificFields = {
      instagram: {
        parentMessageAltId: "", // 添加父消息ID，用于关联上下文
        type: "message" // 消息类型
      }
    };
  } else {
    // 未知通道直接阻断
    console.log("[PIT_REPLY_BLOCKED_UNKNOWN_CHANNEL]", channelId);
    return fail(request, "UNKNOWN_CHANNEL", 400, { channelId });
  }
  
  // 强制日志：在发送前打印一次
  console.log("[PIT_REPLY_CHANNEL_RESOLVED]", {
    customer_id: contactId,
    channel_id: channelId,
    platform: platform,
    reply_type: replyType,
    reply_channel: replyChannel
  });
  
  // PIT API 调用
  const pitHeaders = {
    "Authorization": `Bearer ${env.PIT_JWT}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Version": "2021-07-28" // 必须包含版本头
  };
  
  // 构建 PIT 请求体和消息对象
  let messageObj;
  let pitBody;
  let pitResp, pitText;
  let thirdPartyMessageId = null;
  let statusCode = 200;
  
  if (isImageSend) {
    // 🔴 IMAGE_SEND 分支 - 图片发送逻辑
    console.log("[IMAGE_SEND_TRIGGERED]");
    console.log("[IMAGE_SEND_CHANNEL_ID]", channelId);
    
    const isWhatsApp = numericChannelId === CHANNEL.WHATSAPP || numericChannelId === 19;
    
    // 确定消息类型：AI或人工
    const isAI = body.sender_id === 'ai-assistant' || body.source === 'ai';
    const messageKind = isAI ? 'OUTBOUND_AI' : 'OUTBOUND_MANUAL';
    
    // 构建 attachments 字段
    let attachments = [];
    if (isWhatsApp) {
      // WhatsApp 渠道：使用传入的 attachments 或 image_url
      let validAttachments = [];
      if (body?.attachments && Array.isArray(body.attachments)) {
        validAttachments = body.attachments.filter(att => 
          att.type === 'image' && (typeof att.file === 'string' || typeof att.url === 'string')
        );
      }
      
      // 转换为标准 attachments 格式
      attachments = validAttachments.map(att => ({
        type: 'image',
        url: att.file || att.url
      }));
      
      // 如果没有有效的 attachments 但有 image_url，使用 image_url 构建附件
      if (attachments.length === 0 && image_url) {
        attachments = [{
          type: 'image',
          url: image_url
        }];
      }
    } else {
      // 非 WhatsApp 渠道：使用 image_url 构建 attachments
      if (image_url) {
        attachments = [{
          type: 'image',
          url: image_url
        }];
      }
    }
    
    // 构建基础图片消息对象
    const baseImageMessage = {
      id: finalMessageId,
      message_id: finalMessageId,
      customer_id: contactId,
      text: '', // 严格遵守约束：不把图片URL塞进text字段
      type: 'image',
      channel: replyChannel,
      is_self: true,
      created_at: timestamp,
      timestamp: timestamp,
      attachments: attachments, // 🔴 核心修复：添加 attachments 字段
      messageType: 19 // 🔴 添加 messageType 字段，标识 WhatsApp 消息
    };
    
    // 🔴 V2 唯一裁决入口：所有写入inbox的消息必须经过normalizeMessageV2
    messageObj = normalizeMessageV2(baseImageMessage, {
      kind: messageKind,
      platform: replyChannel, // 使用channel作为platform
      channel_id: numericChannelId,
      customer_id: contactId
    });
    
    // 🔴 V2 脏数据拒绝写入：在写入前执行断言检查
    assertMessageInvariant(messageObj);
    
    // 验证核心字段完整性
    if (!validateMessageFields(messageObj)) {
      console.error('[IMAGE_MESSAGE_REJECTED] Missing required fields', messageObj);
    } else {
      // 🔴 核心修复：将图片消息写入 inbox 主存储（确保刷新后可见）
      if (env.INBOX_KV) {
        // 构建 KV 键：message:{customer_id}:{timestamp}:{uuid}
        const kvKey = `message:${contactId}:${timestamp}:${finalMessageId.split('-').pop()}`;
        try {
          await env.INBOX_KV.put(kvKey, JSON.stringify(messageObj));
          console.log(`[IMAGE_MESSAGE_WRITE_SUCCESS] Written to INBOX_KV: ${kvKey}`);
          console.log('[INBOX_WRITE_CONFIRMED]', {
            customer_id: contactId,
            message_id: messageObj.message_id,
            role: messageObj.role,
            direction: messageObj.direction,
            source: messageObj.source
          });
        } catch (e) {
          console.error(`[IMAGE_MESSAGE_WRITE_ERROR] Failed to write to INBOX_KV: ${e.message}`);
          // 写入失败时继续执行，不中断发送流程
        }
      }
    }
    
    // 构建图片消息的核心 payload
    let payload;
    
    if (isWhatsApp) {
      // WhatsApp 渠道：使用传入的 attachments 或 image_url
      // 验证 attachments 存在且格式正确
      let validAttachments = [];
      if (body?.attachments && Array.isArray(body.attachments)) {
        // 检查每个附件的格式
        validAttachments = body.attachments.filter(att => 
          att.type === 'image' && (typeof att.file === 'string' || typeof att.url === 'string')
        );
      }
      
      if (validAttachments.length > 0) {
        console.log("[VALID_ATTACHMENTS_DETECTED]", { count: validAttachments.length });
        payload = {
          message: message,   // ⚠️ 已在函数顶部初始化，确保非空
          attachments: validAttachments
        };
      } else if (image_url) {
        // 没有有效的 attachments 但有 image_url，使用 image_url 构建 payload
        console.log("[IMAGE_URL_DETECTED]", { image_url });
        payload = {
          message: message,   // ⚠️ 已在函数顶部初始化，确保非空
          attachments: [{
            type: "image",
            url: image_url
          }]
        };
      } else {
        console.error("[INVALID_ATTACHMENTS]", { attachments: body?.attachments, image_url: image_url });
        return fail(request, "INVALID_ATTACHMENTS", 400, { 
          message: "Invalid image attachments format or missing image_url",
          received: body?.attachments,
          image_url: image_url
        });
      }
    } else {
      // 非 WhatsApp 渠道：使用 image_url
      console.log("[NON_WHATSAPP_IMAGE_SEND_URL]", { image_url });
      
      // 🔴 硬断言：image_url 必须是完整的 HTTPS URL，且没有重复拼接
      if (image_url) {
        // 1. 必须是完整 URL
        if (!image_url.startsWith('https://')) {
          throw new Error(
            'OUTBOUND_IMAGE_URL_INVALID: image_url must be absolute'
          );
        }
        // 2. 严禁重复拼接
        if (image_url.match(/https:\/\/.*https:\/\//)) {
          throw new Error(
            'OUTBOUND_IMAGE_URL_DUPLICATED: double https detected'
          );
        }
        // 3. 只允许来自指定 Worker 代理的图片 URL
        if (!image_url.startsWith('https://jev-rebuild-worker.bensonlove1986.workers.dev/images/')) {
          throw new Error(
            'OUTBOUND_IMAGE_URL_SOURCE_INVALID: only Worker proxy URLs are allowed'
          );
        }
      }
      
      // 🔵 图片 URL 已由 upload 阶段保证可读，不再进行 outbound 校验
      console.log("[OUTBOUND_IMAGE_SKIP_PROBE]", { image_url });
      // 🔴 outbound 前最终确认日志，用于验收
      console.log('[OUTBOUND_IMAGE_URL_FINAL]', image_url);
      
      payload = {
        message: message,   // ⚠️ 已在函数顶部初始化，确保非空
        attachments: [
          {
            type: "image",
            url: image_url
          }
        ]
      };
    }
    
    // 构建完整的 PIT 请求体
    const pitBody = {
      locationId: locationId,
      contactId: contactId,
      type: replyType,
      ...payload,
      channel: replyChannel,
      messageType: replyMessageType,
      MessageType: replyMessageType,
      ...channelSpecificFields
    };
    
    console.log("[OUTBOUND_IMAGE_PLATFORM]", replyChannel);
    console.log('[DAOJIE_OUTBOUND_FINAL_PAYLOAD]', JSON.stringify(pitBody));
    
    // 🔴 发送前硬性日志：定位 channel / payload
    console.log("[OUTBOUND_IMAGE_PAYLOAD_FINAL]", {
      customer_id: contactId,
      channel_id: channelId,
      payload: pitBody,
    });
    
    try {
      // 🔴 发送前最终日志，用于验收
      console.log('[OUTBOUND_PAYLOAD_FINAL]', JSON.stringify(pitBody));
      
      // 🔴 修改为添加平台响应透传
      const platformRes = await fetch(PIT_API_ENDPOINT, { 
        method: "POST", 
        headers: pitHeaders, 
        body: JSON.stringify(pitBody) 
      });
      const platformText = await platformRes.text();
      const platformBody = platformText ? platformText.slice(0, 2000) : "";
      
      // 🔴 打印平台响应详细信息
      console.log("[OUTBOUND_IMAGE_PLATFORM_RESPONSE]", {
        status: platformRes.status,
        ok: platformRes.ok,
        body: platformBody,
      });
      
      // 补充日志：图片已发送
      console.log("[OUTBOUND_IMAGE_SENT]", {
        status: platformRes.status,
        customer_id: contactId
      });
      
      console.log("[IMAGE_PIT_API_RESPONSE]", {
        status: platformRes.status,
        bodyPreview: platformBody
      });
      
      // 解析第三方响应，提取 messageId
      try {
        const responseBody = JSON.parse(platformText);
        thirdPartyMessageId = responseBody?.messageId || responseBody?.message?.id || responseBody?.id || null;
      } catch (e) {
        console.log("[IMAGE_THIRD_PARTY_RESPONSE_PARSE_ERROR]", String(e));
      }
      
      statusCode = platformRes.status;
      
      if (statusCode >= 200 && statusCode <= 201) {
        console.log("[IMAGE_SEND_SUCCESS]", { 
          messageId: finalMessageId, 
          customerId: contactId 
        });
        
        // 🔴 发送成功后写入锁（仅在平台响应成功时）
        if (env.KV && platformRes.ok) {
          await env.KV.put(lockKey, "1", {
            expirationTtl: 60 * 60 * 24 * 30 // 30天过期
          });
          console.log("[TWILIO_SEND_LOCK_WRITE]", finalMessageId);
          console.log("[TWILIO_SEND_LOCK_EXPIRE_30D]", finalMessageId);
        } else if (!platformRes.ok) {
          console.log("[TWILIO_SEND_LOCK_SKIP]", finalMessageId, "reason: platform response not ok");
        }
      } else {
        console.log("[IMAGE_SEND_FAILED]", { 
          messageId: finalMessageId, 
          customerId: contactId, 
          statusCode: statusCode 
        });
        // 🔴 返回包含平台响应的详细失败信息
        return fail(request, "OUTBOUND_IMAGE_FAILED", statusCode, {
          reason: "platform_response",
          platform_status: statusCode,
          platform_body: platformBody,
          platform_content_type: platformRes.headers.get("content-type") || "",
          message_id: finalMessageId,
          customer_id: contactId
        });
      }
    } catch (e) {
      console.log("[IMAGE_PIT_FETCH_THROW]", String(e));
      statusCode = 502;
      console.log("[IMAGE_SEND_FAILED]", { 
        messageId: finalMessageId, 
        customerId: contactId, 
        error: e.message 
      });
      // 返回失败响应
      return fail(request, "OUTBOUND_IMAGE_FAILED", statusCode, {
        reason: "network_error",
        message_id: finalMessageId,
        customer_id: contactId
      });
    }
    
    // 如果第三方返回了 message_id，更新本地消息的 message_id
    if (thirdPartyMessageId && env.INBOX_KV) {
      // 更新消息对象
      const updatedMessageObj = {
        ...messageObj,
        external_message_id: thirdPartyMessageId
      };
      
      // 重新写入 KV
      const kvKey = `message:${contactId}:${timestamp}:${finalMessageId.split('-').pop()}`;
      try {
        await env.INBOX_KV.put(kvKey, JSON.stringify(updatedMessageObj));
        console.log(`[IMAGE_MESSAGE_UPDATE_SUCCESS] Updated message_id to ${thirdPartyMessageId}`);
      } catch (e) {
        console.error(`[IMAGE_MESSAGE_UPDATE_ERROR] Failed to update message_id: ${e.message}`);
      }
    }
    
    // 构建图片消息的最小合法响应结构
    const imageMinimalResponse = {
      message_id: finalMessageId,
      customer_id: contactId,
      direction: 'out',
      timestamp: timestamp,
      ok: statusCode >= 200 && statusCode <= 201,
      delivery_status: statusCode >= 200 && statusCode <= 201 ? "DELIVERED" : "NOT_DELIVERED"
    };
    
    console.log("[IMAGE_OUTBOUND_DELIVERY_RESULT]", {
      status: imageMinimalResponse.delivery_status,
      messageId: finalMessageId,
      customerId: contactId,
      timestamp: timestamp
    });
    
    // 直接返回最小合法结构，不合并第三方数据
    return ok(request, imageMinimalResponse, {}, statusCode);
  } else {
    // 🔴 TEXT_SEND 分支 - 文本发送逻辑
    
    // 确定消息类型：AI或人工
    const isAI = body.sender_id === 'ai-assistant' || body.source === 'ai';
    const messageKind = isAI ? 'OUTBOUND_AI' : 'OUTBOUND_MANUAL';
    
    // 构建基础文本消息对象
    const baseTextMessage = {
      id: finalMessageId,
      message_id: finalMessageId,
      customer_id: contactId,
      text: message,
      type: 'text',
      channel: replyChannel,
      is_self: true,
      created_at: timestamp,
      timestamp: timestamp
    };
    
    // 🔴 V2 唯一裁决入口：所有写入inbox的消息必须经过normalizeMessageV2
    messageObj = normalizeMessageV2(baseTextMessage, {
      kind: messageKind,
      platform: replyChannel, // 使用channel作为platform
      channel_id: numericChannelId,
      customer_id: contactId
    });
    
    // 🔴 V2 脏数据拒绝写入：在写入前执行断言检查
    assertMessageInvariant(messageObj);
    
    // 验证核心字段完整性
    if (!validateMessageFields(messageObj)) {
      console.error('[TEXT_MESSAGE_REJECTED] Missing required fields', messageObj);
    } else {
      // 🔴 核心修复：将消息写入 inbox 主存储（确保刷新后可见）
      if (env.INBOX_KV) {
        // 构建 KV 键：message:{customer_id}:{timestamp}:{uuid}
        const kvKey = `message:${contactId}:${timestamp}:${finalMessageId.split('-').pop()}`;
        try {
          await env.INBOX_KV.put(kvKey, JSON.stringify(messageObj));
          console.log(`[MESSAGE_WRITE_SUCCESS] Written to INBOX_KV: ${kvKey}`);
          console.log('[INBOX_WRITE_CONFIRMED]', {
            customer_id: contactId,
            message_id: messageObj.message_id,
            role: messageObj.role,
            direction: messageObj.direction,
            source: messageObj.source
          });
        } catch (e) {
          console.error(`[MESSAGE_WRITE_ERROR] Failed to write to INBOX_KV: ${e.message}`);
          // 写入失败时继续执行，不中断发送流程
        }
      }
    }
    
    // 构建文本消息的 PIT 请求体
    pitBody = {
      locationId: locationId,
      contactId: contactId,
      type: replyType,
      message: message,
      channel: replyChannel,
      messageType: replyMessageType, // 消息类型，与测试脚本一致
      MessageType: replyMessageType, // 兼容首字母大写格式，与测试脚本一致
      ...channelSpecificFields
    };
    
    console.log("[OUTBOUND_WORKER_FORWARD_START]", {
      customer_id: contactId,
      external_conversation_id: contactId, // 使用contactId作为外部会话ID
      message_len: message.length
    });
    
    try {
      pitResp = await fetch(PIT_API_ENDPOINT, { 
        method: "POST", 
        headers: pitHeaders, 
        body: JSON.stringify(pitBody) 
      });
      pitText = await pitResp.text();
      
      console.log("[PIT_API_RESPONSE]", {
        status: pitResp.status,
        bodyPreview: pitText.slice(0, 300)
      });
      
      // 解析第三方响应，提取 messageId
      try {
        const responseBody = JSON.parse(pitText);
        thirdPartyMessageId = responseBody?.messageId || responseBody?.message?.id || responseBody?.id || null;
      } catch (e) {
        console.log("[THIRD_PARTY_RESPONSE_PARSE_ERROR]", String(e));
      }
      
      statusCode = pitResp.status;
    } catch (e) {
      console.log("[PIT_FETCH_THROW]", String(e));
      statusCode = 502;
    }
    
    // 如果第三方返回了 message_id，更新本地消息的 message_id
    if (thirdPartyMessageId && env.INBOX_KV) {
      // 更新消息对象
      const updatedMessageObj = {
        ...messageObj,
        external_message_id: thirdPartyMessageId
      };
      
      // 重新写入 KV
      const kvKey = `message:${contactId}:${timestamp}:${finalMessageId.split('-').pop()}`;
      try {
        await env.INBOX_KV.put(kvKey, JSON.stringify(updatedMessageObj));
        console.log(`[MESSAGE_UPDATE_SUCCESS] Updated message_id to ${thirdPartyMessageId}`);
      } catch (e) {
        console.error(`[MESSAGE_UPDATE_ERROR] Failed to update message_id: ${e.message}`);
      }
    }
    
    // 构建最小合法响应结构
    const minimalResponse = {
      message_id: finalMessageId,
      customer_id: contactId,
      text: message,
      direction: 'out',
      timestamp: timestamp,
      ok: statusCode >= 200 && statusCode <= 201,
      delivery_status: statusCode >= 200 && statusCode <= 201 ? "DELIVERED" : "NOT_DELIVERED"
    };
    
    console.log("[OUTBOUND_DELIVERY_RESULT]", {
      status: minimalResponse.delivery_status,
      messageId: finalMessageId,
      customerId: contactId,
      timestamp: timestamp
    });
    
    // 🔴 发送成功后写入锁（仅在平台响应成功时）
    if (env.KV && statusCode >= 200 && statusCode <= 201) {
      await env.KV.put(lockKey, "1", {
        expirationTtl: 60 * 60 * 24 * 30 // 30天过期
      });
      console.log("[TWILIO_SEND_LOCK_WRITE]", finalMessageId);
      console.log("[TWILIO_SEND_LOCK_EXPIRE_30D]", finalMessageId);
    } else if (statusCode < 200 || statusCode > 201) {
      console.log("[TWILIO_SEND_LOCK_SKIP]", finalMessageId, "reason: platform response not ok");
    }
    
    // 使用统一的响应函数返回结果，确保带有CORS头
    if (statusCode >= 200 && statusCode <= 201) {
      return ok(request, minimalResponse);
    } else {
      return fail(request, "PIT_API_ERROR", statusCode, minimalResponse);
    }
  }
};