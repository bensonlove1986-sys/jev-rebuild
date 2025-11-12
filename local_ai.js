// 本地AI服务 - JEV Auto-Quote System
// 实现图像识别与报价分析功能

const http = require('http');
const url = require('url');
const fs = require('fs');

// 配置
const config = {
  port: 1822,
  priceDbPath: './data/price_db.json',
  logLevel: 'info' // info, warn, error
};

// 模拟价格数据库 (实际使用时从文件或KV存储读取)
let priceDb = {
  "E2E-X3D1-N": {"price": 12.5, "brand": "Omron", "unit": "USD"},
  "M12X1": {"price": 3.8, "brand": "Autonics", "unit": "USD"},
  "TL-W5MC1": {"price": 15.2, "brand": "Autonics", "unit": "USD"},
  "E3Z-LS63": {"price": 22.8, "brand": "Omron", "unit": "USD"},
  "CN-13": {"price": 8.5, "brand": "Keyence", "unit": "USD"},
  "SRT2-OD08": {"price": 45.0, "brand": "Omron", "unit": "USD"}
};

// 初始化 - 尝试从文件加载价格数据库
try {
  if (fs.existsSync(config.priceDbPath)) {
    const dbContent = fs.readFileSync(config.priceDbPath, 'utf8');
    priceDb = JSON.parse(dbContent);
    log(`价格数据库已加载，包含 ${Object.keys(priceDb).length} 个项目`);
  } else {
    log(`未找到价格数据库文件 ${config.priceDbPath}，使用默认数据`);
    // 确保data目录存在
    if (!fs.existsSync('./data')) {
      fs.mkdirSync('./data', { recursive: true });
    }
    // 保存默认数据库
    fs.writeFileSync(config.priceDbPath, JSON.stringify(priceDb, null, 2), 'utf8');
    log(`已创建默认价格数据库文件`);
  }
} catch (error) {
  log(`加载价格数据库失败: ${error.message}`, 'error');
}

// 模拟OCR识别函数
function mockOCR(imageUrl) {
  log(`执行模拟OCR识别: ${imageUrl}`);
  
  // 基于URL或其他特征返回模拟的识别结果
  // 实际实现中，这里应该调用真实的OCR服务
  const mockTexts = [
    "E2E-X3D1-N M12X1 SENSOR",
    "TL-W5MC1 E3Z-LS63 PHOTOELECTRIC",
    "CN-13 SRT2-OD08 CONTROLLER",
    "M12X1 E2E-X3D1-N TL-W5MC1",
    "E3Z-LS63 SRT2-OD08"
  ];
  
  // 随机选择一个模拟结果，模拟不同图片的识别
  const randomIndex = Math.floor(Math.random() * mockTexts.length);
  return mockTexts[randomIndex];
}

// 从文本中提取型号并匹配价格
function analyzeTextForQuotes(text) {
  log(`分析文本: ${text}`);
  
  const matchedItems = [];
  let totalValue = 0;
  
  // 遍历价格数据库，查找文本中匹配的型号
  for (const [model, info] of Object.entries(priceDb)) {
    // 简单的包含匹配，实际可以使用更复杂的正则表达式
    if (text.includes(model)) {
      // 尝试提取数量，默认1
      let quantity = 1;
      
      // 这里可以添加更复杂的数量提取逻辑
      // 例如通过正则表达式查找型号附近的数字
      
      const itemTotal = info.price * quantity;
      totalValue += itemTotal;
      
      matchedItems.push({
        model: model,
        brand: info.brand,
        price: info.price,
        unit: info.unit,
        qty: quantity,
        total: itemTotal
      });
      
      log(`找到匹配: ${model} - ${info.price} ${info.unit}`);
    }
  }
  
  // 按价格降序排序
  matchedItems.sort((a, b) => b.price - a.price);
  
  return {
    matched: matchedItems,
    summary: {
      total_items: matchedItems.length,
      total_value: parseFloat(totalValue.toFixed(2))
    }
  };
}

// 处理/status路由
function handleStatus(req, res) {
  const response = {
    ai_ok: true,
    timestamp: new Date().toISOString(),
    service_name: 'JEV Local AI Service',
    version: '1.0.0',
    price_db_items: Object.keys(priceDb).length
  };
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(response));
  log('返回状态信息');
}

// 处理/analyze-image路由
async function handleAnalyzeImage(req, res) {
  const startTime = Date.now();
  
  try {
    // 读取请求体
    let body = '';
    await new Promise((resolve, reject) => {
      req.on('data', chunk => body += chunk);
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    // 解析JSON
    const data = JSON.parse(body);
    const imageUrl = data.image_url;
    
    if (!imageUrl) {
      throw new Error('Missing image_url parameter');
    }
    
    // 1. 执行OCR识别
    const recognizedText = mockOCR(imageUrl);
    
    // 2. 分析识别结果并匹配价格
    const quoteResult = analyzeTextForQuotes(recognizedText);
    
    // 3. 计算处理时间
    const processingTime = `${(Date.now() - startTime) / 1000}s`;
    
    // 4. 构造响应
    const response = {
      success: true,
      recognized_text: recognizedText,
      matched: quoteResult.matched,
      summary: quoteResult.summary,
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(response));
    
    log(`图像分析完成: 识别文本长度=${recognizedText.length}, 匹配项目=${quoteResult.matched.length}`);
  } catch (error) {
    log(`图像分析错误: ${error.message}`, 'error');
    
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      success: false,
      error: error.message,
      recognized_text: '',
      matched: [],
      summary: { total_items: 0, total_value: 0 },
      processing_time: `${(Date.now() - startTime) / 1000}s`
    }));
  }
}

// 日志函数
function log(message, level = 'info') {
  const levels = { info: 0, warn: 1, error: 2 };
  const currentLevel = levels[config.logLevel] || 0;
  
  if (levels[level] >= currentLevel) {
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
  }
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  log(`收到请求: ${req.method} ${pathname}`);
  
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }
  
  // 路由处理
  if (pathname === '/status') {
    handleStatus(req, res);
  } else if (pathname === '/analyze-image' && req.method === 'POST') {
    handleAnalyzeImage(req, res);
  } else {
    res.writeHead(404, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ error: 'Not Found' }));
    log(`未找到路由: ${pathname}`, 'warn');
  }
});

// 启动服务器
server.listen(config.port, () => {
  log(`JEV 本地AI服务已启动，监听端口 ${config.port}`);
  log(`可用路由:`);
  log(`  GET  /status - 服务状态检查`);
  log(`  POST /analyze-image - 图像分析与报价`);
});

// 处理服务器错误
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    log(`错误: 端口 ${config.port} 已被占用，请检查是否有其他实例在运行`, 'error');
  } else {
    log(`服务器错误: ${error.message}`, 'error');
  }
  process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
  log('正在关闭服务器...');
  server.close(() => {
    log('服务器已关闭');
    process.exit(0);
  });
});