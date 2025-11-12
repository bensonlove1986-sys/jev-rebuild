# JEV L11-C：中控内部监管插件（Control Internal Supervisor）

## 🧩 一、阶段定位

**JEV L11-C：中控内部监管插件（Control Internal Supervisor）**

这个模块不是政府监管，而是系统的**"AI系统内部监察官"**。它的任务是：

* 监视 Worker、KV、R2、AI 模块是否异常；
* 检测客服插件是否上报过多或滥用；
* 检测 AI 是否频繁调用高风险接口；
* 在中控 UI 显示系统健康状态；
* 自动触发"修复 / 暂停 / 报警"。

## 🧠 二、逻辑架构

```
[ 中控 jev_panel.html ]
    │
    ├── 🔍 /supervisor-status     ← Worker 内部自检状态
    ├── ⚙️ /system-usage          ← 记录KV/R2使用量
    ├── 🧠 /ai-activity           ← AI 调用频率与异常检测
    ├── 📡 /agent-activity        ← 客服插件上报频率
    └── 🚨 /alert-log             ← 系统报警信息
```

## 🧱 三、核心功能模块

| 模块        | 功能          | 监控指标     | 报警条件           |
| --------- | ----------- | -------- | -------------- |
| KV 监控     | 读写速率、错误率    | 每分钟读写次数  | 错误率 > 3%       |
| AI 调用监控   | AI 调用次数与失败率 | 每小时调用量   | 连续失败 > 5 次     |
| 客服监控      | 上报频率与响应延迟   | 每分钟心跳包数  | 离线超过 60 秒      |
| Worker 健康 | 端口响应时间      | <500ms   | 响应延迟 > 2s      |
| 日志完整性     | KV 写入校验     | 存在率 100% | 缺失任何 log: 前缀数据 |

## 💻 四、Worker 接口设计

### 1. `/supervisor-status` 接口实现

```javascript
// Worker端实现 - 返回系统运行快照
async function handleSupervisorStatus() {
  // 计算Worker运行时间
  const startTime = new Date(env.WORKER_START_TIME || Date.now());
  const uptimeMs = Date.now() - startTime.getTime();
  const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
  const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  const workerUptime = `${uptimeHours}h ${uptimeMinutes}m`;
  
  // 从KV获取AI调用统计
  const aiCalls = await getAICallsLastHour();
  
  // 获取KV读写统计
  const kvStats = await getKVStats();
  
  // 获取客服在线状态
  const agentStatus = await getAgentStatus();
  
  // 检查是否有活跃警报
  const alerts = await getRecentAlerts();
  const alertActive = alerts.length > 0;
  
  // 判断系统总体状态
  const status = alertActive ? "warning" : "ok";
  
  return new Response(JSON.stringify({
    "worker_uptime": workerUptime,
    "ai_calls_last_hour": aiCalls,
    "kv_reads_min": kvStats.readsPerMin,
    "kv_writes_min": kvStats.writesPerMin,
    "agent_online": agentStatus.onlineCount,
    "errors_detected": alerts.length,
    "alert_active": alertActive,
    "status": status
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// 辅助函数
async function getAICallsLastHour() {
  try {
    // 实现从KV获取最近一小时AI调用统计
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    let count = 0;
    
    const logs = await KV_STORE.list({
      prefix: 'ai-call:',
      limit: 1000
    });
    
    for (const key of logs.keys) {
      const timestamp = key.name.split(':')[1];
      if (parseInt(timestamp) > oneHourAgo) {
        count++;
      }
    }
    
    return count;
  } catch (e) {
    console.error('Error getting AI calls:', e);
    return 0;
  }
}

async function getKVStats() {
  // 实现KV读写统计
  return {
    readsPerMin: 24,  // 实际实现中应从计数器获取
    writesPerMin: 6
  };
}

async function getAgentStatus() {
  // 实现客服在线状态检查
  return { onlineCount: 3 };
}

async function getRecentAlerts() {
  // 获取最近的警报
  try {
    const alerts = await KV_STORE.list({
      prefix: 'alert:',
      limit: 10
    });
    return alerts.keys;
  } catch (e) {
    console.error('Error getting alerts:', e);
    return [];
  }
}
```

### 2. `/alert-log` 接口实现

```javascript
// Worker端实现 - 返回异常警报列表
async function handleAlertLog() {
  try {
    const alertKeys = await KV_STORE.list({
      prefix: 'alert:',
      limit: 50
    });
    
    const alerts = [];
    for (const key of alertKeys.keys) {
      try {
        const alertData = await KV_STORE.get(key.name, 'json');
        if (alertData) {
          alerts.push(alertData);
        }
      } catch (e) {
        console.error(`Error processing alert ${key.name}:`, e);
      }
    }
    
    // 按时间倒序排列
    alerts.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    return new Response(JSON.stringify(alerts), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Error getting alert log:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 3. `/system-usage` 接口实现

```javascript
// Worker端实现 - 返回KV/R2使用情况
async function handleSystemUsage() {
  try {
    // 统计KV键数量
    let kvKeys = 0;
    let cursor = undefined;
    
    do {
      const listResult = await KV_STORE.list({
        limit: 1000,
        cursor: cursor
      });
      kvKeys += listResult.keys.length;
      cursor = listResult.cursor;
    } while (cursor);
    
    // 模拟R2统计（实际实现需连接R2）
    const r2Stats = {
      files: 412,
      spaceMb: 67.4
    };
    
    return new Response(JSON.stringify({
      "kv_keys": kvKeys,
      "r2_files": r2Stats.files,
      "r2_space_mb": r2Stats.spaceMb
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Error getting system usage:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 4. `/ai-activity` 接口实现

```javascript
// Worker端实现 - 返回AI调用活动统计
async function handleAIActivity() {
  try {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    let successCount = 0;
    let failureCount = 0;
    let lastFailureTime = null;
    
    const logs = await KV_STORE.list({
      prefix: 'ai-call:',
      limit: 1000
    });
    
    for (const key of logs.keys) {
      const timestamp = key.name.split(':')[1];
      if (parseInt(timestamp) > oneHourAgo) {
        try {
          const callData = await KV_STORE.get(key.name, 'json');
          if (callData) {
            if (callData.success) {
              successCount++;
            } else {
              failureCount++;
              if (!lastFailureTime || new Date(callData.timestamp) > new Date(lastFailureTime)) {
                lastFailureTime = callData.timestamp;
              }
            }
          }
        } catch (e) {
          console.error(`Error processing ${key.name}:`, e);
        }
      }
    }
    
    const isFailing = failureCount >= 5;
    
    return new Response(JSON.stringify({
      "total_calls": successCount + failureCount,
      "success_count": successCount,
      "failure_count": failureCount,
      "failure_rate": (successCount + failureCount) > 0 ? failureCount / (successCount + failureCount) : 0,
      "last_failure": lastFailureTime,
      "is_failing": isFailing
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Error getting AI activity:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### 5. `/agent-activity` 接口实现

```javascript
// Worker端实现 - 返回客服活动统计
async function handleAgentActivity() {
  try {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    const agents = {};
    
    const logs = await KV_STORE.list({
      prefix: 'agent-heartbeat:',
      limit: 1000
    });
    
    for (const key of logs.keys) {
      try {
        const heartbeatData = await KV_STORE.get(key.name, 'json');
        if (heartbeatData) {
          const agentId = heartbeatData.agent_id;
          const timestamp = Date.parse(heartbeatData.timestamp);
          
          if (!agents[agentId] || timestamp > Date.parse(agents[agentId].last_seen)) {
            agents[agentId] = {
              agent_id: agentId,
              last_seen: heartbeatData.timestamp,
              is_online: timestamp > oneMinuteAgo
            };
          }
        }
      } catch (e) {
        console.error(`Error processing agent heartbeat:`, e);
      }
    }
    
    const onlineAgents = Object.values(agents).filter(agent => agent.is_online);
    const offlineAgents = Object.values(agents).filter(agent => !agent.is_online);
    
    return new Response(JSON.stringify({
      "total_agents": Object.keys(agents).length,
      "online_count": onlineAgents.length,
      "offline_count": offlineAgents.length,
      "online_agents": onlineAgents,
      "offline_agents": offlineAgents
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Error getting agent activity:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## 🎛 五、中控插件 UI 设计

### 在 jev_panel.html 中添加系统监管模块

```html
<!-- 在合适位置添加系统监管面板 -->
<div id="supervisor-panel" class="panel-section bg-gray-900 text-green-400 rounded-lg p-3 mb-4">
  <h3 class="text-lg font-bold mb-2">🛰️ 系统内部监管</h3>
  <div id="sys-status" class="space-y-1 mb-3"></div>
  <div id="alert-area" class="bg-red-900 text-red-300 p-2 rounded hidden"></div>
  <div class="flex space-x-2">
    <button onclick="refreshSupervisor()" class="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-600">刷新状态</button>
    <button onclick="showAlertLog()" class="px-3 py-1 bg-purple-700 text-white rounded hover:bg-purple-600">查看警报</button>
    <button onclick="showSystemUsage()" class="px-3 py-1 bg-green-700 text-white rounded hover:bg-green-600">资源使用</button>
  </div>
</div>

<!-- 警报日志模态框 -->
<div id="alert-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 hidden">
  <div class="bg-gray-800 text-white rounded-lg p-4 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold">🚨 系统警报日志</h3>
      <button onclick="closeAlertModal()" class="text-2xl">×</button>
    </div>
    <div id="alert-log-content"></div>
  </div>
</div>

<!-- 系统使用模态框 -->
<div id="usage-modal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 hidden">
  <div class="bg-gray-800 text-white rounded-lg p-4 max-w-md w-full">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold">📊 系统资源使用</h3>
      <button onclick="closeUsageModal()" class="text-2xl">×</button>
    </div>
    <div id="system-usage-content"></div>
  </div>
</div>

<script>
// 主刷新函数
async function refreshSupervisor() {
  try {
    const res = await fetch('/supervisor-status');
    if (!res.ok) throw new Error('Network response was not ok');
    
    const data = await res.json();
    const statusElement = document.querySelector('#sys-status');
    const alertArea = document.querySelector('#alert-area');
    const panel = document.querySelector('#supervisor-panel');
    
    // 更新状态显示
    statusElement.innerHTML = `
      <div>Worker Uptime: ${data.worker_uptime}</div>
      <div>AI 调用: ${data.ai_calls_last_hour} (过去1小时)</div>
      <div>KV 写入: ${data.kv_writes_min}/min</div>
      <div>客服在线: ${data.agent_online}</div>
      <div>状态: ${getStatusIndicator(data.status)}</div>
    `;
    
    // 更新警报区域
    if (data.alert_active) {
      alertArea.innerText = "🚨 异常警报已触发！";
      alertArea.classList.remove('hidden');
      panel.classList.add('border-2', 'border-red-500');
      
      // 添加闪烁效果
      panel.classList.add('alert-blink');
      setTimeout(() => {
        panel.classList.remove('alert-blink');
      }, 3000);
    } else {
      alertArea.classList.add('hidden');
      panel.classList.remove('border-2', 'border-red-500');
    }
    
  } catch (error) {
    console.error('系统监管刷新失败:', error);
    document.querySelector('#sys-status').innerHTML = `<div class="text-red-500">系统监管服务不可用</div>`;
  }
}

// 获取状态指示器
function getStatusIndicator(status) {
  switch(status) {
    case 'ok':
      return '✅ 正常';
    case 'warning':
      return '⚠️ 警告';
    case 'error':
      return '❌ 错误';
    default:
      return '❓ 未知';
  }
}

// 显示警报日志
async function showAlertLog() {
  try {
    const res = await fetch('/alert-log');
    const alerts = await res.json();
    const content = document.querySelector('#alert-log-content');
    
    if (alerts.length === 0) {
      content.innerHTML = '<div class="text-green-400">暂无警报记录</div>';
    } else {
      content.innerHTML = alerts.map(alert => `
        <div class="bg-gray-700 p-2 mb-2 rounded">
          <div class="font-bold">${formatAlertType(alert.type)}</div>
          <div class="text-sm text-gray-300">时间: ${formatTime(alert.time)}</div>
          ${alert.details ? `<div>详情: ${alert.details}</div>` : ''}
          ${alert.agent ? `<div>客服: ${alert.agent}</div>` : ''}
        </div>
      `).join('');
    }
    
    document.querySelector('#alert-modal').classList.remove('hidden');
    
  } catch (error) {
    console.error('获取警报日志失败:', error);
  }
}

// 显示系统使用情况
async function showSystemUsage() {
  try {
    const res = await fetch('/system-usage');
    const usage = await res.json();
    const content = document.querySelector('#system-usage-content');
    
    content.innerHTML = `
      <div class="space-y-2">
        <div>KV 键数量: ${usage.kv_keys}</div>
        <div>R2 文件数量: ${usage.r2_files}</div>
        <div>R2 存储空间: ${usage.r2_space_mb} MB</div>
      </div>
    `;
    
    document.querySelector('#usage-modal').classList.remove('hidden');
    
  } catch (error) {
    console.error('获取系统使用情况失败:', error);
  }
}

// 关闭模态框
function closeAlertModal() {
  document.querySelector('#alert-modal').classList.add('hidden');
}

function closeUsageModal() {
  document.querySelector('#usage-modal').classList.add('hidden');
}

// 工具函数
function formatAlertType(type) {
  const typeMap = {
    'ai_failure': 'AI 调用失败',
    'agent_offline': '客服离线',
    'kv_error': 'KV 存储错误',
    'worker_error': 'Worker 异常'
  };
  return typeMap[type] || type;
}

function formatTime(timeStr) {
  const date = new Date(timeStr);
  return date.toLocaleString('zh-CN');
}

// 添加CSS样式
const style = document.createElement('style');
style.textContent = `
  .alert-blink {
    animation: blink 1s ease-in-out 3;
  }
  
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;
document.head.appendChild(style);

// 每30秒自动刷新
setInterval(refreshSupervisor, 30000);

// 页面加载时执行一次
window.addEventListener('load', refreshSupervisor);
</script>
```

## 🧠 六、自动报警与自修复逻辑

### Worker端报警队列实现

```javascript
// 报警队列管理
class AlertManager {
  constructor(kvStore) {
    this.kvStore = kvStore;
    this.maxAlerts = 100; // 最大保存警报数
  }
  
  async addAlert(alertData) {
    const alertId = `alert:${Date.now()}`;
    const fullAlert = {
      ...alertData,
      id: alertId,
      time: alertData.time || new Date().toISOString()
    };
    
    // 保存警报
    await this.kvStore.put(alertId, JSON.stringify(fullAlert));
    
    // 清理旧警报
    await this.cleanupOldAlerts();
    
    return fullAlert;
  }
  
  async cleanupOldAlerts() {
    const alerts = await this.kvStore.list({
      prefix: 'alert:',
      limit: this.maxAlerts + 10
    });
    
    if (alerts.keys.length > this.maxAlerts) {
      // 删除最旧的警报
      const alertsToDelete = alerts.keys.slice(this.maxAlerts);
      for (const key of alertsToDelete) {
        await this.kvStore.delete(key.name);
      }
    }
  }
  
  async getRecentAlerts(limit = 50) {
    const alerts = await this.kvStore.list({
      prefix: 'alert:',
      limit: limit
    });
    
    const alertData = [];
    for (const key of alerts.keys) {
      try {
        const data = await this.kvStore.get(key.name, 'json');
        if (data) alertData.push(data);
      } catch (e) {
        console.error(`Error retrieving alert ${key.name}:`, e);
      }
    }
    
    // 按时间倒序排列
    return alertData.sort((a, b) => new Date(b.time) - new Date(a.time));
  }
}

// 初始化警报管理器
const alertManager = new AlertManager(KV_STORE);

// AI失败检测与自修复
async function checkAIFailures() {
  const aiActivity = await handleAIActivity(); // 重用现有函数获取AI活动
  
  if (aiActivity.failure_count >= 5) {
    // 添加警报
    await alertManager.addAlert({
      type: "ai_failure",
      count: aiActivity.failure_count,
      details: `AI连续失败${aiActivity.failure_count}次`,
      time: new Date().toISOString()
    });
    
    // 尝试自动修复
    try {
      await attemptAIRestart();
    } catch (e) {
      console.error('Failed to restart AI:', e);
    }
  }
}

// 客服离线检测
async function checkAgentStatus() {
  const agentActivity = await handleAgentActivity(); // 重用现有函数
  
  for (const agent of agentActivity.offline_agents) {
    const lastSeen = new Date(agent.last_seen);
    const now = new Date();
    const minutesOffline = (now - lastSeen) / (1000 * 60);
    
    if (minutesOffline > 1) { // 超过1分钟离线
      await alertManager.addAlert({
        type: "agent_offline",
        agent: agent.agent_id,
        details: `离线时间: ${minutesOffline.toFixed(1)}分钟`,
        time: now.toISOString()
      });
    }
  }
}

// 尝试重启AI服务
async function attemptAIRestart() {
  try {
    // 记录修复尝试
    await KV_STORE.put(`repair:${Date.now()}`, JSON.stringify({
      type: "ai_restart",
      time: new Date().toISOString(),
      status: "attempted"
    }));
    
    // 调用本地重启API
    const response = await fetch("http://localhost:1822/restart-ai", {
      method: "POST",
      timeout: 5000
    });
    
    if (response.ok) {
      // 更新修复状态
      await KV_STORE.put(`repair:${Date.now()}`, JSON.stringify({
        type: "ai_restart",
        time: new Date().toISOString(),
        status: "success"
      }));
      
      return true;
    }
  } catch (e) {
    console.error('AI restart attempt failed:', e);
  }
  
  return false;
}

// 定时检查任务
async function scheduledChecks() {
  await checkAIFailures();
  await checkAgentStatus();
  
  // 记录每日日志
  await recordDailyLog();
}

// 记录每日系统日志
async function recordDailyLog() {
  const today = new Date().toISOString().split('T')[0];
  const status = await handleSupervisorStatus();
  const statusData = await status.json();
  
  // 获取今日警报数量
  const alerts = await alertManager.getRecentAlerts();
  const todayAlerts = alerts.filter(alert => 
    alert.time.startsWith(today)
  );
  
  // 获取自动修复次数
  const repairs = await KV_STORE.list({
    prefix: 'repair:',
    limit: 100
  });
  const todayRepairs = repairs.keys.filter(key => 
    key.name.includes(today)
  );
  
  // 保存每日汇总
  await KV_STORE.put(`log:supervisor:${today}`, JSON.stringify({
    date: today,
    system_status: statusData.status,
    alerts_today: todayAlerts.length,
    auto_repaired: todayRepairs.length,
    uptime: statusData.worker_uptime,
    ai_calls: statusData.ai_calls_last_hour,
    agents_online: statusData.agent_online
  }));
}
```

## 📊 七、监控界面显示效果

### 正常状态显示

```
🛰️ 系统内部监管
--------------------------------
Worker Uptime: 3h 42m
AI 调用次数: 18 (过去1小时)
KV 写入速率: 6/min
客服在线人数: 3
系统状态: ✅ 正常
--------------------------------
无异常警报
```

### 异常状态显示

```
🚨 [15:32] AI 识别模块响应超时
🚨 [15:34] 客服 Alice 离线超过60秒
⚙️ 系统已尝试自动修复
```

## ⚙️ 八、TRAE 提示词（执行版）

> ⚙️ **TRAE 提示词：JEV 内部监管插件设计任务**
> 
> 请执行以下任务：
> 1️⃣ 在 Worker 中创建以下接口：
>    • `/supervisor-status`（系统运行快照）
>    • `/system-usage`（KV / R2 使用情况）
>    • `/alert-log`（异常报警列表）
> 2️⃣ 实现自动检测逻辑：
>    • AI 连续失败 >5 次 → 触发报警
>    • 客服离线 >60 秒 → 报警
> 3️⃣ 在 jev_panel.html 增加模块 "🛰️ 系统内部监管"；
> 4️⃣ 每 30 秒自动刷新；
> 5️⃣ 如果检测到警报，则闪烁红灯提示；
> 6️⃣ 自动调用 `/restart-ai` 或 `/restart-agent` 尝试修复；
> 7️⃣ 所有日志写入 `log:supervisor:YYYY-MM-DD`；
> 8️⃣ 输出系统汇总：
> 
> ```json
> {
>   "system_status": "ok",
>   "alerts_today": 0,
>   "auto_repaired": 1,
>   "uptime": "3h42m"
> }
> ```
> 
> 目标：
> 实现一个 **自检测、自报警、自修复** 的中控监管插件，
> 让系统在无人干预时也能自我巡逻与维护。

## ✅ 九、完成后的效果

* 中控面板实时显示系统运行健康状态
* 自动检测异常并修复
* 所有行为写入 KV 日志
* 可扩展未来加"AI 日志分析 / 趋势图"

## 🔄 十、与现有系统集成

1. 在 Worker 主函数中集成新接口：

```javascript
// Worker主函数
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 现有路由...
    
    // 内部监管插件路由
    if (path === '/supervisor-status') return handleSupervisorStatus(request, env, ctx);
    if (path === '/system-usage') return handleSystemUsage(request, env, ctx);
    if (path === '/alert-log') return handleAlertLog(request, env, ctx);
    if (path === '/ai-activity') return handleAIActivity(request, env, ctx);
    if (path === '/agent-activity') return handleAgentActivity(request, env, ctx);
    
    // 定期执行检查任务
    ctx.waitUntil(scheduledChecks(env));
    
    // 其他处理...
  }
};
```

## 🔮 十一、未来扩展建议

1. **AI 日志分析**：添加机器学习模型分析日志模式，预测潜在故障
2. **趋势图表**：集成 Chart.js 在中控面板显示系统使用趋势
3. **阈值配置**：允许管理员自定义各监控指标的报警阈值
4. **多级别告警**：实现不同严重程度的警报级别和处理策略
5. **远程通知**：集成邮件/短信通知功能，在关键问题发生时通知管理员

---

📝 **文档版本**: 2025.11.06
🔍 **阶段标识**: JEV-L11-C
🎯 **状态**: 待执行

完成后请输出执行结果，确保内部监管插件正常运行。