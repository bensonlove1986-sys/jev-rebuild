# JEV L9.7 智能图片匹配引擎（Image Match Engine）

## 📋 任务概述

开发JEV系统的智能图片匹配引擎，实现从产品图片自动识别型号、匹配数据库并返回完整报价信息的端到端功能。该模块是JEV系统的核心智能化组件，能够实现"客户发图 → 系统自动识别 → 自动匹配报价 + 附图"的全自动化流程。

## 🎯 核心目标

1. 开发`/match-image` API接口，接收图片URL作为输入
2. 调用本地AI服务识别图片中的产品型号文字
3. 在价格数据库中匹配最相似的产品型号
4. 获取对应的产品图片URL（从R2存储）
5. 返回完整的匹配结果，包括型号、品牌、相似度、价格等信息
6. 记录匹配日志以便后续分析和优化

## 🔧 技术方案

### 📡 接口设计

**接口路径**：`/match-image`
**请求方法**：POST
**请求格式**：JSON
**请求体**：
```json
{
  "image_url": "https://cdn.jevshop.com/uploads/customer_photo_01.jpg"
}
```

### 🧠 实现逻辑

1. **接收请求**：验证`image_url`参数是否存在
2. **AI识别**：调用本地AI服务（1822端口）分析图片内容
3. **文本清洗**：对识别结果进行标准化处理，只保留大写字母、数字和连字符
4. **数据库查询**：从KV存储中读取价格数据库和图片映射关系
5. **相似度匹配**：使用字符相似度算法找到最佳匹配项
6. **结果整合**：将识别信息、匹配结果和产品图片URL组合成完整响应
7. **日志记录**：将匹配结果写入日志KV存储

### 💾 数据存储结构

**使用的KV存储键**：
- `price_db`: 存储产品价格信息（型号、品牌、单价、货币）
- `product_image_map`: 存储型号到产品图片URL的映射关系
- `log:match:YYYY-MM-DD`: 存储每日匹配日志

### 🖼️ 本地AI服务要求

本地AI服务（运行在1822端口）需要提供`/analyze`接口，返回格式如下：
```json
{
  "text": "E2EX3D1N OMRON SENSOR",
  "confidence": 0.97
}
```

## 📝 完整代码实现

```js
// === /match-image: 智能图片识别匹配模块 ===

if (path === "/match-image" && request.method === "POST") {
  const body = await request.json();
  const imageUrl = body.image_url;
  if (!imageUrl) return json({ success: false, error: "Missing image_url" }, 400);

  const result = await matchImageToProduct(env, imageUrl);
  return json(result, 200);
}

// === 核心逻辑 ===
async function matchImageToProduct(env, imageUrl) {
  // Step 1️⃣ 调用本地 AI 识别图片
  let aiData = {};
  try {
    const aiRes = await fetch("http://localhost:1822/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    });
    aiData = await aiRes.json();
  } catch (err) {
    return { success: false, error: "AI service unreachable", details: err.message };
  }

  const recognized = (aiData.text || "").toUpperCase();
  if (!recognized) return { success: false, error: "No text detected" };

  // Step 2️⃣ 清洗识别文本
  const clean = recognized.replace(/[^A-Z0-9\-]/g, "");

  // Step 3️⃣ 读取数据库
  const db = await env.JEVPI.get("price_db", { type: "json" }) || [];
  const imageMap = await env.JEVPI.get("product_image_map", { type: "json" }) || {};

  // Step 4️⃣ 匹配逻辑
  let bestItem = null, bestScore = 0;
  for (const item of db) {
    const model = item.Model.toUpperCase();
    const score = getSimilarity(clean, model);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  // Step 5️⃣ 拼接结果
  const matchedModel = bestItem?.Model || null;
  const matchedBrand = bestItem?.Brand || null;
  const matchedPrice = bestItem?.BasePrice || null;
  const matchedCurrency = bestItem?.Currency || "USD";
  const matchedImage = imageMap[matchedModel] || null;

  const similarityPct = (bestScore * 100).toFixed(1);
  const highConfidence = bestScore > 0.8;

  // Step 6️⃣ 构造响应
  const result = {
    success: true,
    recognized_text: recognized,
    matched_model: matchedModel,
    brand: matchedBrand,
    similarity: similarityPct,
    price: matchedPrice,
    currency: matchedCurrency,
    image_url: matchedImage,
    source_image: imageUrl,
    high_confidence: highConfidence
  };

  // Step 7️⃣ 写入日志
  const logKey = `log:match:${new Date().toISOString().split("T")[0]}`;
  const prevLogs = await env.JEVPI.get(logKey, { type: "json" }) || [];
  prevLogs.push(result);
  await env.JEVPI.put(logKey, JSON.stringify(prevLogs));

  return result;
}

// === 简易相似度算法 ===
function getSimilarity(a, b) {
  if (!a || !b) return 0;
  const s1 = new Set(a);
  const s2 = new Set(b);
  const inter = [...s1].filter(x => s2.has(x));
  return inter.length / Math.max(s1.size, s2.size);
}

// === 响应封装 ===
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

## 📊 匹配结果示例

**请求**：
```json
POST /match-image
{
  "image_url": "https://cdn.jevshop.com/uploads/customer_photo_01.jpg"
}
```

**响应**：
```json
{
  "success": true,
  "recognized_text": "E2EX3D1N OMRON",
  "matched_model": "E2E-X3D1-N",
  "brand": "OMRON",
  "similarity": "96.7",
  "price": 3.6,
  "currency": "USD",
  "image_url": "https://cdn.jevshop.com/products/E2E-X3D1-N.jpg",
  "source_image": "https://cdn.jevshop.com/uploads/customer_photo_01.jpg",
  "high_confidence": true
}
```

## 🚀 测试流程

1. 上传标准产品图片到`jevproductimage`存储桶
2. 在KV存储中导入`price_db`和`product_image_map`数据
3. 使用curl命令测试接口：
   ```bash
   curl -X POST "https://jevshop.bensonlove1986.workers.dev/match-image" \
     -H "Content-Type: application/json" \
     -d '{"image_url":"https://cdn.jevshop.com/uploads/test_photo.jpg"}'
   ```
4. 验证响应中的关键字段：`matched_model`、`similarity`、`image_url`等

## 🔄 未来扩展方向

1. 与`/auto-quote`接口集成，实现自动报价功能
2. 与`/send-image`接口集成，自动向客户发送匹配到的产品图片
3. 优化相似度算法，提高匹配准确率
4. 添加多模型识别支持，提高复杂图片的识别率
5. 实现置信度阈值可配置，适应不同场景需求

## 📈 完整工作流程

```
客户发图片
    ↓
JEV Worker接收请求
    ↓
调用本地AI服务识别文字
    ↓
文字清洗与标准化
    ↓
在price_db中匹配最相似型号
    ↓
从product_image_map获取产品图URL
    ↓
构造完整响应（型号、品牌、价格、图片URL）
    ↓
记录匹配日志
    ↓
返回匹配结果
    ↓
（可选）自动调用auto-quote生成报价
    ↓
（可选）自动调用send-image发送产品图
```

## 🎯 业务价值

- **自动化程度提升**：从图片到报价的全流程自动化，减少人工干预
- **响应速度提高**：毫秒级图片识别与匹配，客户等待时间大幅缩短
- **准确性保障**：相似度评分机制确保匹配质量，低置信度结果可人工复核
- **客户体验优化**："发图即得报价+产品图"的便捷体验，提升转化率
- **数据积累**：匹配日志为后续优化提供数据支持

---

**任务优先级**: 高

**预计完成时间**: 2个工作日

**依赖项**:
- 本地AI服务（1822端口）
- JEVPI KV存储（包含price_db和product_image_map）
- R2存储桶jevproductimage