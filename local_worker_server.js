const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const formidable = require('formidable');

// 存储所有连接的WebSocket客户端
const clients = new Set();

// DeepSeek API 配置 - 实际使用时需要替换为真实的API密钥
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'your-api-key';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 用于模拟DeepSeek API调用的函数
async function callDeepSeekTranslation(text, targetLang) {
  // 确保参数有效
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text parameter');
  }
  
  // 模拟API调用过程
  // 实际项目中应替换为真实的fetch请求
  console.log(`[翻译请求] 文本: ${text.substring(0, 50)}...`);
  console.log(`[翻译请求] 目标语言: ${targetLang}`);
  
  // 模拟响应延迟
  await new Promise(resolve => setTimeout(resolve, 500)); // 减少延迟时间
  
  // 模拟翻译结果
  // 实际实现中应调用真实的DeepSeek API
  let translatedText = '';
  
  // 简单的模拟翻译逻辑
  if (targetLang === 'zh-CN' || targetLang === 'zh') {
    // 模拟英文到中文的翻译
    if (text.toLowerCase().includes('hello')) {
      translatedText = text.replace(/hello/gi, '你好');
    } else if (text.toLowerCase().includes('test')) {
      translatedText = text.replace(/test/gi, '测试');
    } else if (text.toLowerCase().includes('translation')) {
      translatedText = text.replace(/translation/gi, '翻译');
    } else {
      translatedText = '这是一段模拟翻译的中文文本：' + text;
    }
  } else if (targetLang === 'en' || targetLang === 'en-US') {
    // 模拟中文到英文的翻译
    if (text.includes('你好')) {
      translatedText = text.replace(/你好/g, 'Hello');
    }
    if (text.includes('测试')) {
      translatedText = translatedText.replace(/测试/g, 'Test');
    }
    if (text.includes('文本')) {
      translatedText = translatedText.replace(/文本/g, 'Text');
    }
    // 如果没有进行任何替换，使用完整的模拟翻译
    if (!translatedText || translatedText === text) {
      translatedText = 'This is a simulated English translation: ' + text;
    }
  } else {
    // 其他语言
    translatedText = `[${targetLang}] Simulated translation: ${text}`;
  }
  
  return translatedText;
}

// 创建本地测试服务器
const server = http.createServer((req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 模拟API端点
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Local Worker Server is running',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 模拟图片上传端点
  if (req.url === '/upload-image' && req.method === 'POST') {
    const form = new formidable.IncomingForm({
      uploadDir: path.join(__dirname, 'uploads'),
      keepExtensions: true
    });

    // 确保上传目录存在
    if (!fs.existsSync(form.uploadDir)) {
      fs.mkdirSync(form.uploadDir, { recursive: true });
    }

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Failed to parse form data'
        }));
        return;
      }

      // 模拟R2上传成功
      res.writeHead(200, { 'Content-Type': 'application/json' });
      // 检查file字段（主要）和image字段（兼容性）
      const uploadedFile = files.file || files.image;
      res.end(JSON.stringify({
        success: true,
        imageUrl: `https://pub-156ce03fffc59592e2b3b04dbc22aa6c.r2.dev/${uploadedFile.newFilename}`,
        r2Key: uploadedFile.newFilename,
        fileName: uploadedFile.newFilename,
        timestamp: new Date().toISOString()
      }));
    });
    return;
  }

  // 模拟图片分析端点
  if (req.url === '/analyze-image' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // 模拟OCR和翻译结果
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            imageUrl: data.imageUrl || 'https://example.com/test-image.jpg',
            ocrResult: {
              text: '这是一段示例文本，用于测试OCR功能。This is a sample text for OCR testing.',
              confidence: 0.95,
              language: 'zh-CN,en-US'
            },
            translationResult: {
              text: 'This is an example text for testing OCR functionality. 这是一段用于测试OCR功能的示例文本。',
              sourceLanguage: 'zh-CN,en-US',
              targetLanguage: 'en'
            },
            workflowId: data.workflowId || 'test-workflow-' + Date.now(),
            timestamp: new Date().toISOString()
          }));
        }, 1000);
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Invalid JSON format'
        }));
      }
    });
    return;
  }

  // DeepSeek翻译端点
  if (req.url === '/translate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      console.log(`收到翻译请求，内容长度: ${body.length}字符`);
      
      try {
        console.log('解析请求体...');
        const data = JSON.parse(body);
        console.log('请求体解析成功:', { text_length: data.text?.length, target_lang: data.target_lang });
        
        // 验证请求参数
        if (!data.text || typeof data.text !== 'string') {
          console.error('参数验证失败: 缺少或无效的text参数');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Missing or invalid text parameter'
          }));
          return;
        }
        
        const text = data.text;
        const target_lang = data.target_lang || 'zh-CN'; // 默认中文
        
        console.log(`接收到翻译请求: ${text.substring(0, 50)}... -> ${target_lang}`);
        
        try {
          // 调用DeepSeek翻译服务
          console.log(`开始翻译处理，目标语言: ${target_lang}`);
          const translatedText = await callDeepSeekTranslation(text, target_lang);
          console.log(`翻译完成，结果长度: ${translatedText.length}字符`);
          
          // 构建响应对象
          const responseData = {
            success: true,
            translated_text: translatedText,
            source_text: text,
            target_language: target_lang,
            timestamp: new Date().toISOString()
          };
          
          console.log('构建响应对象完成');
          
          // 转换为JSON字符串并验证
          const responseJson = JSON.stringify(responseData);
          console.log(`响应JSON长度: ${responseJson.length}字符`);
          
          // 返回成功响应
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(responseJson)
          });
          console.log('开始发送响应...');
          res.end(responseJson);
          console.log('响应发送完成');
        } catch (apiError) {
          console.error('DeepSeek API调用失败:', apiError);
          const errorResponse = JSON.stringify({
            success: false,
            error: '翻译服务调用失败: ' + apiError.message
          });
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(errorResponse);
        }
      } catch (error) {
        console.error('请求处理失败:', error);
        const errorResponse = JSON.stringify({
          success: false,
          error: 'Invalid JSON format: ' + error.message
        });
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(errorResponse);
      }
    });
    return;
  }

  // 404处理
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: false,
    error: 'Endpoint not found'
  }));
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server });

// 模拟DeepSeek API响应
function mockDeepSeekResponse(query) {
  const responses = {
    '你好': '你好！我是DeepSeek智能助手，有什么可以帮助你的吗？',
    '介绍': '我是基于DeepSeek技术的智能助手，可以帮助你解答问题、提供信息和完成各种任务。',
    '帮助': '我可以帮助你解答问题、提供信息分析、生成创意内容等。请告诉我你需要什么帮助？',
    '天气': '虽然我无法获取实时天气数据，但我可以帮你分析历史天气模式或提供查询天气的方法。',
    '再见': '再见！有需要随时回来找我。'
  };

  // 查找匹配的关键词
  for (const [keyword, response] of Object.entries(responses)) {
    if (query.includes(keyword)) {
      return response;
    }
  }

  // 默认回复
  return `感谢你的提问。基于你询问的"${query}"，我认为这是一个很好的话题。我可以从多个角度为你分析这个问题，包括技术实现、应用场景和潜在挑战。如果你有更具体的问题，请告诉我。`;
}

// 处理WebSocket连接
wss.on('connection', (ws) => {
  console.log('客户端已连接');
  clients.add(ws);

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'chat',
    content: '欢迎连接到DAOJIE Worker服务！我是你的智能助手。'
  }));

  // 处理接收到的消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('收到WebSocket消息:', data);

      // 根据消息类型处理
      switch (data.type) {
        case 'chat':
          // 处理聊天消息
          handleChatMessage(ws, data);
          break;

        case 'deepseek_query':
          // 处理DeepSeek查询
          handleDeepSeekQuery(ws, data);
          break;

        case 'ocr_request':
          // 模拟OCR处理
          handleOcrRequest(ws, data);
          break;

        case 'translation_request':
          // 模拟翻译处理
          handleTranslationRequest(ws, data);
          break;

        default:
          console.log('未知消息类型:', data.type);
          ws.send(JSON.stringify({
            type: 'error',
            message: '未知的消息类型'
          }));
      }
    } catch (error) {
      console.error('处理WebSocket消息时出错:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '处理消息时发生错误'
      }));
    }
  });

  // 处理连接关闭
  ws.on('close', () => {
    console.log('客户端已断开连接');
    clients.delete(ws);
  });

  // 处理错误
  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
});

// 处理聊天消息
function handleChatMessage(ws, data) {
  // 模拟处理延迟
  setTimeout(() => {
    const responses = [
      `我已收到你的消息: ${data.content}`,
      `谢谢你的提问，关于"${data.content}"，我有一些见解...`,
      `这是个很好的问题，让我思考一下。根据我的分析，${data.content}涉及到多个方面...`,
      `感谢你分享这个想法。我认为${data.content}是一个值得探讨的话题。`,
      `关于${data.content}，我可以提供一些专业的建议和解决方案。`
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    ws.send(JSON.stringify({
      type: 'chat',
      content: randomResponse,
      messageId: data.messageId || null
    }));
  }, 500 + Math.random() * 2000); // 随机延迟
}

// 处理DeepSeek查询
function handleDeepSeekQuery(ws, data) {
  console.log('处理DeepSeek查询:', data.query);
  
  // 模拟API调用延迟
  setTimeout(() => {
    const result = mockDeepSeekResponse(data.query);
    
    ws.send(JSON.stringify({
      type: 'deepseek_result',
      result: result,
      confidence: 0.9 + Math.random() * 0.1,
      processingTime: Math.floor(Math.random() * 2000) + 1000,
      timestamp: new Date().toISOString()
    }));
  }, 1000 + Math.random() * 3000);
}

// 处理OCR请求
function handleOcrRequest(ws, data) {
  // 模拟OCR处理
  setTimeout(() => {
    const success = Math.random() > 0.1; // 90%成功率
    
    ws.send(JSON.stringify({
      type: 'ocr_result',
      success: success,
      text: success ? '这是模拟的OCR识别结果文本。在实际应用中，这里会包含从图片中提取的真实文字内容。' : null,
      error: success ? null : 'OCR识别失败，请重试',
      processingTime: Math.floor(Math.random() * 1000) + 500
    }));
  }, 800 + Math.random() * 2000);
}

// 处理翻译请求
function handleTranslationRequest(ws, data) {
  // 模拟翻译处理
  setTimeout(async () => {
    try {
      // 使用现有的翻译函数
      const translatedText = await callDeepSeekTranslation(data.text || '默认文本', data.target_lang || 'en');
      
      ws.send(JSON.stringify({
        type: 'translation_result',
        success: true,
        text: translatedText,
        error: null,
        processingTime: Math.floor(Math.random() * 800) + 400
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'translation_result',
        success: false,
        text: null,
        error: '翻译失败: ' + error.message,
        processingTime: Math.floor(Math.random() * 800) + 400
      }));
    }
  }, 600 + Math.random() * 1500);
}

// 广播消息给所有客户端
function broadcast(message) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// 启动服务器
const PORT = process.env.PORT || 8081; // 改为8081端口
server.listen(PORT, () => {
  console.log(`DAOJIE Worker Server运行在端口 ${PORT}`);
  console.log('HTTP API端点:');
  console.log('- GET /ping');
  console.log('- POST /upload-image (multipart/form-data)');
  console.log('- POST /analyze-image (application/json)');
  console.log('- POST /translate (application/json) - DeepSeek翻译服务');
  console.log('');
  console.log('WebSocket服务已启动，可以接收客户端连接');
  console.log('WebSocket URL: ws://localhost:' + PORT);
});

// 定期发送心跳消息，保持连接活跃
setInterval(() => {
  broadcast({
    type: 'heartbeat',
    timestamp: new Date().toISOString()
  });
}, 30000);
