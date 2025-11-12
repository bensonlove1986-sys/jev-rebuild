# 🧠 任务标识

JEV/2025-11-08/Log-Summary-Analyzer


---

## 🎯 执行目标

为 Cloudflare Worker 添加一个 `/log-summary` 端点，  
用于自动读取前一天的日志 (`log:YYYY-MM-DD`)，  
计算系统行为指标（调用次数、平均耗时、来源分布），  
并将汇总结果存入 KV (`summary:YYYY-MM-DD`)。  


系统可通过 `/log-summary?date=YYYY-MM-DD` 直接查看分析结果。  


---

## 🔍 上下文说明

此任务基于：

- `/log-event`（POST/GET 已完成）

- KV 命名空间 JEVPI 已保存事件日志

- UI Event Feed 已显示实时日志


本模块让系统具备：

> "自我复盘 → 自我优化" 的核心数据能力。  


---

## ⚙️ 操作步骤

1️⃣ 在 `worker.js` 中添加新路由 `/log-summary`  

2️⃣ 逻辑如下：

   - 默认分析 **前一天** 的日志（或 ?date 参数指定日期）；

   - 读取 `log:YYYY-MM-DD`；

   - 按 `source` 聚合统计：

     - 调用次数

     - 平均耗时

     - 最常见动作

   - 生成结构如下：

     ```json

     {

       "date": "2025-11-07",

       "total_events": 35,

       "sources": {

         "local_ai": { "count": 12, "avg_duration": "0.42s", "top_action": "price-query" },

         "worker": { "count": 10, "avg_duration": "0.38s" },

         "agent": { "count": 8, "avg_duration": "0.53s" }

       },

       "system_health": "stable"

     }

     ```

   - 存入 KV 键 `summary:YYYY-MM-DD`


3️⃣ 访问 `/log-summary?date=2025-11-07` 可直接查看结果。  


---

## 💻 代码块

```js

// === JEV Log Summary Analyzer ===


if (path === "/log-summary") {

  try {

    const urlParams = new URL(request.url).searchParams;

    const dateParam = urlParams.get("date");

    const today = new Date();

    const targetDate = dateParam || new Date(today.getTime() - 86400000).toISOString().split("T")[0];

    const kvKey = `log:${targetDate}`;

    const summaryKey = `summary:${targetDate}`;


    const logs = await env.JEVPI.get(kvKey, { type: "json" }) || [];

    if (!logs.length) {

      return new Response(JSON.stringify({ success: false, message: "No logs for that date." }, null, 2), {

        headers: { "Content-Type": "application/json" },

        status: 404

      });

    }


    // 分析日志

    const sourceStats = {};

    for (const ev of logs) {

      const src = ev.source || "unknown";

      if (!sourceStats[src]) sourceStats[src] = { count: 0, total: 0, durations: [], actions: {} };

      sourceStats[src].count++;

      if (ev.duration && typeof ev.duration === "string" && ev.duration.includes("ms")) {

        const val = parseFloat(ev.duration);

        if (!isNaN(val)) sourceStats[src].durations.push(val);

      }

      if (ev.action) {

        sourceStats[src].actions[ev.action] = (sourceStats[src].actions[ev.action] || 0) + 1;

      }

    }


    const summary = {

      date: targetDate,

      total_events: logs.length,

      sources: {},

      system_health: "stable"

    };


    for (const [src, d] of Object.entries(sourceStats)) {

      const avg = d.durations.length ? (d.durations.reduce((a, b) => a + b, 0) / d.durations.length).toFixed(1) + "ms" : "N/A";

      const topAction = Object.entries(d.actions).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

      summary.sources[src] = { count: d.count, avg_duration: avg, top_action: topAction };

    }


    await env.JEVPI.put(summaryKey, JSON.stringify(summary));

    return new Response(JSON.stringify(summary, null, 2), {

      headers: { "Content-Type": "application/json" },

      status: 200

    });


  } catch (err) {

    return new Response(JSON.stringify({ success: false, error: err.message }, null, 2), {

      headers: { "Content-Type": "application/json" },

      status: 500

    });

  }

}