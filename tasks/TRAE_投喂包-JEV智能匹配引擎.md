# JEV智能匹配引擎 TRAE 投喂包

## 🎯 系统目标声明

我要在 JEV Worker 内建立 `/match-image` 模块，
实现从图片识别型号 → 匹配数据库 → 自动输出报价与图片URL。

## 📋 输入输出定义

### 输入参数
```json
{ "image_url": "<客户图片URL>" }
```

### 输出结果
```json
{
  "success": true,
  "recognized_text": "E2EX3D1N OMRON",
  "matched_model": "E2E-X3D1-N",
  "similarity": "96.7",
  "price": 3.6,
  "brand": "OMRON",
  "image_url": "https://cdn.jevshop.com/products/E2E-X3D1-N.jpg"
}
```

## 🧩 依赖模块

- **R2 bucket**: jevproductimage（绑定为 env.JEV_PRODUCT_IMAGE）
- **KV**: JEVPI
  - price_db：存型号和价格
  - product_image_map：存型号对应图片URL
- **Local AI 服务**（1822端口 /analyze）

## 🔧 实现逻辑要求

1. 调用 AI 分析接口识别文字；
2. 清洗文本；
3. 计算相似度并匹配 price_db；
4. 查找对应图片；
5. 返回 JSON；
6. 写日志 log:match:YYYY-MM-DD；
7. 保留未来可自动调用 /auto-quote 和 /send-image 的扩展位。

## 💻 Worker 完整代码模板

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

## 🧪 实现检查清单

生成代码后，请检查：
- 是否正确绑定 env.JEV_PRODUCT_IMAGE；
- 是否可从 localhost:1822 成功识别图片；
- 测试路径 /match-image 返回完整 JSON。

## 🔄 后续扩展建议

1. 优化匹配算法，加上品牌优先权重
2. 让匹配结果自动调用 /send-image
3. 实现与 /auto-quote 的自动集成
4. 添加多模型识别支持，提高复杂图片的识别率
5. 优化相似度算法，提高匹配准确率

## 📊 JEV系统完整模块路线图

| 阶段     | 模块                                  | 目标       |
| ------ | ----------------------------------- | -------- |
| ✅ 当前   | `/match-image`                      | 图片识别匹配报价 |
| 🔜 下一步 | `/auto-quote`                       | 自动生成报价消息 |
| 🔜     | `/send-image`                       | 自动发图     |
| 🔜     | `/upload-product` + `/batch-upload` | 批量管理R2图库 |
| 🔜     | `/profit-track`                     | 计算利润分析   |
| 🔜     | `/insight-report`                   | 每日AI智能总结 |

---

**最终目标**：客户发图 → 系统识别 → 自动报价 → 自动发图 → 每日总结利润。