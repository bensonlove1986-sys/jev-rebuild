# 🧠 任务标识

JEV/2025-11-09/Log-Trend-Chart


---

## 🎯 执行目标

在 jev_panel.html 中新增一个「系统趋势分析图 (Log Trend Chart)」模块，  
自动绘制最近 7 天系统运行趋势图。  

图表展示：
- 每日总事件数；
- 各来源平均耗时；
- 系统健康状态（颜色标记）。  


---

## 🔍 上下文说明

此任务基于：

- `/log-summary` 接口（可返回每日统计）；
- L4 日志分析仪表板（Log Summary Dashboard）；
本模块将这些分析结果转换为可视化趋势图。


---

## ⚙️ 操作步骤

1️⃣ 在 jev_panel.html 中（建议放在 Log Summary Dashboard 下方）添加新卡片 "系统趋势分析图"。  
2️⃣ 使用 **Recharts**（内置于 JEV 环境）绘制折线图。  
3️⃣ 数据来源：
   - 连续读取过去 7 天的 `/log-summary?date=YYYY-MM-DD`；
   - 若某天无数据 → 自动补 0。  
4️⃣ X轴：日期；  
   Y轴：事件数 / 平均耗时；  
5️⃣ 图表颜色规则：
   - 🟣 local_ai → 紫色线  
   - 🟢 worker → 绿色线  
   - 🟡 agent → 黄色线  


---

## 💻 代码块

```html
<!-- === 系统趋势分析图 (Log Trend Chart) === -->

<div class="card mt-4">
  <h3 class="text-lg font-semibold mb-2">系统趋势分析图 (Log Trend Chart)</h3>
  <div id="chart-container" class="h-64 bg-white border border-gray-200 rounded-lg shadow-inner flex items-center justify-center">
    <p class="text-gray-400 text-center">加载中...</p>
  </div>
</div>


<script type="module">
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from " `https://esm.sh/recharts@2.10.0` ";


const CHART_API = " `https://jevshop.bensonlove1986.workers.dev/log-summary` ";


async function getSummaryForDate(date) {
  const res = await fetch(`${CHART_API}?date=${date}`);
  if (!res.ok) return null;
  return await res.json();
}


async function loadTrendChart() {
  const chartContainer = document.getElementById("chart-container");
  chartContainer.innerHTML = "<p class='text-gray-400'>正在加载最近 7 天数据...</p>";

  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000);
    return d.toISOString().split("T")[0];
  });

  const results = [];
  for (const date of dates) {
    const data = await getSummaryForDate(date);
    results.push({
      date,
      total: data?.total_events || 0,
      ai_avg: parseFloat((data?.sources?.local_ai?.avg_duration || "0").replace("ms", "")) || 0,
      worker_avg: parseFloat((data?.sources?.worker?.avg_duration || "0").replace("ms", "")) || 0,
      agent_avg: parseFloat((data?.sources?.agent?.avg_duration || "0").replace("ms", "")) || 0
    });
  }

  // 渲染图表
  const chart = React.createElement(
    ResponsiveContainer,
    { width: "100%", height: 240 },
    React.createElement(LineChart, { data: results },
      React.createElement(XAxis, { dataKey: "date" }),
      React.createElement(YAxis, { yAxisId: "left", orientation: "left", label: { value: "事件数", angle: -90, position: "insideLeft" } }),
      React.createElement(YAxis, { yAxisId: "right", orientation: "right", label: { value: "平均耗时(ms)", angle: 90, position: "insideRight" } }),
      React.createElement(Tooltip, null),
      React.createElement(Legend, null),
      React.createElement(Line, { yAxisId: "left", type: "monotone", dataKey: "total", stroke: "#2563eb", strokeWidth: 2, name: "总事件数" }),
      React.createElement(Line, { yAxisId: "right", type: "monotone", dataKey: "ai_avg", stroke: "#8b5cf6", strokeWidth: 2, name: "AI 平均耗时" }),
      React.createElement(Line, { yAxisId: "right", type: "monotone", dataKey: "worker_avg", stroke: "#22c55e", strokeWidth: 2, name: "Worker 平均耗时" }),
      React.createElement(Line, { yAxisId: "right", type: "monotone", dataKey: "agent_avg", stroke: "#eab308", strokeWidth: 2, name: "Agent 平均耗时" })
    )
  );

  ReactDOM.render(chart, chartContainer);
}


loadTrendChart();
</script>
```


---

## 🧾 验证方式


1️⃣ 打开 `D:\JEV\jev_panel.html`
2️⃣ 页面底部出现 "系统趋势分析图"；
3️⃣ 图表加载最近 7 天数据；
4️⃣ 若系统运行稳定，蓝线（事件数）与紫/绿/黄线（平均耗时）变化平滑。


---

## 📊 报告要求


✅ 成功：


* 折线图正确显示；
* 数据与日志汇总一致；
* 不同来源颜色区分明显；
* 控制台无错误。


❌ 失败：


* 图表不显示；
* 数据加载异常；
* 颜色/图例错误。


---

## 🧱 任务完成标准


| 项目   | 要求         |
| ---- | ---------- |
| 数据加载 | 成功拉取最近 7 天 |
| 图表渲染 | 折线显示正常     |
| 色彩区分 | 源清晰可辨      |
| 性能稳定 | 控制台无报错     |


---

## 💬 附加说明


此模块标志着 JEV 系统进入 **L4.5 阶段：自我监测与趋势分析**。
系统不再只是记录和分析，而是能够「看见」自身的运行规律。


未来可扩展：


* 点击节点显示当天日志；
* 平均耗时 > 阈值 自动标红；
* 30 天长周期趋势对比图；
* 智能预测（L5阶段入口）。


---

**Author:** JEV System Core  
**Generated:** 2025-11-09  
**Version:** v1.0 (L4.5 Trend Visualization)