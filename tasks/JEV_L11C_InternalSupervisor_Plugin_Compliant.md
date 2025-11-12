# JEV_L11C_InternalSupervisor_Plugin_Compliant.md

## 🧠 任务概述

目标是设计一个 **JEV 中控内部监管插件 (Internal Supervisor Plugin)**，用于实时监控系统运行状态（Worker、KV、R2、AI、客服等），自动检测异常、记录日志、触发修复，并在中控面板中可视化显示。同时必须完全遵循 **数据合规原则（Data Compliance）**：不采集、不存储、不分析任何客户或客服个人隐私、聊天内容或业务敏感数据。

## ⚖️ 合规与隐私要求

1. **不记录客户消息内容**，只记录系统事件摘要（如："message_sent"、"ai_request"、"agent_online"）。
2. **客服信息脱敏处理**，仅使用 `agent_id`（如 `"agent_Alice"`），不使用真实姓名。
3. **所有日志写入 KV 时脱敏 + 加密**。
4. **禁止跨域访问未授权 API**。
5. **所有上报均需附带 `Authorization` Token**。
6. **保留周期：30天后自动清理。**
7. **所有监控数据仅限内部使用**，不上传外部服务器。

## 🧩 系统结构

```
┌─────────────────────────────┐
│ jev_panel.html              │
│   ├── 🛰️ Supervisor Panel    │ ← 实时展示系统健康状态
│   ├── ⚠️ Alerts Log          │ ← 异常提示窗口
│   └── 📊 Usage Monitor        │ ← 资源用量统计
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│ Worker (jev_worker.js)      │
│   ├── /supervisor-status     │ ← 返回系统快照
│   ├── /system-usage          │ ← KV / R2 占用信息
│   ├── /alert-log             │ ← 异常记录
│   ├── /cleanup-supervisor    │ ← 自动清理过期日志
│   └── /restart-module        │ ← 自修复接口
└─────────────────────────────┘
```

## 🧱 1️⃣ Worker 端接口设计

### `/supervisor-status`

返回系统当前健康状态（仅汇总指标）：

```json
{
  "system": "JEV",
  "worker_uptime": "3h 45m",
  "kv_reads_per_min": 22,
  "kv_writes_per_min": 5,
  "r2_storage_mb": 68.2,
  "ai_calls_hour": 16,
  "agents_online": 3,
  "alerts_active": 0,
  "status": "ok",
  "timestamp": "2025-11-06T15:30:00Z"
}
```

**实现代码：**

```javascript
// Worker接口: /supervisor-status
app.get('/supervisor-status', async (request) => {
  try {
    // 验证授权Token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SUPERVISOR_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // 获取系统状态数据（仅指标，无敏感信息）
    const kvStats = await getKVStats(env.JEVPI);
    const r2Stats = await getR2Stats(env.JEV_R2);
    const aiStats = await getAIStats();
    const agentStats = await getAgentStats();
    const alertCount = await getActiveAlertsCount();
    
    return new Response(JSON.stringify({
      system: "JEV",
      worker_uptime: formatUptime(workerStartTime),
      kv_reads_per_min: kvStats.readsPerMinute,
      kv_writes_per_min: kvStats.writesPerMinute,
      r2_storage_mb: r2Stats.storageMB,
      ai_calls_hour: aiStats.callsPerHour,
      agents_online: agentStats.onlineCount,
      alerts_active: alertCount,
      status: alertCount === 0 ? "ok" : "warning",
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // 记录错误但不暴露敏感信息
    await logError('supervisor_status_error', 'Error fetching system status');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### `/system-usage`

监控资源使用率（只含非敏感指标）：

```json
{
  "kv_keys": 1520,
  "r2_files": 437,
  "r2_space_mb": 72.5,
  "cpu_load": "medium",
  "memory_mb": 128,
  "status": "ok"
}
```

**实现代码：**

```javascript
// Worker接口: /system-usage
app.get('/system-usage', async (request) => {
  try {
    // 验证授权Token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SUPERVISOR_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // 获取资源使用情况
    const kvKeys = await countKVKeys(env.JEVPI);
    const r2Stats = await getR2Details(env.JEV_R2);
    const systemLoad = getSystemLoad();
    
    return new Response(JSON.stringify({
      kv_keys: kvKeys,
      r2_files: r2Stats.fileCount,
      r2_space_mb: r2Stats.totalSizeMB,
      cpu_load: systemLoad.cpuLevel,
      memory_mb: systemLoad.memoryUsageMB,
      status: checkResourceStatus(kvKeys, r2Stats.totalSizeMB, systemLoad)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await logError('system_usage_error', 'Error fetching system usage');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### `/alert-log`

记录近期系统异常：

```json
[
  { "type": "ai_timeout", "time": "2025-11-06T15:32Z", "details": "AI API timeout x3" },
  { "type": "agent_offline", "agent_id": "agent_Bob", "time": "2025-11-06T15:34Z" }
]
```

**实现代码：**

```javascript
// Worker接口: /alert-log
app.get('/alert-log', async (request) => {
  try {
    // 验证授权Token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SUPERVISOR_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // 获取最近的警报日志（最多50条，不包含敏感信息）
    const alerts = await getRecentAlerts(env.JEVPI, 50);
    
    return new Response(JSON.stringify(alerts), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await logError('alert_log_error', 'Error fetching alert logs');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### `/cleanup-supervisor`

自动清除过期日志：

```javascript
// Worker接口: /cleanup-supervisor
app.post('/cleanup-supervisor', async (request) => {
  try {
    // 验证授权Token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SUPERVISOR_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // 清理过期日志（30天）
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    let deletedCount = 0;
    
    // 清理系统日志
    for await (const key of env.JEVPI.list({ prefix: "log:supervisor:" })) {
      if (Date.now() - new Date(key.metadata?.timestamp || 0).getTime() > thirtyDaysAgo) {
        await env.JEVPI.delete(key.name);
        deletedCount++;
      }
    }
    
    // 清理警报日志
    for await (const key of env.JEVPI.list({ prefix: "alert:supervisor:" })) {
      if (Date.now() - new Date(key.metadata?.timestamp || 0).getTime() > thirtyDaysAgo) {
        await env.JEVPI.delete(key.name);
        deletedCount++;
      }
    }
    
    return new Response(JSON.stringify({
      deleted: deletedCount,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await logError('cleanup_error', 'Error during log cleanup');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

### `/restart-module`

由系统自动调用，用于自修复：

```json
{
  "module": "ai_service",
  "action": "restart",
  "result": "success",
  "timestamp": "2025-11-06T15:40Z"
}
```

**实现代码：**

```javascript
// Worker接口: /restart-module
app.post('/restart-module', async (request) => {
  try {
    // 验证授权Token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${SUPERVISOR_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const data = await request.json();
    const { module } = data;
    
    if (!module) {
      return new Response(JSON.stringify({ error: 'Module name required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 执行模块重启
    let result = 'success';
    try {
      await restartServiceModule(module);
      
      // 记录修复操作（脱敏）
      await env.JEVPI.put(
        `repair:${new Date().toISOString().split('T')[0]}`,
        JSON.stringify({
          module: module,
          action: 'restart',
          time: new Date().toISOString()
        }),
        { metadata: { type: 'repair' } }
      );
    } catch (e) {
      result = 'failed';
      await logError('restart_failed', `Failed to restart module: ${module}`);
    }
    
    return new Response(JSON.stringify({
      module: module,
      action: "restart",
      result: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    await logError('restart_module_error', 'Error in restart module');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

## 💻 2️⃣ 中控面板 jev_panel.html 设计

新增一个独立卡片模块：

```html
<div id="supervisor-panel" class="panel-section bg-gray-950 text-green-300 rounded-lg p-3">
  <h3>🛰️ 系统内部监管</h3>
  <div id="sys-status"></div>
  <div id="alerts"></div>
  <div id="usage"></div>
  <button class="btn btn-outline" onclick="refreshSupervisor()">刷新状态</button>
</div>
```

## 🎨 3️⃣ 样式建议 (Tailwind 简写)

```css
.panel-section {
  font-family: "JetBrains Mono", monospace;
  background-color: #0b0b0b;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 16px;
}
#alerts { color: #ff6b6b; margin-top: 10px; }
#sys-status div { margin-bottom: 4px; }
#usage div { color: #88f; }
```

## 🧠 4️⃣ 前端逻辑

```javascript
// 全局配置
const SUPERVISOR_TOKEN = 'internal_jev_supervisor_token'; // 实际使用中应安全存储

async function refreshSupervisor() {
  try {
    const [statusRes, usageRes, alertRes] = await Promise.all([
      fetch('/supervisor-status', { 
        headers: { 'Authorization': `Bearer ${SUPERVISOR_TOKEN}` } 
      }),
      fetch('/system-usage', { 
        headers: { 'Authorization': `Bearer ${SUPERVISOR_TOKEN}` } 
      }),
      fetch('/alert-log', { 
        headers: { 'Authorization': `Bearer ${SUPERVISOR_TOKEN}` } 
      })
    ]);
    
    if (!statusRes.ok || !usageRes.ok || !alertRes.ok) {
      throw new Error('Failed to fetch supervisor data');
    }
    
    const status = await statusRes.json();
    const usage = await usageRes.json();
    const alerts = await alertRes.json();

    // 更新系统状态显示
    document.querySelector('#sys-status').innerHTML = `
      <div>Worker运行时间: ${status.worker_uptime}</div>
      <div>AI 调用次数: ${status.ai_calls_hour}/小时</div>
      <div>客服在线: ${status.agents_online}</div>
      <div>系统状态: ${status.status === 'ok' ? '✅ 正常' : '⚠️ 异常'}</div>
    `;

    // 更新资源使用显示
    document.querySelector('#usage').innerHTML = `
      <div>KV 键数量: ${usage.kv_keys}</div>
      <div>R2 文件数: ${usage.r2_files}</div>
      <div>存储使用: ${usage.r2_space_mb} MB</div>
      <div>CPU 负载: ${usage.cpu_load}</div>
    `;

    // 更新警报显示
    document.querySelector('#alerts').innerHTML = 
      alerts.length === 0 ? '无异常警报' :
      alerts.map(a => `🚨 ${formatAlertType(a.type)} (${formatAlertTime(a.time)})${a.details ? `: ${a.details}` : ''}`).join('<br>');
  } catch (error) {
    console.error('Error refreshing supervisor data:', error);
    document.querySelector('#sys-status').innerHTML = '<div class="text-red-500">无法获取系统状态</div>';
  }
}

// 格式化辅助函数
function formatAlertType(type) {
  const typeMap = {
    'ai_timeout': 'AI响应超时',
    'agent_offline': '客服离线',
    'kv_error': 'KV存储错误',
    'r2_storage_full': '存储空间不足',
    'system_load_high': '系统负载过高'
  };
  return typeMap[type] || type;
}

function formatAlertTime(timeStr) {
  const date = new Date(timeStr);
  return date.toLocaleString();
}

// 定时刷新和初始化
setInterval(refreshSupervisor, 30000); // 每30秒刷新一次
document.addEventListener('DOMContentLoaded', refreshSupervisor);
```

## 🧮 5️⃣ 监控指标阈值定义

| 指标       | 正常范围     | 异常条件     | 触发行为                 |
| -------- | -------- | -------- | -------------------- |
| AI 调用失败率 | < 10%    | 连续失败 5 次 | 触发 `/restart-module` |
| KV 写入延迟  | < 500ms  | 超过 3 秒   | 报警                   |
| R2 存储占用  | < 500MB  | 超限       | 预警红灯                 |
| 客服心跳     | 每 30 秒一次 | 超时 60 秒  | agent_offline 警报     |

## 🚨 6️⃣ 报警逻辑（自修复 + 记录）

```javascript
// 异常检测与自修复逻辑
async function checkSystemHealth() {
  // 检查AI调用失败率
  if (ai_failures > 5) {
    // 记录警报（脱敏）
    await env.JEVPI.put(
      `alert:supervisor:${Date.now()}`, 
      JSON.stringify({
        type: "ai_failure", 
        count: ai_failures, 
        time: new Date().toISOString(),
        details: "连续失败5次"
      }),
      { metadata: { timestamp: new Date().toISOString() } }
    );
    
    // 触发自修复
    try {
      await fetch("/restart-module", { 
        method: "POST", 
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPERVISOR_TOKEN}`
        },
        body: JSON.stringify({ module: "ai_service" }) 
      });
      ai_failures = 0; // 重置失败计数器
    } catch (error) {
      console.error('Failed to restart AI service:', error);
    }
  }
  
  // 检查KV写入延迟
  if (kv_write_latency > 3000) {
    await logAlert('kv_latency', 'KV写入延迟超过3秒');
  }
  
  // 检查R2存储占用
  if (r2_storage_mb > 500) {
    await logAlert('r2_storage_full', `R2存储超限: ${r2_storage_mb}MB`);
  }
  
  // 检查客服心跳
  for (const agent of Object.values(agents)) {
    if (Date.now() - agent.lastHeartbeat > 60000) {
      await logAlert('agent_offline', `Agent ${agent.id} 超时`);
    }
  }
}

// 日志警报记录函数
async function logAlert(type, details) {
  try {
    await env.JEVPI.put(
      `alert:supervisor:${Date.now()}`,
      JSON.stringify({
        type: type,
        time: new Date().toISOString(),
        details: details
      }),
      { metadata: { timestamp: new Date().toISOString() } }
    );
  } catch (error) {
    console.error('Failed to log alert:', error);
  }
}
```

## 🧾 7️⃣ 日志存储策略

| 类型    | 键名格式                         | 内容     | 保留时长 |
| ----- | ---------------------------- | ------ | ---- |
| 系统状态  | `log:supervisor:YYYY-MM-DD`  | 每日状态汇总 | 30天  |
| 异常警报  | `alert:supervisor:timestamp` | 事件详情   | 15天  |
| 自修复记录 | `repair:YYYY-MM-DD`          | 模块重启结果 | 30天  |

## 🔐 8️⃣ 合规保护机制

| 安全策略  | 实现方式                          |
| ----- | ----------------------------- |
| 数据脱敏  | 所有 agent/customer 以匿名ID表示     |
| 不存消息  | 不记录 message.body、message.text |
| 传输加密  | 所有 fetch 使用 HTTPS + Token     |
| 数据最小化 | 仅保留必要运行指标                     |
| 定期清理  | `/cleanup-supervisor` 每日运行    |
| 内部访问  | 禁止跨域公开接口                      |

## 📅 9️⃣ 定时任务配置

```javascript
// 定时任务配置
async function setupCronJobs() {
  // 每小时检查一次系统健康
  scheduler.addJob('0 * * * *', checkSystemHealth);
  
  // 每日清理过期日志
  scheduler.addJob('0 0 * * *', async () => {
    try {
      await fetch('/cleanup-supervisor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPERVISOR_TOKEN}`
        }
      });
    } catch (error) {
      console.error('Failed to run cleanup job:', error);
    }
  });
  
  // 每小时生成系统状态报告
  scheduler.addJob('0 * * * *', generateDailyReport);
}
```

## 📊 🔟 完整集成示例

### 在 jev_panel.html 中添加内部监管插件

```html
<!-- 在jev_panel.html的适当位置添加 -->
<div id="supervisor-panel" class="panel-section bg-gray-950 text-green-300 rounded-lg p-3">
  <h3>🛰️ 系统内部监管</h3>
  <div id="sys-status"></div>
  <div id="alerts"></div>
  <div id="usage"></div>
  <button class="btn btn-outline" onclick="refreshSupervisor()">刷新状态</button>
</div>

<script>
// 插入前端逻辑代码
const SUPERVISOR_TOKEN = 'internal_jev_supervisor_token'; // 实际使用中应安全存储

async function refreshSupervisor() {
  try {
    const [statusRes, usageRes, alertRes] = await Promise.all([
      fetch('/supervisor-status', { 
        headers: { 'Authorization': `Bearer ${SUPERVISOR_TOKEN}` } 
      }),
      fetch('/system-usage', { 
        headers: { 'Authorization': `Bearer ${SUPERVISOR_TOKEN}` } 
      }),
      fetch('/alert-log', { 
        headers: { 'Authorization': `Bearer ${SUPERVISOR_TOKEN}` } 
      })
    ]);
    
    if (!statusRes.ok || !usageRes.ok || !alertRes.ok) {
      throw new Error('Failed to fetch supervisor data');
    }
    
    const status = await statusRes.json();
    const usage = await usageRes.json();
    const alerts = await alertRes.json();

    document.querySelector('#sys-status').innerHTML = `
      <div>Worker运行时间: ${status.worker_uptime}</div>
      <div>AI 调用次数: ${status.ai_calls_hour}/小时</div>
      <div>客服在线: ${status.agents_online}</div>
      <div>系统状态: ${status.status === 'ok' ? '✅ 正常' : '⚠️ 异常'}</div>
    `;

    document.querySelector('#usage').innerHTML = `
      <div>KV 键数量: ${usage.kv_keys}</div>
      <div>R2 文件数: ${usage.r2_files}</div>
      <div>存储使用: ${usage.r2_space_mb} MB</div>
      <div>CPU 负载: ${usage.cpu_load}</div>
    `;

    document.querySelector('#alerts').innerHTML = 
      alerts.length === 0 ? '无异常警报' :
      alerts.map(a => `🚨 ${formatAlertType(a.type)} (${formatAlertTime(a.time)})${a.details ? `: ${a.details}` : ''}`).join('<br>');
  } catch (error) {
    console.error('Error refreshing supervisor data:', error);
    document.querySelector('#sys-status').innerHTML = '<div class="text-red-500">无法获取系统状态</div>';
  }
}

function formatAlertType(type) {
  const typeMap = {
    'ai_timeout': 'AI响应超时',
    'agent_offline': '客服离线',
    'kv_error': 'KV存储错误',
    'r2_storage_full': '存储空间不足',
    'system_load_high': '系统负载过高'
  };
  return typeMap[type] || type;
}

function formatAlertTime(timeStr) {
  const date = new Date(timeStr);
  return date.toLocaleString();
}

setInterval(refreshSupervisor, 30000);
document.addEventListener('DOMContentLoaded', refreshSupervisor);
</script>
```

## 📋 TRAE 执行提示词

```
请执行以下操作:

1. 在 cloudflare_worker.js 中添加 `/supervisor-status`, `/system-usage`, `/alert-log`, `/cleanup-supervisor`, `/restart-module` 这五个接口的完整实现，确保所有实现符合数据最小化原则和隐私保护要求。

2. 在 jev_panel.html 中添加系统内部监管插件模块，包括HTML结构、CSS样式和JavaScript逻辑。

3. 确保所有接口都有严格的Authorization Token验证，禁止未授权访问。

4. 实现自动清理机制，确保日志不超过30天保留期。

5. 实现异常检测和自修复逻辑，当AI调用连续失败5次时自动触发重启。

6. 所有数据存储使用KV，并确保敏感信息脱敏处理。

7. 为worker添加定时任务，每日执行日志清理。

执行完成后请测试所有接口和UI功能是否正常工作。
```

## ✅ 执行完成后的效果

1. 中控面板 jev_panel.html 新增一个"系统内部监管"卡片，实时显示系统状态
2. Worker新增的五个监管接口可以正常响应并返回合规数据
3. 系统自动检测异常并触发修复
4. 所有日志数据经过脱敏处理并定期清理
5. 无客户隐私数据被采集或存储

## 🔒 安全与合规注意事项

1. 所有Authorization Token必须安全存储，不可硬编码在前端
2. 严禁在任何日志中记录客户聊天内容
3. 所有监控数据仅限内部使用，不上传外部服务器
4. 定期审查监控范围，确保符合最小化原则
5. 为所有API调用添加超时处理，避免阻塞
6. 实现错误边界，防止前端崩溃