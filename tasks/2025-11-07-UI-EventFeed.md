# 🧠 任务标识

JEV/2025-11-07/UI-EventFeed


---

## 🎯 执行目标

在 jev_panel.html 中新增一个「系统事件流」模块，
实时显示从 Cloudflare Worker `/log-event` 接口获取的日志数据，
让中控界面可视化系统运行轨迹（时间、来源、动作、结果）。


---

## 🔍 上下文说明

此任务基于前一任务 **JEV/2025-11-07/Log-System** 已成功部署的 `/log-event` 端点。  
系统现在具备行为日志存储能力（KV内 log:YYYY-MM-DD）。  
本次任务将 UI 与日志系统打通，实现：

- 实时事件刷新；

- 动态渲染事件表；

- 状态颜色区分不同来源。


---

## ⚙️ 操作步骤

1️⃣ 在 `jev_panel.html` 的「系统状态」模块下方，新增一个 "系统事件流" 区块。  

2️⃣ 前端通过 `fetch('https://jevshop.bensonlove1986.workers.dev/log-event?today')`  
   拉取当日日志（GET 请求返回 JSON 数组）。  

3️⃣ 每 10 秒刷新一次；

4️⃣ 不同来源（AI / Worker / UI / Agent）用不同颜色；

5️⃣ 滚动到最新事件。


---

## 💻 代码块

```html

<!-- === 系统事件流模块 === -->

<div class="card mt-4">

  <h3 class="text-lg font-semibold mb-2">系统事件流 (Event Feed)</h3>

  <div id="event-feed" class="bg-gray-50 p-3 rounded-lg h-64 overflow-y-auto text-sm font-mono text-gray-700 border border-gray-200 shadow-inner">

    <p class="text-gray-400 text-center">加载中...</p>

  </div>

</div>


<script>

const FEED_URL = "https://jevshop.bensonlove1986.workers.dev/log-event?today";


async function loadEventFeed() {

  const feed = document.getElementById("event-feed");

  try {

    const res = await fetch(FEED_URL, { cache: "no-cache" });

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {

      feed.innerHTML = "<p class='text-gray-400 text-center'>暂无事件记录</p>";

      return;

    }

    let html = "";

    data.slice(-50).forEach(ev => {

      const time = new Date(ev.time).toLocaleTimeString();

      const srcColor =

        ev.source === "local_ai" ? "text-indigo-500" :

        ev.source === "worker" ? "text-green-600" :

        ev.source === "agent" ? "text-yellow-600" :

        "text-gray-600";

      html += `

        <div class="border-b border-gray-200 py-1 flex justify-between">

          <span><span class="${srcColor}">[${ev.source}]</span> ${ev.action}</span>

          <span class="text-gray-400">${time}</span>

        </div>

        <div class="text-xs text-gray-500 pl-4 mb-1">${ev.result || ""}</div>

      `;

    });

    feed.innerHTML = html;

    feed.scrollTop = feed.scrollHeight;

  } catch (err) {

    feed.innerHTML = `<p class="text-red-500 text-center">加载失败: ${err.message}</p>`;

  }

}


loadEventFeed();

setInterval(loadEventFeed, 10000);

</script>