const http = require('http');

// In-memory storage
const messageStore = new Map();
const customers = new Map();

// Helper function to get messages for a customer
const getMessagesForCustomer = (customerId) => {
  return messageStore.get(customerId) || [];
};

// Helper function to add message to store
const addMessageToStore = (customerId, message) => {
  const messages = getMessagesForCustomer(customerId);
  messages.push(message);
  messageStore.set(customerId, messages);
  return messages;
};

// Helper function to parse request body
const parseRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
};

// Helper function to generate mock translation for unmatched text
function generateMockTranslation(text) {
  // 改进的翻译生成策略：根据英文单词生成更真实的中文翻译
  const wordTranslations = {
    'Hello': '你好',
    'how': '如何',
    'are': '是',
    'you': '你',
    'I': '我',
    'would': '想要',
    'like': '喜欢',
    'to': '去',
    'place': '下',
    'an': '一',
    'order': '订单',
    'What': '什么',
    'is': '是',
    'the': '这个',
    'price': '价格',
    'When': '什么时候',
    'will': '会',
    'it': '它',
    'be': '被',
    'delivered': '发货',
    'Thank': '谢谢',
    'you': '你',
    'for': '为了',
    'your': '你的',
    'help': '帮助',
    'This': '这个',
    'product': '产品',
    'is': '是',
    'very': '非常',
    'good': '好',
    'Can': '能',
    'give': '给',
    'me': '我',
    'a': '一',
    'discount': '折扣',
    'need': '需要',
    'more': '更多',
    'information': '信息',
    'The': '这个',
    'quality': '质量',
    'excellent': '优秀',
    'will': '会',
    'contact': '联系',
    'later': '稍后',
    'Please': '请',
    'send': '发送',
    'invoice': '发票',
    'am': '是',
    'satisfied': '满意',
    'with': '与',
    'service': '服务',
    'Is': '是',
    'there': '有',
    'warranty': '保修',
    'How': '如何',
    'long': '长',
    'delivery': '交货',
    'time': '时间',
    'return': '退货',
    'if': '如果',
    'don\'t': '不',
    'like': '喜欢',
    'it': '它'
  };
  
  // 将文本拆分为单词并翻译
  const translatedWords = text.split(/\s+/).map(word => {
    // 检查是否有完全匹配的翻译
    if (wordTranslations[word]) {
      return wordTranslations[word];
    }
    // 检查是否有首字母大写的匹配
    const lowercaseWord = word.toLowerCase();
    if (wordTranslations[lowercaseWord]) {
      return wordTranslations[lowercaseWord];
    }
    // 保留原始单词
    return word;
  });
  
  // 组合翻译后的单词并添加适当的标点符号
  let translatedText = translatedWords.join(' ');
  
  // 移除多余的空格
  translatedText = translatedText.replace(/\s+/g, ' ').trim();
  
  // 如果翻译结果与原文相同，返回一个更通用的中文翻译
  if (translatedText === text) {
    return `[中文翻译] ${text}`;
  }
  
  return translatedText;
};

const server = http.createServer(async (req, res) => {
  // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const { url, method } = req;
  console.log(`[MOCK_WORKER] ${method} ${url}`);

  // API Health endpoint
  if (method === 'GET' && url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // API Status endpoint
  if (method === 'GET' && url === '/api/status') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      ok: true,
      status: 'ok',
      ws: 'disabled',
      mode: 'http-event-engine',
      engine: 'active',
      dev_mode: true
    }));
    return;
  }

  // API Inbox Customers endpoint
  if (method === 'GET' && url === '/api/inbox/customers') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      ok: true, 
      customers: Array.from(customers.values()) 
    }));
    return;
  }

  // API Inbox Pull endpoint
  if (method === 'GET' && url.startsWith('/api/inbox/pull')) {
    const urlObj = new URL(`http://localhost:8787${url}`);
    const customerId = urlObj.searchParams.get('customer_id');
    const messages = customerId ? getMessagesForCustomer(customerId) : [];
    
    res.writeHead(200);
    res.end(JSON.stringify({ 
      ok: true,
      messages: messages,
      cursor: messages.length,
      hasMore: false
    }));
    return;
  }

  // API Inbound Daojie endpoint
  if (method === 'POST' && url === '/api/inbound/daojie') {
    try {
      const body = await parseRequestBody(req);
      const customerId = body.customer_id || body.customerId || 'unknown';
      const customerName = body.customer_name || body.customerName || 'Unknown';
      const text = body.text || '';
      const timestamp = Date.now();
      const messageId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create customer if not exists
      if (!customers.has(customerId)) {
        customers.set(customerId, {
          customer_id: customerId,
          display_name: customerName,
          status: 'active',
          last_message_at: timestamp
        });
      }
      
      // Create message
      const message = {
        id: messageId,
        customer_id: customerId,
        text: text,
        type: 'inbound',
        source: 'daojie',
        timestamp: timestamp,
        stored: true
      };
      
      // Store message
      addMessageToStore(customerId, message);
      
      console.log(`[INBOUND_MSG_WRITE] customer_id=${customerId} text_length=${text.length}`);
      console.log(`[FORCE_CUSTOMER_REGISTERED] ${customerId}`);
      console.log(`[TRACE][DAOJIE_INBOUND_STORED] { customerId: '${customerId}', text: '${text}', type: 'inbound', stored: true }`);
      
      res.writeHead(200);
      res.end(JSON.stringify({ 
        ok: true, 
        customer_id: customerId, 
        message_id: messageId 
      }));
      return;
    } catch (error) {
      console.error(`[INBOUND][ERROR] ${error.message}`);
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: 'PARSE_ERROR' }));
      return;
    }
  }

  // 辅助函数：检测文本是否为中文
  function isChinese(text) {
    // 检查文本中是否包含中文字符
    return /[\u4e00-\u9fa5]/.test(text);
  }

  // 统一翻译端点处理
  const handleTranslateRequest = async (req) => {
    try {
      const trace_id = `trace_${Date.now()}`;
      const body = await parseRequestBody(req);
      
      // 按照要求的顺序读取文本字段
      const text = 
        body.text || 
        body.content || 
        body.message || 
        body.original_text || 
        "";
      
      // 环境检查日志
      console.log("[ENV_CHECK]", !!process.env.DEEPSEEK_API_KEY);
      
      // 验证API密钥存在
      if (!process.env.DEEPSEEK_API_KEY) {
        res.writeHead(502);
        res.end(JSON.stringify({
          ok: false,
          engine: "deepseek",
          error: "DEEPSEEK_API_KEY_NOT_SET",
          trace_id: trace_id
        }));
        return;
      }
      
      // 日志：输入文本
      console.log('[TRANSLATE_REQUEST] text=' + text.slice(0, 50) + '...');
      
      // 调用真实DeepSeek翻译API
      let translatedText = text;
      
      try {
        // 从环境变量获取DeepSeek API密钥
        const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        
        // 构建DeepSeek Chat Completions请求
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${deepseekApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                "role": "system",
                "content": "你是专业翻译引擎。把用户输入翻译成简体中文。\n要求：\n- 只输出翻译后的中文，不要解释，不要加标题，不要加引号。\n- 遇到拼写错误、口语、省略句：根据语境合理补全，使中文通顺。\n- 保留专有名词/缩写（如 PVG、RMB、PCS）不翻译或按常用译法处理。"
              },
              {
                "role": "user",
                "content": text
              }
            ],
            temperature: 0.1,
            max_tokens: 500
          })
        });
        
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(`DeepSeek API error: ${response.status} ${JSON.stringify(errorBody)}`);
        }
        
        const result = await response.json();
        translatedText = result.choices[0].message.content.trim();
      } catch (error) {
        console.error(`[DEEPSEEK_TRANSLATE_ERROR] ${error.message}`);
        // 不再使用mock或模板，直接返回错误
        res.writeHead(502);
        res.end(JSON.stringify({
          ok: false,
          error: error.message,
          engine: "deepseek",
          trace_id: trace_id
        }));
        return;
      }
      
      // 日志：输出文本
      console.log('[TRANSLATE_RESULT] translated=' + translatedText.slice(0, 50) + '...');
      
      // 返回固定格式的成功响应
      res.writeHead(200);
      res.end(JSON.stringify({ 
        ok: true, 
        source_lang: "auto",
        translated_text: translatedText,
        engine: "deepseek"
      }));
      return;
    } catch (error) {
      console.error(`[TRANSLATE_HANDLER_ERROR] ${error.message}`);
      
      // 异常情况下，返回错误响应
      res.writeHead(500);
      res.end(JSON.stringify({ 
        ok: false, 
        error: error.message,
        engine: "deepseek",
        trace_id: `trace_${Date.now()}`
      }));
      return;
    }
  };
  
  // ===== /api/translate/text（统一翻译入口） =====
  if (method === 'POST' && url === '/api/translate/text') {
    return handleTranslateRequest(req);
  }
  
  // ===== /api/translate/message 兼容转发 =====
  if (method === 'POST' && url === '/api/translate/message') {
    return handleTranslateRequest(req);
  }
  
  // ===== 其他翻译端点兼容转发 =====
  if (method === 'POST' && url.startsWith('/api/translate/')) {
    return handleTranslateRequest(req);
  }
  
  // API Send Message endpoint
  if (method === 'POST' && url === '/api/message/send') {
    try {
      const body = await parseRequestBody(req);
      const customerId = body.customer_id || body.customerId || 'unknown';
      const text = body.text || '';
      const timestamp = Date.now();
      const messageId = `mock-send-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create message
      const message = {
        id: messageId,
        customer_id: customerId,
        text: text,
        type: 'outbound',
        source: 'human',
        timestamp: timestamp,
        stored: true
      };
      
      // Store message
      addMessageToStore(customerId, message);
      
      console.log(`[SEND_MSG_WRITE] customer_id=${customerId} text_length=${text.length}`);
      
      res.writeHead(200);
      res.end(JSON.stringify({ 
        ok: true, 
        data: { 
          mode: 'local-dev' 
        } 
      }));
      return;
    } catch (error) {
      console.error(`[SEND][ERROR] ${error.message}`);
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: 'PARSE_ERROR' }));
      return;
    }
  }

  // Default response
  res.writeHead(404);
  res.end(JSON.stringify({ ok: false, error: 'ROUTE_NOT_HANDLED', path: url }));
});

const PORT = 8787;
server.listen(PORT, () => {
  console.log(`Mock Worker Server running at http://localhost:${PORT}/`);
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/status');
  console.log('  GET  /api/inbox/customers');
  console.log('  GET  /api/inbox/pull?customer_id=xxx');
  console.log('  POST /api/inbound/daojie');
  console.log('  POST /api/translate/text');
});
