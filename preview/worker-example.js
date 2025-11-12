/**
 * Cloudflare Worker 示例：处理图片上传和DeepSeek API调用
 */

// 配置参数（实际部署时应通过环境变量设置）
const CONFIG = {
  DEEPSEEK_API_KEY: 'YOUR_DEEPSEEK_API_KEY', // 在实际部署时设置为环境变量
  DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
  WEBHOOK_SECRET: 'YOUR_WEBHOOK_SECRET', // Cloudflare Secrets类型密钥
  WEBHOOK_SHARED_SECRET: 'jevindustry2025', // 纯文本类型密钥
  R2_BUCKET_NAME: 'your-image-bucket', // R2存储桶名称
};

// 初始化允许的密钥列表（支持多密钥认证）
const ALLOWED_SECRETS = [
  CONFIG.WEBHOOK_SECRET,
  CONFIG.WEBHOOK_SHARED_SECRET,
  'jevindustry2025' // 兜底开发模式密钥
].filter(Boolean); // 过滤掉可能的undefined

// 多密钥认证验证函数 - 支持多种认证方式
function validateWebhookSecret(request) {
  // 尝试从Authorization头获取Bearer token
  const authHeader = request.headers.get('Authorization') || '';
  const bearerToken = authHeader.replace('Bearer ', '').trim();
  
  // 尝试从X-Webhook-Secret头获取密钥
  const webhookSecretHeader = request.headers.get('X-Webhook-Secret') || '';
  
  // 检查是否有任何有效的认证方式
  return ALLOWED_SECRETS.includes(bearerToken) || 
         ALLOWED_SECRETS.includes(webhookSecretHeader);
}

// 处理图片上传请求
async function handleImageUpload(request) {
  try {
    const data = await request.json();
    
    // 1. 验证请求数据
    if (!data.base64_url || !data.filename) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 2. 解析base64并上传到R2（这里是示例，实际需要实现R2上传逻辑）
    // const base64Data = data.base64_url.replace(/^data:image\/[^;]+;base64,/, '');
    // const arrayBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
    // const uploadResult = await uploadToR2(arrayBuffer, data.filename);
    
    // 模拟R2上传结果
    const r2Key = `images/${Date.now()}-${data.filename}`;
    const r2Url = `https://your-r2-domain.cloudflarestorage.com/${r2Key}`;
    
    // 3. 如果需要OCR处理（这里应该调用实际的OCR服务）
    let ocrText = '';
    let translatedText = '';
    
    if (data.ocr) {
      // 实际项目中调用OCR服务
      // ocrText = await performOCR(r2Url);
      ocrText = '这是模拟的OCR识别结果，包含产品信息和客户需求';
      
      // 如果需要翻译
      if (data.translate && data.target_lang) {
        // 实际项目中调用翻译服务
        // translatedText = await translateText(ocrText, data.target_lang);
        translatedText = 'This is a simulated OCR result, containing product information and customer requirements';
      }
    }
    
    // 4. 返回成功结果
    return new Response(JSON.stringify({
      success: true,
      key: r2Key,
      url: r2Url,
      worker_url: r2Url,
      ocr_text: ocrText,
      translated_text: translatedText || ocrText,
      contactId: data.contactId,
      conversationId: data.conversationId
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理DeepSeek API调用请求
async function handleDeepSeekChat(request) {
  try {
    const data = await request.json();
    
    // 1. 验证请求数据
    if (!data.system || !data.prompt || !CONFIG.DEEPSEEK_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields or API key' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 2. 构造DeepSeek API请求
    const deepSeekBody = {
      model: data.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: data.system },
        { role: 'user', content: data.prompt }
      ],
      temperature: data.temperature !== undefined ? data.temperature : 0.7,
      top_p: data.top_p !== undefined ? data.top_p : 0.9
    };
    
    // 3. 调用DeepSeek API
    const deepSeekResponse = await fetch(CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(deepSeekBody)
    });
    
    // 4. 处理DeepSeek API响应
    const deepSeekData = await deepSeekResponse.json();
    
    if (!deepSeekResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: deepSeekData.error || `DeepSeek API error: ${deepSeekResponse.status}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 5. 提取响应内容
    const content = deepSeekData.choices && deepSeekData.choices[0] && 
                    deepSeekData.choices[0].message && 
                    deepSeekData.choices[0].message.content;
    
    if (!content) {
      return new Response(JSON.stringify({
        success: false,
        error: 'DeepSeek returned no content'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 6. 可选：写入CRM系统（实际项目中需要实现）
    // if (data.contactId && data.conversationId) {
    //   await writeToCRM(data.contactId, data.conversationId, content);
    // }
    
    // 7. 返回成功结果
    return new Response(JSON.stringify({
      success: true,
      content: content
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 主处理函数
async function handleRequest(request) {
  // 验证webhook secret
  if (!validateWebhookSecret(request)) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 根据路径分发请求
  const url = new URL(request.url);
  const path = url.pathname;
  
  if (path === '/receive-image') {
    return handleImageUpload(request);
  } else if (path === '/deepseek-chat') {
    return handleDeepSeekChat(request);
  } else {
    return new Response(JSON.stringify({ success: false, error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 导出fetch处理函数
export default {
  async fetch(request) {
    try {
      return handleRequest(request);
    } catch (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
