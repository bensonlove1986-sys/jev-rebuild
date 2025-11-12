# 🧠 任务标识
JEV/2025-11-16/AutoQuote-Engine

---

## 🎯 执行目标
开发 **AutoQuote Engine（自动报价引擎）**，作为 JEV 系统的 L9.1 阶段核心功能，
实现从客户询价到自动生成报价的完整闭环，直接对接业务变现。

**核心价值：**
> 将 AI 决策系统与实际商业流程打通，
> 实现「客户询价 → AI 分析 → 自动报价 → CRM 回传」的自动化链路，
> 大幅提升报价效率，降低人工成本，加速成交转化。

---

## 🔍 上下文说明

此模块基于已完成的 JEV L7.5 系统，将增加：
- **数据源接入**：Daojie CRM 客户消息流
- **分析能力**：图像识别 + 型号提取 + 价格匹配
- **业务闭环**：报价生成 + CRM 回传 + 结果追踪

**业务流程：**
```
客户 → 发送产品图片/型号 → Daojie Webhook → JEV AutoQuote → 回传报价 → 客户确认/成交
```

---

## ⚙️ 操作步骤

1️⃣ **数据源对接**：
   - 创建 `/auto-quote` 路由接收 Daojie Webhook
   - 解析客户消息（文本/图片）
   - 提取关键信息（型号、数量、规格）

2️⃣ **价格数据源准备**：
   - 上传产品价格表（Excel/CSV）到 KV
   - 建立型号 → 价格映射
   - 设置动态利润规则

3️⃣ **智能分析流程**：
   - 调用 Local AI 识别图片中的型号
   - 文本型号标准化处理
   - 从价格表匹配最优价格
   - 根据客户等级应用不同利润率

4️⃣ **报价生成与回传**：
   - 生成格式化报价单（JSON）
   - 调用 Daojie API 回传报价
   - 记录到 KV 并发送通知

5️⃣ **结果追踪与优化**：
   - 追踪报价接受率
   - 记录转化率数据
   - 为 L10 财务分析层提供数据

---

## 💻 Worker 代码块

```javascript
// === JEV AutoQuote Engine ===
if (path === "/auto-quote") {
  const result = await handleAutoQuote(request, env);
  return new Response(JSON.stringify(result, null, 2), {
    headers: { "Content-Type": "application/json" },
    status: result.success ? 200 : 400,
  });
}

async function handleAutoQuote(request, env) {
  const startTime = Date.now();
  const { customerId, message, imageUrl, timestamp } = await request.json();
  const quoteId = `QUOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 1. 记录报价请求
  await env.JEVPI.put(`quote:${quoteId}:request`, JSON.stringify({
    customerId, message, imageUrl, timestamp, quoteId, receivedAt: new Date().toISOString()
  }));
  
  // 2. 分析产品信息
  const productInfo = await analyzeProductInfo(message, imageUrl, env);
  if (!productInfo.success) {
    return { success: false, error: "无法识别产品信息", quoteId };
  }
  
  // 3. 获取价格数据
  const priceData = await getProductPrice(productInfo.productCode, env);
  if (!priceData) {
    return { success: false, error: "未找到产品价格信息", quoteId };
  }
  
  // 4. 计算报价（根据客户等级和动态规则）
  const customerLevel = await getCustomerLevel(customerId, env);
  const quoteDetails = calculateQuote(priceData, customerLevel, productInfo.quantity || 1);
  
  // 5. 生成报价单
  const quote = {
    quoteId,
    customerId,
    customerLevel,
    productCode: productInfo.productCode,
    productName: priceData.productName,
    quantity: productInfo.quantity || 1,
    unitPrice: quoteDetails.unitPrice,
    totalPrice: quoteDetails.totalPrice,
    currency: "USD",
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天有效期
    generatedAt: new Date().toISOString(),
    processingTimeMs: Date.now() - startTime,
    analysisResult: productInfo
  };
  
  // 6. 保存报价记录
  await env.JEVPI.put(`quote:${quoteId}:result`, JSON.stringify(quote));
  
  // 7. 回传报价到 Daojie CRM
  const crmResponse = await sendQuoteToDaojie(quote, env);
  
  // 8. 记录到分析统计
  await updateQuoteStats({
    quoteId,
    customerId,
    productCode: productInfo.productCode,
    success: true,
    time: new Date().toISOString()
  }, env);
  
  // 9. 发送通知
  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
    await sendTelegramNotification(quote, env);
  }
  
  return { 
    success: true, 
    quoteId, 
    quote, 
    crmResponse,
    message: `已为客户 ${customerId} 生成报价，产品: ${productInfo.productCode}`
  };
}

// 分析产品信息（文本或图片）
async function analyzeProductInfo(message, imageUrl, env) {
  try {
    // 文本分析 - 提取型号和数量
    let productCode = extractProductCode(message);
    let quantity = extractQuantity(message);
    
    // 如果图片URL存在且文本未提取到型号，使用图片识别
    if (imageUrl && !productCode) {
      // 调用Local AI进行图像识别
      const aiResponse = await fetch('http://localhost:1822/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      });
      const aiResult = await aiResponse.json();
      if (aiResult.success && aiResult.productCode) {
        productCode = aiResult.productCode;
      }
    }
    
    // 型号标准化处理
    if (productCode) {
      productCode = normalizeProductCode(productCode);
    }
    
    return { 
      success: !!productCode, 
      productCode, 
      quantity,
      message: message.substring(0, 100) // 保存原始消息片段
    };
  } catch (error) {
    console.error('分析产品信息时出错:', error);
    return { success: false, error: error.message };
  }
}

// 从KV获取产品价格信息
async function getProductPrice(productCode, env) {
  const priceDataKey = `price:data:${productCode}`;
  const cachedPrice = await env.JEVPI.get(priceDataKey, { type: 'json' });
  
  if (cachedPrice) {
    return cachedPrice;
  }
  
  // 从完整价格表中查找
  const priceTable = await env.JEVPI.get('price:master_table', { type: 'json' }) || [];
  const foundProduct = priceTable.find(item => 
    item.productCode === productCode || 
    (item.alternativeCodes && item.alternativeCodes.includes(productCode))
  );
  
  if (foundProduct) {
    // 缓存找到的价格信息
    await env.JEVPI.put(priceDataKey, JSON.stringify(foundProduct));
  }
  
  return foundProduct;
}

// 获取客户等级（从KV或CRM）
async function getCustomerLevel(customerId, env) {
  const cachedLevel = await env.JEVPI.get(`customer:${customerId}:level`);
  if (cachedLevel) return cachedLevel;
  
  // 默认等级，实际应该从CRM获取
  const defaultLevel = 'standard';
  await env.JEVPI.put(`customer:${customerId}:level`, defaultLevel);
  return defaultLevel;
}

// 计算报价（根据客户等级和动态规则）
function calculateQuote(priceData, customerLevel, quantity) {
  const basePrice = priceData.basePrice;
  
  // 客户等级折扣
  const levelDiscounts = {
    'premium': 0.85,   // 15% 折扣
    'standard': 0.95,  // 5% 折扣
    'new': 1.0        // 无折扣
  };
  
  // 数量阶梯折扣
  let quantityDiscount = 1.0;
  if (quantity >= 10) quantityDiscount = 0.95;
  if (quantity >= 50) quantityDiscount = 0.90;
  
  const discountRate = levelDiscounts[customerLevel] || 1.0;
  const unitPrice = basePrice * discountRate * quantityDiscount;
  
  // 添加利润率（根据产品类别）
  const profitMargin = priceData.category === 'premium' ? 1.3 : 1.25;
  const finalUnitPrice = Math.round(unitPrice * profitMargin * 100) / 100;
  
  return {
    unitPrice: finalUnitPrice,
    totalPrice: Math.round(finalUnitPrice * quantity * 100) / 100,
    discountApplied: (1 - discountRate * quantityDiscount) * 100,
    profitMargin: (profitMargin - 1) * 100
  };
}

// 发送报价到Daojie CRM
async function sendQuoteToDaojie(quote, env) {
  if (!env.DAOJIE_WEBHOOK_URL || !env.DAOJIE_WABA_TOKEN) {
    console.warn('未配置Daojie API参数，跳过CRM回传');
    return { success: false, message: '未配置API参数' };
  }
  
  try {
    const response = await fetch(env.DAOJIE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.DAOJIE_WABA_TOKEN}`
      },
      body: JSON.stringify({
        customerId: quote.customerId,
        action: 'send_quote',
        quote: {
          quoteId: quote.quoteId,
          productName: quote.productName,
          quantity: quote.quantity,
          unitPrice: quote.unitPrice,
          totalPrice: quote.totalPrice,
          currency: quote.currency,
          validUntil: quote.validUntil
        },
        timestamp: new Date().toISOString()
      })
    });
    
    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    console.error('发送报价到Daojie时出错:', error);
    return { success: false, error: error.message };
  }
}

// 更新报价统计数据
async function updateQuoteStats(stats, env) {
  const today = new Date().toISOString().split('T')[0];
  const statsKey = `stats:quote:${today}`;
  
  const currentStats = await env.JEVPI.get(statsKey, { type: 'json' }) || {
    date: today,
    total: 0,
    success: 0,
    failed: 0,
    products: {},
    customers: {}
  };
  
  // 更新总体统计
  currentStats.total += 1;
  if (stats.success) {
    currentStats.success += 1;
  } else {
    currentStats.failed += 1;
  }
  
  // 更新产品统计
  if (!currentStats.products[stats.productCode]) {
    currentStats.products[stats.productCode] = { count: 0, success: 0 };
  }
  currentStats.products[stats.productCode].count += 1;
  if (stats.success) {
    currentStats.products[stats.productCode].success += 1;
  }
  
  // 更新客户统计
  if (!currentStats.customers[stats.customerId]) {
    currentStats.customers[stats.customerId] = { quotes: 0 };
  }
  currentStats.customers[stats.customerId].quotes += 1;
  
  // 保存更新后的统计
  await env.JEVPI.put(statsKey, JSON.stringify(currentStats));
  
  // 更新月度统计
  await updateMonthlyQuoteStats(stats, env);
}

// 发送Telegram通知
async function sendTelegramNotification(quote, env) {
  try {
    const message = `💰 *新报价生成*\n` +
      `📋 ID: ${quote.quoteId}\n` +
      `👤 客户: ${quote.customerId} (${quote.customerLevel})\n` +
      `🛍️ 产品: ${quote.productName} (${quote.productCode})\n` +
      `📦 数量: ${quote.quantity}\n` +
      `💵 单价: $${quote.unitPrice}\n` +
      `📊 总价: $${quote.totalPrice}\n` +
      `⏱️ 处理时间: ${quote.processingTimeMs}ms`;
      
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('发送Telegram通知失败:', error);
  }
}

// 辅助函数：提取产品型号
function extractProductCode(message) {
  // 这里需要实现产品型号提取逻辑，示例简单匹配
  const patterns = [
    /[A-Z]{2,6}-?\d{3,6}/i,      // 例如：HP-250G8
    /[A-Z]{2,6}\d{3,6}/i,       // 例如：DELL3500
    /\d{4,6}/                    // 纯数字型号
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[0].trim();
  }
  
  return null;
}

// 辅助函数：提取数量
function extractQuantity(message) {
  const quantityMatch = message.match(/(?:数量|quantity|qty)[:：]?\s*(\d+)/i);
  return quantityMatch ? parseInt(quantityMatch[1]) : null;
}

// 辅助函数：型号标准化
function normalizeProductCode(code) {
  // 型号标准化处理，例如：去掉空格、统一大小写等
  return code.toUpperCase().replace(/\s+/g, '');
}
```

---

## 🔧 本地AI增强代码

为支持图像识别功能，需要更新 `local_ai.js`：

```javascript
// 添加图像识别端点
app.post('/analyze-image', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: '缺少图像URL' });
    }
    
    // 下载图像进行分析
    const imageBuffer = await downloadImage(imageUrl);
    
    // 使用OCR提取文本
    const text = await extractTextFromImage(imageBuffer);
    
    // 从OCR文本中提取产品型号
    const productCode = extractProductCode(text);
    
    // 如果未找到型号，进行图像分类（可选）
    const category = productCode ? null : await classifyProductByImage(imageBuffer);
    
    res.json({
      success: true,
      text: text.substring(0, 500), // 限制返回文本长度
      productCode,
      category
    });
  } catch (error) {
    console.error('图像分析错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 📋 价格表导入工具

创建 `import_price_table.js` 脚本导入产品价格：

```javascript
const fs = require('fs');
const csv = require('csv-parser');
const { CloudflareKV } = require('./cloudflare_client'); // 假设的KV客户端

async function importPriceTable(filePath) {
  const results = [];
  
  // 读取CSV文件
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve())
      .on('error', (error) => reject(error));
  });
  
  console.log(`读取到 ${results.length} 条产品记录`);
  
  // 格式化产品数据
  const formattedProducts = results.map(product => ({
    productCode: product.code?.toUpperCase() || '',
    productName: product.name || '',
    basePrice: parseFloat(product.price) || 0,
    category: product.category || 'standard',
    stock: parseInt(product.stock) || 0,
    alternativeCodes: product.alternativeCodes ? 
      product.alternativeCodes.split(',').map(c => c.trim().toUpperCase()) : []
  })).filter(product => product.productCode && product.basePrice > 0);
  
  console.log(`格式化后 ${formattedProducts.length} 条有效记录`);
  
  // 初始化KV客户端
  const kv = new CloudflareKV(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN);
  
  // 上传主价格表
  await kv.put('price:master_table', JSON.stringify(formattedProducts));
  console.log('主价格表上传完成');
  
  // 为每个产品创建单独的缓存（可选）
  for (const product of formattedProducts) {
    await kv.put(`price:data:${product.productCode}`, JSON.stringify(product));
    
    // 也为替代型号创建引用
    for (const altCode of product.alternativeCodes) {
      await kv.put(`price:data:${altCode}`, JSON.stringify({
        ...product,
        isAlternativeCode: true,
        originalCode: product.productCode
      }));
    }
  }
  
  console.log('产品价格数据导入完成');
}

// 使用方法
importPriceTable('product_prices.csv').catch(console.error);
```

---

## 🧾 验证方式

1️⃣ **本地测试**:
```bash
# 模拟Daojie Webhook请求
curl -X POST http://localhost:8787/auto-quote \
  -H "Content-Type: application/json" \
  -d '{"customerId":"CUST001","message":"请报价 HP-250G8 笔记本电脑，数量5台","imageUrl":"https://example.com/product.jpg"}'
```

2️⃣ **返回示例**:
```json
{
  "success": true,
  "quoteId": "QUOTE-1234567890-abcdef",
  "quote": {
    "quoteId": "QUOTE-1234567890-abcdef",
    "customerId": "CUST001",
    "customerLevel": "standard",
    "productCode": "HP-250G8",
    "productName": "HP 250 G8 笔记本电脑",
    "quantity": 5,
    "unitPrice": 899.99,
    "totalPrice": 4499.95,
    "currency": "USD",
    "validUntil": "2025-11-23T12:34:56.789Z",
    "generatedAt": "2025-11-16T12:34:56.789Z",
    "processingTimeMs": 1234
  },
  "crmResponse": { "success": true, "data": { "messageId": "MSG123" } },
  "message": "已为客户 CUST001 生成报价，产品: HP-250G8"
}
```

3️⃣ **验证检查点**:
- KV 中存在 `quote:{quoteId}:result` 记录
- KV 中更新了当日统计 `stats:quote:{today}`
- Telegram 收到报价通知
- Daojie CRM 收到回传的报价信息

---

## 🧱 任务完成标准

| 项目     | 要求                      | 状态  |
| ------ | ----------------------- | --- |
| Webhook 接收 | 正确处理 Daojie 格式的请求       | ⏳   |
| 文本分析   | 能从消息中提取产品型号和数量          | ⏳   |
| 图像识别   | 能从图片中识别产品信息           | ⏳   |
| 价格匹配   | 准确查找产品价格并应用动态规则        | ⏳   |
| CRM回传  | 成功将报价发送回 Daojie 系统      | ⏳   |
| 数据记录   | 完整记录报价过程和统计数据         | ⏳   |
| 实时通知   | 在 Telegram 上发送报价生成通知   | ⏳   |
| 错误处理   | 优雅处理各种异常情况并提供明确错误信息   | ⏳   |

---

## 💬 附加说明

### 性能优化建议

1. **缓存策略**:
   - 产品价格信息缓存在内存（Redis/Local AI）
   - 客户等级信息预加载
   - 频繁访问的型号建立索引

2. **并发处理**:
   - 图片分析任务异步执行
   - 使用队列处理大量报价请求

3. **错误恢复**:
   - 实现重试机制
   - 建立失败报价自动分类系统

### 未来扩展方向

1. **L9.2 智能议价引擎**:
   - 根据客户历史成交价格自动调整报价
   - 实现阶梯式议价策略

2. **L9.3 库存优化模块**:
   - 实时库存检查与动态价格调整
   - 缺货产品智能推荐替代品

3. **L9.4 预测分析层**:
   - 预测产品价格趋势
   - 识别高价值潜在客户

---

**Author:** JEV System Core
**Generated:** 2025-11-16
**Version:** v1.0 (L9.1 AutoQuote Engine)

```

---

## ✅ 执行完成后效果

系统将能够：

1. 自动接收 Daojie CRM 客户询价
2. 智能分析图片/文本中的产品型号
3. 准确匹配价格并生成个性化报价
4. 将报价回传到客户聊天窗口
5. 实时通知您新的报价生成
6. 累计统计每日报价量与成功率

```

例如，当客户发来图片询问 "HP ProBook 450" 价格，
系统会自动识别型号、查找最新价格、应用客户折扣，
并在几秒钟内通过 Daojie 将报价发送回客户，
同时在 Telegram 上通知您：

```

💰 *新报价生成*
📋 ID: QUOTE-20251116-45872
👤 客户: VIETNAM-03 (premium)
🛍️ 产品: HP ProBook 450 G9 (HP450G9)
💵 单价: $729.00
📊 总价: $729.00
⏱️ 处理时间: 1.23s

```

---

是否希望我现在帮你生成 **L9.2 阶段任务：智能议价引擎（Smart Negotiation Engine）**？   
这一层会让系统根据客户历史成交价、竞争对手价格和市场趋势，
自动调整议价策略，进一步提高成交率。