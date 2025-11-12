# 🧠 **TRAE 投喂包：JEV AI 自动识别与报价系统 Blueprint**

**作者：** JEV System Core
**目标：** 构建完整的「客户发图 → AI识别 → 自动报价 → 自动发图」闭环系统
**运行环境：** Cloudflare Worker + R2 + KV + Local AI (1822端口)

---

## 🚀 一、系统总体目标

请你（TRAE）为我构建以下功能模块，部署在 Cloudflare Worker 中。
整体逻辑如下：

```
客户发图 (WhatsApp / Daojie)
        ↓
Worker 接口 /match-image
        ↓
本地 AI (1822端口 /analyze) 识别图像文本
        ↓
KV 读取 price_db（价格数据库）
        ↓
AI 匹配型号、品牌、价格
        ↓
从 R2 图库 jevproductimage 中取图片
        ↓
输出匹配结果 JSON（或直接发图报价）
```

---

## ⚙️ 二、系统依赖模块

| 模块              | 用途      | 环境绑定                                                          |
| --------------- | ------- | ------------------------------------------------------------- |
| Cloudflare KV   | 数据存储    | `JEVPI`                                                       |
| Cloudflare R2   | 图片存储    | `JEV_PRODUCT_IMAGE`（bucket: `jevproductimage`）                |
| Local AI 服务     | 识别与文本提取 | `http://localhost:1822/analyze`                               |
| Daojie WABA API | 发图与自动回复 | `https://services.leadconnectorhq.com/conversations/messages` |

---

## 🧩 三、关键数据库说明

### 1️⃣ `price_db`

| Model      | Brand    | BasePrice | Currency |
| ---------- | -------- | --------- | -------- |
| E2E-X3D1-N | OMRON    | 3.6       | USD      |
| MU12X30SB  | AUTONICS | 2.8       | USD      |

### 2️⃣ `product_image_map`

| Model      | ImageUrl                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------- |
| E2E-X3D1-N | `https://cdn.jevshop.com/products/E2E-X3D1-N.jpg`  |
| MU12X30SB  | `https://cdn.jevshop.com/products/MU12X30SB.jpg`    |

---

## 💻 四、主要接口说明

### 🧠 `/match-image`

#### 功能：

* 调用 Local AI 服务识别图片；
* 从 `price_db` 匹配最相似型号；
* 从 `product_image_map` 获取对应图；
* 输出识别 + 匹配结果；
* 写入匹配日志 `log:match:YYYY-MM-DD`。

#### 输入：

```json
{
  "image_url": "`https://cdn.jevshop.com/uploads/test_photo.jpg`"
}
```

#### 输出：

```json
{
  "success": true,
  "recognized_text": "E2EX3D1N OMRON",
  "matched_model": "E2E-X3D1-N",
  "brand": "OMRON",
  "similarity": "96.7",
  "price": 3.6,
  "currency": "USD",
  "image_url": "`https://cdn.jevshop.com/products/E2E-X3D1-N.jpg`",
  "source_image": "`https://cdn.jevshop.com/uploads/test_photo.jpg`",
  "high_confidence": true
}
```

---

## 🧠 五、核心 Worker 逻辑（参考模板）

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
  // 调用本地 AI 服务识别图像
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

  // 清洗文本
  const clean = recognized.replace(/[^A-Z0-9\-]/g, "");

  // 读取数据库
  const db = await env.JEVPI.get("price_db", { type: "json" }) || [];
  const imageMap = await env.JEVPI.get("product_image_map", { type: "json" }) || {};

  // 匹配逻辑
  let bestItem = null, bestScore = 0;
  for (const item of db) {
    const model = item.Model.toUpperCase();
    const score = getSimilarity(clean, model);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  // 构造结果
  const matchedModel = bestItem?.Model || null;
  const matchedBrand = bestItem?.Brand || null;
  const matchedPrice = bestItem?.BasePrice || null;
  const matchedCurrency = bestItem?.Currency || "USD";
  const matchedImage = imageMap[matchedModel] || null;

  const similarityPct = (bestScore * 100).toFixed(1);
  const highConfidence = bestScore > 0.8;

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

  // 写入日志
  const logKey = `log:match:${new Date().toISOString().split("T")[0]}`;
  const prevLogs = await env.JEVPI.get(logKey, { type: "json" }) || [];
  prevLogs.push(result);
  await env.JEVPI.put(logKey, JSON.stringify(prevLogs));

  return result;
}

// 相似度算法
function getSimilarity(a, b) {
  if (!a || !b) return 0;
  const s1 = new Set(a);
  const s2 = new Set(b);
  const inter = [...s1].filter(x => s2.has(x));
  return inter.length / Math.max(s1.size, s2.size);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
```

---

## 🧠 六、后续联动模块（保留接口）

| 模块   | 作用               | 接口名             |
| ---- | ---------------- | --------------- |
| 自动报价 | 当相似度 > 80% 时生成报价 | `/auto-quote`   |
| 发图模块 | 自动向客户发送产品图       | `/send-image`   |
| 批量上传 | 管理产品图库           | `/batch-upload` |
| 报价分析 | 分析利润、销售趋势        | `/profit-track` |

---

## 🧾 七、测试流程建议

1️⃣ 上传几张产品图片到 `jevproductimage/products/`
2️⃣ 在 KV 导入 `price_db` 与 `product_image_map`
3️⃣ 启动本地 AI (1822端口)
4️⃣ 执行：

```bash
curl -X POST "`https://jevshop.bensonlove1986.workers.dev/match-image`"
  -H "Content-Type: application/json"
  -d '{"image_url":"`https://cdn.jevshop.com/uploads/test_photo.jpg`"}'
```

5️⃣ 查看返回结果 → 确认匹配逻辑正确。

---

## 💬 八、扩展指令（未来TRA扩展）

* 当匹配结果高于80%，自动执行：

  * `/auto-quote`
  * `/send-image`
* 当匹配低于80%，自动触发人工复核标记：

  ```
  log:match:pending
  ```
