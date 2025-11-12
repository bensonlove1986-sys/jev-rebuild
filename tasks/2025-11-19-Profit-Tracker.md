# 🧠 任务标识

JEV/2025-11-19/Profit-Tracker


---

## 🎯 执行目标

开发并部署 `/profit-track` 模块，  
每日自动分析最近 30 天的报价与成交记录，  
计算以下关键指标：


- 📈 日利润（每日毛利总额）
- 💰 平均利润率（含波动趋势）
- 🏆 最赚钱型号 / 客户国家
- 🧩 趋势预测（未来7天利润预估）


并将结果：
- 写入 `profit_summary:<date>`；
- 同步更新到 `insight_report:<date>` → `"profit_insight"` 字段；
- 生成 Telegram 提要。


---

## 🔍 上下文说明

此模块基于：
- `log:quote:*`（报价记录）  
- `price_db`（成本数据库）  
- `quote_summary:*`（前一模块输出）  
- `insight_report:*`（月度洞察）  


目标是让系统具备"自动算账"的能力：  
> 把每天的自动报价行为汇总成真实利润数据，  
> 并形成趋势分析，让你清楚知道：  
> 哪天赚最多？哪些产品利润最高？哪些国家回报最好？


---

## ⚙️ 操作步骤

1️⃣ 新增 `/profit-track` 路由；  
2️⃣ 读取最近 30 天 `log:quote:*`；  
3️⃣ 读取价格表（`price_db`）；  
4️⃣ 计算：
    - 单笔利润：`profit = (unit_price - BasePrice) * qty`；
    - 利润率：`(unit_price - BasePrice) / BasePrice`；
    - 每日总利润；
    - 平均利润率；
    - Top5 盈利型号；
    - 国家收益汇总；
5️⃣ 调用 AI 生成总结性分析；
6️⃣ 写入 KV 并同步更新 Insight；
7️⃣ 通知 Telegram。


---

## 💻 Worker 代码模板

```js

// === JEV Profit Tracker ===

if (path === "/profit-track") {

  const result = await runProfitTracker(env);

  return new Response(JSON.stringify(result, null, 2), {

    headers: { "Content-Type": "application/json" },

    status: 200,

  });

}


async function runProfitTracker(env) {

  const today = new Date();

  const priceDb = await env.JEVPI.get("price_db", { type: "json" }) || [];

  const allQuotes = [];


  // 收集30天报价

  for (let i = 0; i < 30; i++) {

    const d = new Date(today.getTime() - i * 86400000).toISOString().split("T")[0];

    const log = await env.JEVPI.get(`log:quote:${d}`, { type: "json" });

    if (log && log.length) allQuotes.push(...log.map(q => ({ ...q, date: d })));

  }

  if (!allQuotes.length) return { success: false, message: "No quotes found" };


  // 计算利润

  const dailyProfit = {};

  const countryProfit = {};

  const modelProfit = {};

  let totalProfit = 0, totalRevenue = 0, count = 0;


  for (const q of allQuotes) {

    const base = priceDb.find(p => p.Model === q.model);

    if (!base) continue;

    const profitPer = (q.unit_price - base.BasePrice) * (q.qty || 1);

    const revenuePer = q.unit_price * (q.qty || 1);

    totalProfit += profitPer;

    totalRevenue += revenuePer;

    count++;


    dailyProfit[q.date] = (dailyProfit[q.date] || 0) + profitPer;

    modelProfit[q.model] = (modelProfit[q.model] || 0) + profitPer;

    countryProfit[q.country || "Unknown"] = (countryProfit[q.country || "Unknown"] || 0) + profitPer;

  }


  const avgProfitRate = totalRevenue ? ((totalProfit / totalRevenue) * 100).toFixed(2) : "0";

  const sortedModels = Object.entries(modelProfit).sort((a, b) => b[1] - a[1]);

  const sortedCountries = Object.entries(countryProfit).sort((a, b) => b[1] - a[1]);


  // AI分析

  let aiText = "";

  try {

    const prompt = `

 最近30天利润分析：

 平均利润率：${avgProfitRate}%

 最高利润型号：${sortedModels[0]?.[0] || "无"}

 主要市场：${sortedCountries[0]?.[0] || "未知"}

 每日利润趋势：${JSON.stringify(dailyProfit)}

 

 请生成100字左右总结，描述利润趋势与建议策略。

     `;

    const aiRes = await fetch("http://localhost:1822/jev/ai-summarize", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({ prompt }),

    });

    aiText = await aiRes.text();

  } catch {

    aiText = `系统检测到平均利润率 ${avgProfitRate}% ，主要利润来自 ${sortedCountries[0]?.[0] || "未知"}`;

  }


  const summary = {

    date: today.toISOString().split("T")[0],

    avgProfitRate,

    totalProfit: totalProfit.toFixed(2),

    topModel: sortedModels.slice(0, 3),

    topCountry: sortedCountries.slice(0, 3),

    aiSummary: aiText.trim(),

  };


  await env.JEVPI.put(`profit_summary:${summary.date}`, JSON.stringify(summary));


  // 更新 Insight Report

  const insight = await env.JEVPI.get(`insight_report:${summary.date}`, { type: "json" }) || {};

  insight.profit_insight = summary;

  await env.JEVPI.put(`insight_report:${summary.date}`, JSON.stringify(insight));


  // Telegram 提示

  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {

    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        chat_id: env.TELEGRAM_CHAT_ID,

        text: `💰 JEV Profit Tracker ${summary.date}\n平均利润率：${summary.avgProfitRate}%\n总利润：$${summary.totalProfit}\nTop型号：${summary.topModel[0]?.[0]}\n主要市场：${summary.topCountry[0]?.[0]}`,

      }),

    });

  }


  return { success: true, summary };

}
```


---

## 🧾 验证方式


1️⃣ 上传你的报价日志与价格表；
2️⃣ 执行：


```

https://jevshop.bensonlove1986.workers.dev/profit-track

```


3️⃣ 返回：


```json

{

  "success": true,

  "summary": {

    "date": "2025-11-19",

    "avgProfitRate": "27.8",

    "totalProfit": "386.50",

    "topModel": [["E2E-X3D1-N", 153.6]],

    "topCountry": [["India", 210.4]],

    "aiSummary": "过去30天利润稳定增长，主要来源于印度与越南市场，建议重点投放广告优化。"

  }

}

```


4️⃣ KV 新增：


```

profit_summary:2025-11-19

insight_report:2025-11-19

```


---

## 🧱 任务完成标准


| 项目   | 要求                                 |

| ---- | ---------------------------------- |

| 数据来源 | log:quote:* & price_db             |

| 计算指标 | 日利润、平均利润率、Top型号、Top国家              |

| AI分析 | 成功生成自然语言总结                         |

| KV更新 | 写入 profit_summary 与 insight_report |

| 通知   | Telegram 报告成功推送                    |


---

## 💬 附加说明


完成此模块后，你的系统具备：


* 💵 自动计算利润与收益；
* 📈 跟踪每日利润变化；
* 🧭 指导销售策略（系统会知道"该推什么"）；
* 🧠 可与 Insight Report 结合展示；
* 📊 可在 jev_panel.html 展示利润折线图。

