# 🧠 任务标识

JEV/2025-11-08/Log-Summary-Dashboard


---

## 🎯 执行目标

在 jev_panel.html 中新增一个「系统日志分析仪表板 (Log Summary Dashboard)」模块，  
自动从 Cloudflare Worker 的 `/log-summary` 接口拉取每日系统统计数据，  
以表格方式展示调用次数、平均耗时、最常见动作及整体健康状态。  


---

## 🔍 上下文说明

此任务基于前一任务：

- `JEV/2025-11-08/Log-Summary-Analyzer`（已实现日志汇总计算）
- Worker 端 `/log-summary` 可返回 JSON 汇总

本次任务让 UI 可视化这些分析数据，使系统拥有"自我评估仪表板"。


---

## ⚙️ 操作步骤

1️⃣ 在 jev_panel.html 页面中（建议放在 Event Feed 模块下方），新增一个 "日志分析仪表板" 区块。  
2️⃣ 该模块包含：

   - 日期选择器（默认今日）
   - "加载分析"按钮
   - 表格展示每个来源的统计（count、avg_duration、top_action）
   - 健康状态显示条
3️⃣ 每次点击按钮或更改日期，自动请求：

```

`https://jevshop.bensonlove1986.workers.dev/log-summary?date=YYYY-MM-DD` 

```
4️⃣ 若无数据 → 显示提示信息。  
5️⃣ 每日首次打开页面自动加载前一日数据。


---

## 💻 代码块

```html
<!-- === 日志分析仪表板 (Log Summary Dashboard) === -->

<div class="card mt-4">
<h3 class="text-lg font-semibold mb-2">系统日志分析仪表板 (Log Summary Dashboard)</h3>
<div class="flex items-center mb-2">
 <input id="summary-date" type="date" class="border rounded p-1 text-sm mr-2" />
 <button id="load-summary" class="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded">
   加载分析
 </button>
</div>
<div id="summary-output" class="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 shadow-inner">
 <p class="text-gray-400 text-center">请选择日期以加载系统分析。</p>
</div>
</div>


<script>
const SUMMARY_API = " `https://jevshop.bensonlove1986.workers.dev/log-summary` ";


async function loadSummary(dateStr) {
const container = document.getElementById("summary-output");
container.innerHTML = "<p class='text-gray-400 text-center'>加载中...</p>";


try {
 const res = await fetch(`${SUMMARY_API}?date=${dateStr}`);
 const data = await res.json();

 if (!data || !data.sources) {
   container.innerHTML = "<p class='text-gray-400 text-center'>无可用数据</p>";
   return;
 }

 const healthColor = data.system_health === "stable" ? "text-green-600" :
                     data.system_health === "warning" ? "text-yellow-600" :
                     "text-red-600";

 let html = `
   <div class="flex justify-between items-center mb-2">
     <div>日期：<span class="font-mono">${data.date}</span></div>
     <div>总事件：<span class="font-semibold">${data.total_events}</span></div>
     <div>系统健康：<span class="${healthColor} font-semibold">${data.system_health}</span></div>
   </div>
   <table class="min-w-full text-sm border-collapse border border-gray-300">
     <thead class="bg-gray-100 text-gray-700">
       <tr>
         <th class="border border-gray-300 px-2 py-1">来源</th>
         <th class="border border-gray-300 px-2 py-1">调用次数</th>
         <th class="border border-gray-300 px-2 py-1">平均耗时</th>
         <th class="border border-gray-300 px-2 py-1">主要动作</th>
       </tr>
     </thead>
     <tbody>
 `;

 for (const [src, stats] of Object.entries(data.sources)) {
   const srcColor =
     src === "local_ai" ? "text-indigo-500" :
     src === "worker" ? "text-green-600" :
     src === "agent" ? "text-yellow-600" :
     "text-gray-600";
   html += `
     <tr>
       <td class="border border-gray-300 px-2 py-1"><span class="${srcColor}">[${src}]</span></td>
       <td class="border border-gray-300 px-2 py-1">${stats.count}</td>
       <td class="border border-gray-300 px-2 py-1">${stats.avg_duration}</td>
       <td class="border border-gray-300 px-2 py-1">${stats.top_action || "-"}</td>
     </tr>
   `;
 }
 html += "</tbody></table>";

 container.innerHTML = html;
} catch (err) {
 container.innerHTML = `<p class="text-red-500 text-center">加载失败: ${err.message}</p>`;
}
}


document.getElementById("load-summary").addEventListener("click", () => {
const dateInput = document.getElementById("summary-date");
const dateStr = dateInput.value || new Date().toISOString().split("T")[0];
loadSummary(dateStr);
});


// 默认载入昨日数据
window.addEventListener("DOMContentLoaded", () => {
const d = new Date(Date.now() - 86400000);
document.getElementById("summary-date").value = d.toISOString().split("T")[0];
loadSummary(d.toISOString().split("T")[0]);
});
</script>
```


---

## 🧾 验证方式


1️⃣ 打开 jev_panel.html


* 页面下方出现 "系统日志分析仪表板"；
 2️⃣ 确认日期默认是昨天；
 3️⃣ 点击 "加载分析"
* UI 显示表格；
* 数据与 `/log-summary` 返回一致；
 4️⃣ 若系统健康正常 → "系统健康：✅ stable"。


---

## 📊 报告要求


✅ 成功：


* 数据能正确加载；
* 表格正常渲染；
* 颜色区分明显；
* 控制台无报错。


❌ 失败：


* 无数据显示；
* API 返回异常；
* 格式错误。


---

## 🧱 任务完成标准


| 项目    | 要求     |
| ----- | ------ |
| UI加载  | 表格正常显示 |
| API响应 | 返回正常   |
| 自动刷新  | 默认加载昨日 |
| 健康状态  | 正确显示颜色 |


---

## 💬 附加说明


此模块标志着 JEV L4 阶段「自学习 → 自觉 → 自评估」的实现。
未来可扩展为：


* 折线图展示趋势；
* 月度统计图；
* 异常自动报警（若 error 事件超阈值）。


---

**Author:** JEV System Core  
**Generated:** 2025-11-08  
**Version:** v1.0 (L4 Dashboard)