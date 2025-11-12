# 🧠 **JEV L11-Agent Monitor UI**

**作者：** JEV System Core  
**阶段：** L11 - 中控客服监控窗口扩展  
**目标：** 在 jev_panel.html 中增加实时客服监控子模块，实现客服状态可视化

--- 

## 🚀 一、功能定位

> "中控要能看见客服在干什么"

### ✅ 核心目标

* 实时显示每个客服是否在线、正在打字、正在回复谁
* 查看最近 N 条客户对话内容（纯前端流展示）
* 统计客服响应速度 / 消息量 / 成交量
* 支持 AI 实时建议、监控是否采纳建议

--- 

## 🧩 二、系统结构扩展

```
[ 客服浏览器端插件 (jev_agent_plugin) ]
   │ 上报：/agent-log + /agent-status
   ▼
[ Cloudflare Worker (中转层) ]
   │ 推送：/agent-stream
   ▼
[ 中控面板 jev_panel.html ]
   └─▶ 新增窗口：Agent Monitor Panel
```

--- 

## 💻 三、在 jev_panel.html 中新增的区域

### 1️⃣ 结构布局

在页面右侧或底部增加一个卡片式窗口：

```html
<div id="agent-monitor" class="panel-section"> 
  <h3>👩‍💻 客服监控</h3> 
  <div id="agent-list"></div> 
  <div id="chat-preview"></div> 
</div>
```

### 2️⃣ 样式（Tailwind简写）

```css
#agent-monitor { 
  background: #111; 
  color: #eee; 
  border-radius: 12px; 
  padding: 16px; 
  width: 420px; 
  overflow-y: auto; 
}
.agent-item { 
  display: flex; 
  justify-content: space-between; 
  padding: 6px 0; 
  border-bottom: 1px solid #333; 
}
.agent-item.online { color: #7CFC00; }
.agent-item.idle { color: #FFD700; }
.agent-item.offline { color: #FF6347; }
```

--- 

## 🧠 四、Worker 端新增接口

| 接口                  | 功能              | 返回示例                                                                   | 
| ------------------- | --------------- | ---------------------------------------------------------------------- | 
| `/agent-status`     | 返回所有客服的在线状态     | `{ "agents": [{ "name":"Alice","status":"online","active_chats":3 }]}` | 
| `/agent-log?latest` | 拉取最近10条客服事件     | `[{agent:"Alice",event:"message_sent",content:"报价"}]`                  | 
| `/agent-stream`     | WebSocket 实时事件流 | 实时推送消息与状态变化                                                            | 

--- 

## ⚙️ 五、前端逻辑绑定

```js
// === 定时刷新客服状态 === 
async function refreshAgents() { 
  const res = await fetch('/agent-status'); 
  const data = await res.json(); 
  const html = data.agents.map(a => 
    `<div class="agent-item ${a.status}"> 
       <span>${a.name}</span> 
       <span>${a.status.toUpperCase()}</span> 
     </div>` 
  ).join(''); 
  document.querySelector('#agent-list').innerHTML = html;
  
  // 更新在线客服计数
  const onlineCount = data.agents.filter(a => a.status === 'online').length;
  document.querySelector('#agent-count').textContent = `Agent Online Count: ${onlineCount}`;
} 
setInterval(refreshAgents, 15000); 

// === 聊天事件流 === 
async function loadAgentLogs() { 
  const res = await fetch('/agent-log?latest'); 
  const data = await res.json(); 
  const html = data.map(l => 
    `<div>[${l.agent}] ${l.event} → ${l.content}</div>` 
  ).join(''); 
  document.querySelector('#chat-preview').innerHTML = html;
  
  // 检测响应超时
  detectResponseDelays(data);
} 
setInterval(loadAgentLogs, 10000);

// === 检测响应超时并触发AI建议 ===
async function detectResponseDelays(events) {
  const now = new Date().getTime();
  // 简单实现：查找最近10秒内的客户消息但无对应回复
  const customerMessages = events.filter(e => e.event === 'customer_message');
  
  for (const msg of customerMessages) {
    const msgTime = new Date(msg.time).getTime();
    const responseTime = now - msgTime;
    
    if (responseTime > 15000 && !hasReply(events, msg.agent, msg.id)) {
      // 触发AI建议
      try {
        const res = await fetch('/ai-suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_message: msg.content })
        });
        const suggestion = await res.text();
        // 通知客服插件
        notifyAgent(suggestion, msg.agent);
      } catch (err) {
        console.error('AI suggestion failed:', err);
      }
    }
  }
}

// === 检查是否有对应的回复 ===
function hasReply(events, agent, msgId) {
  return events.some(e => 
    e.event === 'message_sent' && 
    e.agent === agent && 
    e.reply_to === msgId
  );
}

// === 通知客服插件 ===
function notifyAgent(suggestion, agentName) {
  // 如果支持WebSocket
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'ai_suggestion',
      for_agent: agentName,
      suggestion: suggestion,
      timestamp: new Date().toISOString()
    }));
  }
  
  // 记录AI建议触发
  aiSuggestionsTriggered++;
  updateStatusSummary();
}

// === WebSocket连接 ===
let ws;
function connectWebSocket() {
  try {
    ws = new WebSocket('ws://localhost:8787/agent-stream');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleAgentStreamUpdate(data);
    };
    ws.onclose = () => {
      console.log('Agent stream disconnected, will reconnect in 5s');
      setTimeout(connectWebSocket, 5000);
    };
  } catch (err) {
    console.error('Failed to connect WebSocket:', err);
  }
}

// === 处理实时流更新 ===
function handleAgentStreamUpdate(data) {
  switch(data.type) {
    case 'agent_status':
      // 实时更新单个客服状态
      updateAgentStatus(data.agent, data.status);
      break;
    case 'new_event':
      // 实时添加新事件
      addNewEvent(data.event);
      break;
  }
  updateStatusSummary();
}

// === 更新单个客服状态 ===
function updateAgentStatus(agentName, status) {
  const element = document.querySelector(`.agent-item[data-name="${agentName}"]`);
  if (element) {
    element.className = `agent-item ${status}`;
    element.querySelector('.status-text').textContent = status.toUpperCase();
  }
}

// === 添加新事件 ===
function addNewEvent(event) {
  const container = document.querySelector('#chat-preview');
  const newEvent = document.createElement('div');
  newEvent.textContent = `[${event.agent}] ${event.event} → ${event.content}`;
  container.prepend(newEvent);
  
  // 保持最多显示10条事件
  const events = container.querySelectorAll('div');
  if (events.length > 10) {
    events[events.length - 1].remove();
  }
}

// === 状态汇总 ===
let aiSuggestionsTriggered = 0;
function updateStatusSummary() {
  const statusSummary = {
    agents_online: document.querySelectorAll('.agent-item.online').length,
    agents_idle: document.querySelectorAll('.agent-item.idle').length,
    latest_events: document.querySelectorAll('#chat-preview > div').length,
    ai_suggestions_triggered: aiSuggestionsTriggered
  };
  
  console.log('Agent Monitor Status:', statusSummary);
  // 可以选择将状态汇总显示在UI上
}

// === 初始化 ===
function initAgentMonitor() {
  // 在中控面板左上角添加在线客服计数
  const header = document.querySelector('header') || document.body.firstElementChild;
  const countElement = document.createElement('div');
  countElement.id = 'agent-count';
  countElement.className = 'agent-count';
  countElement.textContent = 'Agent Online Count: 0';
  header.prepend(countElement);
  
  // 初始加载
  refreshAgents();
  loadAgentLogs();
  
  // 尝试连接WebSocket
  connectWebSocket();
}

// 页面加载完成后初始化
window.addEventListener('load', initAgentMonitor);
```

--- 

## 📊 六、实时监控效果（中控面板）

```
👩‍💻 客服监控 
----------------------------------- 
[✔] Alice  - 在线   |  5条对话 
[🟡] Bob    - 空闲   |  1条对话 
[🔴] Cindy  - 离线   |  - 
----------------------------------- 
[13:45:23] Alice → "客户询问 E2E-X3D1-N"
[13:45:25] AI 推荐回复: "可报价 3.6 USD / pcs"
[13:45:29] Alice 已回复
```

--- 

## 🧮 七、与 AI 建议的联动逻辑

当中控检测到客服响应慢（>15 秒未回复）：

```js
if(responseTime > 15000){
   fetch('/ai-suggest', { method:'POST', body: JSON.stringify({ last_message }) })
     .then(r=>r.text())
     .then(suggestion=>{
       notifyAgent(suggestion); // 插件端收到提示
     });
}
```

--- 

## 🧠 八、TRAE 执行提示词（中控客服监控窗口）

> ⚙️ **TRAE 提示词：JEV 中控客服监控窗口扩展**
> 
> 请执行以下任务： 
> 1️⃣ 在 `jev_panel.html` 中增加一个 "👩‍💻 客服监控 (Agent Monitor)" 模块； 
> 2️⃣ 模块需实时显示所有客服状态（online/idle/offline）； 
> 3️⃣ 同时展示最近10条客服事件记录（来自 `/agent-log?latest`）； 
> 4️⃣ 每15秒刷新状态，每10秒刷新日志； 
> 5️⃣ 如果 Worker 提供 `/agent-stream` WebSocket，则自动实时更新； 
> 6️⃣ UI 需分区显示客服列表与事件流； 
> 7️⃣ 当某客服响应超时 (>15秒) 时触发 `/ai-suggest`； 
> 8️⃣ 中控面板左上角显示 "Agent Online Count"； 
> 9️⃣ 输出 JSON 状态汇总： 
> 
> ```json 
> { 
>   "agents_online": 3, 
>   "agents_idle": 1, 
>   "latest_events": 10, 
>   "ai_suggestions_triggered": 2 
> } 
> ``` 
> 
> 目标： 
> 让中控具备 "可视化客服活动监控" 功能，能实时掌握客服状态、对话内容与 AI 辅助情况。

--- 

## ✅ 九、执行完成后的效果

* 中控可实时看到每个客服的状态
* 能预览最近的聊天记录
* 可判断客服是否响应及时
* 可触发 AI 实时建议
* 所有状态同步写入日志与中控UI

--- 

## 📋 十、验证标准

执行完成后，TRAE 应返回以下状态确认：

```
✅ Agent Monitor UI verified and integrated
```

同时，中控面板应显示：

```
Agent Online Count: X
```

以及完整的客服监控窗口。