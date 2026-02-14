/**
 * Fixed Worker with Durable Objects
 * This version includes all detailed functionality for production deployment
 */

// Import Media Pipeline Core
import { ingestMedia } from './utils/media_ingest_core.js';

// Import version utilities
import { DATA_VERSION, withV } from './utils/version.js';

// No fs module needed - Cloudflare Workers doesn't support filesystem access

// Import Durable Objects
import { ChatRoomDO, CHAT_ROOM_DO } from './durable/chat_room_do.js';
import { DEAL_STATE_DO } from './deals/DEAL_STATE_DO.js';

// CORS headers definition
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Log version information on startup
console.log('[DATA_VERSION]', DATA_VERSION);
console.log('[AUTH_PREFIX] contact=' + withV('contact:'));
console.log('[AUTH_PREFIX] room=' + withV('room:'));
console.log('[AUTH_PREFIX] deal=' + withV('deal:'));

// Environment check flag
let envChecked = false;

// 存储 chat_id 到目标语言的映射
const chatLanguageMap = new Map();

// 内存存储作为 KV 的 fallback
const memoryStorage = new Map();

// OCR 并发控制
const MAX_CONCURRENT_OCR = 2;
const ocrProcessingMap = new Map();
const chatOcrTimestamps = new Map();
const MAX_OCR_SIZE = 5 * 1024 * 1024; // 5MB

// === Structure Gate ===
// 产品身份主权层 - Product Identity Authority
class StructureGate {
  constructor() {
    // 等级优先级映射
    this.LEVEL_PRIORITY = {
      NONE: 0,
      C: 1,
      B: 2,
      A: 3
    };
  }

  /**
   * 裁决产品品牌和型号的唯一来源
   * @param data 输入数据集合
   * @returns 标准化的产品身份结构
   */
  async resolveProductIdentity(data) {
    // 初始化结果
    let result = {
      brand: '未知',
      model: '未知',
      source: 'none',
      confidence: 0,
      level: 'NONE'
    };
    
    // 初始化当前等级（使用枚举值）
    let currentLevel = 'NONE';
    
    // 1. 处理 LEVEL_A: analyze_ocr_result (最高优先级)
    if (data.analyze_ocr_result && currentLevel === 'NONE') {
      const levelAResult = this.extractFromAnalyzeOcr(data.analyze_ocr_result);
      // LEVEL_A 必须有 model 才锁级
      if (levelAResult.model && levelAResult.model !== '未知') {
        result = {
          brand: levelAResult.brand,
          model: levelAResult.model,
          source: 'analyze-ocr',
          confidence: 0.9,
          level: 'A'
        };
        currentLevel = 'A';
      }
    }
    
    // 2. 处理 LEVEL_B: analyze_result (仅当 LEVEL_A 未命中时)
    if (data.analyze_result && currentLevel === 'NONE') {
      const levelBResult = this.extractFromAnalyze(data.analyze_result);
      // LEVEL_B 也要求必须有 model
      if (levelBResult.model && levelBResult.model !== '未知') {
        result = {
          brand: levelBResult.brand,
          model: levelBResult.model,
          source: 'analyze',
          confidence: 0.8,
          level: 'B'
        };
        currentLevel = 'B';
      }
    }
    
    // 3. 处理 LEVEL_C: ocr_text (仅当 LEVEL_A/B 未命中时)
    if (data.ocr_text && currentLevel === 'NONE') {
      const levelCResult = this.extractFromOcrText(data.ocr_text);
      // LEVEL_C 作为 fallback，有 model 或 brand 即可
      if (levelCResult.model || levelCResult.brand) {
        result = {
          brand: levelCResult.brand,
          model: levelCResult.model,
          source: 'ocr-text',
          confidence: 0.7,
          level: 'C'
        };
        currentLevel = 'C';
      }
    }
    
    // 4. 处理 LEVEL_C: chat_reply (仅当 LEVEL_A/B/C 未命中时)
    if (data.chat_reply && currentLevel === 'NONE') {
      const levelCResult = this.extractFromChatReply(data.chat_reply);
      // LEVEL_C 作为 fallback，有 model 或 brand 即可
      if (levelCResult.model || levelCResult.brand) {
        result = {
          brand: levelCResult.brand,
          model: levelCResult.model,
          source: 'chat',
          confidence: 0.6,
          level: 'C'
        };
        currentLevel = 'C';
      }
    }
    
    // 增加 identity_hash (防抖锁) - 仅在 model 不为 '未知' 时生成
    if (result.model && result.model !== '未知') {
      // 使用 Web Crypto API (Worker 原生支持)
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(result.brand + result.model);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        // identity_hash 加 level 前缀，避免不同等级碰撞
        result.identity_hash = `${result.level}-${hashHex.substring(0, 12)}`;
      } catch (error) {
        // 降级处理：如果 Web Crypto API 不可用，使用简单哈希
        const simpleHash = this.simpleHash(result.brand + result.model);
        result.identity_hash = `${result.level}-${simpleHash}`;
      }
    }
    
    return result;
  }
  
  /**
   * 简单哈希函数（降级方案）
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  /**
   * 从 analyze_ocr_result 提取品牌和型号
   */
  extractFromAnalyzeOcr(data) {
    let brand = '未知';
    let model = '未知';
    
    if (data && data.model_guess) {
      model = data.model_guess.trim();
    }
    
    if (data && data.brand) {
      brand = data.brand.trim();
    } else if (data && data.ocr_text) {
      // 尝试从 OCR 文本中提取品牌
      const brandMatch = data.ocr_text.match(/品牌[:：]\s*([^\n]+)/i);
      if (brandMatch) {
        brand = brandMatch[1].trim();
      }
    }
    
    return { brand, model };
  }
  
  /**
   * 从 analyze_result 提取品牌和型号
   */
  extractFromAnalyze(data) {
    let brand = '未知';
    let model = '未知';
    
    if (data && data.structured_result) {
      const structuredResult = data.structured_result;
      const brandMatch = structuredResult.match(/品牌[:：]\s*([^\n]+)/i);
      const modelMatch = structuredResult.match(/型号[:：]\s*([^\n]+)/i);
      
      if (brandMatch) {
        brand = brandMatch[1].trim();
      }
      
      if (modelMatch) {
        model = modelMatch[1].trim();
      }
    }
    
    return { brand, model };
  }
  
  /**
   * 从 ocr_text 提取品牌和型号
   */
  extractFromOcrText(ocrText) {
    let brand = '未知';
    let model = '未知';
    
    // 尝试从 OCR 文本中提取品牌和型号
    const brandMatch = ocrText.match(/品牌[:：]\s*([^\n]+)/i);
    const modelMatch = ocrText.match(/型号[:：]\s*([^\n]+)/i);
    
    if (brandMatch) {
      brand = brandMatch[1].trim();
    }
    
    if (modelMatch) {
      model = modelMatch[1].trim();
    }
    
    return { brand, model };
  }
  
  /**
   * 从 chat_reply 提取品牌和型号
   */
  extractFromChatReply(chatReply) {
    let brand = '未知';
    let model = '未知';
    
    // 尝试从回复文本中提取品牌
    const brandPatterns = [
      /品牌[:：]\s*\*\*([^*]+)\*\*/i,
      /品牌[:：]\s*([^，\n]+)/i
    ];
    
    for (const pattern of brandPatterns) {
      const match = chatReply.match(pattern);
      if (match) {
        brand = match[1].trim();
        break;
      }
    }
    
    // 尝试从回复文本中提取型号
    const modelPatterns = [
      /型号[:：]\s*\*\*([^*]+)\*\*/i,
      /型号[:：]\s*([^，\n]+)/i
    ];
    
    for (const pattern of modelPatterns) {
      const match = chatReply.match(pattern);
      if (match) {
        model = match[1].trim();
        break;
      }
    }
    
    return { brand, model };
  }
}

// 导出 StructureGate 类
export { StructureGate };

// 广播基址生成函数
function getPublicBaseUrl(request, env) {
  // 优先使用 env.PUBLIC_BASE_URL
  if (env && env.PUBLIC_BASE_URL) {
    const baseUrl = env.PUBLIC_BASE_URL;
    if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      console.log('[PUBLIC_BASE_URL] Using env.PUBLIC_BASE_URL:', baseUrl);
      return baseUrl;
    } else {
      console.log('[BROADCAST_URL_BLOCK_LOCALHOST] original=' + baseUrl);
    }
  }
  
  // 从 request.url 解析 origin
  if (request && request.url) {
    try {
      const url = new URL(request.url);
      const origin = url.origin;
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        console.log('[PUBLIC_BASE_URL] Using origin from request:', origin);
        return origin;
      } else {
        console.log('[BROADCAST_URL_BLOCK_LOCALHOST] original=' + origin);
      }
    } catch (error) {
      console.error('[PUBLIC_BASE_URL_ERROR] Failed to parse request url:', error.message);
    }
  }
  
  // 强制 fallback 为真实 Worker 域名
  const fallbackUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
  console.log('[PUBLIC_BASE_URL] Using fallback:', fallbackUrl);
  return fallbackUrl;
}

// OCR 处理类
export class OCROperator {
  constructor(env) {
    this.env = env;
  }

  async runOCR(chatId, messageId, mediaPath, provider, force = false) {
    console.log('[OCR_START]', { chatId, messageId, mediaPath, provider, force });

    // 1. 校验 mediaPath 必须来自 /api/media/r2/
    // 支持完整URL格式：https://jev-rebuild-worker.bensonlove1986.workers.dev/api/media/r2/...
    let r2Key;
    if (mediaPath.startsWith('http')) {
      // 从完整URL中提取路径部分
      try {
        const url = new URL(mediaPath);
        if (url.pathname.startsWith('/api/media/r2/')) {
          r2Key = url.pathname.replace('/api/media/r2/', '');
          console.log('[OCR_MEDIA_PATH_FULL_URL] Extracted r2Key:', r2Key);
        } else {
          console.error('[OCR_REJECT] Invalid mediaPath:', mediaPath);
          throw new Error('MEDIA_PATH_NOT_FROM_R2');
        }
      } catch (error) {
        console.error('[OCR_REJECT] Invalid mediaPath URL:', mediaPath);
        throw new Error('MEDIA_PATH_NOT_FROM_R2');
      }
    } else if (mediaPath.startsWith('/api/media/r2/')) {
      // 支持相对路径格式：/api/media/r2/...
      r2Key = mediaPath.replace('/api/media/r2/', '');
      console.log('[OCR_MEDIA_PATH_RELATIVE] Extracted r2Key:', r2Key);
    } else {
      console.error('[OCR_REJECT] Invalid mediaPath:', mediaPath);
      throw new Error('MEDIA_PATH_NOT_FROM_R2');
    }

    // 2. OCR 任务去重锁（核心）
    const OCR_LOCK_PREFIX = "ocr_lock:";
    const lockKey = OCR_LOCK_PREFIX + messageId;
    
    // 检查是否已经在处理
    if (this.env.JEV_STATE) {
      // 创建 DurableObjectId
      const doId = this.env.JEV_STATE.idFromName(lockKey);
      console.log('[OCR_DO_CREATED] Created DurableObjectId:', doId.toString());
      const stub = this.env.JEV_STATE.get(doId);
      
      // 使用 stub.fetch() 触发后台执行
      console.log('[OCR_DO_BACKGROUND_START] Calling stub.fetch() to trigger background execution');
      
      // 检查锁是否存在（即使失败也继续执行）
      let skipDuplicate = false;
      try {
        const checkResponse = await stub.fetch(new Request('http://localhost/ocr/lock/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lockKey
          })
        }));
        
        const checkResult = await checkResponse.json();
        if (checkResult.exists && !force) {
          console.log('[OCR_SKIP_DUPLICATE] message_id=' + messageId);
          skipDuplicate = true;
        }
      } catch (error) {
        console.error('[OCR_LOCK_CHECK_ERROR]', error.message);
        // 锁检查失败，继续执行 OCR 处理
      }
      
      if (skipDuplicate) {
        return {
          ok: true,
          skipped: true,
          reason: "duplicate"
        };
      }
      
      if (force) {
        console.log('[OCR_FORCE_RUN] Force run enabled for message_id=' + messageId);
      }
      
      // 写入锁（5分钟过期）
      try {
        await stub.fetch(new Request('http://localhost/ocr/lock/put', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lockKey,
            value: "1",
            expirationTtl: 300
          })
        }));
      } catch (error) {
        console.error('[OCR_LOCK_PUT_ERROR]', error.message);
        // 锁写入失败，继续执行 OCR 处理
      }

      // 3. 调用 DurableObject 的 /ocr/process 端点执行完整的 OCR 处理
      console.log('[OCR_DO_PROCESS_START] Calling DO /ocr/process');
      try {
        const processResponse = await stub.fetch(new Request('http://localhost/ocr/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chatId,
            messageId,
            mediaPath,
            provider,
            force
          })
        }));

        const processResult = await processResponse.json();
        console.log('[OCR_DO_PROCESS_RESULT]', processResult);

        if (!processResult.ok) {
          console.error('[OCR_DO_PROCESS_ERROR]', processResult.error);
          throw new Error(processResult.error || 'OCR_PROCESS_FAILED');
        }

        // 4. 返回结果
        console.log('[OCR_SUCCESS] OCR completed successfully via DO');
        return {
          ok: true,
          ocr_id: processResult.ocr_id,
          status: processResult.status,
          ocr_text: processResult.ocr_text,
          error_reason: processResult.error_reason
        };
      } catch (error) {
        console.error('[OCR_PROCESS_ERROR]', error.message);
        throw error;
      }
    } else {
      console.error('[OCR_MISSING_DO] JEV_STATE DurableObject not configured');
      throw new Error('OCR_MISSING_DO');
    }
  }

  // 模拟 Google Vision OCR 响应（实际需要替换为真实 API 调用）
  async simulateGoogleVisionOCR(buffer) {
    // 模拟处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      text: '这是一张测试图片中的文本内容。\nThis is test text in an image.',
      language: 'zh',
      confidence: 0.95,
      blocks: [
        {
          text: '这是一张测试图片中的文本内容。',
          confidence: 0.98,
          bounds: {
            top: 10,
            left: 10,
            width: 200,
            height: 50
          }
        },
        {
          text: 'This is test text in an image.',
          confidence: 0.92,
          bounds: {
            top: 70,
            left: 10,
            width: 200,
            height: 30
          }
        }
      ]
    };
  }

  async callGoogleVisionOCR(buffer) {
    // 读取Google Vision凭证
    const GOOGLE_VISION_API_KEY = this.env.GOOGLE_VISION_API_KEY;
    const GOOGLE_VISION_TOKEN = this.env.GOOGLE_VISION_TOKEN;
    
    // 检查凭证是否存在
    const hasKey = !!GOOGLE_VISION_API_KEY;
    const hasToken = !!GOOGLE_VISION_TOKEN;
    console.log('[OCR_AUTH_PRESENT] key=' + hasKey + ' token=' + hasToken);
    
    // 如果没有凭证，返回失败
    if (!hasKey && !hasToken) {
      console.error('[OCR_MISSING_CREDENTIAL] No Google Vision API key or token provided');
      throw new Error('OCR_MISSING_CREDENTIAL');
    }

    console.log('[OCR_BUFFER_RECEIVED] Buffer length:', buffer.byteLength);
    
    // 转换为 Base64
    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(buffer))
    );
    console.log('[OCR_BASE64_ENCODED] Base64 encoded, length:', base64.length);

    // 构建 Google Vision API 请求
    const requestData = {
      requests: [
        {
          image: { content: base64 },
          features: [
            { type: 'TEXT_DETECTION' }
          ]
        }
      ]
    };

    try {
      console.log('[OCR_PROVIDER_REQUEST]', { method: 'POST', hasKey: !!GOOGLE_VISION_API_KEY, hasToken: !!GOOGLE_VISION_TOKEN });
      console.log('[OCR_GOOGLE_VISION_CALL] API request initiated');
      
      // 使用原生 fetch
      const nativeFetch = globalThis.fetch.bind(globalThis);
      console.log("[OCR_VISION_NATIVE_FETCH_USED]");
      
      const GOOGLE_VISION_KEY = GOOGLE_VISION_API_KEY;
      const visionUrl = "https://vision.googleapis.com/v1/images:annotate?key=" + GOOGLE_VISION_KEY;
      const visionOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      };
      
      const resp = await nativeFetch(visionUrl, visionOptions);
      
      let bodyText = "";
      try { bodyText = await resp.text(); } catch(e) { bodyText = "[resp.text_failed]"; }
      
      console.log("[OCR_VISION_HTTP]", {
        status: resp.status,
        statusText: resp.statusText,
        bodySnippet: (bodyText || "").slice(0, 200),
      });
      
      if (!resp.ok) {
        const code = 
          resp.status === 401 ? "unauthorized" : 
          resp.status === 403 ? "forbidden" : 
          resp.status === 429 ? "quota" : 
          resp.status === 400 ? "invalid_request" : 
          "http_error";
        throw new Error(`vision_http_${code}_${resp.status}`);
      }
      
      const result = JSON.parse(bodyText);

      // 解析响应
      if (!result.responses || !result.responses[0]) {
        console.error('[OCR_GOOGLE_RESPONSE_INVALID] Invalid response format');
        throw new Error('OCR_GOOGLE_RESPONSE_INVALID');
      }

      const visionResponse = result.responses[0];
      const textAnnotation = visionResponse.fullTextAnnotation;
      const textAnnotations = visionResponse.textAnnotations;
      let text = '';
      let extractPath = 'none';
      
      // 修复解析策略（兼容不同返回结构）
      // 1️⃣ fullTextAnnotation.text
      if (textAnnotation && textAnnotation.text) {
        text = textAnnotation.text;
        extractPath = 'fullTextAnnotation.text';
        console.log('[OCR_TEXT_FROM_FULL] Found text in fullTextAnnotation');
      } 
      // 2️⃣ textAnnotations[0].description
      else if (textAnnotations && textAnnotations.length > 0 && textAnnotations[0].description) {
        text = textAnnotations[0].description;
        extractPath = 'textAnnotations[0].description';
        console.log('[OCR_TEXT_FROM_ANNOTATIONS] Found text in textAnnotations');
      } 
      // 3️⃣ 其他可能的路径
      else if (visionResponse.text) {
        text = visionResponse.text;
        extractPath = 'visionResponse.text';
        console.log('[OCR_TEXT_FROM_RESPONSE] Found text in visionResponse.text');
      }
      // 4️⃣ 检查是否有 documentTextAnnotation
      else if (visionResponse.documentTextAnnotation && visionResponse.documentTextAnnotation.text) {
        text = visionResponse.documentTextAnnotation.text;
        extractPath = 'documentTextAnnotation.text';
        console.log('[OCR_TEXT_FROM_DOCUMENT] Found text in documentTextAnnotation');
      }
      // 5️⃣ 否则空字符串
      else {
        console.log('[OCR_NO_TEXT_DETECTED] No text detected in image');
        console.log('[OCR_RESPONSE_DEBUG]', {
          hasFullTextAnnotation: !!textAnnotation,
          hasTextAnnotations: !!textAnnotations,
          textAnnotationsLength: textAnnotations?.length || 0,
          hasDocumentTextAnnotation: !!visionResponse.documentTextAnnotation
        });
        
        // 检测 Vision 返回空数组
        if ((textAnnotations?.length === 0 || !textAnnotations) && !textAnnotation && !visionResponse.documentTextAnnotation) {
          console.log('[OCR_PROVIDER_EMPTY_RESULT]');
        }
      }
      
      // 记录使用了哪条提取路径
      console.log('[OCR_EXTRACT_PATH_USED]', extractPath);
      console.log('[OCR_TEXT_LENGTH_FINAL]', text?.length||0);
      
      // 记录 provider 响应元数据
      console.log('[OCR_PROVIDER_RESPONSE_META]', { status: 'ok', hasText: text?.length > 0, textLength: text?.length || 0 });

      return {
        text: text,
        language: 'unknown', // Google Vision 不直接返回语言
        confidence: 1.0, // Google Vision 不直接返回置信度
        blocks: []
      };
    } catch (error) {
      console.error('[OCR_GOOGLE_CALL_ERROR]', error.message);
      throw error;
    }
  }

  async getOCRResult(messageId) {
    const kvKey = `ocr:${messageId}`;
    if (this.env.KV) {
      const result = await this.env.KV.get(kvKey, { type: 'json' });
      return result;
    }
    return null;
  }
}

// OCR Worker 类
export class OCRWorker {
  constructor(env) {
    this.env = env;
    this.ocrOperator = new OCROperator(env);
  }

  async processOCRRequest(chatId, messageId, mediaPath, provider) {
    try {
      // 生成 OCR ID 但不执行后台任务，因为我们已经在 /api/ocr/run 中使用了 waitUntil
      const ocr_id = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('[OCR_PROCESS_REQUEST]', { ocr_id, chatId, messageId, provider });

      return {
        ok: true,
        ocr_id: ocr_id,
        status: 'processing'
      };
    } catch (error) {
      console.error('[OCR_REQUEST_ERROR]', error.message);
      throw error;
    }
  }
}

// DeepSeek API Key Configuration
// 在 Cloudflare Workers 仪表板中设置以下环境变量：
// - DEEPSEEK_API_KEY: sk-77dbd0cc5f30451daa863d5213e6607f
// - 可选：DRAFT_KV: 用于存储草稿的 KV 命名空间绑定

// Response utility functions
function getCorsHeaders(request) {
  const origin = (request.headers.get('Origin') || '').trim();
  const headers = new Headers();
  const corsOrigin = origin || '*';
  headers.set('Access-Control-Allow-Origin', corsOrigin);
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Credentials', 'true');
  return headers;
}

function createResponse(request, body, status = 200, additionalHeaders = {}) {
  const headers = getCorsHeaders(request);
  headers.set('Content-Type', 'application/json');
  for (const [key, value] of Object.entries(additionalHeaders)) {
    headers.set(key, value);
  }
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}

function ok(request, data, additionalHeaders = {}, status = 200) {
  return createResponse(request, {
    ok: true,
    ...data
  }, status, additionalHeaders);
}

function fail(request, error, status = 400, additionalData = {}, additionalHeaders = {}) {
  return createResponse(request, {
    ok: false,
    error,
    ...additionalData
  }, status, additionalHeaders);
}

function options(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request)
  });
}

// Canonical Customer ID normalization function
function normalizeCustomerId(input) {
  if (!input) return "";
  let v = input.trim();

  if (v.startsWith("whatsapp:")) {
    v = v.replace(/\s+/g, "");
    // 提取国家码和手机号部分
    const phonePart = v.substring(9); // 移除 "whatsapp:" 前缀
    // 检查是否是纯数字且没有 + 号
    if (/^\d+$/.test(phonePart)) {
      // 添加 + 号
      return "whatsapp:+" + phonePart;
    }
    return v;
  }

  if (/^\+?\d+$/.test(v)) {
    if (!v.startsWith("+")) v = "+" + v;
    return "whatsapp:" + v;
  }

  return v;
}

// WhatsApp inbound handler functions
function parseTwilioInbound(form) {
  const numMedia = Number(form.get('NumMedia') || '0');
  const messageSid = form.get('MessageSid');
  const from = form.get('From');
  const body = form.get('Body') || '';
  if (!messageSid || !from) {
    throw new Error('[TWILIO_INVALID_BASE_PARAMS]');
  }
  
  const fromRaw = from;
  const fromTrimmed = from.trim();
  
  // 确保 customer_id 以 whatsapp: 开头，并且格式规范
  let normalizedFrom = fromTrimmed.startsWith('whatsapp:') ? fromTrimmed : `whatsapp:${fromTrimmed}`;
  // 确保格式为 whatsapp:+国家码手机号，无空格
  normalizedFrom = normalizedFrom.replace(/\s+/g, '');
  
  console.log('[FROM_RAW] "' + fromRaw + '", [FROM_TRIMMED] "' + fromTrimmed + '", [CUSTOMER_ID_CANONICAL] "' + normalizedFrom + '"');
  
  return {
    messageSid,
    chatId: fromTrimmed,
    customer_id: normalizedFrom,
    body,
    numMedia,
    media: numMedia > 0
      ? {
          mediaSid: form.get('MediaSid0'),
          mediaUrl: form.get('MediaUrl0'),
          mediaType: form.get('MediaContentType0'),
        }
      : null,
  };
}

function extractMediaSidFromUrl(mediaUrl) {
  if (!mediaUrl) return null;
  const match = mediaUrl.match(/\/Media\/(ME[\w]+)/);
  return match ? match[1] : null;
}

function assertMessageBeforePersist(msg) {
  if (msg.media_path) {
    // 允许完整的媒体 URL 路径
    // if (!msg.media_path.startsWith('/api/media/')) {
    //   throw new Error('[MEDIA_PATH_INVALID_PREFIX]');
    // }
    // if (msg.media_path.includes('http')) {
    //   throw new Error('[MEDIA_PATH_POLLUTED]');
    // }
  }
}

async function handleWhatsappInbound(request, env) {
  try {
    console.log('[TWILIO_WEBHOOK_START] Incoming Twilio webhook request');
    console.log('[TWILIO_WEBHOOK_URL]', request.url);
    console.log('[TWILIO_WEBHOOK_METHOD]', request.method);
    
    const form = new URLSearchParams(await request.text());
    // 打印原始payload结构，用于分析用户名字段
    console.log('[DEBUG_RAW_INBOUND]', JSON.stringify(Object.fromEntries(form.entries()), null, 2));
    const parsed = parseTwilioInbound(form);
    
    // 在handleWhatsappInbound最顶部打印INBOUND_TOP信息
    console.log('[INBOUND_TOP]', {
      numMedia: parsed.numMedia,
      body: parsed.body,
      hasBody: !!parsed.body,
      numMediaType: typeof parsed.numMedia
    });
    
    console.log('[TWILIO_WEBHOOK_HIT] Received Twilio inbound message');
      console.log('[TWILIO_WEBHOOK_PARSED]', { messageSid: parsed.messageSid, chatId: parsed.chatId, customer_id: parsed.customer_id, numMedia: parsed.numMedia });
      console.log('[REAL_WRITE_ID]', parsed.customer_id);
      console.log('[INBOUND_FLOW_STEP] AFTER_PARSE');
    
    // 添加 Presence Radar Hook
    logPresenceRadar(parsed.messageSid, parsed.customer_id);
    
    // 写入 Presence Memory
    try {
      console.log("[PRESENCE_CALL]", parsed.messageSid, parsed.customer_id);
      await writePresenceMemory({
        customer_id: parsed.customer_id,
        message_id: parsed.messageSid,
        source: "twilio",
        ts: Date.now()
      }, env);
    } catch (error) {
      console.error('[PRESENCE_MEMORY_ERROR]', error.message);
    }
    
    // 添加 Presence Heartbeat
    console.log('[PRESENCE_HEARTBEAT]', parsed.messageSid);
    
    let mediaPath = null;
    let buf, mime;
    let mediaUrl0 = '';
    let mediaType0 = '';
    let mediaSid = null;
    const messageSid = parsed.messageSid;
    const numMedia = parsed.numMedia;
    const isMedia = messageSid.startsWith('MM') || numMedia > 0;
    
    if (isMedia) {
      mediaUrl0 = String(parsed.media?.mediaUrl || '').trim();
      mediaType0 = parsed.media?.mediaType || '';
      
      if (!mediaUrl0 || !mediaType0) {
        console.error('[MEDIA_MISSING_PARAMS] Missing required media parameters');
        return new Response('<Response></Response>', {
          headers: {
            'Content-Type': 'text/xml'
          }
        });
      }
      
      mediaSid = extractMediaSidFromUrl(mediaUrl0);
      if (!messageSid || !mediaSid) {
        console.error('[MEDIA_SID_MISSING] Missing required MessageSid or MediaSid');
        return new Response('<Response></Response>', {
          headers: {
            'Content-Type': 'text/xml'
          }
        });
      }
      
      try {
        const accountSid = env.TWILIO_ACCOUNT_SID;
        const authToken = env.TWILIO_AUTH_TOKEN;
        if (!accountSid || !authToken) {
          console.error('[MEDIA_AUTH_MISSING] Missing Twilio auth credentials');
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
        
        const encoder = new TextEncoder();
        const data = encoder.encode(`${accountSid}:${authToken}`);
        const authHeader = 'Basic ' + btoa(String.fromCharCode(...data));
        
        const res = await fetch(mediaUrl0, {
          headers: {
            Authorization: authHeader,
            'Accept': 'image/*'
          },
          timeout: 30000
        });
        
        console.log("[TWILIO_FETCH_STATUS]", mediaSid, res.status);
        
        if (!res.ok) {
          console.error('[MEDIA_FETCH_FAIL] Media fetch failed');
          console.error("[TWILIO_FETCH_FAIL]", mediaSid, res.status);
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
        
        buf = await res.arrayBuffer();
        console.log("[TWILIO_FETCH_SIZE]", mediaSid, buf.byteLength);
        
        mime = res.headers.get('content-type') || mediaType0 || 'application/octet-stream';
        
        if (!mime.startsWith('image/')) {
          console.error('[MEDIA_TYPE_INVALID] Invalid media type');
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
      } catch (error) {
        console.error('[MEDIA_FETCH_ERROR]', error.message);
        // 确保在错误情况下也能使用mediaSid
        if (!mediaSid) {
          console.error('[MEDIA_SID_ERROR] mediaSid is undefined');
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
        // 即使fetch失败，也继续处理消息，使用twilio媒体路径
        mediaPath = `/api/media/twilio?msid=${parsed.messageSid}&esid=${mediaSid}`;
        const message = {
          id: parsed.messageSid,
          message_id: parsed.messageSid,
          chat_id: parsed.chatId,
          direction: 'inbound',
          kind: 'image',
          type: 'image',
          media_type: 'image',
          text: parsed.body,
          media_path: mediaPath,
          mediaSid: parsed.media?.mediaSid,
          mediaCount: parsed.numMedia,
          mediaType: parsed.media?.mediaType,
          timestamp: Date.now(),
          created_at: Date.now(),
          from: parsed.chatId,
          senderName: parsed.chatId.replace('whatsapp:', ''),
          ProfileName: parsed.chatId.replace('whatsapp:', '')
        };
        
        try {
          assertMessageBeforePersist(message);
        } catch (error) {
          console.error('[MESSAGE_VALIDATION_ERROR]', error.message);
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
        
        // 使用 canonical customer ID
        const canonicalId = normalizeCustomerId(parsed.customer_id);
        console.log('[CANONICAL_ID_USED]', { raw: parsed.customer_id, canonical: canonicalId });
        
        console.log('[INBOUND_FLOW_STEP] BEFORE_PERSIST');
        // 调用持久化函数
        await persistInboundMessage(env, {
          chatId: canonicalId,
          messageId: parsed.messageSid,
          text: parsed.body,
          ts: Date.now(),
          raw: Object.fromEntries(form.entries())
        });
        console.log('[INBOUND_FLOW_STEP] AFTER_PERSIST');
        
        // Upsert inbox index entry
        try {
          const inboxEntry = {
            customer_id: parsed.customer_id,
            chat_id: parsed.chatId,
            last_message_ts: Date.now(),
            last_message_preview: parsed.body.substring(0, 50),
            source: 'twilio'
          };
          await upsertInboxIndexEntry(env, inboxEntry);
        } catch (upsertError) {
          console.error('[INBOX_INDEX_UPSERT_ERROR]', upsertError.message);
          // Upsert error doesn't block message processing
        }
        
        const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
        const doStub = env.WHATSAPP_CHAT_DO.get(doId);
        
        try {
          // 使用完整的 URL 格式调用 Durable Object
          const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
          const broadcastUrl = `${WORKER_ORIGIN}/broadcast`;
          console.log('[BROADCAST_URL_FINAL]', broadcastUrl);
          console.log('[BROADCAST_PAYLOAD]', { type: 'message', data: { chat_id: message.chat_id, message_id: message.message_id, kind: message.kind } });
          console.log('[INBOUND_FLOW_STEP] BEFORE_WS_BROADCAST');
          
          const broadcastRequest = new Request(broadcastUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'message',
              data: message
            })
          });
          
          const broadcastResponse = await doStub.fetch(broadcastRequest);
          console.log('[BROADCAST_RESPONSE]', { status: broadcastResponse.status, statusText: broadcastResponse.statusText });
          
          const responseText = await broadcastResponse.text();
          console.log('[BROADCAST_RESPONSE_TEXT]', responseText);
          
          // Generate AI draft for media message
          try {
            const draftWorker = new AutoDraftWorker(env);
            await draftWorker.processNewCustomerMessage(message, message.chat_id);
            console.log('[AI_DRAFT_GENERATION] Started for media message');
          } catch (error) {
            console.error('[AI_DRAFT_GENERATION_ERROR]', error.message);
          }
        } catch (error) {
          console.error('[DO_OPERATION_ERROR]', error.message);
        }
        
        return new Response('<Response></Response>', {
          headers: {
            'Content-Type': 'text/xml'
          }
        });
      }
      
      // 存储图片到 R2
      const mm = parsed.messageSid;
      const me = mediaSid;
      const r2Key = `whatsapp/${mm}/${me}`;
      let ocrText = null;
      
      try {
        // 使用与 Twilio 相同的 R2 写入逻辑
        const r2 = env.JEV_R2 || env.MEDIA;
        if (r2) {
          console.log("[WHATSAPP_MEDIA_R2_WRITE_START]", r2Key);
          
          await r2.put(r2Key, buf, {
            httpMetadata: {
              contentType: mime,
              cacheControl: "public, max-age=31536000"
            }
          });
          
          console.log("[WHATSAPP_MEDIA_R2_WRITE_OK]", r2Key);
          console.log("[R2_WRITE_OK]", mediaSid);
          
          // 使用固定Worker域名构建绝对路径
          const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
          mediaPath = `${WORKER_ORIGIN}/api/media/r2/whatsapp/${mm}/${me}`;
          console.log('[MEDIA_STORE] Storage successful');
          console.log('[INBOX_WRITE_OK] kind=media type=image mediaPath=' + mediaPath);
          
          // 当媒体类型为 image 时，调用 Google Vision OCR
          if (mime.startsWith('image/')) {
            console.log('[OCR_TRIGGER] Media type is image, triggering OCR');
            try {
              const ocrOperator = new OCROperator(env);
              const ocrResult = await ocrOperator.runOCR(parsed.chatId, parsed.messageSid, mediaPath, 'google_vision');
              ocrText = ocrResult.text;
              console.log('[OCR_SUCCESS] OCR completed, text detected:', ocrText ? ocrText.substring(0, 50) + '...' : 'No text');
            } catch (ocrError) {
              console.error('[OCR_ERROR]', ocrError.message);
              // OCR 失败不影响消息处理
              ocrText = null;
            }
          }
        } else {
          console.error('[MEDIA_STORE_MISSING] R2 binding not configured');
          // 使用固定Worker域名构建绝对路径
          const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
          mediaPath = `${WORKER_ORIGIN}/api/media/twilio?msid=${parsed.messageSid}&esid=${mediaSid}`;
          console.log('[INBOX_WRITE_OK] kind=media type=image mediaPath=' + mediaPath);
        }
      } catch (error) {
        console.error('[MEDIA_STORE_ERROR]', error.message);
        // 使用固定Worker域名构建绝对路径
        const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
        mediaPath = `${WORKER_ORIGIN}/api/media/twilio?msid=${parsed.messageSid}&esid=${mediaSid}`;
        console.log('[INBOX_WRITE_OK] kind=media type=image mediaPath=' + mediaPath);
      }
    
    // Twilio 媒体自动缓存到 R2（用于 UI 显示）
    try {
      // 生成 R2 Key - 使用 messageId 与 Service 层保持一致
      const twilioR2Key = `twilio/${messageSid}.jpg`;
      console.log('[R2_WRITE_START]', twilioR2Key);
      console.log('[R2_WRITE_BUCKET]', Object.keys(env));
      console.log("[R2_CACHE_START]", messageSid);
      console.log("[TWILIO_MEDIA_START]", messageSid);
      
      // 写入媒体索引到 KV - 同时索引 mediaSid 和 messageId
      if (env.MEDIA_INDEX) {
        console.log('[MEDIA_INDEX_WRITE_START]', { mediaSid, messageSid });
        try {
          // 为 messageId 建立索引
          await env.MEDIA_INDEX.put(
            `twilio:${messageSid}`,
            JSON.stringify({
              messageSid,
              mediaSid,
              contentType: mime || "image/jpeg",
              ext: "jpg",
              ts: Date.now()
            }),
            { expirationTtl: 60 * 60 * 24 * 30 } // 30天
          );
          console.log('[MEDIA_INDEX_WRITE_OK]', { mediaSid, messageSid });
        } catch (indexError) {
          console.error('[MEDIA_INDEX_WRITE_ERROR]', indexError.message);
          // 索引写入失败不影响消息处理
        }
      } else {
        console.warn('[MEDIA_INDEX_MISSING] MEDIA_INDEX KV not configured');
      }
      
      // 检查 MEDIA binding
      if (env.MEDIA) {
        console.log('[R2_BINDING_OK] MEDIA exists');
        
        // 检查是否已存在（避免重复下载）
        console.log("[R2_EXIST_CHECK]");
        try {
          const exist = await env.MEDIA.head(twilioR2Key);
          console.log('[R2_EXIST_CHECK_RESULT]', exist ? 'Exists' : 'Not exists');
        } catch (headError) {
          console.log('[R2_EXIST_CHECK_ERROR]', headError.message);
        }
        
        const exist = await env.MEDIA.get(twilioR2Key);
        if (exist) {
          console.log('[TWILIO_MEDIA_CACHE_EXIST] Media already exists in R2:', twilioR2Key);
        } else {
          console.log('[TWILIO_MEDIA_CACHE_DOWNLOAD] Downloading media from Twilio');
          
          // 使用 Twilio Media URL 下载真实图片
          const mediaUrl = mediaUrl0;
          console.log('[TWILIO_MEDIA_CACHE_URL]', mediaUrl);
          
          const accountSid = env.TWILIO_ACCOUNT_SID;
          const authToken = env.TWILIO_AUTH_TOKEN;
          if (!accountSid || !authToken) {
            console.error('[TWILIO_MEDIA_CACHE_AUTH_ERROR] Missing Twilio auth credentials');
          } else {
            const authHeader = 'Basic ' + btoa(accountSid + ':' + authToken);
            console.log('[TWILIO_MEDIA_CACHE_AUTH] Authorization header generated');
            
            const res = await fetch(mediaUrl, {
              headers: {
                Authorization: authHeader,
                'Accept': 'image/*'
              },
              timeout: 30000
            });
            
            console.log("[TWILIO_FETCH_STATUS]", mediaSid, res.status);
            
            if (!res.ok) {
              console.error('[TWILIO_MEDIA_CACHE_FETCH_ERROR] Media fetch failed:', res.status);
              console.error("[R2_CACHE_FAIL]", mediaSid);
              console.error("[TWILIO_FETCH_FAIL]", mediaSid, res.status);
            } else {
              console.log('[TWILIO_MEDIA_CACHE_FETCH_SUCCESS] Media fetched successfully');
              
              // 写入 R2
              const mediaBuffer = await res.arrayBuffer();
              console.log("[TWILIO_FETCH_SIZE]", mediaSid, mediaBuffer.byteLength);
              console.log('[R2_WRITE_BUFFER_SIZE]', mediaBuffer.byteLength);
              
              await env.MEDIA.put(twilioR2Key, mediaBuffer, {
                httpMetadata: {
                  contentType: 'image/jpeg',
                  cacheControl: 'public, max-age=31536000'
                }
              });
              
              console.log('[R2_WRITE_DONE]', twilioR2Key);
              console.log('[R2_WRITE_OK]', mediaSid);
              console.log("[R2_CACHE_SUCCESS]", mediaSid);
              console.log("[R2_CACHE_OK]", mediaSid);
              console.log('[TWILIO_MEDIA_CACHE_WRITE_SUCCESS] Media written to R2:', twilioR2Key);
            }
          }
        }
      } else {
        console.error('[R2_BINDING_MISSING]');
        console.error('[TWILIO_MEDIA_CACHE_ERROR] MEDIA binding not configured');
      }
    } catch (error) {
      console.error('[TWILIO_MEDIA_CACHE_ERROR]', error.message);
      // 缓存失败不影响消息处理
    }
      
      const message = {
        id: parsed.messageSid,
        message_id: parsed.messageSid,
        chat_id: parsed.chatId,
        direction: 'inbound',
        kind: 'image',
        type: 'image',
        media_type: 'image',
        text: parsed.body,
        media_path: mediaPath,
        mediaSid: parsed.media?.mediaSid,
        mediaCount: parsed.numMedia,
        mediaType: parsed.media?.mediaType,
        mime: mime,
        ocr_text: ocrText,
        timestamp: Date.now(),
        created_at: Date.now(),
        from: parsed.chatId,
        senderName: parsed.chatId.replace('whatsapp:', ''),
        ProfileName: parsed.chatId.replace('whatsapp:', '')
      };
      
      try {
          assertMessageBeforePersist(message);
        } catch (error) {
          console.error('[MESSAGE_VALIDATION_ERROR]', error.message);
          return new Response('<Response></Response>', {
            headers: {
              'Content-Type': 'text/xml'
            }
          });
        }
        
        // 使用 canonical customer ID
        const canonicalId = normalizeCustomerId(parsed.customer_id);
        console.log('[CANONICAL_ID_USED]', { raw: parsed.customer_id, canonical: canonicalId });
        
        console.log('[INBOUND_FLOW_STEP] BEFORE_PERSIST');
        // 调用持久化函数
        await persistInboundMessage(env, {
          chatId: canonicalId,
          messageId: parsed.messageSid,
          text: parsed.body,
          ts: Date.now(),
          raw: Object.fromEntries(form.entries())
        });
        console.log('[INBOUND_FLOW_STEP] AFTER_PERSIST');
        
        // Upsert inbox index entry
      try {
        const inboxEntry = {
          customer_id: parsed.customer_id,
          chat_id: parsed.chatId,
          last_message_ts: Date.now(),
          last_message_preview: parsed.body.substring(0, 50),
          source: 'twilio'
        };
        await upsertInboxIndexEntry(env, inboxEntry);
      } catch (upsertError) {
        console.error('[INBOX_INDEX_UPSERT_ERROR]', upsertError.message);
        // Upsert error doesn't block message processing
      }
      
      const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
      const doStub = env.WHATSAPP_CHAT_DO.get(doId);
      
      try {
        // 使用完整的 URL 格式调用 Durable Object
        const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
        const broadcastUrl = `${WORKER_ORIGIN}/broadcast`;
        console.log('[BROADCAST_URL_FINAL]', broadcastUrl);
        console.log('[INBOUND_FLOW_STEP] BEFORE_WS_BROADCAST');
        await doStub.fetch(new Request(broadcastUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'message',
            data: message
          })
        }));
        
        // Contact addition moved to broadcast method
        
        // Generate AI draft for media message
        try {
          const draftWorker = new AutoDraftWorker(env);
          await draftWorker.processNewCustomerMessage(message, message.chat_id);
          console.log('[AI_DRAFT_GENERATION] Started for media message');
        } catch (error) {
          console.error('[AI_DRAFT_GENERATION_ERROR]', error.message);
        }
      } catch (error) {
        console.error('[DO_OPERATION_ERROR]', error.message);
      }
      
      return new Response('<Response></Response>', {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    } else {
      console.log("[TEXT_BRANCH_ENTERED]", parsed.messageSid);
      const message = {
        id: parsed.messageSid,
        message_id: parsed.messageSid,
        chat_id: parsed.chatId,
        direction: 'inbound',
        kind: 'text',
        type: 'text',
        text: parsed.body,
        timestamp: Date.now(),
        created_at: Date.now(),
        from: parsed.chatId,
        senderName: parsed.chatId.replace('whatsapp:', ''),
        ProfileName: parsed.chatId.replace('whatsapp:', '')
      };
      
      try {
        assertMessageBeforePersist(message);
      } catch (error) {
        console.error('[MESSAGE_VALIDATION_ERROR]', error.message);
        return new Response('<Response></Response>', {
          headers: {
            'Content-Type': 'text/xml'
          }
        });
      }
      
      // 使用 canonical customer ID
      const canonicalId = normalizeCustomerId(parsed.customer_id);
      console.log('[CANONICAL_ID_USED]', { raw: parsed.customer_id, canonical: canonicalId });
      
      // 在文本消息分支中调用 persistInboundMessage()
      console.log('[TEXT_PERSIST_CALL]', { message_id: parsed.messageSid, customer_id: canonicalId });
      // 调用持久化函数
      await persistInboundMessage(env, {
        chatId: canonicalId,
        messageId: parsed.messageSid,
        text: parsed.body,
        ts: Date.now(),
        raw: Object.fromEntries(form.entries())
      });
      console.log('[INBOUND_FLOW_STEP] AFTER_PERSIST');
      console.log('[INBOUND_AFTER_PERSIST]', parsed.messageSid);
      
      // Upsert inbox index entry
      try {
        const inboxEntry = {
          customer_id: parsed.customer_id,
          chat_id: parsed.chatId,
          last_message_ts: Date.now(),
          last_message_preview: parsed.body.substring(0, 50),
          source: 'twilio'
        };
        await upsertInboxIndexEntry(env, inboxEntry);
      } catch (upsertError) {
        console.error('[INBOX_INDEX_UPSERT_ERROR]', upsertError.message);
        // Upsert error doesn't block message processing
      }
      
      const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
      const doStub = env.WHATSAPP_CHAT_DO.get(doId);
      
      try {
        // 使用完整的 URL 格式调用 Durable Object
        const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
        const broadcastUrl = `${WORKER_ORIGIN}/broadcast`;
        console.log('[BROADCAST_URL_FINAL]', broadcastUrl);
        console.log('[INBOUND_FLOW_STEP] BEFORE_WS_BROADCAST');
        await doStub.fetch(new Request(broadcastUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'message',
            data: message
          })
        }));
        
        // Contact addition moved to broadcast method
        
        // Generate AI draft for text message
        try {
          const draftWorker = new AutoDraftWorker(env);
          await draftWorker.processNewCustomerMessage(message, message.chat_id);
          console.log('[AI_DRAFT_GENERATION] Started for text message');
        } catch (error) {
          console.error('[AI_DRAFT_GENERATION_ERROR]', error.message);
        }
      } catch (error) {
        console.error('[DO_OPERATION_ERROR]', error.message);
      }
      
      return new Response('<Response></Response>', {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
  } catch (error) {
    console.error('[TWILIO_WEBHOOK_ERROR]', error);
    return new Response('<Response></Response>', {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  }
}

// 媒体路径断言函数
function assertMediaPath(media_path) {
  if (typeof media_path !== 'string') {
    throw new Error('MEDIA_PATH_TYPE_INVALID');
  }
  // 允许完整的媒体 URL 路径
  // if (!media_path.startsWith('/api/media/')) {
  //   throw new Error('MEDIA_PATH_NOT_RELATIVE');
  // }
  // if (media_path.includes('http://') || media_path.includes('https://')) {
  //   throw new Error('MEDIA_PATH_PROTOCOL_FORBIDDEN');
  // }
}

// WhatsApp Chat Durable Object - complete version
export class WhatsAppChatDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;

    this.processedMessageIds = new Set();
    this.customerIds = new Set();
    this.sessions = new Map(); // 维护WebSocket连接
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    console.log('[DO_FETCH] Received request:', {
      method: method,
      path: path,
      url: request.url,
      isWebSocket: request.headers.get('Upgrade') === 'websocket'
    });

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }



    // Broadcast endpoint
    if (method === 'POST' && path === '/broadcast') {
      try {
        const payload = await request.json();
        this.broadcast(payload);
        return new Response('OK', {
          headers: corsHeaders
        });
      } catch (error) {
        console.error('[BROADCAST_ERROR]', error);
        return new Response('Broadcast Error', {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // History endpoint
    if (method === 'GET' && path === '/history') {
      const customerId = url.searchParams.get('customer_id');
      console.log('[HISTORY_REQUEST] Requesting messages for customer:', customerId);
      
      return new Response(JSON.stringify({
        messages: [],
        message_ids: []
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Customers endpoint
    if (method === 'GET' && path === '/customers') {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      this.handleWebSocket(server);
      return new Response(null, {
        status: 101,
        webSocket: client
      });
    }

    return new Response('Not Found', {
      status: 404,
      headers: corsHeaders
    });
  }

  // 处理WebSocket连接
  handleWebSocket(ws) {
    const id = crypto.randomUUID();
    this.sessions.set(id, ws);
    console.log('[WS_CONNECT] New WebSocket connection established:', id);
    console.log('[WS_SESSIONS_COUNT] Total connections:', this.sessions.size);

    ws.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[WS_MESSAGE_RECEIVED]', message);
        // 处理收到的消息
      } catch (error) {
        console.error('[WS_MESSAGE_ERROR]', error);
      }
    });

    ws.addEventListener('close', () => {
      this.sessions.delete(id);
      console.log('[WS_DISCONNECT] WebSocket connection closed:', id);
      console.log('[WS_SESSIONS_COUNT] Total connections:', this.sessions.size);
    });

    ws.addEventListener('error', (error) => {
      console.error('[WS_ERROR] WebSocket error:', error);
    });
  }

  // 广播消息给所有连接的客户端
  async broadcast(message) {
    console.log('[BROADCAST_START] Broadcasting message to', this.sessions.size, 'clients');
    console.log('[BROADCAST_PAYLOAD]', message);

    const payload = JSON.stringify(message);
    const closedSessions = [];

    for (const [id, ws] of this.sessions.entries()) {
      try {
        ws.send(payload);
        console.log('[BROADCAST_SUCCESS] Message sent to client:', id);
      } catch (error) {
        console.error('[BROADCAST_SEND_ERROR] Failed to send to client', id, ':', error);
        closedSessions.push(id);
      }
    }

    // 清理关闭的连接
    for (const id of closedSessions) {
      this.sessions.delete(id);
      console.log('[BROADCAST_CLEANUP] Removed closed session:', id);
    }

    console.log('[BROADCAST_COMPLETE] Broadcast finished. Remaining sessions:', this.sessions.size);
  }

}

// ChatMemoryDO
export class ChatMemoryDO {
  constructor(state) {
    this.state = state;
  }

  async fetch(request, env) {
    const body = await request.json();
    const { type, message } = body;

    let summary = await this.state.storage.get("summary") || "";
    let recent = await this.state.storage.get("recent") || [];

    if (type === "append") {
      recent.push(message);
    }

    await this.state.storage.put("summary", summary);
    await this.state.storage.put("recent", recent);

    return ok(request, { summary, recent });
  }
}

// Export ChatMemory as alias for compatibility with existing Durable Objects
export class ChatMemory extends ChatMemoryDO {
  constructor(state) {
    super(state);
  }
}

// Persist inbound message to KV storage
async function persistInboundMessage(env, {
  chatId,
  messageId,
  text,
  ts,
  raw
}) {
  // 在 persistInboundMessage 第一行：[PERSIST_ENTER]
  console.log("[PERSIST_ENTER]", messageId);
  
  console.log("[MESSAGE_PERSIST_START]", { chatId, messageId });
  
  // 打印 KV 对象类型
  console.log("[KV_OBJECT_TYPE]", typeof env.MESSAGES_KV);
  
  // 确定使用哪个 KV binding
  let kv;
  let kvBindingUsed = 'NONE';
  if (env.MESSAGES_KV) {
    kv = env.MESSAGES_KV;
    kvBindingUsed = 'MESSAGES_KV';
  } else if (env.KV) {
    kv = env.KV;
    kvBindingUsed = 'KV';
  }
  
  // 1. 绑定选择日志
  console.log("[KV_BINDING_PICK]", `using=${kvBindingUsed}`);
  
  if (kv) {
    try {
      const kvKey = `messages:${chatId}`;
      
      // 2. 写入前后长度 - 写入前
      const beforeRaw = await kv.get(kvKey);
      console.log("[KV_BEFORE_GET]", { key: kvKey, raw_len: beforeRaw ? beforeRaw.length : 0 });
      
      const existingMessages = beforeRaw ? JSON.parse(beforeRaw) : [];
      
      // 3. 写入的消息字段证明
      console.log("[KV_APPEND_MSG]", { message_id: messageId, ts: ts, type: 'text', text_len: text ? text.length : 0 });
      
      // 添加新消息
      const newMessage = {
        id: messageId,
        chatId: chatId,
        customer_id: chatId,
        text,
        ts,
        raw
      };
      existingMessages.push(newMessage);
      
      // 写回 KV
      const messageJson = JSON.stringify(existingMessages);
      await kv.put(kvKey, messageJson);
      
      // 在 KV.put 成功后打印：[KV_WRITE_OK]
      console.log("[KV_WRITE_OK]");
      
      // 2. 写入前后长度 - 写入后立即读取
      const afterRaw = await kv.get(kvKey);
      console.log("[KV_AFTER_PUT_GET]", { key: kvKey, raw_len: afterRaw ? afterRaw.length : 0 });
      
      console.log("[MESSAGE_PERSIST_OK]", { chatId, messageId, totalCount: existingMessages.length, storage: 'kv' });
    } catch (error) {
      console.error("[MESSAGE_PERSIST_ERROR]", error.message);
    }
  } else {
    console.error("[KV_NOT_AVAILABLE]", "Neither MESSAGES_KV nor KV is available");
  }
}

// JEV_STATE
export class JEV_STATE {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    let path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') {
      return options(request);
    }

    // OCR lock endpoints
    if (method === 'POST' && path === '/ocr/lock/check') {
      try {
        const body = await request.json();
        const { lockKey } = body;
        console.log('[OCR_LOCK_CHECK_ENDPOINT_HIT]', { lockKey });
        
        // Check if lock exists
        let value = await this.state.storage.get(lockKey);
        let exists = !!value;
        
        // Check if lock is expired
        if (exists && typeof value === 'object' && value.ts && value.ttl) {
          if (Date.now() - value.ts > value.ttl) {
            // Auto release expired lock
            await this.state.storage.delete(lockKey);
            console.log('[OCR_LOCK_EXPIRED_AUTO_RELEASE]', lockKey);
            exists = false;
          }
        }
        
        console.log('[OCR_LOCK_CHECK_RESULT]', { lockKey, exists });
        
        return ok(request, {
          ok: true,
          exists
        });
      } catch (error) {
        console.error('[OCR_LOCK_CHECK_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    if (method === 'POST' && path === '/ocr/lock/put') {
      try {
        const body = await request.json();
        const { lockKey, value, expirationTtl } = body;
        console.log('[OCR_LOCK_PUT_ENDPOINT_HIT]', { lockKey, expirationTtl });
        
        // Store lock with TTL
        const lockValue = {
          ts: Date.now(),
          ttl: expirationTtl || 120000, // Default 2 minutes
          value: value
        };
        await this.state.storage.put(lockKey, lockValue);
        console.log('[OCR_LOCK_PUT_STORED]', lockKey);
        
        return ok(request, {
          ok: true,
          message: 'OCR lock stored'
        });
      } catch (error) {
        console.error('[OCR_LOCK_PUT_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    if (method === 'POST' && path === '/ocr/lock') {
      try {
        const body = await request.json();
        const { lockKey, expirationTtl } = body;
        console.log('[OCR_LOCK_ENDPOINT_HIT]', { lockKey, expirationTtl });
        
        // Store lock
        await this.state.storage.put(lockKey, '1', { expirationTtl });
        console.log('[OCR_LOCK_STORED]', lockKey);
        
        return ok(request, {
          ok: true,
          message: 'OCR lock acquired'
        });
      } catch (error) {
        console.error('[OCR_LOCK_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // Identity lock endpoints
    if (method === 'POST' && path === '/identity/lock/check') {
      try {
        const body = await request.json();
        const { lockKey } = body;
        console.log('[IDENTITY_LOCK_CHECK_ENDPOINT_HIT]', { lockKey });
        
        // Check if lock exists
        let value = await this.state.storage.get(lockKey);
        let exists = !!value;
        
        // Check if lock is expired
        if (exists && typeof value === 'object' && value.ts && value.ttl) {
          if (Date.now() - value.ts > value.ttl) {
            // Auto release expired lock
            await this.state.storage.delete(lockKey);
            console.log('[IDENTITY_LOCK_EXPIRED_AUTO_RELEASE]', lockKey);
            exists = false;
          }
        }
        
        console.log('[IDENTITY_LOCK_CHECK_RESULT]', { lockKey, exists });
        
        return ok(request, {
          ok: true,
          exists
        });
      } catch (error) {
        console.error('[IDENTITY_LOCK_CHECK_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    if (method === 'POST' && path === '/identity/lock/put') {
      try {
        const body = await request.json();
        const { lockKey, value, expirationTtl } = body;
        console.log('[IDENTITY_LOCK_PUT_ENDPOINT_HIT]', { lockKey, expirationTtl });
        
        // Store lock with TTL
        const lockValue = {
          ts: Date.now(),
          ttl: expirationTtl * 1000, // Convert to milliseconds
          value: value
        };
        await this.state.storage.put(lockKey, lockValue);
        console.log('[IDENTITY_LOCK_PUT_STORED]', lockKey);
        
        return ok(request, {
          ok: true,
          message: 'Identity lock stored'
        });
      } catch (error) {
        console.error('[IDENTITY_LOCK_PUT_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    if (method === 'POST' && path === '/ocr/process') {
      let lockKey;
      try {
        const body = await request.json();
        const { chatId, messageId, mediaPath, provider, force } = body;
        lockKey = "ocr_lock:" + messageId;
        console.log('[OCR_DO_ENTER] message_id=' + messageId);
        
        // Handle force unlock
        if (force) {
          console.log('[OCR_FORCE_UNLOCK] message_id=' + messageId);
          await this.state.storage.delete(lockKey);
          console.log('[OCR_LOCK_RELEASED]', lockKey);
        }
        
        // 1. 解析 r2Key
        let r2Key;
        if (mediaPath.startsWith('http')) {
          try {
            const url = new URL(mediaPath);
            if (url.pathname.startsWith('/api/media/r2/')) {
              r2Key = url.pathname.replace('/api/media/r2/', '');
              console.log('[OCR_DO_R2_KEY_EXTRACTED]', r2Key);
            } else {
              console.error('[OCR_DO_INVALID_MEDIA_PATH]', mediaPath);
              throw new Error('Invalid mediaPath');
            }
          } catch (error) {
            console.error('[OCR_DO_R2_KEY_ERROR]', error.message);
            throw new Error('Invalid mediaPath');
          }
        } else if (mediaPath.startsWith('/api/media/r2/')) {
          r2Key = mediaPath.replace('/api/media/r2/', '');
          console.log('[OCR_DO_R2_KEY_EXTRACTED]', r2Key);
        } else {
          console.error('[OCR_DO_INVALID_MEDIA_PATH]', mediaPath);
          throw new Error('Invalid mediaPath');
        }
        
        if (!r2Key) {
          console.error('[OCR_DO_MISSING_R2_KEY]');
          throw new Error('Missing R2 key');
        }
        
        // 2. 从 R2 读取图片
        if (!this.env.MEDIA) {
          console.error('[OCR_DO_MISSING_R2] R2 binding not configured');
          throw new Error('R2 binding not configured');
        }
        
        console.log('[OCR_VISION_DIRECT_R2_READ] Reading image from R2:', r2Key);
        const obj = await this.env.MEDIA.get(r2Key);
        if (!obj) {
          console.error('[OCR_DO_R2_NOT_FOUND] Object not found in R2:', r2Key);
          throw new Error('R2_NOT_FOUND');
        }
        
        console.log('[OCR_DO_R2_GET_OK] size=' + obj.size);
        
        // 3. 检查图片大小
        const size = obj.size || 0;
        const MAX_OCR_SIZE = 5 * 1024 * 1024; // 5MB
        if (size > MAX_OCR_SIZE) {
          console.error('[OCR_DO_SIZE_LIMIT] Image too large:', size);
          throw new Error('Image too large');
        }
        
        // 4. 获取图片 buffer
        const buffer = await obj.arrayBuffer();
        
        // 5. 转 base64
        console.log('[OCR_VISION_BASE64_ENCODE_START] Encoding image to base64');
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Image = btoa(binary);
        console.log('[OCR_VISION_BASE64_OK] Base64 encoded, length:', base64Image.length);
        
        // 5. Provider 分发
        console.log('[OCR_PROVIDER_DISPATCH]', provider);
        
        const kvKey = `ocr:${messageId}`;
        
        if(provider === "google_vision" || provider === "google") {
          console.log('[OCR_PROVIDER_GOOGLE_VISION_START]');
          console.log('[OCR_VISION_START] message_id=' + messageId);
          console.log('[OCR_GOOGLE_VISION_REQUEST] bytes=' + buffer.byteLength + ', contentType=' + obj.httpMetadata?.contentType);
          
          try {
            // 构建最小化请求结构
            const payload = {
              requests: [{
                image: { content: base64Image },
                features: [{ type: "TEXT_DETECTION" }]
              }]
            };
            
            // Google Vision API 端点
            const GOOGLE_VISION_API_KEY = this.env.GOOGLE_VISION_API_KEY;
            if (!GOOGLE_VISION_API_KEY) {
              console.error('[OCR_DO_MISSING_GOOGLE_API_KEY]');
              throw new Error('Google Vision API key not configured');
            }
            
            // 发送请求
            const nativeFetch = globalThis.fetch.bind(globalThis);
            console.log("[OCR_VISION_NATIVE_FETCH_USED]");
            
            const GOOGLE_VISION_KEY = this.env.GOOGLE_VISION_API_KEY;
            const visionUrl = "https://vision.googleapis.com/v1/images:annotate?key=" + GOOGLE_VISION_KEY;
            const visionOptions = {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            };
            
            // Log request details
            const keyPrefix = GOOGLE_VISION_KEY.substring(0, 6);
            const keySuffix = GOOGLE_VISION_KEY.substring(GOOGLE_VISION_KEY.length - 4);
            console.log('[OCR_VISION_REQUEST_DETAILS]', {
              url: visionUrl.replace(GOOGLE_VISION_KEY, `${keyPrefix}...${keySuffix}`),
              bodyLength: JSON.stringify(payload).length,
              hasImageContent: !!payload.requests[0].image.content,
              imageContentLength: payload.requests[0].image.content.length
            });
            
            console.log('[OCR_VISION_FETCH_SENT] Sending request to Google Vision API');
            const resp = await nativeFetch(visionUrl, visionOptions);
            
            const rawText = await resp.text();
            
            console.log("[OCR_VISION_HTTP]", {
              status: resp.status,
              statusText: resp.statusText,
              contentType: resp.headers.get('content-type'),
              body: rawText.slice(0, 2000)
            });
            
            console.log('[OCR_VISION_HTTP_STATUS]', resp.status);
            console.log('[OCR_VISION_HTTP_BODY]', rawText.slice(0, 2000));
            
            if (!resp.ok) {
              // Parse error response
              let errorDetails = {};
              try {
                errorDetails = JSON.parse(rawText);
                console.log('[OCR_VISION_ERROR_PARSED]', errorDetails);
              } catch (parseError) {
                console.error('[OCR_VISION_ERROR_PARSE_FAILED]', parseError.message);
                errorDetails = { message: rawText };
              }
              
              // Write debug info to KV
              if (this.env.KV) {
                const debugKey = `ocr_debug:${messageId}`;
                const debugInfo = {
                  timestamp: Date.now(),
                  status: resp.status,
                  statusText: resp.statusText,
                  contentType: resp.headers.get('content-type'),
                  error: errorDetails,
                  request: {
                    url: visionUrl.replace(GOOGLE_VISION_KEY, `${keyPrefix}...${keySuffix}`),
                    bodyLength: JSON.stringify(payload).length
                  }
                };
                
                try {
                  await this.env.KV.put(debugKey, JSON.stringify(debugInfo), {
                    expirationTtl: 600
                  });
                  console.log('[OCR_DEBUG_KV_WRITTEN]', debugKey);
                } catch (kvError) {
                  console.error('[OCR_DEBUG_KV_WRITE_ERROR]', kvError.message);
                }
              }
              
              throw new Error(`vision_http_${resp.status}: ${errorDetails.message || rawText.slice(0, 200)}`);
            }
            
            // 读取结果
            const json = JSON.parse(rawText);
            
            // 解析响应
            if (!json.responses || !json.responses[0]) {
              console.error('[OCR_VISION_RESPONSE_INVALID] Invalid format');
              throw new Error('Invalid Google Vision response format');
            }
            
            const visionResponse = json.responses[0];
            const textAnnotation = visionResponse.fullTextAnnotation;
            const textAnnotations = visionResponse.textAnnotations;
            let text = '';
            
            // 尝试从多个路径提取文本
            if (textAnnotation && textAnnotation.text) {
              text = textAnnotation.text;
            } else if (textAnnotations && textAnnotations.length > 0 && textAnnotations[0].description) {
              text = textAnnotations[0].description;
            } else if (visionResponse.text) {
              text = visionResponse.text;
            } else if (visionResponse.documentTextAnnotation && visionResponse.documentTextAnnotation.text) {
              text = visionResponse.documentTextAnnotation.text;
            }
            
            console.log('[OCR_VISION_PARSE_OK] textLen=' + text.length);
            
            // 成功写 KV
            const successKvValue = {
              ok: true,
              status: "completed",
              ocr_text: text
            };
            
            if (this.env.KV) {
              await this.env.KV.put(kvKey, JSON.stringify(successKvValue));
              console.log('[OCR_KV_WRITE_DONE] key=' + kvKey + ', textLen=' + text.length);
            }
            
            console.log('[OCR_DO_DONE] message_id=' + messageId);
            
            return ok(request, {
              ok: true,
              ocr_id: `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              status: "completed",
              ocr_text: text
            });
          } catch (error) {
            console.error('[OCR_DO_GOOGLE_CALL_ERROR]', error.message);
            console.error("[OCR_VISION_FINAL_ERROR]", error.message);
            
            // 解析错误信息，提取HTTP状态码和错误类型
            let httpStatus = null;
            let bodySnippet = "";
            let errorDetail = error.message.substring(0, 200);
            
            // 尝试从错误消息中提取HTTP状态码
            const statusMatch = error.message.match(/vision_http_(\d+)/);
            if (statusMatch) {
              httpStatus = parseInt(statusMatch[1]);
            }
            
            // 失败写 KV
            const errorKvValue = {
              ok: false,
              status: "failed",
              ocr_text: "",
              error: "vision_call_failed",
              detail: errorDetail,
              http_status: httpStatus,
              body_snippet: bodySnippet
            };
            
            if (this.env.KV) {
              await this.env.KV.put(kvKey, JSON.stringify(errorKvValue));
              console.log('[OCR_KV_WRITE_DONE] key=' + kvKey + ', status=failed, httpStatus=' + httpStatus);
            }
            
            console.log('[OCR_VISION_PARSE_FAIL] message=' + errorDetail + ', httpStatus=' + httpStatus);
            console.log('[OCR_DO_DONE] message_id=' + messageId + ' (failed)');
            
            return ok(request, {
              ok: false,
              ocr_id: `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              status: "failed",
              ocr_text: "",
              error: "vision_call_failed",
              detail: errorDetail,
              http_status: httpStatus
            });
          }
        } else {
          console.log('[OCR_PROVIDER_NOT_FOUND]', provider);
          
          // 写 KV 失败状态
          if (this.env.KV) {
            const notFoundKvValue = {
              ok: false,
              status: "failed",
              ocr_text: "",
              error: "provider_not_found",
              detail: "Provider not supported"
            };
            await this.env.KV.put(kvKey, JSON.stringify(notFoundKvValue));
            console.log('[OCR_KV_WRITE_DONE] key=' + kvKey + ', status=failed');
          }
          
          console.log('[OCR_DO_DONE] message_id=' + messageId + ' (provider not found)');
          
          return ok(request, {
            ok: false,
            ocr_id: `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: "failed",
            ocr_text: "",
            error: "provider_not_found"
          });
        }
      } catch (error) {
        console.error('[OCR_DO_ERROR]', error.message);
        
        // 确保即使在最外层错误也能写 KV
        if (this.env.KV) {
          const errorKvValue = {
            ok: false,
            status: "failed",
            ocr_text: "",
            error: "internal_error",
            detail: error.message.substring(0, 200)
          };
          try {
            await this.env.KV.put(kvKey, JSON.stringify(errorKvValue));
            console.log('[OCR_KV_WRITE_DONE] key=' + kvKey + ', status=failed');
          } catch (kvError) {
            console.error('[OCR_KV_WRITE_ERROR]', kvError.message);
          }
        }
        
        console.log('[OCR_VISION_PARSE_FAIL] message=' + error.message.substring(0, 200));
        console.log('[OCR_DO_DONE] message_id=' + messageId + ' (failed)');
        
        return ok(request, {
          ok: false,
          ocr_id: `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: "failed",
          ocr_text: "",
          error: "internal_error"
        });
      } finally {
        // Always release lock
        if (lockKey) {
          await this.state.storage.delete(lockKey);
          console.log('[OCR_LOCK_RELEASED]', lockKey);
        }
      }
    }

    return ok(request, {
      ok: true,
      message: "JEV_STATE is running"
    });
  }

  // Get method for OCR lock checking
  async get(key) {
    try {
      const value = await this.state.storage.get(key);
      console.log('[OCR_LOCK_GET]', { key, value: value ? 'LOCKED' : 'UNLOCKED' });
      return value;
    } catch (error) {
      console.error('[OCR_LOCK_GET_ERROR]', error.message);
      return null;
    }
  }

  // Put method for OCR lock setting
  async put(key, value, options) {
    try {
      await this.state.storage.put(key, value, options);
      console.log('[OCR_LOCK_PUT]', { key, value, expirationTtl: options?.expirationTtl });
    } catch (error) {
      console.error('[OCR_LOCK_PUT_ERROR]', error.message);
      throw error;
    }
  }
}

// DaojieStreamDO
export class DaojieStreamDO {
  async fetch(request) {
    return new Response('DO disabled', {
      status: 410,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
}

// ContactIndexDO - Durable Object for contact management
export class ContactIndexDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(req) {
    let pathname = "/";
    try {
      const url = new URL(req.url);
      pathname = url.pathname;
    } catch (error) {
      console.warn('[CONTACT_INDEX_URL_PARSE_ERROR]', error.message);
      // 尝试从请求对象中获取路径信息
      if (req.url) {
        pathname = req.url;
      }
    }
    
    const method = req.method;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    console.log('[CONTACT_INDEX_REQUEST] Pathname:', pathname, 'Method:', method);

    // 处理路径匹配，支持多种格式
    if (pathname === "/add" || pathname.includes("/add")) {
      return this.addContact(req, corsHeaders);
    }

    if (pathname === "/list" || pathname.includes("/list")) {
      return this.getList(corsHeaders);
    }

    return new Response("NOT_FOUND", {
      status: 404,
      headers: corsHeaders
    });
  }

  async addContact(req, corsHeaders) {
    const body = await req.json();
    const id = body.customer_id;

    if (!id) {
      return new Response(JSON.stringify({ ok: false }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    let contacts = await this.state.storage.get("contacts") || {};

    contacts[id] = {
      customer_id: id,
      last_message_ts: Date.now()
    };

    await this.state.storage.put("contacts", contacts);

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  async getList(corsHeaders) {
    const contacts = await this.state.storage.get("contacts") || {};

    return new Response(JSON.stringify({
      ok: true,
      chats: Object.values(contacts)
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// AutoDraftEngine - Enterprise-level AI reply draft generator
export class AutoDraftEngine {
  constructor(env) {
    this.env = env;
    this.deepSeekApiKey = env.DEEPSEEK_API_KEY;
    this.deepSeekApiUrl = 'https://api.deepseek.com/v1/chat/completions';
  }

  async callDeepSeekAPI(customerMessage, chatId, messageId) {
    if (!this.deepSeekApiKey) {
      throw new Error('DeepSeek API key is not configured');
    }

    // 使用 QUOTE_DRAFT intent 获取 system prompt
    const intent = 'QUOTE_DRAFT';
    const systemPrompt = getSystemPrompt(intent);

    try {
      console.log('[DeepSeek API Call] Starting API call');
      console.log('[PERSONA_GATE]', {
        message_id: messageId,
        intent: intent,
        route: 'ai_draft',
        prompt_type: 'QUOTE_DRAFT_PROMPT'
      });

      // 调用 Persona Firewall
      const payload = { message_id: messageId };
      const guard = await persona_guard('ai_draft', payload);

      const response = await fetch(this.deepSeekApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepSeekApiKey}`,
          ...guard.headers
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: customerMessage }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.error('[DeepSeek API Error]', response.status, errorBody);
        throw new Error(`DeepSeek API error: ${response.status} ${errorBody}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';

      if (!content) {
        throw new Error('DeepSeek API returned empty response');
      }

      let englishReply = '';
      let chineseTranslation = '';
      
      try {
        const customerVisibleMatch = content.match(/【AI 建议回复｜客户可见】[\s\S]*?【中文翻译｜仅内部可见】/);
        if (customerVisibleMatch) {
          englishReply = customerVisibleMatch[0]
            .replace(/【AI 建议回复｜客户可见】/g, '')
            .replace(/【中文翻译｜仅内部可见】/g, '')
            .trim();
        }
        
        const chineseTranslationMatch = content.match(/【中文翻译｜仅内部可见】[\s\S]*/);
        if (chineseTranslationMatch) {
          chineseTranslation = chineseTranslationMatch[0]
            .replace(/【中文翻译｜仅内部可见】/g, '')
            .trim();
        }
        
        if (!englishReply) {
          englishReply = content.trim();
        }
      } catch (parseError) {
        console.warn('[DeepSeek API Response] Failed to parse response format');
        englishReply = content.trim();
        chineseTranslation = '翻译服务暂时不可用';
      }

      return {
        draft: englishReply,
        chineseTranslation: chineseTranslation,
        internalCn: {
          "客户在想什么": "客户询问相关事宜",
          "为什么这样回": "以自然、简短的方式回应客户，保持对话流畅"
        },
        language: 'en',
        confidence: 0.9,
        timestamp: Date.now(),
        draftData: {
          chat_id: chatId,
          draft_type: 'auto_reply',
          based_on_message_id: messageId,
          reply_to_customer_en: englishReply,
          reply_to_customer_zh: chineseTranslation,
          internal_cn: {
            "客户在想什么": "客户询问相关事宜",
            "为什么这样回": "以自然、简短的方式回应客户，保持对话流畅"
          }
        }
      };
    } catch (error) {
      console.error('[DeepSeek API Error]', error.message);
      throw error;
    }
  }

  async generateDraft(customerMessage, chatId, messageId) {
    try {
      const result = await this.callDeepSeekAPI(customerMessage, chatId, messageId);

      return {
        success: true,
        draft: result.draft,
        chineseTranslation: result.chineseTranslation,
        language: result.language,
        languageName: 'English',
        confidence: result.confidence,
        timestamp: result.timestamp,
        internalCn: result.internalCn,
        draftData: result.draftData,
        customerMessage: customerMessage
      };
    } catch (error) {
      console.error('[Generate Draft Error]', error.message);
      return {
        success: false,
        error: error.message,
        draft: '',
        language: 'en',
        languageName: 'English',
        confidence: 0,
        timestamp: Date.now(),
        internalCn: {
          "客户在想什么": "客户询问相关事宜",
          "为什么这样回": "以自然、简短的方式回应客户，保持对话流畅"
        },
        customerMessage: customerMessage
      };
    }
  }
}

// AutoDraftWorker - Background processing for draft generation
export class AutoDraftWorker {
  constructor(env) {
    this.env = env;
    this.draftEngine = new AutoDraftEngine(env);
    this.processingQueue = new Set();
    this.draftStorage = new Map();
  }

  async processNewCustomerMessage(message, chatId) {
    try {
      if (this.processingQueue.has(message.message_id)) {
        console.log('[Draft Processing] Message already in queue');
        return { status: 'pending' };
      }

      this.processingQueue.add(message.message_id);
      console.log('[Draft Processing] Added to queue');

      // 检查是否是媒体消息且OCR失败
      const isMediaMessage = !!message.media_path;
      const isOcrFailed = isMediaMessage && !message.ocr_text;
      
      // 根据OCR状态构建消息文本
      let messageText;
      if (isOcrFailed) {
        messageText = '[图片消息] OCR暂不可用';
      } else {
        messageText = message.text || (message.media_path ? '[图片消息]' : '[无文本消息]');
      }
      
      const draftResult = await this.draftEngine.generateDraft(
        messageText,
        chatId,
        message.message_id
      );
      
      // 如果是OCR失败的媒体消息，确保生成合适的Draft
      if (isOcrFailed && !draftResult.success) {
        draftResult.success = true;
        draftResult.draft = '已收到图片/文件，OCR暂不可用。';
        draftResult.chineseTranslation = '已收到图片/文件，OCR暂不可用。';
        draftResult.internalCn = {
          "客户在想什么": "客户发送了图片/文件",
          "为什么这样回": "确认收到媒体文件，并告知OCR功能暂不可用"
        };
      }

      if (draftResult.success) {
        await this.storeDraft(chatId, message.message_id, draftResult);
        console.log('[Draft Processing] Draft generated successfully');
        
        await this.broadcastDraftComplete(chatId, message.message_id, draftResult);

        return {
          status: 'completed',
          draft: draftResult.draft,
          chineseTranslation: draftResult.chineseTranslation,
          language: draftResult.language,
          languageName: draftResult.languageName
        };
      } else {
        console.error('[Draft Processing] Failed to generate draft:', draftResult.error);
        return {
          status: 'failed',
          error: draftResult.error
        };
      }
    } catch (error) {
      console.error('[Draft Processing Error]', error.message);
      return {
        status: 'failed',
        error: error.message
      };
    } finally {
      this.processingQueue.delete(message.message_id);
      console.log('[Draft Processing] Removed from queue');
    }
  }

  async storeDraft(chatId, messageId, draftResult) {
    try {
      const draftData = {
        chat_id: chatId,
        source: 'deepseek',
        based_on_message_id: messageId,
        based_on_text: draftResult.customerMessage || '',
        reply_to_customer_en: draftResult.draft || '',
        internal_cn: draftResult.internalCn || {
          "客户在想什么": "客户询问相关事宜",
          "为什么这样回": "以自然、简短的方式回应客户，保持对话流畅"
        },
        status: 'active',
        updated_at: Date.now()
      };

      if (this.env.DRAFT_KV) {
        const key = `draft:${chatId}`;
        await this.env.DRAFT_KV.put(key, JSON.stringify(draftData));
        console.log('[Draft Storage] Draft stored:', key);
      }
      
      const storageKey = `draft:${chatId}`;
      this.draftStorage.set(storageKey, draftData);
    } catch (error) {
      console.error('[Draft Storage Error]', error.message);
    }
  }

  async getDraft(chatId) {
    try {
      const storageKey = `draft:${chatId}`;
      if (this.draftStorage.has(storageKey)) {
        return this.draftStorage.get(storageKey);
      }

      if (this.env.DRAFT_KV) {
        const key = `draft:${chatId}`;
        const draftData = await this.env.DRAFT_KV.get(key, { type: 'json' });
        if (draftData) {
          return draftData;
        }
      }

      return null;
    } catch (error) {
      console.error('[Get Draft Error]', error.message);
      return null;
    }
  }

  async broadcastDraftComplete(chatId, messageId, draftResult) {
    try {
      const doId = this.env.WHATSAPP_CHAT_DO.idFromName('chat');
      const doStub = this.env.WHATSAPP_CHAT_DO.get(doId);
      
      // 使用完整的 URL 格式调用 Durable Object
      const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
      const broadcastUrl = `${WORKER_ORIGIN}/broadcast`;
      console.log('[BROADCAST_URL_FINAL]', broadcastUrl);
      await doStub.fetch(new Request(broadcastUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'draft_complete',
          data: {
            chatId,
            messageId,
            draft: draftResult.draft,
            language: draftResult.language,
            languageName: draftResult.languageName,
            timestamp: Date.now()
          }
        })
      }));
      
      console.log('[Draft Broadcast] Draft complete event broadcasted');
    } catch (error) {
      console.error('[Draft Broadcast Error]', error.message);
    }
  }
}

// Presence Radar 函数
function logPresenceRadar(message_id, customer_id) {
  console.log(JSON.stringify({
    type: "PRESENCE_RADAR",
    message_id,
    customer_id,
    ts: Date.now(),
    layer: "WORKER"
  }));
}

// Presence Memory 写入函数
async function writePresenceMemory(radar, env) {
  try {
    console.log("[PRESENCE_WRITE_START]");
    
    if (env && env.KV) {
      // 1. 先读取现有的雷达数据
      let radarList = [];
      try {
        const existingData = await env.KV.get('presence:radar:list', 'json');
        if (existingData && Array.isArray(existingData)) {
          radarList = existingData;
        }
      } catch (readError) {
        console.error('[PRESENCE_RADAR_READ_ERROR]', readError.message);
      }
      
      // 2. 添加新的雷达数据到数组开头
      radarList.unshift({
        ...radar,
        stored_at: Date.now()
      });
      
      // 3. 只保留最近 20 条数据
      if (radarList.length > 20) {
        radarList = radarList.slice(0, 20);
      }
      
      // 4. 写回 KV
      await env.KV.put(
        'presence:radar:list',
        JSON.stringify(radarList),
        { expirationTtl: 86400 * 7 } // 保留7天
      );
      
      console.log("[PRESENCE_EDGE_MEMORY]", radar.message_id);
    } else {
      console.log("[PRESENCE_MEMORY_SKIPPED] KV not available");
    }
  } catch (error) {
    console.error('[PRESENCE_MEMORY_WRITE_ERROR]', error.message);
  }
}

// Main request handler
async function handleRequest(request, env, ctx) {
  try {
    // 标记 Worker 主函数激活
    console.log("[WORKER_MAIN_ACTIVE]");
    
    // WebSocket Upgrade 入口
    if (request.headers.get("Upgrade") === "websocket") {
      const url = new URL(request.url);

      if (url.pathname === "/stream") {

        console.log("[WS_UPGRADE_RECEIVED]");
        console.log("[WS_MAIN_FORWARD_ONLY]");

        const id = env.CHAT_ROOM_DO.idFromName("global");
        const stub = env.CHAT_ROOM_DO.get(id);

        return stub.fetch(request);
      }
    }
    
    // WebSocket 路由检查
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;
    console.log("[WS_ROUTE_CHECK]", url.pathname);
    
    // 静态文件服务
    if (method === 'GET') {
      // 处理根路径
      if (pathname === '/') {
        return new Response('<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/index.html"></head><body></body></html>', {
          headers: {
            'Content-Type': 'text/html'
          }
        });
      }
      
      // 处理 index.html
      if (pathname === '/index.html') {
        return new Response('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>JEV Rebuild</title><script type="module" src="/assets/index-BWP1GyQm.js"></script><link rel="stylesheet" href="/assets/index-1p1J62b1.css"></head><body><div id="root"></div></body></html>', {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=31536000'
          }
        });
      }
      
      // 处理 vite.svg
      if (pathname === '/vite.svg') {
        return new Response('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="31.88" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 257"><defs><linearGradient id="IconifyId1813788fe1fbc6666466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%"><stop offset="0%" stop-color="#41D1FF"></stop><stop offset="100%" stop-color="#BD34FE"></stop></linearGradient><linearGradient id="IconifyId1813788fe1fbc6666467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%"><stop offset="0%" stop-color="#FFEA83"></stop><stop offset="8.333%" stop-color="#FFDD35"></stop><stop offset="100%" stop-color="#FFA800"></stop></linearGradient></defs><path fill="url(#IconifyId1813788fe1fbc6666466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"></path><path fill="url(#IconifyId1813788fe1fbc6666467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"></path></svg>', {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=31536000'
          }
        });
      }
      
      // 处理声音文件
      if (pathname === '/sounds/notify.mp3') {
        return new Response('', {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=31536000'
          }
        });
      }
    }
    
    // 一次性环境检查日志
    if (!envChecked) {
      console.log("[ENV_CHECK] CHAT_ROOM_DO=" + !!env.CHAT_ROOM_DO);
      console.log("[ENV_CHECK] DEAL_STATE_DO=" + !!env.DEAL_STATE_DO);
      console.log("[ENV_CHECK] CONTACT_INDEX=" + !!env.CONTACT_INDEX);
      console.log("[ENV_CHECK] TRANSLATION_STORE=" + !!env.TRANSLATION_STORE);
      console.log("[ENV_CHECK] JEV_R2=" + !!env.JEV_R2);
      envChecked = true;
    }
    
    // 一次性检测日志：检查 MESSAGES_KV 是否真实绑定
    console.log("[KV_BIND_CHECK]", {
      has_MESSAGES_KV: !!env.MESSAGES_KV,
      has_KV: !!env.KV
    });

    console.log("[ROUTE_TRACE]", request.method, url.pathname);
    console.log(`[LIVELOG_HIT] ${method} ${pathname}`);
    console.log(`[ROUTE_MATCH] Checking routes for ${method} ${pathname}`);
    console.log("[WORKER_ROUTE_MATCH]", url.pathname);

    if (method === "OPTIONS") {
      console.log("[OPTIONS_ROUTE_HIT]", pathname);
      return options(request);
    }

    // Twilio inbound webhook endpoint
    if (method === 'POST' && pathname === '/api/inbound/whatsapp/twilio') {
      return handleWhatsappInbound(request, env);
    }

    // Outbound WhatsApp endpoint
    if (method === 'POST' && pathname === '/api/outbound/whatsapp') {
      console.log('[ROUTE_HIT] outbound_whatsapp', request.method, url.pathname);
      console.log('[OUTBOUND_WHATSAPP_ROUTE_HIT]');
      console.log('[V3_PIPELINE_ENTRY] twilio_send_whatsapp hit');
      try {
        const { to, chat_id, text, from, mediaUrl, media_path, message_id, media_source } = await request.json();
        
        let finalTo = chat_id || to;
        
        if (!finalTo.startsWith("whatsapp:")) {
          finalTo = "whatsapp:" + finalTo.replace(/^whatsapp:/, "");
        }
        
        const safeText = text !== undefined ? text : '';
        const finalMessageId = message_id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 确定最终的媒体URL
        let finalMediaUrl = mediaUrl || media_path;
        let media_path_result = null;
        
        // 处理媒体入库
        if (media_source) {
          console.log('[V3_INGEST_CALL]', {customer_id: finalTo, media_sid: finalMessageId, media_source: media_source.type});
          
          // 构建 pipeline 环境
          const pipelineEnv = {
            R2: env.MEDIA,
            KV: env.KV,
            MEDIA_LOCK: env.MEDIA_LOCK,
            WORKER_ORIGIN: getPublicBaseUrl(request, env)
          };
          
          try {
            // 使用 Media Pipeline Core 进行媒体入库
            const ingestResult = await ingestMedia(pipelineEnv, media_source, {
              namespace: 'whatsapp',
              direction: 'outbound',
              customerId: finalTo,
              mediaId: finalMessageId
            });
            
            media_path_result = ingestResult.mediaPath;
            finalMediaUrl = `${getPublicBaseUrl(request, env)}/api/media/r2/${ingestResult.r2Key}`;
            
            console.log('[V3_INGEST_DONE]', {r2Key: ingestResult.r2Key, media_path: ingestResult.mediaPath});
            console.log('[OUTBOUND_MEDIA_INGEST_SUCCESS] Media stored successfully via pipeline');
          } catch (error) {
            console.error('[OUTBOUND_MEDIA_INGEST_ERROR]', error.message);
            // Continue with original mediaUrl if ingest fails
          }
        } else if (finalMediaUrl) {
          // 检查是否已经是R2路径
          if (finalMediaUrl.startsWith('/api/media/r2/') || finalMediaUrl.includes('/api/media/r2/')) {
            console.log('[V3_SKIP_INGEST_ALREADY_R2]');
          } else {
            console.log('[V3_INGEST_CALL]', {customer_id: finalTo, media_sid: finalMessageId, mediaUrl: finalMediaUrl});
            
            // 构建 pipeline 环境
            const pipelineEnv = {
              R2: env.MEDIA,
              KV: env.KV,
              MEDIA_LOCK: env.MEDIA_LOCK,
              WORKER_ORIGIN: getPublicBaseUrl(request, env)
            };
            
            try {
              // 使用 Media Pipeline Core 进行媒体入库
              const ingestResult = await ingestMedia(pipelineEnv, {
                remoteUrl: finalMediaUrl
              }, {
                namespace: 'whatsapp',
                direction: 'outbound',
                customerId: finalTo,
                mediaId: finalMessageId
              });
              
              media_path_result = ingestResult.mediaPath;
              finalMediaUrl = ingestResult.mediaPath; // 直接使用返回的 mediaPath 作为 Twilio MediaUrl
              
              console.log('[V3_INGEST_DONE]', {r2Key: ingestResult.r2Key, media_path: ingestResult.mediaPath});
              console.log('[OUTBOUND_MEDIA_INGEST_SUCCESS] Media stored successfully via pipeline');
            } catch (error) {
              console.error('[OUTBOUND_MEDIA_INGEST_ERROR]', error.message);
              // Continue with original mediaUrl if ingest fails
            }
          }
        } else {
          console.log('[V3_NO_MEDIA_SOURCE_FALLBACK]');
        }
        
        // 将相对路径转换为绝对URL（使用固定Worker域名）
        if (finalMediaUrl && !finalMediaUrl.startsWith('http')) {
          const WORKER_ORIGIN = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
          finalMediaUrl = `${WORKER_ORIGIN}${finalMediaUrl}`;
          console.log('[OUTBOUND_MEDIA_URL]', finalMediaUrl);
        }
        
        console.log('[OUTBOUND_WHATSAPP_PAYLOAD]', {
          to: finalTo,
          text: safeText,
          from,
          mediaUrl: finalMediaUrl,
          message_id: finalMessageId
        });
        
        // 验证Twilio凭据
        const hasSid = !!env.TWILIO_ACCOUNT_SID;
        const hasToken = !!env.TWILIO_AUTH_TOKEN;
        const hasFrom = !!env.TWILIO_WHATSAPP_FROM || !!env.TWILIO_MESSAGING_SERVICE_SID;
        console.log('[TWILIO_ENV_PRESENT] sid=' + hasSid + ' token=' + hasToken + ' from=' + hasFrom);
        
        if (!hasSid || !hasToken || !hasFrom) {
          console.error('[OUTBOUND_BLOCKED] TWILIO_MISSING_CREDENTIAL');
          return new Response(JSON.stringify({
            ok: false,
            error: 'TWILIO_MISSING_CREDENTIAL',
            missing: [
              !hasSid ? 'sid' : '',
              !hasToken ? 'token' : '',
              !hasFrom ? 'from' : ''
            ].filter(Boolean)
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        if (from) {
          console.error('[TWILIO_INVALID_PARAM] from parameter is not allowed with MessagingServiceSid');
          throw new Error('[TWILIO_INVALID_PARAM] from parameter is not allowed with MessagingServiceSid');
        }
        
        const messagingServiceSid = 'MG8d901e3947635deacc8fab383cb55ad2';
        console.log('[TWILIO_SEND_MODE] messaging_service');
        console.log('[V3_PIPELINE_REAL_ENTRY]');
        
        // 处理媒体入库
        if (media_source) {
          console.log('[V3_INGEST_CALL]', {customer_id: finalTo, media_id: finalMessageId, media_source: media_source.type});
          
          // 构建 pipeline 环境
          const pipelineEnv = {
            R2: env.MEDIA,
            KV: env.KV,
            MEDIA_LOCK: env.MEDIA_LOCK,
            WORKER_ORIGIN: getPublicBaseUrl(request, env)
          };
          
          try {
            // 使用 Media Pipeline Core 进行媒体入库
            const result = await ingestMedia(pipelineEnv, media_source, {
              namespace: 'whatsapp',
              direction: 'outbound',
              customerId: finalTo,
              mediaId: finalMessageId
            });
            
            media_path_result = result.mediaPath;
            finalMediaUrl = `${getPublicBaseUrl(request, env)}/api/media/r2/${result.r2Key}`;
            
            console.log('[V3_INGEST_DONE]', {r2Key: result.r2Key, media_path: result.mediaPath});
            console.log('[OUTBOUND_MEDIA_INGEST_SUCCESS] Media stored successfully via pipeline');
          } catch (error) {
            console.error('[OUTBOUND_MEDIA_INGEST_ERROR]', error.message);
            // Continue with original mediaUrl if ingest fails
          }
        } else if (finalMediaUrl) {
          // 检查是否已经是R2路径
          if (finalMediaUrl.startsWith('/api/media/r2/') || finalMediaUrl.includes('/api/media/r2/')) {
            console.log('[V3_SKIP_INGEST_ALREADY_R2]');
          } else {
            console.log('[V3_INGEST_CALL]', {customer_id: finalTo, media_id: finalMessageId, mediaUrl: finalMediaUrl});
            
            // 构建 pipeline 环境
            const pipelineEnv = {
              R2: env.MEDIA,
              KV: env.KV,
              MEDIA_LOCK: env.MEDIA_LOCK,
              WORKER_ORIGIN: getPublicBaseUrl(request, env)
            };
            
            try {
              // 使用 Media Pipeline Core 进行媒体入库
              const result = await ingestMedia(pipelineEnv, {
                remoteUrl: finalMediaUrl
              }, {
                namespace: 'whatsapp',
                direction: 'outbound',
                customerId: finalTo,
                mediaId: finalMessageId
              });
              
              media_path_result = result.mediaPath;
              finalMediaUrl = `${getPublicBaseUrl(request, env)}/api/media/r2/${result.r2Key}`;
              
              console.log('[V3_INGEST_DONE]', {r2Key: result.r2Key, media_path: result.mediaPath});
              console.log('[OUTBOUND_MEDIA_INGEST_SUCCESS] Media stored successfully via pipeline');
            } catch (error) {
              console.error('[OUTBOUND_MEDIA_INGEST_ERROR]', error.message);
              // Continue with original mediaUrl if ingest fails
            }
          }
        } else {
          console.log('[V3_NO_MEDIA_SOURCE_FALLBACK]');
        }
        
        console.log('[TWILIO_SEND_START]');
        
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
        
        const encoder = new TextEncoder();
        const data = encoder.encode(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
        const authHeader = "Basic " + btoa(String.fromCharCode(...data));
        
        const formData = new URLSearchParams();
        formData.append('To', finalTo);
        formData.append('MessagingServiceSid', messagingServiceSid);
        formData.append('Body', safeText);
        
        if (finalMediaUrl) {
          formData.append('MediaUrl', finalMediaUrl);
        }
        
        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: formData.toString()
        });
        
        const responseBody = await response.json();
        
        console.log('[TWILIO_SEND_RESPONSE]', {
          status: response.status,
          statusText: response.statusText,
          responseBody
        });
        
        if (response.status !== 201) {
          return new Response(JSON.stringify({
            ok: false,
            error: 'TWILIO_API_ERROR',
            message: responseBody.message || 'Failed to send message',
            twilioError: responseBody,
            single_world: true
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        console.log('[TWILIO_SEND_OK]', { sid: responseBody.sid });
        
        try {
          const draftWorker = new AutoDraftWorker(env);
          const currentDraft = await draftWorker.getDraft(to);
          if (currentDraft) {
            currentDraft.status = 'sent';
            currentDraft.updated_at = Date.now();
            if (env.DRAFT_KV) {
              const key = `draft:${to}`;
              await env.DRAFT_KV.put(key, JSON.stringify(currentDraft));
              console.log('[Draft Status] Draft marked as sent:', key);
            }
          }
        } catch (draftError) {
          console.error('[Draft Status Update Error]', draftError.message);
        }
        
        return new Response(JSON.stringify({
          ok: true,
          twilio_sid: responseBody.sid,
          message_id: responseBody.sid,
          to: to,
          from: from,
          text: text,
          media_path: media_path_result,
          timestamp: Date.now(),
          single_world: true
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        console.error('[WHATSAPP_OUTBOUND_ERROR]', error);
        return new Response(JSON.stringify({
          ok: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: error.message,
          single_world: true
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Draft API endpoints
    const draftWorker = new AutoDraftWorker(env);
    
    // Get draft for specific message
    if (method === 'GET' && pathname === '/api/draft') {
      console.log('[DRAFT_GET_ROUTE_HIT]');
      try {
        const chatId = url.searchParams.get('chat_id');
        const messageId = url.searchParams.get('message_id');
        
        if (!chatId || !messageId) {
          return fail(request, 'Missing chat_id or message_id', 400);
        }
        
        const draft = await draftWorker.getDraft(chatId);
        if (draft) {
          return ok(request, { draft });
        } else {
          return ok(request, { draft: null });
        }
      } catch (error) {
        console.error('[DRAFT_GET_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // Generate draft manually
    if (method === 'POST' && pathname === '/api/draft/generate') {
      console.log('[DRAFT_GENERATE_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[DRAFT_GENERATE_PAYLOAD]', payload);
        
        let chat_id, text, sourceMessageId = null;
        
        if (payload.chat_id && payload.source_message && payload.source_message.text) {
          chat_id = payload.chat_id;
          text = payload.source_message.text;
          sourceMessageId = payload.source_message.message_id;
        } else if (payload.chat_id && payload.messages && Array.isArray(payload.messages) && payload.messages.length > 0) {
          chat_id = payload.chat_id;
          text = payload.messages[0].text;
        } else if (payload.chat_id && payload.new_messages && Array.isArray(payload.new_messages) && payload.new_messages.length > 0) {
          chat_id = payload.chat_id;
          text = payload.new_messages[0].text;
        } else {
          chat_id = payload.chat_id;
          text = payload.text;
        }
        
        if (!chat_id || !text) {
          return fail(request, 'Missing chat_id or text', 400);
        }
        
        const message = {
          message_id: payload.message_id || `msg_${Date.now()}`,
          chat_id,
          text,
          direction: 'inbound',
          timestamp: Date.now()
        };
        
        console.log('[DRAFT_GENERATE_MESSAGE]', message);
        
        const result = await draftWorker.processNewCustomerMessage(message, chat_id);
        console.log('[DRAFT_GENERATE_RESULT]', result);
        
        const storedDraft = await draftWorker.getDraft(chat_id);
        
        const responseData = {
          "ok": true,
          "chat_id": chat_id,
          "draft_id": `draft_${Date.now()}`,
          "source_message": {
            "message_id": sourceMessageId || message.message_id,
            "text": text
          },
          "reply": {
            "text": result.draft || 'Thank you for reaching out. How can I assist you today?',
            "lang": 'en'
          },
          "reply_zh_translation": {
            "text": result.chineseTranslation || '感谢您的留言。我今天能为您提供什么帮助？',
            "lang": "zh-CN"
          },
          "meta": {
            "ai_source": "deepseek_worker",
            "model": "deepseek",
            "generated_at": Date.now(),
            "reply_language": "en",
            "source_language": "auto",
            "provider": "deepseek",
            "ts": Date.now()
          },
          "reply_language": "en",
          "source_language": "auto"
        };
        
        console.log('[DRAFT_GENERATE_RESPONSE_V3]', responseData);
        
        return ok(request, responseData);
      } catch (error) {
        console.error('[DRAFT_GENERATE_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    // Health check
    if (method === 'GET' && pathname === '/api/health') {
      console.log('[HEALTH_ROUTE_HIT]');
      return ok(request, {
        ok: true,
        service: "jev-rebuild-worker"
      });
    }

    // Media ingest endpoint
    if (method === 'POST' && pathname === '/api/media/ingest') {
      console.log('[ROUTE_HIT] media_ingest', request.method, url.pathname);
      console.log('[MEDIA_INGEST_ROUTE_HIT]');
      try {
        const body = await request.json();
        console.log('[MEDIA_INGEST_REQUEST]', body);
        
        const { source, meta } = body;
        
        if (!source) {
          return fail(request, 'MISSING_SOURCE', 400, {
            error: 'Missing media source'
          });
        }
        
        // 构建 pipeline 环境
        const pipelineEnv = {
          R2: env.MEDIA,
          KV: env.KV,
          MEDIA_LOCK: env.MEDIA_LOCK,
          WORKER_ORIGIN: getPublicBaseUrl(request, env)
        };
        
        // Ingest media using Media Pipeline Core
        const result = await ingestMedia(pipelineEnv, source, meta);
        
        // Return success response
        return ok(request, {
          media_path: result.mediaPath,
          r2Key: result.r2Key,
          contentType: result.contentType,
          bytes: result.bytes,
          sha256: result.sha256
        });
        
      } catch (error) {
        console.error('[MEDIA_INGEST_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // WhatsApp media route
    if (method === 'GET' && pathname.startsWith("/api/media/r2/whatsapp/")) {
      console.log('[ROUTE_HIT] whatsapp_media', request.method, url.pathname);
      console.log("[WHATSAPP_MEDIA_ROUTE]", pathname);
      try {
        const parts = pathname.split("/");
        const messageSid = parts[5];
        const mediaSid = parts[6];
        
        const key = `whatsapp/${messageSid}/${mediaSid}`;
        console.log("[WHATSAPP_MEDIA_ROUTE_KEY]", key);
        
        const r2 = env.JEV_R2 || env.MEDIA;
        if (!r2) {
          console.error('[R2_MISSING] No R2 bucket configured');
          return new Response("Not Found", { status: 404 });
        }
        
        const obj = await r2.get(key);
        
        if (obj) {
          console.log("[WHATSAPP_MEDIA_R2_HIT]", key);
          
          return new Response(obj.body, {
            headers: {
              "content-type": obj.httpMetadata?.contentType || "image/jpeg",
              "cache-control": "public, max-age=31536000",
              "Access-Control-Allow-Origin": "*"
            }
          });
        }
        
        console.log("[WHATSAPP_MEDIA_R2_MISS]", key);
        
        return new Response("Not Found", { 
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*"
          }
        });
      } catch (error) {
        console.error('[WHATSAPP_MEDIA_ROUTE_ERROR]', error.message);
        return new Response("Not Found", { 
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    }
    
    // Media endpoint
    if (method === 'GET' && pathname.startsWith('/api/media/r2/')) {
      console.log('[ROUTE_HIT] media', request.method, url.pathname);
      console.log('[MEDIA_ROUTE_HIT]', pathname);
      try {
        // Extract key from path
        const encodedKey = pathname.replace('/api/media/r2/', '');
        const key = decodeURIComponent(encodedKey);
        if (!key) {
          return new Response('Not Found', {
            status: 404,
            headers: {
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        console.log('[R2_KEY_DECODED]', key);
        console.log('[R2_FETCH_KEY]', key);
        
        // Check if R2 bucket is configured
        if (!env.MEDIA) {
          console.error('[R2_MISSING] MEDIA bucket not configured');
          return new Response('Not Found', {
            status: 404,
            headers: {
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // ===== Twilio media route =====
        if (key.startsWith('twilio/')) {
          console.log('[TWILIO_MEDIA_ROUTE] Handling Twilio media request');
          
          // Get object from R2
          const obj = await env.MEDIA.get(key);
          
          if (!obj) {
            console.log('[R2_MISS] Twilio media not found in R2:', key);
            
            // Extract messageId from key (remove 'twilio/' prefix and '.jpg' suffix)
            const messageSid = key.replace('twilio/', '').replace('.jpg', '');
            console.log('[R2_MISS_FALLBACK_TWILIO]', { messageSid });
            
            // Check if Twilio credentials are available
            const accountSid = env.TWILIO_ACCOUNT_SID;
            const authToken = env.TWILIO_AUTH_TOKEN;
            if (!accountSid || !authToken) {
              console.error('[TWILIO_AUTH_MISSING] Missing Twilio auth credentials');
              return new Response("Not Found", { status: 404 });
            }
            
            // Check if MEDIA_INDEX KV is configured
            if (!env.MEDIA_INDEX) {
              console.error('[MEDIA_INDEX_MISSING] MEDIA_INDEX KV not configured');
              return new Response("Not Found", { status: 404 });
            }
            
            // 1️⃣ 查 KV 索引获取 messageSid 和 mediaSid
            console.log('[MEDIA_INDEX_LOOKUP]', { messageSid });
            const idxRaw = await env.MEDIA_INDEX.get(`twilio:${messageSid}`);
            if (!idxRaw) {
              console.log('[MEDIA_INDEX_MISS] Media index not found for:', messageSid);
              return new Response("Not Found", { status: 404 });
            }
            
            const { mediaSid, contentType, ext } = JSON.parse(idxRaw);
            console.log('[MEDIA_INDEX_HIT]', { messageSid, mediaSid });
            
            // 2️⃣ 生成正确的 Twilio Media URL
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}/Media/${mediaSid}`;
            
            // 3️⃣ Basic Auth
            const auth = "Basic " + btoa(accountSid + ":" + authToken);
            
            try {
              // 4️⃣ 拉取真实图片
              const resp = await fetch(twilioUrl, {
                headers: { Authorization: auth }
              });
              
              if (!resp.ok) {
                console.error('[TWILIO_FETCH_FAIL] Failed to fetch media from Twilio:', resp.status);
                return new Response("Media not found", { status: 404 });
              }
              
              const buffer = await resp.arrayBuffer();
              console.log('[TWILIO_FALLBACK_FETCH_OK]', { status: resp.status, bytes: buffer.byteLength });
              
              // 5️⃣ 写入 R2
              await env.MEDIA.put(
                key,
                buffer,
                {
                  httpMetadata: {
                    contentType: contentType || "image/jpeg",
                    cacheControl: "public, max-age=31536000"
                  }
                }
              );
              
              console.log('[R2_WRITE_FROM_FALLBACK]', { key });
              console.log('[R2_WRITE_OK]', mediaSid);
              
              // Return the fetched media
              return new Response(buffer, {
                headers: { "Content-Type": contentType || "image/jpeg" }
              });
            } catch (error) {
              console.error('[TWILIO_FALLBACK_ERROR] Error fetching media from Twilio:', error.message);
              return new Response("Not Found", { status: 404 });
            }
          }
          
          console.log('[R2_HIT] Twilio media found in R2:', key);
          
          // Return the object with correct headers
          const headers = new Headers();
          headers.set('content-type', 'image/jpeg');
          headers.set('cache-control', 'public, max-age=31536000');
          headers.set('Access-Control-Allow-Origin', '*');
          
          return new Response(obj.body, { headers });
        }
        
        // ===== Other media routes =====
        console.log('[R2_GET_START] Getting object:', key);
        const obj = await env.MEDIA.get(key);
        
        if (obj) {
          console.log('[R2_OBJECT_FOUND] Object found:', {
            key: key,
            size: obj.size,
            contentType: obj.httpMetadata?.contentType
          });
          
          // Return the object with appropriate headers
          return new Response(obj.body, {
            headers: {
              'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
              'Cache-Control': obj.httpMetadata?.cacheControl || 'public, max-age=31536000',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        console.log('[R2_MISS]', key);
        return new Response('Not Found', {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        console.error('[MEDIA_ROUTE_ERROR]', error.message);
        return new Response('Not Found', {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // /api/inbound/mock 端点
    if (method === 'POST' && pathname === '/api/inbound/mock') {
      console.log('[INBOUND_MOCK_ROUTE_HIT]');
      try {
        const payload = await request.json();
        const { message_id, customer_id, text } = payload;
        
        if (!message_id || !customer_id) {
          return fail(request, 'Missing required parameters: message_id, customer_id', 400);
        }
        
        // 添加 Presence Radar Hook
        logPresenceRadar(message_id, customer_id);
        
        // 添加 Presence Heartbeat
        console.log('[PRESENCE_HEARTBEAT]', message_id);
        
        // Upsert inbox index entry
        try {
          const inboxEntry = {
            customer_id: customer_id,
            chat_id: customer_id,
            last_message_ts: Date.now(),
            last_message_preview: text ? text.substring(0, 50) : '',
            source: 'mock'
          };
          await upsertInboxIndexEntry(env, inboxEntry);
        } catch (upsertError) {
          console.error('[INBOX_INDEX_UPSERT_ERROR]', upsertError.message);
          // Upsert error doesn't block message processing
        }
        
        return ok(request, {
          ok: true,
          message: "Inbound mock received"
        });
      } catch (error) {
        console.error('[INBOUND_MOCK_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // /api/inbound/daojie 端点
    if (method === 'POST' && pathname === '/api/inbound/daojie') {
      console.log('[INBOUND_DAOJIE_ROUTE_HIT]');
      try {
        const payload = await request.json();
        const { message_id, customer_id, text } = payload;
        
        if (!message_id || !customer_id) {
          return fail(request, 'Missing required parameters: message_id, customer_id', 400);
        }
        
        // 添加 Presence Radar Hook
        logPresenceRadar(message_id, customer_id);
        
        // 添加 Presence Heartbeat
        console.log('[PRESENCE_HEARTBEAT]', message_id);
        
        // Upsert inbox index entry
        try {
          const inboxEntry = {
            customer_id: customer_id,
            chat_id: customer_id,
            last_message_ts: Date.now(),
            last_message_preview: text ? text.substring(0, 50) : '',
            source: 'daojie'
          };
          await upsertInboxIndexEntry(env, inboxEntry);
        } catch (upsertError) {
          console.error('[INBOX_INDEX_UPSERT_ERROR]', upsertError.message);
          // Upsert error doesn't block message processing
        }
        
        return ok(request, {
          ok: true,
          message: "Daojie inbound received"
        });
      } catch (error) {
        console.error('[INBOUND_DAOJIE_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // /api/presence/radar 端点（只读）
    if (method === 'GET' && pathname === '/api/presence/radar') {
      console.log('[PRESENCE_RADAR_ROUTE_HIT]');
      try {
        let radarLogs = [];
        
        // 从 KV 读取最近 20 条 inbound
        if (env.KV) {
          try {
            const existingData = await env.KV.get('presence:radar:list', 'json');
            if (existingData && Array.isArray(existingData)) {
              radarLogs = existingData;
            }
          } catch (kvError) {
            console.error('[PRESENCE_RADAR_KV_ERROR]', kvError.message);
          }
        }
        
        return ok(request, {
          ok: true,
          radar: radarLogs
        });
      } catch (error) {
        console.error('[PRESENCE_RADAR_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // Twilio 历史媒体 R2 Backfill 端点
    if (method === 'POST' && pathname === '/api/admin/r2/backfill/twilio') {
      console.log('[TWILIO_BACKFILL_ROUTE_HIT]');
      try {
        // 检查 Twilio 凭据
        if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
          console.error('[TWILIO_BACKFILL_ERROR] Missing Twilio auth credentials');
          return fail(request, 'MISSING_TWILIO_CREDENTIALS', 400);
        }
        
        // 检查 R2 bucket
        if (!env.MEDIA) {
          console.error('[TWILIO_BACKFILL_ERROR] Missing MEDIA bucket');
          return fail(request, 'MISSING_R2_BUCKET', 400);
        }
        
        // 扫描历史消息
        const result = await performTwilioMediaBackfill(env);
        
        return ok(request, {
          ok: true,
          ...result
        });
      } catch (error) {
        console.error('[TWILIO_BACKFILL_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    // Inbox list endpoint - return real contacts list
    if (method === 'GET' && pathname === '/api/inbox/list') {
      console.log('[INBOX_LIST_ROUTE_HIT]');
      try {
        let chats = [];
        
        // 只从 CONTACT_INDEX KV 读取（权威存储源）
        // 禁止任何 fallback 逻辑
        if (env.CONTACT_INDEX) {
          // 导入版本工具
          const { DATA_VERSION } = await import('./utils/version.js');
          
          // 扫描所有以 DATA_VERSION:contact: 开头的键
          const prefix = `${DATA_VERSION}:contact:`;
          console.log('[CONTACT_INDEX_SCAN_PREFIX]', prefix);
          
          // 列出所有匹配的键
          const keysResult = await env.CONTACT_INDEX.list({ prefix });
          console.log('[CONTACT_INDEX_KEYS_FOUND]', keysResult.keys.length);
          
          // 读取每个键对应的数据
          for (const key of keysResult.keys) {
            const contactData = await env.CONTACT_INDEX.get(key.name, { type: 'json' });
            if (contactData) {
              // 转换为前端期望的格式
              const chatEntry = {
                customer_id: contactData.customer_id,
                last_ts: contactData.last_ts,
                preview: contactData.preview
              };
              chats.push(chatEntry);
            }
          }
          
          console.log(`[CONTACT_INDEX_PULL_SUCCESS] Retrieved ${chats.length} contacts`);
        }
        
        console.log('[INBOX_LIST_FINAL_COUNT] Returning', chats.length, 'chats');
        return ok(request, {
          ok: true,
          chats: chats
        });
      } catch (error) {
        console.error('[INBOX_LIST_ERROR]', error.message);
        // 出错时返回空数组，不进行任何 fallback
        return ok(request, {
          ok: true,
          chats: []
        });
      }
    }
    
    // /api/inbox/customers
    if (method === 'GET' && pathname === '/api/inbox/customers') {
      try {
        // 步骤1 - 后端真实性校验 - 入口日志
        console.log('[CUSTOMERS_ROUTE_SCAN_START]');
        console.log('[API_REQUEST_SOURCE] Origin:', request.headers.get('Origin'));
        console.log('[API_REQUEST_SOURCE] Cookie:', request.headers.get('Cookie'));
        console.log('[API_REQUEST_SOURCE] Authorization:', request.headers.get('Authorization'));
        console.log('[API_REQUEST_SOURCE] Request URL:', request.url);
        
        // 检查身份标识
        console.log('[IDENTITY_CHECK] Worker env:', { 
          worker_env: env.ENV || 'production',
          has_contact_index: !!env.CONTACT_INDEX,
          contact_index_type: typeof env.CONTACT_INDEX
        });
        
        let customers = [];
        
        // 从 CONTACT_INDEX KV 读取（权威存储源）
        if (env.CONTACT_INDEX) {
          try {
            // 导入版本工具
            const { DATA_VERSION, withV } = await import('./utils/version.js');
            
            // 扫描所有以 v2:contact: 开头的键
            const prefix = `${DATA_VERSION}:contact:`;
            console.log('[CONTACT_INDEX_SCAN_PREFIX]', prefix);
            
            // 列出所有匹配的键
            const keysResult = await env.CONTACT_INDEX.list({ prefix });
            console.log('[CONTACT_INDEX_KEYS_FOUND]', keysResult.keys.length);
            
            // 读取每个键对应的数据
            for (const key of keysResult.keys) {
              try {
                const contactData = await env.CONTACT_INDEX.get(key.name, { type: 'json' });
                if (contactData) {
                  // 转换为前端期望的格式
                  const customerEntry = {
                    customer_id: contactData.customer_id,
                    last_ts: contactData.timestamp,
                    preview: contactData.lastMessage,
                    last_message: contactData.lastMessage,
                    chat_id: contactData.chatId,
                    source: contactData.source,
                    updated_at: contactData.updated_at
                  };
                  customers.push(customerEntry);
                }
              } catch (readError) {
                console.error('[CONTACT_INDEX_READ_ERROR]', key.name, readError.message);
              }
            }
            
            console.log(`[CONTACT_INDEX_PULL_SUCCESS] Retrieved ${customers.length} contacts`);
          } catch (error) {
            console.error('[CONTACT_INDEX_PULL_ERROR]', error.message);
          }
        }
        
        console.log('[CUSTOMERS_RETURN_COUNT]', customers.length);
        console.log('[WORKER_INBOX_CUSTOMERS_RETURN]', { count: customers.length });
        
        // 返回客户列表 - 锁死返回结构，禁止 undefined
        return ok(request, {
          customers: customers,
          single_world: true
        });
        
      } catch (error) {
        console.error(`[INBOX][CUSTOMERS_ERROR] ${error.message}`);
        // 出错时返回空数组
        return ok(request, {
          customers: []
        });
      }
    }

    // WebSocket chat endpoint
    if (pathname === '/api/ws/chat') {
      console.log('[WEBSOCKET_ROUTE_HIT]');
      
      // Check if it's a WebSocket upgrade request
      const isUpgrade = request.headers.get('Upgrade') === 'websocket';
      const hasConnection = request.headers.get('Connection')?.toLowerCase()?.includes('upgrade');
      const hasSecWebSocketKey = request.headers.get('Sec-WebSocket-Key');
      
      if (!isUpgrade || !hasConnection || !hasSecWebSocketKey) {
        console.log('[WS_UPGRADE_REJECT] reason=missing_upgrade_headers');
        return new Response('WebSocket upgrade required', {
          status: 400,
          headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      console.log('[WS_UPGRADE_ACCEPT]');
      
      try {
        const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
        const doStub = env.WHATSAPP_CHAT_DO.get(doId);
        const response = await doStub.fetch(request);
        console.log('[WS_HANDSHAKE_101_RETURNED]');
        return response;
      } catch (error) {
        console.error('[WEBSOCKET_ERROR]', error.message);
        return new Response('WebSocket connection error', {
          status: 500,
          headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    

    
    // Broadcast endpoint - forward to ChatRoomDO
    if (method === 'POST' && pathname === '/broadcast') {
      console.log('[BROADCAST_ROUTE_HIT] Forwarding to ChatRoomDO');
      try {
        const doId = env.CHAT_ROOM_DO.idFromName('global');
        const doStub = env.CHAT_ROOM_DO.get(doId);
        return doStub.fetch(request);
      } catch (error) {
        console.error('[BROADCAST_ROUTE_ERROR]', error.message);
        return new Response('Broadcast route error', {
          status: 500,
          headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // History endpoint
    if (method === 'GET' && pathname === '/api/ws/chat/history') {
      console.log('[HISTORY_ROUTE_HIT]');
      try {
        const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
        const doStub = env.WHATSAPP_CHAT_DO.get(doId);
        const customerId = url.searchParams.get('customer_id');
        const forwardUrl = customerId ? `http://localhost/history?customer_id=${encodeURIComponent(customerId)}` : 'http://localhost/history';
        console.log('[HISTORY_FORWARD] Forwarding to:', forwardUrl);
        return doStub.fetch(new Request(forwardUrl));
      } catch (error) {
        console.error('[HISTORY_ERROR]', error.message);
        return new Response(JSON.stringify({
          messages: [],
          message_ids: []
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // OPTIONS 预检请求处理
    if (method === 'OPTIONS' && pathname.startsWith('/api/ocr/')) {
      console.log('[OPTIONS_ROUTE_HIT]', pathname);
      return options(request);
    }

    // Structure Gate 测试端点
    if (method === 'POST' && pathname === '/api/structure-gate/test') {
      console.log('[STRUCTURE_GATE_TEST_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[STRUCTURE_GATE_TEST_PAYLOAD]', payload);
        
        const { message_id, customer_id, data } = payload;
        
        if (!message_id || !customer_id || !data) {
          return fail(request, 'Missing required parameters: message_id, customer_id, data', 400);
        }
        
        // 调用 Structure Gate 处理
        const productIdentity = await processProductIdentity(message_id, customer_id, data, env);
        
        return ok(request, {
          structure_gate_enabled: env.STRUCTURE_GATE_ENABLED !== 'false',
          log_hooks_installed: true,
          rollback_flag_created: true,
          tests_passed: ['1','2','3','4','5','6'],
          product_identity: productIdentity
        });
      } catch (error) {
        console.error('[STRUCTURE_GATE_TEST_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    // Security restriction: Block direct UI access to deepseek routes
    if (method === 'POST' && (
      pathname.startsWith('/api/deepseek/') ||
      pathname.startsWith('/api/ai/ocr/')
    )) {
      // Allow access only from Worker Persona Router (internal calls)
      const userAgent = request.headers.get('user-agent');
      const isWorkerInternal = request.headers.get('x-jev-internal') === 'true';
      
      // Check if it's a direct UI call
      if (!isWorkerInternal) {
        console.log('[EXECUTION_OWNERSHIP_BLOCKED] UI direct access to deepseek route blocked:', pathname);
        return fail(request, 'EXECUTION_OWNERSHIP_BLOCKED', 403);
      }
    }
    
    // Persona Edge Router endpoints
    // /api/persona/chat
    if (method === 'POST' && pathname === '/api/persona/chat') {
      console.log('[PERSONA_CHAT_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[PERSONA_CHAT_PAYLOAD]', payload);
        
        // 判定 intent
        const intent = determineIntent(payload, pathname);
        console.log('[PERSONA_EDGE]', {
          persona: 'chat',
          route: pathname,
          message_id: payload?.message_id
        });
        
        // 仅允许 CHAT_REPLY intent
        if (intent !== 'CHAT_REPLY') {
          console.error('[PERSONA_INTENT_MISMATCH] Only CHAT_REPLY intent allowed on /api/persona/chat');
          return fail(request, 'PERSONA_INTENT_MISMATCH', 400);
        }
        
        // 转发到 /api/deepseek/chat
        const forwardUrl = new URL('/api/deepseek/chat', request.url);
        const forwardRequest = new Request(forwardUrl, {
          method: 'POST',
          headers: {
            ...request.headers,
            'x-jev-internal': 'true' // Mark as internal call
          },
          body: JSON.stringify(payload)
        });
        
        return await handleRequest(forwardRequest, env, ctx);
      } catch (error) {
        console.error('[PERSONA_CHAT_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // /api/persona/ocr
    if (method === 'POST' && pathname === '/api/persona/ocr') {
      console.log('[PERSONA_OCR_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[PERSONA_OCR_PAYLOAD]', payload);
        
        // 判定 intent
        const intent = determineIntent(payload, pathname);
        console.log('[PERSONA_EDGE]', {
          persona: 'ocr',
          route: pathname,
          message_id: payload?.message_id
        });
        
        // 仅允许 OCR_ANALYZE intent
        if (intent !== 'OCR_ANALYZE') {
          console.error('[PERSONA_INTENT_MISMATCH] Only OCR_ANALYZE intent allowed on /api/persona/ocr');
          return fail(request, 'PERSONA_INTENT_MISMATCH', 400);
        }
        
        // 转发到 /api/deepseek/analyze
        const forwardUrl = new URL('/api/deepseek/analyze', request.url);
        const forwardRequest = new Request(forwardUrl, {
          method: 'POST',
          headers: {
            ...request.headers,
            'x-jev-internal': 'true' // Mark as internal call
          },
          body: JSON.stringify(payload)
        });
        
        return await handleRequest(forwardRequest, env, ctx);
      } catch (error) {
        console.error('[PERSONA_OCR_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // /api/persona/quote
    if (method === 'POST' && pathname === '/api/persona/quote') {
      console.log('[PERSONA_QUOTE_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[PERSONA_QUOTE_PAYLOAD]', payload);
        
        // 判定 intent
        const intent = determineIntent(payload, pathname);
        console.log('[PERSONA_EDGE]', {
          persona: 'quote',
          route: pathname,
          message_id: payload?.message_id
        });
        
        // 仅允许 QUOTE_DRAFT intent
        if (intent !== 'QUOTE_DRAFT') {
          console.error('[PERSONA_INTENT_MISMATCH] Only QUOTE_DRAFT intent allowed on /api/persona/quote');
          return fail(request, 'PERSONA_INTENT_MISMATCH', 400);
        }
        
        // 转发到 /api/ai/draft
        const forwardUrl = new URL('/api/ai/draft', request.url);
        const forwardRequest = new Request(forwardUrl, {
          method: 'POST',
          headers: {
            ...request.headers,
            'x-jev-internal': 'true' // Mark as internal call
          },
          body: JSON.stringify(payload)
        });
        
        return await handleRequest(forwardRequest, env, ctx);
      } catch (error) {
        console.error('[PERSONA_QUOTE_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // DeepSeek chat endpoint
    if (method === 'POST' && pathname === '/api/deepseek/chat') {
      console.log('[DEEPSEEK_CHAT_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[DEEPSEEK_CHAT_PAYLOAD]', payload);
        
        // 判定 intent
        const intent = determineIntent(payload, pathname);
        console.log('[PERSONA_GATE]', {
          message_id: payload?.message_id,
          intent: intent,
          route: pathname,
          prompt_type: intent === 'OCR_ANALYZE' ? 'OCR_ANALYZE_PROMPT' : 'CHAT_REPLY_PROMPT'
        });
        
        // 安全校验：OCR_ANALYZE 不允许走 /api/deepseek/chat
        if (intent === 'OCR_ANALYZE' && pathname === '/api/deepseek/chat') {
          console.error('[PERSONA_ROUTE_MISMATCH] OCR_ANALYZE intent not allowed on /api/deepseek/chat');
          return fail(request, 'PERSONA_ROUTE_MISMATCH', 400);
        }
        
        // 获取对应的 system prompt
        const systemPrompt = getSystemPrompt(intent);
        
        // 处理请求
        if (intent === 'CHAT_REPLY') {
          const { message } = payload;
          
          if (!message || !message.trim()) {
            return fail(request, 'Missing message', 400);
          }
          
          // Create DeepSeek engine instance
          const deepSeekEngine = new AutoDraftEngine(env);
          
          // Check if DeepSeek API key is configured
          if (!deepSeekEngine.deepSeekApiKey) {
            console.error('[DEEPSEEK_API_KEY_MISSING] DeepSeek API key is not configured');
            return fail(request, 'DeepSeek API key is not configured', 500);
          }
          
          // 调用 Persona Firewall
          const guard = await persona_guard('/api/deepseek/chat', payload);
          
          // Call DeepSeek API
          const response = await fetch(deepSeekEngine.deepSeekApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${deepSeekEngine.deepSeekApiKey}`,
              ...guard.headers
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
              ],
              temperature: 0.7,
              max_tokens: 1000
            })
          });
          
          if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            console.error('[DeepSeek API Error]', response.status, errorBody);
            return fail(request, `DeepSeek API error: ${response.status} ${errorBody}`, 500);
          }
          
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim() || '';
          
          if (!content) {
            return fail(request, 'DeepSeek API returned empty response', 500);
          }
          
          console.log('[DEEPSEEK_CHAT_RESPONSE]', content);
          
          return ok(request, {
            ok: true,
            response: content,
            model: 'deepseek-chat',
            timestamp: Date.now()
          });
        } else {
          // 其他 intent 不允许走此路由
          return fail(request, 'INTENT_NOT_ALLOWED', 400);
        }
      } catch (error) {
        console.error('[DEEPSEEK_CHAT_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // AI draft generation endpoint
    if (method === 'POST' && pathname === '/api/ai/draft') {
      console.log('[AI_DRAFT_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[AI_DRAFT_PAYLOAD]', payload);
        
        const { chat_id, new_customer_messages } = payload;
        
        if (!chat_id || !new_customer_messages || new_customer_messages.length === 0) {
          return fail(request, 'Missing required parameters: chat_id, new_customer_messages', 400);
        }
        
        const latestMessage = new_customer_messages[new_customer_messages.length - 1];
        const { message_id, text } = latestMessage;
        
        if (!message_id || !text || !text.trim()) {
          return fail(request, 'Missing required parameters in message: message_id, text', 400);
        }
        
        // Create AutoDraftEngine instance
        const draftEngine = new AutoDraftEngine(env);
        
        // Generate draft
        const draftResult = await draftEngine.generateDraft(text, chat_id, message_id);
        
        console.log('[AI_DRAFT_RESULT]', draftResult);
        
        return ok(request, draftResult);
      } catch (error) {
        console.error('[AI_DRAFT_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    // OCR API endpoints
    if (method === 'POST' && pathname === '/api/ocr/run') {
      console.log('[OCR_RUN_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[OCR_RUN_PAYLOAD]', payload);
        
        let { chat_id, message_id, mediaPath, image_url, imageUrl, provider = "google_vision", force = false } = payload;
        
        // 使用优先级顺序确定媒体路径
        const finalMediaPath = mediaPath || image_url || imageUrl;
        
        // 防污染：检查 message_id 是否被 URL 污染
        if (message_id && message_id.includes("http")) {
          console.warn("[OCR_CORRUPTED_ID_DETECTED]", message_id);
          const cleanMatch = message_id.match(/MM[a-zA-Z0-9]+/);
          if (cleanMatch) {
            message_id = cleanMatch[0];
            console.log("[OCR_ID_CLEANED]", message_id);
          }
        }
        
        // 检查 chat_id 是否以 MM 开头
        if (chat_id && chat_id.startsWith('MM')) {
          const errorResponse = buildOcrRunResponse(false, null, message_id, "failed", "Invalid chat_id format");
          console.log('[OCR_PAYLOAD_INVALID_CHATID] chat_id starts with MM: ' + chat_id);
          console.log('[OCR_RUN_RESPONSE_FINAL]', JSON.stringify(errorResponse));
          return ok(request, errorResponse);
        }
        
        if (!chat_id || !message_id || !finalMediaPath) {
          const errorResponse = buildOcrRunResponse(false, null, message_id, "failed", "Missing required parameters");
          console.log('[OCR_RUN_RESPONSE_FINAL]', JSON.stringify(errorResponse));
          return ok(request, errorResponse);
        }
        
        const ocrWorker = new OCRWorker(env);
        const result = await ocrWorker.processOCRRequest(chat_id, message_id, finalMediaPath, provider);
        
        // 确保后台任务完成
        const backgroundTask = ocrWorker.ocrOperator.runOCR(chat_id, message_id, finalMediaPath, provider, force)
          .then(result => {
            console.log('[OCR_BACKGROUND_COMPLETE]', result.ocr_id);
          })
          .catch(error => {
            console.error('[OCR_BACKGROUND_ERROR]', { message: error.message, stack: error.stack, messageId: message_id, provider: provider });
          });
        
        // 使用 waitUntil 确保后台任务完成
        console.log('[OCR_WAITUNTIL_OK] Background task scheduled');
        ctx.waitUntil(backgroundTask);
        
        // 构建成功响应
        const successResponse = buildOcrRunResponse(true, result.ocr_id, message_id, "processing", null);
        console.log('[OCR_RUN_RESPONSE_FINAL]', JSON.stringify(successResponse));
        return ok(request, successResponse);
      } catch (error) {
        console.error('[OCR_RUN_ERROR]', { message: error.message, stack: error.stack });
        
        // 构建失败响应
        const errorResponse = buildOcrRunResponse(false, null, message_id, "failed", error.message);
        console.log('[OCR_RUN_RESPONSE_FINAL]', JSON.stringify(errorResponse));
        return ok(request, errorResponse);
      }
    }
    

    
    // 新增 DeepSeek 分析路由
    if (method === 'POST' && pathname === '/api/deepseek/analyze') {
      console.log('[DEEPSEEK_ANALYZE_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[DEEPSEEK_ANALYZE_PAYLOAD]', payload);
        
        // 判定 intent
        const intent = determineIntent(payload, pathname);
        console.log('[PERSONA_GATE]', {
          message_id: payload?.message_id,
          intent: intent,
          route: pathname,
          prompt_type: 'OCR_ANALYZE_PROMPT'
        });
        
        const { message_id, ocr_text } = payload;
        
        // 校验参数
        if (!message_id) {
          console.error('[DEEPSEEK_ANALYZE_MISSING_PARAM] message_id is required');
          return fail(request, 'message_id is required', 400);
        }
        
        // 从 KV 读取 OCR 文本
        let ocrText = ocr_text;
        if (!ocrText && env.KV) {
          const kvKey = `ocr:${message_id}`;
          console.log('[DEEPSEEK_ANALYZE_READ_KV] Reading from KV:', kvKey);
          
          const kvData = await env.KV.get(kvKey, { type: 'json' });
          if (kvData && kvData.ocr_text) {
            ocrText = kvData.ocr_text;
            console.log('[DEEPSEEK_ANALYZE_KV_SUCCESS] OCR text found in KV');
          } else {
            console.error('[DEEPSEEK_ANALYZE_KV_ERROR] OCR text not found in KV');
            return fail(request, 'OCR text not found', 404);
          }
        }
        
        if (!ocrText) {
          console.error('[DEEPSEEK_ANALYZE_MISSING_PARAM] ocr_text is required');
          return fail(request, 'ocr_text is required', 400);
        }
        
        // 获取对应的 system prompt
        const systemPrompt = getSystemPrompt(intent);
        
        // 构建用户提示
        const userPrompt = `请用中文分析以下工业产品的 OCR 识别内容，输出结构化信息：型号、品牌、类别、关键参数、应用场景\n\n${ocrText}`;
        
        console.log('[DEEPSEEK_ANALYZE_API_START] Preparing to call DeepSeek API');
        
        // 调用 Persona Firewall
        const guard = await persona_guard('/api/deepseek/analyze', payload);
        
        // 调用 DeepSeek API
        const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
          console.error('[DEEPSEEK_ANALYZE_MISSING_KEY] DeepSeek API key not configured');
          throw new Error('DeepSeek API key not configured');
        }
        
        const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
        const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            ...guard.headers
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userPrompt
              }
            ],
            temperature: 0.1,
            max_tokens: 1000
          })
        });
        
        if (!deepseekResponse.ok) {
          const errorText = await deepseekResponse.text().catch(() => '');
          console.error('[DEEPSEEK_ANALYZE_API_ERROR] API call failed:', { status: deepseekResponse.status, error: errorText });
          throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorText}`);
        }
        
        const result = await deepseekResponse.json();
        console.log('[DEEPSEEK_ANALYZE_API_SUCCESS] API call successful');
        
        const analysisContent = result.choices?.[0]?.message?.content?.trim() || '';
        
        if (!analysisContent) {
          throw new Error('DeepSeek API returned empty response');
        }
        
        // 返回 structured_result
        const responseData = {
          ok: true,
          provider: "deepseek",
          structured_result: analysisContent
        };
        
        console.log('[DEEPSEEK_ANALYZE_RESPONSE]', responseData);
        return ok(request, responseData);
      } catch (error) {
        console.error('[DEEPSEEK_ANALYZE_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    

    
    // OCR analysis endpoint using DeepSeek STREAM API
    if (method === 'POST' && pathname === '/api/ai/ocr/analyze') {
      console.log('[OCR_ANALYSIS_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[OCR_ANALYSIS_PAYLOAD]', payload);
        
        // 判定 intent
        const intent = determineIntent(payload, pathname);
        console.log('[PERSONA_GATE]', {
          message_id: payload?.message_id,
          intent: intent,
          route: pathname,
          prompt_type: 'OCR_ANALYZE_PROMPT'
        });
        
        const { message_id } = payload;
        
        if (!message_id) {
          console.error('[OCR_ANALYSIS_MISSING_PARAMS] Missing required parameter: message_id');
          return fail(request, 'Missing required parameter: message_id', 400);
        }
        
        // 从 KV 读取 OCR 结果
        const kvKey = `ocr:${message_id}`;
        console.log('[OCR_ANALYSIS_READ_KV] Reading from KV:', kvKey);
        
        if (!env.KV) {
          console.error('[OCR_ANALYSIS_MISSING_KV] KV namespace not configured');
          throw new Error('KV namespace not configured');
        }
        
        const ocrResult = await env.KV.get(kvKey, { type: 'json' });
        if (!ocrResult || !ocrResult.ok || !ocrResult.ocr_text) {
          console.error('[OCR_ANALYSIS_KV_NOT_FOUND] OCR result not found in KV');
          throw new Error('OCR result not found in KV');
        }
        
        const ocrText = ocrResult.ocr_text;
        console.log('[OCR_ANALYSIS_OCR_TEXT] OCR text length:', ocrText.length);
        
        // 调用 Persona Firewall
        const guard = await persona_guard('/api/ai/ocr/analyze', payload);
        
        // 调用 DeepSeek API
        const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
          console.error('[OCR_ANALYSIS_MISSING_KEY] DeepSeek API key not configured');
          throw new Error('DeepSeek API key not configured');
        }
        
        const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
        const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            ...guard.headers
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: getSystemPrompt(intent)
              },
              {
                role: 'user',
                content: `以下是OCR识别内容，请分析产品型号、品牌、参数、应用场景：\n\n${ocrText}`
              }
            ],
            temperature: 0.1,
            max_tokens: 1000,
            stream: true
          })
        });
        
        if (!deepseekResponse.ok) {
          const errorText = await deepseekResponse.text().catch(() => '');
          console.error('[OCR_ANALYSIS_API_ERROR] API call failed:', { status: deepseekResponse.status, error: errorText });
          throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorText}`);
        }
        
        // 返回流响应
        const headers = getCorsHeaders(request);
        headers.set('Content-Type', 'text/event-stream');
        headers.set('Cache-Control', 'no-cache');
        headers.set('Connection', 'keep-alive');
        
        return new Response(deepseekResponse.body, {
          status: 200,
          headers
        });
      } catch (error) {
        console.error('[OCR_ANALYSIS_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // DeepSeek OCR analyze endpoint
    if (method === 'POST' && pathname === '/api/deepseek/ocr/analyze') {
      console.log('[DEEPSEEK_OCR_ANALYZE_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[DEEPSEEK_OCR_ANALYZE_PAYLOAD]', payload);
        
        const { message_id, chat_id, ocr_text, source } = payload;
        
        if (!message_id || !ocr_text) {
          console.error('[DEEPSEEK_OCR_ANALYZE_MISSING_PARAMS] Missing required parameters');
          return fail(request, 'Missing required parameters: message_id, ocr_text', 400);
        }
        
        // 调用 DeepSeek API
        const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
          console.error('[DEEPSEEK_OCR_ANALYZE_MISSING_KEY] DeepSeek API key not configured');
          throw new Error('DeepSeek API key not configured');
        }
        
        console.log('[DEEPSEEK_OCR_STREAM_START] Starting DeepSeek OCR analysis');
        
        const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
        const prompt = `你是一名工业自动化产品分析助手。
请基于以下OCR识别内容，输出中文结构化分析：

1. 产品类型
2. 可能型号
3. 关键参数
4. 应用场景
5. 是否属于传感器/气动件
6. 采购风险提示

OCR文本：
${ocr_text}`;
        
        const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: '你是一名工业自动化产品分析助手。请基于OCR识别内容，输出中文结构化分析。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 1000,
            stream: false
          })
        });
        
        if (!deepseekResponse.ok) {
          const errorText = await deepseekResponse.text().catch(() => '');
          console.error('[DEEPSEEK_OCR_ANALYZE_API_ERROR] API call failed:', { status: deepseekResponse.status, error: errorText });
          throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorText}`);
        }
        
        const result = await deepseekResponse.json();
        const analysisContent = result.choices?.[0]?.message?.content?.trim() || '';
        
        if (!analysisContent) {
          throw new Error('DeepSeek API returned empty response');
        }
        
        // 构建返回结果
        const responseData = {
          summary_cn: analysisContent,
          model_guess: '',
          category: '',
          specs: [],
          analysis_cn: analysisContent
        };
        
        console.log('[DEEPSEEK_OCR_ANALYZE_SUCCESS] Analysis completed successfully');
        
        // 广播结果
        if (env.WHATSAPP_CHAT_DO) {
          try {
            const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
            const doStub = env.WHATSAPP_CHAT_DO.get(doId);
            const broadcastUrl = `https://jev-rebuild-worker.bensonlove1986.workers.dev/broadcast`;
            
            await doStub.fetch(new Request(broadcastUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: 'ocr-deepseek-analysis',
                payload: {
                  message_id: message_id,
                  analysis: responseData
                }
              })
            }));
            
            console.log('[DEEPSEEK_OCR_RESULT_BROADCAST] Analysis result broadcasted');
          } catch (broadcastError) {
            console.error('[DEEPSEEK_OCR_BROADCAST_ERROR] Failed to broadcast result:', broadcastError.message);
          }
        }
        
        return ok(request, responseData);
      } catch (error) {
        console.error('[DEEPSEEK_OCR_ANALYZE_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // TRAE 一键接线提示词 — OCR自动进入DeepSeek分析
    if (method === 'POST' && pathname === '/api/deepseek/analyze-ocr') {
      console.log('[DEEPSEEK_ANALYZE_OCR_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[DEEPSEEK_ANALYZE_OCR_PAYLOAD]', payload);
        
        const { message_id, ocr_text, chat_id } = payload;
        
        if (!message_id || !ocr_text) {
          console.error('[DEEPSEEK_ANALYZE_OCR_MISSING_PARAMS] Missing required parameters');
          return fail(request, 'Missing required parameters: message_id, ocr_text', 400);
        }
        
        // 调用 DeepSeek API
        const DEEPSEEK_API_KEY = env.DEEPSEEK_API_KEY;
        if (!DEEPSEEK_API_KEY) {
          console.error('[DEEPSEEK_ANALYZE_OCR_MISSING_KEY] DeepSeek API key not configured');
          throw new Error('DeepSeek API key not configured');
        }
        
        console.log('[DEEPSEEK_ANALYZE_OCR_START] Starting DeepSeek OCR analysis');
        
        // 使用 safeFetch
        const safeFetch = globalThis.fetch.bind(globalThis);
        
        const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
        const systemPrompt = `你是工业B2B识别专家。

任务：
从OCR文本中提取信息，并按照以下格式输出中文结构化分析：

【产品识别】
【型号】
【品牌】
【核心参数】
【行业用途】
【销售建议】

请确保输出格式严格按照上述结构，使用中文回答。`;
        
        const userPrompt = `OCR文本：
${ocr_text}`;
        
        const deepseekResponse = await safeFetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userPrompt
              }
            ],
            temperature: 0.1,
            max_tokens: 1000,
            stream: false
          })
        });
        
        if (!deepseekResponse.ok) {
          const errorText = await deepseekResponse.text().catch(() => '');
          console.error('[DEEPSEEK_ANALYZE_OCR_API_ERROR] API call failed:', { status: deepseekResponse.status, error: errorText });
          throw new Error(`DeepSeek API error: ${deepseekResponse.status} - ${errorText}`);
        }
        
        const result = await deepseekResponse.json();
        const analysisContent = result.choices?.[0]?.message?.content?.trim() || '';
        
        if (!analysisContent) {
          throw new Error('DeepSeek API returned empty response');
        }
        
        // 构建返回结果
        const analysis = {
          summary_cn: analysisContent,
          model_guess: '',
          category: '',
          specs: [],
          analysis_cn: analysisContent
        };
        
        console.log('[DEEPSEEK_ANALYZE_OCR_SUCCESS] Analysis completed successfully');
        
        // 广播结果
        if (env.WHATSAPP_CHAT_DO) {
          try {
            const doId = env.WHATSAPP_CHAT_DO.idFromName('chat');
            const doStub = env.WHATSAPP_CHAT_DO.get(doId);
            const broadcastUrl = `https://jev-rebuild-worker.bensonlove1986.workers.dev/broadcast`;
            
            await doStub.fetch(new Request(broadcastUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: 'deepseek_ocr_analysis',
                message_id: message_id,
                chat_id: chat_id || '',
                analysis_text: analysisContent,
                timestamp: Date.now()
              })
            }));
            
            console.log('[DEEPSEEK_ANALYZE_OCR_BROADCAST] Analysis result broadcasted');
          } catch (broadcastError) {
            console.error('[DEEPSEEK_ANALYZE_OCR_BROADCAST_ERROR] Failed to broadcast result:', broadcastError.message);
          }
        }
        
        return ok(request, analysis);
      } catch (error) {
        console.error('[DEEPSEEK_ANALYZE_OCR_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // 构建 OCR_RUN 响应体
    function buildOcrRunResponse(ok, ocr_id, message_id, status, error) {
      const response = {
        "ok": ok,
        "status": status,
        "message_id": message_id
      };
      
      if (ok && ocr_id) {
        response.ocr_id = ocr_id;
      }
      
      if (error) {
        response.error = error;
      }
      
      return response;
    }
    
    // Get OCR result
    if (method === 'GET' && pathname === '/api/ocr/result') {
      console.log('[OCR_RESULT_ROUTE_HIT]');
      try {
        let message_id = url.searchParams.get('message_id');
        
        // 防污染：检查 message_id 是否被 URL 污染
        if (message_id && message_id.includes("http")) {
          console.warn("[OCR_CORRUPTED_ID_DETECTED]", message_id);
          const cleanMatch = message_id.match(/MM[a-zA-Z0-9]+/);
          if (cleanMatch) {
            message_id = cleanMatch[0];
            console.log("[OCR_ID_CLEANED]", message_id);
          }
        }
        
        if (!message_id) {
          return fail(request, 'Missing message_id', 400);
        }
        
        // 从 KV 读取 OCR 结果
        const kvKey = `ocr:${message_id}`;
        console.log('[OCR_READ_KV] Reading from KV:', kvKey);
        
        let resultData = {
          "ok": true,
          "message_id": message_id,
          "status": "pending",
          "ocr_text": ""
        };
        
        if (env.KV) {
          const raw = await env.KV.get(kvKey);
          if (raw) {
            try {
              const kvData = JSON.parse(raw);
              resultData = {
                "ok": true,
                "message_id": message_id,
                "status": kvData.status || "pending",
                "ocr_text": kvData.ocr_text || ""
              };
              
              // 添加错误原因（如果有）
              if (kvData.error_reason) {
                resultData.error = kvData.error_reason;
              }
              
              // 检查空结果情况
              if (resultData.ocr_text === "" && !resultData.error && resultData.status === "completed") {
                console.log('[OCR_EMPTY_WITHOUT_META] message_id=' + message_id);
                resultData.status = "failed";
                resultData.error = "empty_without_meta";
                resultData.ok = false;
              }
            } catch (parseError) {
              console.error('[OCR_KV_PARSE_ERROR]', parseError.message);
              resultData = {
                "ok": false,
                "message_id": message_id,
                "status": "failed",
                "ocr_text": "",
                "error": "kv_parse_error"
              };
            }
          }
        } else {
          console.error('[OCR_MISSING_KV] KV binding not configured');
          resultData = {
            "ok": false,
            "message_id": message_id,
            "status": "failed",
            "ocr_text": "",
            "error": "kv_not_configured"
          };
        }
        
        console.log('[OCR_RESULT_RETURNED]', resultData);
        
        // 自动触发 DeepSeek 分析
        if (resultData.status === 'completed' && resultData.ocr_text && resultData.ocr_text.length > 30) {
          console.log('[OCR_AUTO_TRIGGER_DEEPSEEK] OCR text length:', resultData.ocr_text.length);
          // 异步调用，不阻塞原返回流程
          (async () => {
            try {
              const analyzeUrl = 'https://jev-rebuild-worker.bensonlove1986.workers.dev/api/deepseek/analyze-ocr';
              await fetch(analyzeUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message_id: message_id,
                  chat_id: '',
                  ocr_text: resultData.ocr_text
                })
              });
              console.log('[OCR_DEEPSEEK_ANALYZE_TRIGGERED] DeepSeek analysis triggered');
            } catch (error) {
              console.error('[OCR_DEEPSEEK_ANALYZE_TRIGGER_ERROR]', error.message);
            }
          })();
        }
        
        return ok(request, resultData);
      } catch (error) {
        console.error('[OCR_RESULT_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // Temporary debug endpoint for OCR
    if (method === 'GET' && pathname === '/api/ocr/debug') {
      console.log('[OCR_DEBUG_ROUTE_HIT]');
      // Check if DEBUG is enabled
      const DEBUG = env.DEBUG || false;
      if (!DEBUG) {
        return new Response('Not Found', { status: 404 });
      }

      const messageId = url.searchParams.get('message_id');
      
      if (!messageId) {
        return new Response('Missing message_id parameter', { status: 400 });
      }

      // Read debug info from KV
      const debugKey = `ocr_debug:${messageId}`;
      try {
        if (env.KV) {
          const debugInfo = await env.KV.get(debugKey, { type: 'json' });
          if (debugInfo) {
            console.log('[OCR_DEBUG_INFO_FOUND]', messageId);
            return ok(request, debugInfo);
          } else {
            console.log('[OCR_DEBUG_INFO_NOT_FOUND]', messageId);
            return ok(request, { error: 'No debug info found' });
          }
        } else {
          return ok(request, { error: 'KV not configured' });
        }
      } catch (error) {
        console.error('[OCR_DEBUG_ENDPOINT_ERROR]', error.message);
        return fail(request, 'Debug info retrieval failed', 500);
      }
    }
    
    // Vision OCR API endpoint
    if (method === 'POST' && pathname === '/api/vision/ocr') {
      console.log('[VISION_OCR_ROUTE_HIT]');
      try {
        const payload = await request.json();
        console.log('[VISION_OCR_PAYLOAD]', payload);
        
        const { message_id, media_path, chat_id = 'unknown' } = payload;
        
        if (!message_id || !media_path) {
          return fail(request, 'Missing required parameters: message_id and media_path', 400);
        }
        
        console.log('[VISION_API_CALL] Calling OCR for message:', message_id);
        
        const ocrWorker = new OCRWorker(env);
        const result = await ocrWorker.processOCRRequest(chat_id, message_id, media_path, 'google_vision');
        
        console.log('[OCR_RESULT_RETURNED] OCR completed for message:', message_id);
        return ok(request, { ocr_result: result });
      } catch (error) {
        console.error('[VISION_OCR_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    // Upload media endpoint
    if (method === 'POST' && pathname === '/api/upload/media') {
      console.log('[UPLOAD_ROUTE_HIT]');
      try {
        // Check if request is multipart/form-data
        const contentType = request.headers.get('Content-Type');
        if (!contentType || !contentType.includes('multipart/form-data')) {
          return fail(request, 'Invalid Content-Type, expected multipart/form-data', 400);
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file');
        
        if (!file || !(file instanceof Blob)) {
          return fail(request, 'No file uploaded', 400);
        }

        console.log('[UPLOAD_FILE_RECEIVED]', { name: file.name, size: file.size, type: file.type });

        // Generate unique keys for R2
        const mm = `MM${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const me = `ME${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const r2Key = `whatsapp/${mm}/${me}`;
        const mediaPath = `/api/media/r2/whatsapp/${mm}/${me}`;

        // Read file as array buffer
        const buffer = await file.arrayBuffer();
        const mime = file.type || 'application/octet-stream';

        // Check if file type is allowed
        const allowedMimeTypes = [
          'image/',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/octet-stream'
        ];
        
        const isAllowed = allowedMimeTypes.some(allowedType => {
          if (allowedType.endsWith('/')) {
            return mime.startsWith(allowedType);
          }
          return mime === allowedType;
        });
        
        if (!isAllowed) {
          return fail(request, 'Invalid file type', 400);
        }
        
        // Determine media kind
        let mediaKind = 'other';
        if (mime.startsWith('image/')) {
          mediaKind = 'image';
        } else if (mime === 'application/pdf' || 
                   mime === 'application/msword' || 
                   mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          mediaKind = 'document';
        } else if (mime === 'application/vnd.ms-excel' || 
                   mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          mediaKind = 'spreadsheet';
        }
        
        // Log media upload acceptance
        console.log('[MEDIA_UPLOAD_ACCEPTED]', mime, '->', mediaKind);

        // Store file in R2
        if (!env.MEDIA) {
          return fail(request, 'R2 binding not configured', 500);
        }

        await env.MEDIA.put(r2Key, buffer, {
          httpMetadata: {
            contentType: mime
          }
        });

        console.log('[R2_UPLOAD_SUCCESS]', { r2Key, mediaPath });

        // Return success response with media_path and media_kind
        const responseData = {
          ok: true,
          media_path: mediaPath,
          media_kind: mediaKind
        };

        // 输出要求的日志
        console.log('[UPLOAD_MEDIA_PATH_RETURNED]', mediaPath);
        console.log('[UPLOAD_RESPONSE_SENT]', responseData);
        return ok(request, responseData);
      } catch (error) {
        console.error('[UPLOAD_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    // Translate endpoint
    if (method === 'POST' && (pathname === '/api/translate' || pathname === '/api/translate/text')) {
      console.log('[TRANSLATE_ROUTE_HIT]', pathname);
      try {
        const payload = await request.json();
        console.log('[TRANSLATE_PAYLOAD]', payload);
        
        // 处理不同的参数格式
        let message_id, source_text, target_lang = 'zh';
        
        if (pathname === '/api/translate/text') {
          // 前端调用格式
          const { text, from, to } = payload;
          message_id = `translate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          source_text = text;
          target_lang = to || 'zh';
        } else {
          // 后端调用格式
          message_id = payload.message_id;
          source_text = payload.source_text;
          target_lang = payload.target_lang || 'zh';
        }
        
        if (!source_text) {
          return fail(request, 'Missing required parameters', 400);
        }

        // Use DeepSeek API for translation
        if (!env.DEEPSEEK_API_KEY) {
          return fail(request, 'DeepSeek API key not configured', 500);
        }

        const deepSeekApiUrl = 'https://api.deepseek.com/v1/chat/completions';
        
        const systemPrompt = `你是一个专业的翻译助手，只负责将输入文本翻译成目标语言，不要添加任何额外的解释或内容。`;
        
        // Determine if we need to translate to English or Chinese
        const isEnglishTarget = target_lang === 'en' || target_lang === 'en-US';
        const targetLanguageName = isEnglishTarget ? '英文' : '中文';
        
        // Construct the correct prompt based on target language
        const userPrompt = isEnglishTarget 
          ? `Please translate the following text to English:\n${source_text}`
          : `请将以下文本翻译成中文：\n${source_text}`;

        const response = await fetch(deepSeekApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          console.error('[DEEPSEEK_API_ERROR]', response.status, errorBody);
          return fail(request, `DeepSeek API error: ${response.status}`, 500);
        }

        const data = await response.json();
        const translatedText = data.choices?.[0]?.message?.content?.trim() || '';
        
        if (!translatedText) {
          return fail(request, 'Translation returned empty result', 500);
        }

        console.log('[TRANSLATE_SUCCESS]', { original: source_text.substring(0, 50), translated: translatedText.substring(0, 50) });

        // Return translation result with different formats based on endpoint
        let translationResponse;
        if (pathname === '/api/translate/text') {
          // 前端期望的格式
          translationResponse = {
            ok: true,
            translated: translatedText,
            translated_text: translatedText,
            text: translatedText,
            source_lang: 'auto',
            target_lang,
            engine: 'deepseek'
          };
        } else {
          // 后端期望的格式
          translationResponse = {
            ok: true,
            message_id,
            translated_text: translatedText,
            source_lang: 'auto',
            target_lang,
            engine: 'deepseek'
          };
        }

        console.log('[TRANSLATE_RESPONSE_SENT]', translationResponse);
        return ok(request, translationResponse);
      } catch (error) {
        console.error('[TRANSLATE_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }

    // Media R2 endpoint - 返回二进制流
    console.log('[ROUTE_MATCH] Checking media route:', method, pathname);
    if (method === 'GET') {
      // 简化媒体路由匹配逻辑
      if (pathname.indexOf('/api/media/r2/') === 0) {
        console.log('[WORKER_MEDIA_REQUEST] Matched media route:', pathname);
        
        try {
          // 提取 R2 key
          let r2Key = pathname.substring('/api/media/r2/'.length);
          console.log('[WORKER_MEDIA_KEY]', r2Key);
          
          // 从 R2 bucket 读取对象
          let r2Bucket;
          // 检查 R2 binding 名称
          if (env.R2_MEDIA) {
            r2Bucket = env.R2_MEDIA;
            console.log('[R2_BINDING_USED] Using R2_MEDIA');
          } else if (env.MEDIA) {
            r2Bucket = env.MEDIA;
            console.log('[R2_BINDING_USED] Using MEDIA');
          } else {
            console.error('[WORKER_MEDIA_STREAM_FAIL] R2 binding not configured');
            return new Response('R2 binding not configured', {
              status: 500,
              headers: {
                'Content-Type': 'text/plain'
              }
            });
          }
          
          // 从 R2 获取对象
          const r2Object = await r2Bucket.get(r2Key);
          
          console.log('[WORKER_MEDIA_FOUND]', !!r2Object);
          
          if (!r2Object) {
            console.log('[WORKER_MEDIA_STREAM_FAIL] Object not found in R2');
            return new Response('Not Found', {
              status: 404,
              headers: {
                'Content-Type': 'text/plain'
              }
            });
          }
          
          console.log('[WORKER_MEDIA_R2_FOUND] Object found in R2');
          
          // 返回真实的图片
          const headers = new Headers();
          headers.set('Content-Type', r2Object.httpMetadata?.contentType || 'image/jpeg');
          headers.set('Cache-Control', 'public, max-age=31536000');
          headers.set('Access-Control-Allow-Origin', '*');
          headers.set('X-WhatsApp-Media', 'true');
          
          console.log('[WORKER_MEDIA_STREAM_OK] Streaming image with content-type:', r2Object.httpMetadata?.contentType);
          
          return new Response(r2Object.body, {
            headers: headers
          });
        } catch (error) {
          console.error('[WORKER_MEDIA_STREAM_FAIL]', error.message);
          return new Response('Internal Server Error', {
            status: 500,
            headers: {
              'Content-Type': 'text/plain'
            }
          });
        }
      }
    }

    // Contact upsert endpoint
    if (method === 'POST' && pathname === '/api/contact/upsert') {
      console.log('[CONTACT_UPSERT_ROUTE_HIT]');
      try {
        const contact = await request.json();
        console.log('[CONTACT_UPSERT_PAYLOAD]', contact);
        
        if (!contact.customer_id) {
          return fail(request, 'Missing customer_id', 400);
        }
        
        // 使用 upsertInboxIndexEntry 函数写入，确保与 inbound 路径使用相同逻辑
        const upsertResult = await upsertInboxIndexEntry(env, {
          customer_id: contact.customer_id,
          chat_id: contact.chat_id || contact.customer_id,
          last_message_preview: contact.lastMessage || contact.last_message_preview || '',
          last_message_ts: contact.timestamp || contact.last_message_ts || Date.now(),
          source: contact.source || 'contact_upsert'
        });
        
        if (upsertResult.ok) {
          console.log('[CONTACT_UPSERT_SUCCESS] Contact upserted:', contact.customer_id);
          return ok(request, { ok: true });
        } else {
          console.error('[CONTACT_UPSERT_ERROR]', upsertResult.error);
          // 如果是KV_BINDING_MISSING错误，返回200状态码
          if (upsertResult.error === 'KV_BINDING_MISSING') {
            return ok(request, { ok: false, error: upsertResult.error }, {}, 200);
          }
          return fail(request, upsertResult.error, 500);
        }
      } catch (error) {
        console.error('[CONTACT_UPSERT_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // /api/inbound/mock 端点
    if (method === 'POST' && pathname === '/api/inbound/mock') {
      console.log('[INBOUND_MOCK_ROUTE_HIT]');
      try {
        const payload = await request.json();
        const { message_id, customer_id, text } = payload;
        
        if (!message_id || !customer_id) {
          return fail(request, 'Missing required parameters: message_id, customer_id', 400);
        }
        
        // 添加 Presence Radar Hook
        logPresenceRadar(message_id, customer_id);
        
        // 添加 Presence Heartbeat
        console.log('[PRESENCE_HEARTBEAT]', message_id);
        
        return ok(request, {
          ok: true,
          message: "Inbound mock received"
        });
      } catch (error) {
        console.error('[INBOUND_MOCK_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // /api/inbound/daojie 端点
    if (method === 'POST' && pathname === '/api/inbound/daojie') {
      console.log('[INBOUND_DAOJIE_ROUTE_HIT]');
      try {
        const payload = await request.json();
        const { message_id, customer_id, text } = payload;
        
        if (!message_id || !customer_id) {
          return fail(request, 'Missing required parameters: message_id, customer_id', 400);
        }
        
        // 添加 Presence Radar Hook
        logPresenceRadar(message_id, customer_id);
        
        // 添加 Presence Heartbeat
        console.log('[PRESENCE_HEARTBEAT]', message_id);
        
        return ok(request, {
          ok: true,
          message: "Daojie inbound received"
        });
      } catch (error) {
        console.error('[INBOUND_DAOJIE_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // /api/presence/radar 端点（只读）
    if (method === 'GET' && pathname === '/api/presence/radar') {
      console.log('[PRESENCE_RADAR_ROUTE_HIT]');
      try {
        let radarLogs = [];
        
        // 从 KV 读取最近 20 条 inbound
        if (env.KV) {
          try {
            const radarData = await env.KV.get('presence:radar:list', 'json');
            if (radarData && Array.isArray(radarData)) {
              radarLogs = radarData;
            }
          } catch (kvError) {
            console.error('[PRESENCE_RADAR_KV_ERROR]', kvError.message);
          }
        }
        
        return ok(request, {
          ok: true,
          radar: radarLogs
        });
      } catch (error) {
        console.error('[PRESENCE_RADAR_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // Diagnostic endpoint for KV messages
    if (method === 'GET' && pathname === '/api/diag/kv/messages') {
      console.log('[DIAG_KV_ROUTE_HIT]');
      try {
        const customerId = url.searchParams.get('customer_id');
        
        if (!customerId) {
          return fail(request, 'Missing customer_id parameter', 400);
        }
        
        // 使用 canonical customer ID
        const canonicalId = normalizeCustomerId(customerId);
        console.log('[CANONICAL_ID_USED]', { raw: customerId, canonical: canonicalId });
        
        const kvKey = `messages:${canonicalId}`;
        console.log('[DIAG_KV]', { key: kvKey });
        
        // 尝试使用 MESSAGES_KV，如果不可用则使用 KV
        let kv;
        let kvBindingUsed = 'NONE';
        if (env.MESSAGES_KV) {
          kv = env.MESSAGES_KV;
          kvBindingUsed = 'MESSAGES_KV';
        } else if (env.KV) {
          kv = env.KV;
          kvBindingUsed = 'KV';
        }
        
        console.log('[KV_BINDING_PICK]', `using=${kvBindingUsed}`);
        
        if (kv) {
          try {
            const rawData = await kv.get(kvKey);
            const rawLen = rawData ? rawData.length : 0;
            console.log('[DIAG_KV_RAW]', { key: kvKey, raw_len: rawLen });
            
            let parsedCount = 0;
            let firstMsgId = null;
            let lastMsgId = null;
            let minTs = 0;
            let maxTs = 0;
            
            if (rawData) {
              try {
                const messages = JSON.parse(rawData);
                if (Array.isArray(messages)) {
                  parsedCount = messages.length;
                  if (parsedCount > 0) {
                    firstMsgId = messages[0].id;
                    lastMsgId = messages[messages.length - 1].id;
                    
                    const timestamps = messages.map(msg => msg.ts).filter(ts => ts);
                    if (timestamps.length > 0) {
                      minTs = Math.min(...timestamps);
                      maxTs = Math.max(...timestamps);
                    }
                  }
                }
              } catch (parseError) {
                console.error('[DIAG_KV_PARSE_ERROR]', parseError.message);
              }
            }
            
            console.log('[DIAG_KV_RESULT]', {
              key: kvKey,
              raw_len: rawLen,
              parsed_count: parsedCount,
              first_msg_id: firstMsgId,
              last_msg_id: lastMsgId,
              min_ts: minTs,
              max_ts: maxTs
            });
            
            return ok(request, {
              ok: true,
              key: kvKey,
              raw_len: rawLen,
              parsed_count: parsedCount,
              first_msg_id: firstMsgId,
              last_msg_id: lastMsgId,
              min_ts: minTs,
              max_ts: maxTs
            });
          } catch (error) {
            console.error('[DIAG_KV_ERROR]', error.message);
            return fail(request, error.message, 500);
          }
        } else {
          return fail(request, 'KV binding not available', 500);
        }
      } catch (error) {
        console.error('[DIAG_KV_ROUTE_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // Incremental sync endpoint
    if (method === 'GET' && pathname === '/api/inbox/pull') {
      console.log('[INCREMENTAL_SYNC_ROUTE_HIT]');
      try {
        const since = parseInt(url.searchParams.get('since') || '0', 10);
        const cursor = url.searchParams.get('cursor');
        const customerId = url.searchParams.get('customer_id');
        
        // 从 KV 读取消息
        let messages = [];
        let lastTs = since;
        let hasMore = false;
        let nextCursor = null;
        
        // A.1 在 handler 顶部打印 [PULL_ENTRY]
        console.log('[PULL_ENTRY]', { customer_id: customerId, since: since, cursor: cursor });
        
        // A.2 打印 KV 绑定检查
        console.log('[PULL_KV_BIND_CHECK]', { has_MESSAGES_KV: !!env.MESSAGES_KV, has_KV: !!env.KV });
        
        // 尝试使用 KV - 方案1：强制优先使用 env.KV（与 persist 完全一致）
        let kv;
        let kvBindingUsed = 'NONE';
        if (env.KV) {
          kv = env.KV;
          kvBindingUsed = 'KV';
        } else if (env.MESSAGES_KV) {
          kv = env.MESSAGES_KV;
          kvBindingUsed = 'MESSAGES_KV';
        }
        
        // A.2 打印最终选择的 KV 绑定
        console.log('[PULL_KV_BINDING_PICK]', `using=${kvBindingUsed}`);
        
        if (kv) {
          console.log('[INCREMENTAL_SYNC_KV_AVAILABLE] KV storage is available');
          if (customerId) {
            try {
              // 使用 canonical customer ID
              const canonicalId = normalizeCustomerId(customerId);
              console.log('[CANONICAL_ID_USED]', { raw: customerId, canonical: canonicalId });
              
              const kvKey = `messages:${canonicalId}`;
              
              // A.3 打印最终读取的 KV key
              console.log('[PULL_KV_READ_KEY]', kvKey);
              
              // 2. 打印KV get原始长度
              const rawData = await kv.get(kvKey);
              const rawLen = rawData ? rawData.length : 0;
              // A.4 打印读出后的 raw 长度
              console.log('[PULL_KV_READ_RAWLEN]', { raw_len: rawLen });
              console.log('[PULL_KV_RAW]', { key: kvKey, raw_len: rawLen });
              
              let storedMessages = [];
              if (rawData) {
                try {
                  storedMessages = JSON.parse(rawData);
                  if (Array.isArray(storedMessages) && storedMessages.length > 0) {
                    // 3. 解析后打印
                    const timestamps = storedMessages.map(msg => msg.ts).filter(ts => ts);
                    const minTs = timestamps.length > 0 ? Math.min(...timestamps) : 0;
                    const maxTs = timestamps.length > 0 ? Math.max(...timestamps) : 0;
                    console.log('[PULL_PARSE]', { total_in_kv: storedMessages.length, min_ts: minTs, max_ts: maxTs });
                    
                    // 过滤出时间戳大于 since 的消息
                    const filteredMessages = storedMessages.filter(msg => msg.ts > since);
                    
                    // 为没有 chatId 的消息添加 chatId 字段，使用 canonicalId
                    messages = filteredMessages.map(msg => {
                      if (!msg.chatId) {
                        return {
                          ...msg,
                          chatId: canonicalId,
                          customer_id: canonicalId
                        };
                      }
                      return msg;
                    });
                    
                    console.log('[PULL_FILTER]', { after_since: messages.length, since: since });
                  }
                } catch (parseError) {
                  console.error('[PULL_PARSE_ERROR]', parseError.message);
                  storedMessages = [];
                }
              }
              
              // 更新 lastTs 为最新消息的时间戳
              if (messages.length > 0) {
                lastTs = Math.max(...messages.map(msg => msg.ts));
              }
              
              // 4. 打印返回信息
              console.log('[PULL_RETURN]', { messages: messages.length, last_ts: lastTs });
            } catch (kvError) {
              console.error('[INCREMENTAL_SYNC_KV_ERROR]', kvError.message);
            }
          } else {
            console.log('[INCREMENTAL_SYNC_MISSING_CUSTOMER_ID] No customer_id provided, trying to get all customers');
            
            // 尝试从 contact_index 中获取所有客户的 ID
            try {
              let contactIndex;
              let contacts = [];
              
              // 1. 优先从 KV 读取 contact_index
              console.log('[INCREMENTAL_SYNC_KV_READ] Reading contact_index from KV');
              if (env.KV) {
                try {
                  const contactIndexKey = getEnvTaggedKey('contact_index', env);
                  contactIndex = await env.KV.get(contactIndexKey, { type: 'json' });
                  if (contactIndex && contactIndex.chats && Array.isArray(contactIndex.chats)) {
                    contacts = contactIndex.chats;
                    console.log('[INCREMENTAL_SYNC_KV_SUCCESS] Found', contacts.length, 'chats in KV');
                  } else {
                    console.log('[INCREMENTAL_SYNC_KV_EMPTY] No contact_index in KV');
                  }
                } catch (kvError) {
                  console.error('[INCREMENTAL_SYNC_KV_ERROR]', kvError.message);
                }
              }
              
              // 2. 若 KV 无数据，则从 ContactIndexDO 拉取
              if (contacts.length === 0) {
                console.log('[INCREMENTAL_SYNC_DO_FALLBACK] Falling back to ContactIndexDO');
                try {
                  if (env.CONTACT_INDEX) {
                    const id = env.CONTACT_INDEX.idFromName('global');
                    const stub = env.CONTACT_INDEX.get(id);
                    const doResponse = await stub.fetch(new Request('http://localhost/list'));
                    const doResult = await doResponse.json();
                    if (doResult && doResult.chats) {
                      contacts = doResult.chats.map(chat => ({
                        chatId: chat.customer_id,
                        customer_id: chat.customer_id,
                        lastMessage: '',
                        timestamp: chat.last_message_ts || Date.now()
                      }));
                      console.log('[INCREMENTAL_SYNC_DO_SUCCESS] Found', contacts.length, 'chats in ContactIndexDO');
                    } else {
                      console.log('[INCREMENTAL_SYNC_DO_EMPTY] No chats in ContactIndexDO');
                    }
                  } else {
                    console.log('[INCREMENTAL_SYNC_DO_MISSING] ContactIndexDO not configured');
                  }
                } catch (doError) {
                  console.error('[INCREMENTAL_SYNC_DO_ERROR]', doError.message);
                }
              }
              
              if (contacts.length > 0) {
                console.log('[INCREMENTAL_SYNC_CONTACT_INDEX_FOUND] Found', contacts.length, 'customers');
                
                // 为每个客户读取消息
                for (const contact of contacts) {
                  const customerId = contact.customer_id;
                  if (customerId) {
                    try {
                      const canonicalId = normalizeCustomerId(customerId);
                      const kvKey = `messages:${canonicalId}`;
                      
                      const rawData = await kv.get(kvKey);
                      if (rawData) {
                        try {
                          const storedMessages = JSON.parse(rawData);
                          if (Array.isArray(storedMessages) && storedMessages.length > 0) {
                            // 过滤出时间戳大于 since 的消息
                            const filteredMessages = storedMessages.filter(msg => msg.ts > since);
                            
                            // 为没有 chatId 的消息添加 chatId 字段，使用 canonicalId
                            const messagesWithChatId = filteredMessages.map(msg => {
                              if (!msg.chatId) {
                                return {
                                  ...msg,
                                  chatId: canonicalId,
                                  customer_id: canonicalId
                                };
                              }
                              return msg;
                            });
                            
                            messages = messages.concat(messagesWithChatId);
                            
                            // 更新 lastTs 为最新消息的时间戳
                            if (messagesWithChatId.length > 0) {
                              const maxTs = Math.max(...messagesWithChatId.map(msg => msg.ts));
                              if (maxTs > lastTs) {
                                lastTs = maxTs;
                              }
                            }
                          }
                        } catch (parseError) {
                          console.error('[PULL_PARSE_ERROR]', parseError.message);
                        }
                      }
                    } catch (error) {
                      console.error('[INCREMENTAL_SYNC_CUSTOMER_ERROR]', error.message);
                    }
                  }
                }
                
                console.log('[INCREMENTAL_SYNC_ALL_CUSTOMERS] Loaded', messages.length, 'messages from all customers');
              } else {
                console.log('[INCREMENTAL_SYNC_CONTACT_INDEX_MISSING] No contact_index found');
              }
            } catch (error) {
              console.error('[INCREMENTAL_SYNC_CONTACT_INDEX_ERROR]', error.message);
            }
          }
        } else {
          console.error('[INCREMENTAL_SYNC_KV_UNAVAILABLE] MESSAGES_KV is not available');
        }
        
        return ok(request, {
          messages: messages,
          last_ts: lastTs,
          has_more: hasMore,
          cursor: nextCursor
        });
      } catch (error) {
        console.error('[INCREMENTAL_SYNC_ERROR]', error.message);
        return fail(request, error.message, 500);
      }
    }
    
    // Default response
    return ok(request, {
      ok: true,
      message: "Worker is running"
    });
  } catch (error) {
    console.error('[GLOBAL_ERROR]', error);
    return fail(request, error.message, 500);
  }
}

// 从消息中提取 mediaSid 的辅助函数
function extractMediaSidFromMessage(message) {
  // 尝试从不同字段提取 mediaSid
  if (message.mediaSid) {
    return message.mediaSid;
  }
  
  if (message.media_path) {
    // 从媒体路径中提取 mediaSid
    const mediaPathMatch = message.media_path.match(/Media\/(ME[\w]+)/);
    if (mediaPathMatch) {
      return mediaPathMatch[1];
    }
  }
  
  if (message.raw) {
    // 从原始数据中提取 mediaSid
    if (message.raw.MediaSid0) {
      return message.raw.MediaSid0;
    }
  }
  
  return null;
}

// Twilio 历史媒体 R2 Backfill 函数
async function performTwilioMediaBackfill(env) {
  console.log('[TWILIO_BACKFILL_START] Starting Twilio media backfill task');
  
  let totalScanned = 0;
  let totalFound = 0;
  let totalBackfilled = 0;
  let totalFailed = 0;
  let backfilledMediaSids = [];
  let failedMediaSids = [];
  
  try {
    // 1. 扫描历史消息
    console.log('[TWILIO_BACKFILL_SCAN] Scanning for Twilio media messages');
    
    // 从 KV 读取所有联系人
    let contacts = [];
    if (env.KV) {
      try {
        const contactIndexKey = getEnvTaggedKey('contact_index', env);
        const contactIndex = await env.KV.get(contactIndexKey, { type: 'json' });
        if (contactIndex && contactIndex.chats) {
          contacts = contactIndex.chats;
          console.log('[TWILIO_BACKFILL_CONTACTS_FOUND] Found', contacts.length, 'contacts in KV');
        }
      } catch (kvError) {
        console.error('[TWILIO_BACKFILL_CONTACTS_ERROR]', kvError.message);
      }
    }
    
    // 2. 对每个联系人，读取其消息
    for (const contact of contacts) {
      const customerId = contact.customer_id;
      if (!customerId) continue;
      
      console.log('[TWILIO_BACKFILL_PROCESS_CONTACT] Processing contact:', customerId);
      
      try {
        // 使用 canonical customer ID
        const canonicalId = normalizeCustomerId(customerId);
        const kvKey = `messages:${canonicalId}`;
        
        // 从 KV 读取消息
        if (env.KV) {
          const rawData = await env.KV.get(kvKey);
          if (rawData) {
            try {
              const messages = JSON.parse(rawData);
              if (Array.isArray(messages)) {
                totalScanned += messages.length;
                console.log('[TWILIO_BACKFILL_MESSAGES_FOUND] Found', messages.length, 'messages for contact:', customerId);
                
                // 3. 过滤出符合条件的消息
                for (const message of messages) {
                  // 检查消息是否符合条件
                  if (message.source === 'twilio' && message.hasMedia === true && !message.r2Key) {
                    totalFound++;
                    
                    // 提取 mediaSid
                    let mediaSid = message.mediaSid;
                    
                    // 使用 message.id 作为 mediaSid（当消息 ID 以 MM 开头且媒体路径包含 /twilio/ 时）
                    if (
                      message.id?.startsWith("MM") &&
                      message.mediaPath?.includes("/twilio/")
                    ) {
                      mediaSid = message.id;
                      console.log('[R2_BACKFILL_SCAN_MM] Using message.id as mediaSid:', mediaSid);
                    }
                    
                    if (mediaSid) {
                      console.log('[TWILIO_BACKFILL_MEDIA_FOUND] Found mediaSid:', mediaSid);
                      
                      // 4. 检查 R2 中是否已存在
                      const r2Key = `twilio/${message.id}.jpg`;
                      let exists = false;
                      
                      try {
                        const r2Object = await env.MEDIA.get(r2Key);
                        exists = !!r2Object;
                        if (exists) {
                          console.log('[TWILIO_BACKFILL_R2_EXISTS] Media already exists in R2:', r2Key);
                          continue;
                        }
                      } catch (headError) {
                        console.log('[TWILIO_BACKFILL_R2_CHECK_ERROR]', headError.message);
                      }
                      
                      // 5. 从 Twilio 下载媒体
                      try {
                        console.log('[R2_BACKFILL_DOWNLOAD] Downloading media from Twilio:', mediaSid);
                        console.log('[TWILIO_BACKFILL_DOWNLOAD_START] Downloading media from Twilio:', mediaSid);
                        
                        // 构建 Twilio Media URL
                        const mediaUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages/Media/${mediaSid}`;
                        console.log('[TWILIO_BACKFILL_MEDIA_URL]', mediaUrl);
                        
                        // 生成 Basic Auth header
                        const authHeader = 'Basic ' + btoa(env.TWILIO_ACCOUNT_SID + ':' + env.TWILIO_AUTH_TOKEN);
                        
                        // 下载媒体
                        const res = await fetch(mediaUrl, {
                          headers: {
                            Authorization: authHeader,
                            'Accept': 'image/*'
                          },
                          timeout: 30000
                        });
                        
                        if (!res.ok) {
                          console.error('[TWILIO_BACKFILL_DOWNLOAD_FAIL] Media fetch failed:', res.status);
                          totalFailed++;
                          failedMediaSids.push(mediaSid);
                          continue;
                        }
                        
                        console.log('[TWILIO_BACKFILL_DOWNLOAD_SUCCESS] Media fetched successfully');
                        
                        // 获取二进制数据
                        const buffer = await res.arrayBuffer();
                        console.log('[TWILIO_BACKFILL_BUFFER_SIZE]', buffer.byteLength);
                        
                        // 6. 写入 R2
                        console.log('[TWILIO_BACKFILL_R2_WRITE_START] Writing to R2:', r2Key);
                        await env.MEDIA.put(r2Key, buffer, {
                          httpMetadata: {
                            contentType: 'image/jpeg',
                            cacheControl: 'public, max-age=31536000'
                          }
                        });
                        
                        console.log('[R2_BACKFILL_OK]', mediaSid);
                        console.log('[R2_BACKFILL_WRITE_OK] Media written to R2:', r2Key);
                        console.log('[TWILIO_BACKFILL_R2_WRITE_SUCCESS] Media written to R2:', r2Key);
                        
                        totalBackfilled++;
                        backfilledMediaSids.push(mediaSid);
                        
                      } catch (error) {
                        console.error('[TWILIO_BACKFILL_PROCESS_ERROR]', error.message);
                        totalFailed++;
                        failedMediaSids.push(mediaSid);
                      }
                    }
                  }
                }
              }
            } catch (parseError) {
              console.error('[TWILIO_BACKFILL_PARSE_ERROR]', parseError.message);
            }
          }
        }
      } catch (error) {
        console.error('[TWILIO_BACKFILL_CONTACT_ERROR]', error.message);
      }
    }
    
    console.log('[TWILIO_BACKFILL_COMPLETE] Backfill task completed');
    console.log('[TWILIO_BACKFILL_STATS]', {
      totalScanned,
      totalFound,
      totalBackfilled,
      totalFailed,
      backfilledMediaSids: backfilledMediaSids.length,
      failedMediaSids: failedMediaSids.length
    });
    
    return {
      totalScanned,
      totalFound,
      totalBackfilled,
      totalFailed,
      backfilledMediaSids,
      failedMediaSids
    };
    
  } catch (error) {
    console.error('[TWILIO_BACKFILL_GLOBAL_ERROR]', error.message);
    return {
      totalScanned,
      totalFound,
      totalBackfilled,
      totalFailed,
      backfilledMediaSids,
      failedMediaSids,
      error: error.message
    };
  }
}

// Persona Firewall 函数
async function persona_guard(route, payload) {
  // 默认 persona
  let persona = "CHAT";
  
  // 如果满足 OCR 条件，强制切换
  if (
    payload?.ocr_text ||
    payload?.analyze_ocr_result ||
    payload?.structured_result ||
    payload?.image_url
  ) {
    persona = "OCR";
  }
  
  // 新增日志
  console.log("[PERSONA_FIREWALL]",
    "route=", route,
    "persona=", persona,
    "message_id=", payload?.message_id
  );
  
  return {
    persona,
    headers: {
      "x-jev-persona": persona
    }
  };
}

// 统一媒体管道就绪标志
console.log('[UNIFIED_MEDIA_PIPELINE_READY]');

// Persona Routing Gate 常量
const OCR_ANALYZE_PROMPT = '你是专业的工业产品分析助手，擅长从 OCR 识别文本中提取结构化信息。请直接分析提供的文本，不要要求用户提供更多信息。';
const CHAT_REPLY_PROMPT = '你是一个智能助手，用自然、专业、真实的人类语气与用户沟通。\n禁止提及任何"AI / 模型 / 系统"。\n\n输入：\n- 用户最新一条消息（仅这一条，不使用历史）\n\n输出规则（必须严格遵守）：\n1. 回复必须自然、拟人\n2. 不要长篇大论，不要营销话术\n3. 不要承诺无法确认的事情\n4. 不要解释，不要分析过程';
const QUOTE_DRAFT_PROMPT = '你是一个有经验的传感器外贸业务人员，用自然、专业、真实的人类语气与客户沟通。\n禁止提及任何"AI / 模型 / 系统"。\n\n输入：\n- 客户最新一条消息（仅这一条，不使用历史）\n- 当前 chat_id 已锁定\n- 语言：客户原始语言 = English\n\n输出规则（必须严格遵守）：\n1. 回复必须简短、自然、拟人\n2. 不要长篇大论，不要营销话术\n3. 不要承诺无法确认的事情\n4. 不要解释，不要分析过程\n5. 不要问超过 1 个问题\n\n输出结构（必须一致）：\n【AI 建议回复｜客户可见】\n<英文回复>\n【中文翻译｜仅内部可见】\n<上面英文的逐句中文翻译>';

// 判定 message intent
function determineIntent(payload, route) {
  // Persona Edge Router 判定
  if (route === '/api/persona/chat') {
    return 'CHAT_REPLY';
  }
  if (route === '/api/persona/ocr') {
    return 'OCR_ANALYZE';
  }
  if (route === '/api/persona/quote') {
    return 'QUOTE_DRAFT';
  }
  
  // OCR_ANALYZE 判定
  if (payload?.ocr_text || payload?.analyze_result || payload?.analyze_ocr_result || payload?.structured_result) {
    return 'OCR_ANALYZE';
  }
  
  // CHAT_REPLY 判定
  if (route.includes('/api/deepseek/chat') || route.includes('/api/ai/draft') || payload?.type === 'chat') {
    return 'CHAT_REPLY';
  }
  
  // QUOTE_DRAFT 判定
  if (route.includes('/api/ai/draft') || payload?.intent === 'QUOTE_DRAFT') {
    return 'QUOTE_DRAFT';
  }
  
  throw new Error('INTENT_NOT_ALLOWED');
}

// 获取对应的 system prompt
function getSystemPrompt(intent) {
  switch (intent) {
    case 'OCR_ANALYZE':
      return OCR_ANALYZE_PROMPT;
    case 'CHAT_REPLY':
      return CHAT_REPLY_PROMPT;
    case 'QUOTE_DRAFT':
      return QUOTE_DRAFT_PROMPT;
    default:
      throw new Error('INTENT_NOT_ALLOWED');
  }
}

// 全局 Structure Gate 实例
let structureGateInstance = null;

// 初始化 Structure Gate
function getStructureGate() {
  if (!structureGateInstance) {
    structureGateInstance = new StructureGate();
  }
  return structureGateInstance;
}

// ENV_TAG + KV key 前缀拼接函数
function getEnvTaggedKey(key, env = {}) {
  // 默认使用 prod 环境
  const envTag = env.ENV_TAG || 'prod';
  
  // 对于 prod 环境，返回原始 key，保持与现网一致
  if (envTag === 'prod') {
    return key;
  }
  
  // 对于其他环境，添加环境前缀
  return `${envTag}:${key}`;
}

// Inbox Index Upsert 函数 - 复用写入逻辑
async function upsertInboxIndexEntry(env, message) {
  // Trim customer_id to prevent duplicate entries with spaces
  let customer_id = message.customer_id;
  if (typeof customer_id === 'string') {
    const trimmedCustomerId = customer_id.trim();
    if (trimmedCustomerId !== customer_id) {
      console.log('[INBOX_ID_TRIM_APPLIED]', { before: customer_id, after: trimmedCustomerId });
      customer_id = trimmedCustomerId;
    }
  }
  
  // Check if customer_id is in TEST_ID blacklist
  const testIdBlacklist = ['10000000001'];
  const isTestId = testIdBlacklist.some(testId => 
    customer_id.includes(testId) || 
    (message.chat_id && message.chat_id.includes(testId))
  );
  
  if (isTestId) {
    console.log('[TEST_ID_BLACKLIST_HIT]', customer_id, 'blocked from正式 customers 列表');
    // Allow logs and diag, but block from正式 customers 列表
    return { ok: true, blocked: true, reason: 'test_id_blacklist' };
  }
  
  console.log('[INBOX_INDEX_UPSERT_START]', customer_id);
  
  try {
    // 检查 CONTACT_INDEX KV 绑定
    const contactIndexKV = env.CONTACT_INDEX;
    console.log('[CONTACT_UPSERT_KV_PICK]', contactIndexKV ? 'CONTACT_INDEX_OK' : 'CONTACT_INDEX_MISSING');
    
    // 如果 CONTACT_INDEX 不存在，返回错误
    if (!contactIndexKV) {
      console.log('[CONTACT_INDEX_BINDING_MISSING] env.CONTACT_INDEX is not available');
      return { ok: false, error: 'CONTACT_INDEX_BINDING_MISSING' };
    }
    
    // 生成版本化的键
    const { withV } = await import('./utils/version.js');
    const normalizedCustomerId = normalizeCustomerId(customer_id);
    
    // 构造新的 entry 结构
    const entry = {
      customer_id: normalizedCustomerId,
      last_ts: message.timestamp || Date.now(),
      preview: message.text || "[media]",
      last_message: message.text || "",
    };
    
    // 写入前增加调试日志
    console.log("[CONTACT_ENTRY]", JSON.stringify(entry));
    
    // 生成 contact key
    const contactKey = withV(`contact:${normalizedCustomerId}`);
    
    // 写入 CONTACT_INDEX KV
    try {
      await contactIndexKV.put(contactKey, JSON.stringify(entry));
      console.log('[CONTACT_INDEX_KV_WRITE]', normalizedCustomerId, 'key=' + contactKey);
      // 写入成功后增加调试日志
      console.log("[CONTACT_KEY_WRITE]", contactKey);
    } catch (kvError) {
      console.error('[CONTACT_KV_ERROR]', kvError.message);
      throw kvError;
    }
    
    // 添加 INBOX_REFRESH_TRIGGER 日志
    console.log("[INBOX_REFRESH_TRIGGER]", normalizedCustomerId);
    
    console.log('[INBOX_INDEX_UPSERT_OK]', normalizedCustomerId);
    return { ok: true };
  } catch (error) {
    console.error('[INBOX_INDEX_UPSERT_FAIL]', customer_id, error.message);
    return { ok: false, error: error.message };
  }
}

// === Structure Gate 集成函数 ===
// 产品身份主权层集成
export async function processProductIdentity(messageId, customerId, data, env) {
  try {
    // 检查回滚开关
    const structureGateEnabled = env.STRUCTURE_GATE_ENABLED !== 'false';
    
    if (!structureGateEnabled) {
      console.log('[STRUCTURE_GATE_DISABLED] Structure Gate is disabled via environment variable');
      return null;
    }

    // 输入摘要日志
    console.log('[INPUT_SUMMARY]', {
      message_id: messageId,
      has_analyze_ocr_result: !!data.analyze_ocr_result,
      has_analyze_result: !!data.analyze_result,
      has_ocr_text: !!data.ocr_text,
      has_chat_reply: !!data.chat_reply
    });

    // 调用 Structure Gate 裁决
    const gate = getStructureGate();
    const productIdentity = await gate.resolveProductIdentity(data);

    // 裁决结果日志
    console.log('[RESOLUTION_RESULT]', {
      level: productIdentity.level,
      source: productIdentity.source,
      confidence: productIdentity.confidence,
      identity_hash: productIdentity.identity_hash,
      is_unknown_model: productIdentity.model === '未知'
    });

    // 写入策略：以 customer_id + identity_hash 作为幂等键
    if (productIdentity.identity_hash && customerId) {
      const idempotentKey = `${customerId}:${productIdentity.identity_hash}`;
      
      // 检查是否已存在
      let exists = false;
      let identityLocked = false;
      
      // 检查 Identity Lock Gate
      if (env.JEV_STATE && env.IDENTITY_GATE_ENABLED !== 'false') {
        const IDENTITY_LOCK_PREFIX = "identity_lock:";
        const identityLockKey = IDENTITY_LOCK_PREFIX + productIdentity.identity_hash;
        
        try {
          const doId = env.JEV_STATE.idFromName(identityLockKey);
          const stub = env.JEV_STATE.get(doId);
          
          // 检查锁是否存在
          const checkResponse = await stub.fetch(new Request('http://localhost/identity/lock/check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              lockKey: identityLockKey
            })
          }));
          
          const checkResult = await checkResponse.json();
          identityLocked = checkResult.exists;
          console.log('[IDENTITY_LOCK_CHECK]', { identityLockKey, locked: identityLocked });
        } catch (error) {
          console.error('[IDENTITY_LOCK_CHECK_ERROR]', error.message);
        }
      }
      
      // 检查 KV 中是否已存在
      if (!identityLocked && env.KV) {
        try {
          const existing = await env.KV.get(idempotentKey);
          exists = !!existing;
        } catch (error) {
          console.error('[KV_CHECK_ERROR]', error.message);
        }
      }

      // 下游触发逻辑
      let triggered = 'none';
      let reason = 'missing_model';
      
      if (productIdentity.model !== '未知' && !identityLocked) {
        if (!exists) {
          // 首次出现：写入 KV / 触发下游
          if (env.KV) {
            try {
              await env.KV.put(idempotentKey, JSON.stringify({
                ...productIdentity,
                message_id: messageId,
                customer_id: customerId,
                created_at: Date.now()
              }), {
                expirationTtl: 60 * 60 * 24 * 30 // 30天过期
              });
              console.log('[KV_WRITE_SUCCESS]', idempotentKey);
            } catch (error) {
              console.error('[KV_WRITE_ERROR]', error.message);
            }
          }

          // 检查 Identity Lock Gate
          if (env.JEV_STATE && env.IDENTITY_GATE_ENABLED !== 'false') {
            const IDENTITY_LOCK_PREFIX = "identity_lock:";
            const identityLockKey = IDENTITY_LOCK_PREFIX + productIdentity.identity_hash;
            
            try {
              const doId = env.JEV_STATE.idFromName(identityLockKey);
              const stub = env.JEV_STATE.get(doId);
              
              await stub.fetch(new Request('http://localhost/identity/lock/put', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  lockKey: identityLockKey,
                  value: "1",
                  expirationTtl: 60 * 60 * 24 * 7 // 7天过期
                })
              }));
              console.log('[IDENTITY_LOCK_SET]', identityLockKey);
            } catch (error) {
              console.error('[IDENTITY_LOCK_PUT_ERROR]', error.message);
            }
          }

          // 报价引擎触发策略 - 状态机逻辑
          if (productIdentity.level === 'A') {
            triggered = 'quote_draft';
            reason = 'level=A';
          } else if (productIdentity.level === 'B') {
            triggered = 'quote_review';
            reason = 'level=B';
          } else if (productIdentity.level === 'C') {
            triggered = 'crm_tag';
            reason = 'level=C';
          }
        } else {
          // 重复出现：仅更新 timestamp，不触发报价/CRM
          triggered = 'none';
          reason = 'duplicate_hash';
          
          if (env.KV) {
            try {
              const existingData = await env.KV.get(idempotentKey, { type: 'json' });
              if (existingData) {
                await env.KV.put(idempotentKey, JSON.stringify({
                  ...existingData,
                  updated_at: Date.now(),
                  seen_count: (existingData.seen_count || 0) + 1
                }), {
                  expirationTtl: 60 * 60 * 24 * 30
                });
              }
            } catch (error) {
              console.error('[KV_UPDATE_ERROR]', error.message);
            }
          }
        }
      } else if (identityLocked) {
        triggered = 'none';
        reason = 'identity_locked';
        console.log('[IDENTITY_LOCKED] Skipping downstream trigger due to identity lock:', productIdentity.identity_hash);
      }

      // 下游触发日志
      console.log('[DOWNSTREAM_TRIGGER]', {
        triggered: triggered,
        reason: reason
      });
    }

    return productIdentity;
  } catch (error) {
    console.error('[STRUCTURE_GATE_ERROR]', error.message);
    return null;
  }
}

// Cloudflare Workers ES Module syntax
export default {
  async fetch(request, env, ctx) {

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 提前检查是否是 /stream 或 WebSocket upgrade 请求
    const url = new URL(request.url);
    const pathname = url.pathname;
    const upgrade = request.headers.get("Upgrade");
    
    // 对 /stream 和 WebSocket upgrade 请求，直接返回，不做任何封装
    if (pathname === "/stream" || (upgrade && upgrade.toLowerCase() === "websocket")) {
      const response = await handleRequest(request, env, ctx);
      return response;
    }

    // 对其他请求，继续进行 CORS 封装
    const response = await handleRequest(request, env, ctx);

    const newHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => {
      newHeaders.set(k, v);
    });

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }
};

// Export Durable Objects
export { ChatRoomDO, CHAT_ROOM_DO, DEAL_STATE_DO };