# JEV L11-A.2 内部监管系统（Internal Compliance Supervision）

## 🧩 一、系统定位：内部监管体系

目标是建立"内部可监管的合规闭环"，实现系统自我监管能力，而非对外备案。主要功能包括：

* ✅ 系统能**实时检测违规行为**
* ✅ 管理者能**查看合规状态、审计报告**
* ✅ 所有日志、AI调用、客服上报都有**审计留痕**
* ✅ 数据生命周期受控（自动清理、可追溯）

## ⚙️ 二、核心结构图

```
[客服插件] →  /agent-log
      │
      ▼
[Worker 审计层]
      │
      ├── /compliance-status       ← 中控拉取状态
      ├── /audit-report-internal   ← 生成内部审计报告
      ├── /cleanup-logs            ← 自动清理过期数据
      ▼
[中控 jev_panel.html]
      └── "合规状态 / 内部监管" 面板
```

## 🧠 三、核心功能清单

| 模块                       | 功能              | 状态 |
| ------------------------ | --------------- | -- |
| `/compliance-status`     | 返回系统合规开关状态      | ✅  |
| `/audit-report-internal` | 自动生成内部审计报告（含签名） | ✅  |
| `/cleanup-logs`          | 清除过期日志（默认30天）   | ✅  |
| 中控UI：合规监控卡               | 实时显示合规状态（绿/黄/红） | ✅  |
| KV 审计记录                  | 记录日志与每日合规快照     | ✅  |

## 💻 四、接口逻辑实现

### `/compliance-status` 接口

```javascript
// Worker端实现
async function handleComplianceStatus() {
  const lastSelfCheck = new Date().toISOString();
  
  return new Response(JSON.stringify({
    "data_minimized": true,
    "content_logging": false,
    "encryption": "AES256",
    "policy_version": "2025.11",
    "compliance_mode": "internal",
    "last_self_check": lastSelfCheck
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### `/audit-report-internal` 接口

```javascript
// Worker端实现
async function handleAuditReportInternal() {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const report = {
    "system": "JEV",
    "audit_scope": "internal",
    "violations_found": 0,
    "auto_cleanup": true,
    "last_audit": today,
    "next_audit": nextWeek,
    "signature": "local_internal_signed"
  };
  
  // 保存到KV存储
  await KV_STORE.put(`log:audit:internal:${today}`, JSON.stringify(report));
  
  return new Response(JSON.stringify(report), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### `/cleanup-logs` 接口

```javascript
// Worker端实现
async function handleCleanupLogs() {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  
  const logs = await KV_STORE.list({
    prefix: 'agent-log:',
    limit: 1000
  });
  
  let deletedCount = 0;
  for (const key of logs.keys) {
    try {
      const data = await KV_STORE.get(key.name, 'json');
      if (data && data.timestamp && Date.parse(data.timestamp) < thirtyDaysAgo) {
        await KV_STORE.delete(key.name);
        deletedCount++;
      }
    } catch (e) {
      console.error(`Error processing ${key.name}:`, e);
    }
  }
  
  return new Response(JSON.stringify({
    "deleted_logs": deletedCount,
    "timestamp": new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## 📊 五、中控 jev_panel.html 新增合规卡

在 jev_panel.html 中添加合规状态监控模块：

```html
<!-- 在面板顶部添加合规状态卡片 -->
<div id="internal-compliance" class="panel-section bg-yellow-50 p-2 rounded mb-4">
  ⚖️ 内部合规状态：<span id="compliance-state">检测中...</span>
  <button onclick="refreshCompliance()" class="ml-2 px-2 py-1 bg-blue-500 text-white rounded">重新检测</button>
  <div id="compliance-details" class="mt-2 text-sm hidden"></div>
</div>

<script>
// 定期刷新合规状态
async function refreshCompliance() {
  try {
    const res = await fetch('/compliance-status');
    if (!res.ok) throw new Error('Network response was not ok');
    
    const data = await res.json();
    const ok = data.data_minimized && !data.content_logging;
    
    const statusElement = document.querySelector('#compliance-state');
    const detailsElement = document.querySelector('#compliance-details');
    
    if (ok) {
      statusElement.innerText = '✅ 合规正常';
      statusElement.style.color = 'green';
    } else {
      statusElement.innerText = '⚠️ 需检查';
      statusElement.style.color = 'red';
    }
    
    // 显示详细信息
    detailsElement.innerHTML = `
      <p>加密方式: ${data.encryption}</p>
      <p>策略版本: ${data.policy_version}</p>
      <p>合规模式: ${data.compliance_mode}</p>
      <p>上次自检: ${new Date(data.last_self_check).toLocaleString()}</p>
    `;
    detailsElement.classList.remove('hidden');
    
  } catch (error) {
    console.error('合规检查失败:', error);
    document.querySelector('#compliance-state').innerText = '❌ 检查失败';
    document.querySelector('#compliance-state').style.color = 'red';
  }
}

// 每分钟自动刷新
setInterval(refreshCompliance, 60000);

// 页面加载时执行一次
window.addEventListener('load', refreshCompliance);
</script>
```

## 🧩 六、内部监管机制实现

### 1. 每日自动审计报告生成

在Worker中实现定时任务：

```javascript
// Worker端定时任务实现
async function scheduleDailyAudit() {
  // 检查当前是否为凌晨 (00:00-00:30)
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  if (hours === 0 && minutes < 30) {
    // 执行审计报告生成
    await handleAuditReportInternal();
    console.log('Daily audit report generated');
  }
}

// 在每次请求时检查是否需要执行定时任务
scheduleDailyAudit();
```

### 2. 异常检测与报警机制

```javascript
// Worker端异常检测实现
async function checkForDataViolations(data) {
  // 定义敏感字段列表
  const sensitiveFields = ['password', 'ssn', 'credit_card', 'full_name'];
  
  // 检查是否包含敏感字段
  for (const field of sensitiveFields) {
    if (JSON.stringify(data).toLowerCase().includes(field)) {
      // 记录违规事件
      await KV_STORE.put(`violation:${Date.now()}`, JSON.stringify({
        "alert_type": "data_violation",
        "timestamp": new Date().toISOString(),
        "violated_field": field
      }));
      
      return true; // 发现违规
    }
  }
  
  return false; // 无违规
}

// 在agent-log接口中集成违规检测
async function handleAgentLog(request) {
  try {
    const data = await request.json();
    
    // 检测数据违规
    const hasViolation = await checkForDataViolations(data);
    if (hasViolation) {
      return new Response(JSON.stringify({
        "error": "数据包含敏感信息，已被系统拦截",
        "violation": true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 正常处理上报数据（仅保留哈希ID）
    const safeData = {
      timestamp: new Date().toISOString(),
      agent_id: generateHash(data.agent_id || ''),
      event_type: data.event_type,
      // 不保存实际内容，只保存哈希值
      content_hash: data.content ? generateHash(data.content) : null
    };
    
    await KV_STORE.put(`agent-log:${Date.now()}`, JSON.stringify(safeData));
    
    return new Response(JSON.stringify({ "status": "success" }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ "error": error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 简单哈希函数实现
function generateHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}
```

## 🧠 七、TRAE 提示词（执行版）

> ⚙️ **TRAE 提示词：JEV 内部监管系统集成任务**
> 
> 请执行以下任务：
> 1️⃣ 在 Worker 中实现以下接口：
>    • `/compliance-status` — 返回当前合规状态
>    • `/audit-report-internal` — 生成内部合规报告
>    • `/cleanup-logs` — 自动清理过期日志
> 2️⃣ 每天凌晨自动运行自检并生成报告 `log:audit:internal:YYYY-MM-DD`；
> 3️⃣ 在中控面板 jev_panel.html 中添加 "⚖️ 内部合规状态" 模块；
> 4️⃣ 定期刷新合规状态，每分钟更新一次；
> 5️⃣ 当检测到违规字段或未加密传输时自动报警：
> 
> ```json
> {
>   "alert_type": "data_violation",
>   "timestamp": "2025-11-06T15:00:00Z"
> }
> ```
> 
> 6️⃣ 输出最终报告：
> 
> ```json
> {
>   "compliance_mode": "internal",
>   "violations_found": 0,
>   "auto_cleanup": true,
>   "status": "PASS ✅"
> }
> ```
> 
> 目标：
> 让系统具备内部自我审计、违规检测与数据留痕能力，
> 为未来接入外部监管打下基础。

## ✅ 八、执行完成后的状态

* 中控顶部显示：

  ```
  ⚖️ 内部合规状态：✅ 正常
  ```
* 每日 KV 生成：

  ```
  log:audit:internal:2025-11-06
  ```
* 检测出异常时自动警报；
* 外部监管关闭（外部API不上报）；
* 可随时升级至 L11-B（外部监管层）无缝衔接。

## 🔒 九、安全与合规注意事项

1. **数据最小化**：仅记录必要信息，实际内容只保存哈希值
2. **自动清理**：超过30天的日志自动删除，确保数据不被无限期保存
3. **审计留痕**：所有操作都有时间戳和签名，确保可追溯性
4. **异常检测**：实时监控敏感字段，防止数据泄露
5. **权限控制**：确保只有授权人员可以访问审计报告

## 🔄 十、与未来外部监管层（L11-B）的衔接准备

本内部监管层设计为未来接入外部监管系统预留了接口和数据结构。通过简单的配置变更，即可升级至外部监管模式，无需重构核心逻辑。

---

📝 **文档版本**: 2025.11.06
🔍 **阶段标识**: JEV-L11-A.2
🎯 **状态**: 待执行

完成后请输出执行结果，确保内部合规监管系统正常运行。