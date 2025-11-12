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

## 🧠 五、核心 Worker 逻辑

```js
if (path === "/match-image" && request.method === "POST") {
  const body = await request.json();
  const imageUrl = body.image_url;
  if (!imageUrl) return json({ success: false, error: "Missing image_url" }, 400);
  const result = await matchImageToProduct(env, imageUrl);
  return json(result, 200);
}

async function matchImageToProduct(env, imageUrl) {
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

  const clean = recognized.replace(/[^A-Z0-9\-]/g, "");
  const db = await env.JEVPI.get("price_db", { type: "json" }) || [];
  const imageMap = await env.JEVPI.get("product_image_map", { type: "json" }) || [];

  let bestItem = null, bestScore = 0;
  for (const item of db) {
    const model = item.Model.toUpperCase();
    const score = getSimilarity(clean, model);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

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

  const logKey = `log:match:${new Date().toISOString().split("T")[0]}`;
  const prevLogs = await env.JEVPI.get(logKey, { type: "json" }) || [];
  prevLogs.push(result);
  await env.JEVPI.put(logKey, JSON.stringify(prevLogs));
  return result;
}

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

## 🔗 六、扩展模块（未来接入）

| 模块                | 功能              |
| ----------------- | --------------- |
| `/auto-quote`     | 当相似度 > 80% 自动报价 |
| `/send-image`     | 发送产品图           |
| `/batch-upload`   | 批量管理产品图库        |
| `/profit-track`   | 自动利润分析          |
| `/insight-report` | AI智能日报生成        |

---

## 🧾 七、测试方式

```bash
curl -X POST "`https://jevshop.bensonlove1986.workers.dev/match-image`"
  -H "Content-Type: application/json"
  -d '{"image_url":"`https://cdn.jevshop.com/uploads/test_photo.jpg`"}'
```

---

## 🧠 八、执行指令（给 TRAE）

> **请执行以下操作：**
>
> 1. 创建 `/match-image` 接口；
> 2. 确认 env.JEV_PRODUCT_IMAGE 已绑定 jevproductimage；
> 3. 确认 Local AI 1822 端口服务可访问；
> 4. 导入 `price_db` 与 `product_image_map`；
> 5. 测试接口返回完整JSON；
> 6. 记录日志到 KV；
> 7. 保留 `/auto-quote` 与 `/send-image` 扩展位。

---

## ✅ 九、完成后效果

* AI 从图片识别出型号；
* 匹配产品库；
* 自动生成价格；
* 附带标准图片；
* 写入日志；
* 一步扩展即能发图报价。