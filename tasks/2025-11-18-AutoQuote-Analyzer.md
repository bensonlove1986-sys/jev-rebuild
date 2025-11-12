# 🧠 任务标识

JEV/2025-11-18/AutoQuote-Analyzer


---

## 🎯 执行目标

实现一个自动报价分析模块 `/quote-analyze`，  
每日自动读取最近 30 天的报价日志（`log:quote:*`），计算：


- 🔝 最热型号 / 品牌  
- 💰 平均利润率  
- 🌍 客户国家分布  
- ⏱️ 响应时间趋势  
- 📈 成交预测与推荐优化策略  


并将分析结果写入：
- `quote_summary:<date>`  
- 同步更新至 `insight_report:<date>` → `"quote_insight"` 字段  


---

## 🔍 上下文说明

此模块基于：
- `log:quote:*` 自动报价记录；
- `insight_report:*` 每日洞察；
- 系统AI（Local AI 或外部API）。


其目标是：  
> 把「行为 → 数据 → 智能策略」转化成  
> "系统知道什么产品卖得好，利润哪天高，客户来自哪里"。


---

## ⚙️ 操作步骤

1️⃣ 新增 `/quote-analyze` 接口；  
2️⃣ 循环读取最近 30 天 `log:quote:*`；  
3️⃣ 提取统计字段：
    - `model`
    - `brand`
    - `unit_price`
    - `total`
    - `currency`
    - `country`（从 Daojie webhook 附带或 KV 补充）；
4️⃣ 聚合分析：
    - Top5 型号
    - 品牌占比
    - 平均利润率（需读取 `price_db` 的 BasePrice 对比）
    - 客户地区分布；
5️⃣ 调用 AI 生成自然语言分析；
6️⃣ 结果写入 `quote_summary:<date>`；
7️⃣ 同步更新 `insight_report:<date>` 的 `"quote_insight"` 字段。  


---

## 💻 Worker 代码模板

```js

// === JEV AutoQuote Analyzer ===

if (path === "/quote-analyze") {

  const result = await runQuoteAnalyzer(env);

  return new Response(JSON.stringify(result, null, 2), {

    headers: { "Content-Type": "application/json" },

    status: 200,

  });

}


async function runQuoteAnalyzer(env) {

  const today = new Date();

  const priceDb = await env.JEVPI.get("price_db", { type: "json" }) || [];

  const quoteLogs = [];


  // 收集最近30天报价日志

  for (let i = 0; i < 30; i++) {

    const d = new Date(today.getTime() - i * 86400000).toISOString().split("T")[0];

    const log = await env.JEVPI.get(`log:quote:${d}`, { type: "json" });

    if (log && log.length) quoteLogs.push(...log.map(q => ({ ...q, date: d })));

  }


  if (!quoteLogs.length) return { success: false, message: "No quote logs found" };


  // 聚合分析

  const modelStats = {};

  const brandStats = {};

  const countryStats = {};

  let totalProfit = 0, totalCount = 0;


  for (const q of quoteLogs) {

    const key = q.model;

    modelStats[key] = (modelStats[key] || 0) + 1;

    brandStats[q.brand] = (brandStats[q.brand] || 0) + 1;

    countryStats[q.country || "Unknown"] = (countryStats[q.country || "Unknown"] || 0) + 1;


    const base = priceDb.find(p => p.Model === q.model);

    if (base) {

      const profit = (q.unit_price - base.BasePrice) / base.BasePrice;

      totalProfit += profit;

      totalCount++;

    }

  }


  const avgProfit = totalCount ? (totalProfit / totalCount * 100).toFixed(2) : "N/A";

  const topModels = Object.entries(modelStats).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topBrands = Object.entries(brandStats).sort((a, b) => b[1] - a[1]).slice(0, 3);


  // AI分析文本

  let aiText = "";

  try {

    const prompt = `

 分析以下报价趋势数据：

 - Top Models: ${JSON.stringify(topModels)}

 - Top Brands: ${JSON.stringify(topBrands)}

 - Avg Profit: ${avgProfit}%

 - Country Stats: ${JSON.stringify(countryStats)}

  

 请用简洁自然语言生成一段分析摘要（约100字），指出最畅销产品、主要市场和利润走势。

     `;

    const aiRes = await fetch("http://localhost:1822/jev/ai-summarize", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ prompt }),

    });

    aiText = await aiRes.text();

  } catch {

    aiText = `系统检测到平均利润率 ${avgProfit}%，主要销售地区 ${Object.keys(countryStats).slice(0,2).join(", ")}。`;

  }


  const summary = {

    date: today.toISOString().split("T")[0],

    topModels,

    topBrands,

    avgProfit,

    countryStats,

    aiSummary: aiText.trim(),

  };


  // 保存分析结果

  await env.JEVPI.put(`quote_summary:${summary.date}`, JSON.stringify(summary));


  // 同步更新 insight_report

  const insight = await env.JEVPI.get(`insight_report:${summary.date}`, { type: "json" }) || {};

  insight.quote_insight = summary;

  await env.JEVPI.put(`insight_report:${summary.date}`, JSON.stringify(insight));


  return { success: true, summary };

}
```


---

## 🧾 验证方式


1️⃣ 上传若干天的报价日志（`log:quote:YYYY-MM-DD`）；
2️⃣ 执行：


```

https://jevshop.bensonlove1986.workers.dev/quote-analyze

```


3️⃣ 返回：


```json

{

  "success": true,

  "summary": {

    "date": "2025-11-18",

    "topModels": [["E2E-X3D1-N", 12], ["MU12X30SB", 8]],

    "avgProfit": "27.4",

    "aiSummary": "过去30天最畅销型号为E2E-X3D1-N，利润稳定，主要市场集中在印度与越南。"

  }

}

```


4️⃣ KV 新增键：


```

quote_summary:2025-11-18

insight_report:2025-11-18

```


→ 含 `quote_insight` 字段。


---

## 🧱 任务完成标准


| 项目   | 要求                |

| ---- | ----------------- |

| 日志聚合 | 近30天报价汇总          |

| 统计结果 | Top型号/品牌/地区       |

| 平均利润 | 自动计算              |

| AI分析 | 正常生成摘要            |

| 同步更新 | 写入 insight_report |


---

## 💬 附加说明


这一步完成后，你的系统具备：


| 功能          | 说明                      |

| ----------- | ----------------------- |

| 🔍 自动报价数据挖掘 | 统计趋势、市场热点               |

| 💹 智能利润分析   | 平均利润率自动计算               |

| 🌍 区域市场识别   | 国家分布                    |

| 🧠 AI 总结    | 自动写入洞察报告                |

| 🪶 可视化      | 可在 jev_panel.html 加趋势图表 |


---

## 🔮 下一阶段展望


| 模块                    | 功能           | 阶段 |

| --------------------- | ------------ | -- |

| L9.3 Profit Tracker   | 自动生成"每日利润报表" |    |

| L9.4 Country Insights | 不同国家客户行为分析   |    |

| L9.5 AutoFollowUp     | 自动催单与成交跟进    |    |

| L10 Control Hub       | 所有数据在一个总面板展示 |    |


---

**Author:** JEV System Core

**Generated:** 2025-11-18

**Version:** v1.0 (L9.2 AutoQuote Analyzer)


---

## ✅ 执行后效果

系统每天 00:25 自动：

1. 聚合过去 30 天报价数据；  
2. 分析最热型号与利润率；  
3. 自动生成洞察文本；  
4. 写入 `insight_report`；  
5. Telegram 通知示例：


```

📊 AutoQuote Summary (2025-11-18)

最热型号: E2E-X3D1-N

平均利润率: 27.4%

主要市场: 印度, 越南

AI总结: 利润稳定，建议提高热门型号库存。


```

