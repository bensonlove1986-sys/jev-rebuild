# 🧠 任务标识

JEV/2025-11-16/Auto-Command-Loop


---

## 🎯 执行目标

为 Cloudflare Worker 添加 `/auto-command` 模块，  
实现系统的**自执行能力**，使其能根据 `/auto-decision` 的结果，  
自动发送命令到本地服务、远程API或子系统，  
完成「感知 → 决策 → 执行」的完整闭环。


---

## 🔍 上下文说明

此模块基于：

- L7 Autonomous Decision Engine  
- `/auto-decision` 路由的输出结果
- 本地服务（Agent、AI服务等）
- 远程API（Daojie、GHL等）


核心逻辑：
> 系统不仅能思考和决策，还能**自主执行**——
> 就像有了双手，可以直接操作环境和其他系统。


---

## ⚙️ 操作步骤

1️⃣ 新增 `/auto-command` 路由；  
2️⃣ 从 KV 读取最近的决策记录 `log:decision:YYYY-MM-DD`；  
3️⃣ 根据决策类型执行对应命令：
    - **模块控制**：重启AI服务、Agent等
    - **系统优化**：清理缓存、重建索引
    - **外部调用**：通知Daojie执行任务
    - **紧急干预**：人工通知升级
4️⃣ 执行后记录结果到 `log:command:YYYY-MM-DD`；
5️⃣ 每日由Worker的 `scheduled()` 在 `/auto-decision` 后执行。


---

## 💻 Worker 代码块

```js

// === JEV Auto Command Loop ===

if (path === "/auto-command") {

  const result = await executeAutoCommands(env);

  return new Response(JSON.stringify(result, null, 2), {

    headers: { "Content-Type": "application/json" },

    status: 200,

  });

}


async function executeAutoCommands(env) {

  const today = new Date().toISOString().split("T")[0];
  const decisionLog = await env.JEVPI.get(`log:decision:${today}`, { type: "json" }) || [];
  
  // 只处理今天的最新决策
  const recentDecisions = decisionLog.filter(d => d.date === today);
  if (!recentDecisions.length) {
    return { success: true, message: "No recent decisions to execute", executed: 0 };
  }
  
  const commands = [];
  const executed = [];
  
  // 1. 解析决策生成命令
  for (const decision of recentDecisions) {
    const decisionCommands = generateCommandsFromDecision(decision);
    commands.push(...decisionCommands);
  }
  
  // 2. 执行命令
  for (const command of commands) {
    const result = await executeCommand(env, command);
    executed.push({
      command: command.type,
      target: command.target,
      params: command.params,
      success: result.success,
      message: result.message
    });
  }
  
  // 3. 记录执行结果
  await env.JEVPI.put(
    `log:command:${today}`, 
    JSON.stringify({
      timestamp: new Date().toISOString(),
      executed: executed,
      total: commands.length,
      success: executed.filter(e => e.success).length
    })
  );
  
  return {
    success: true,
    executed_commands: executed.length,
    successful: executed.filter(e => e.success).length,
    details: executed
  };
}

function generateCommandsFromDecision(decision) {
  const commands = [];
  
  if (!decision.decisions || !decision.decisions.length) return commands;
  
  for (const decisionText of decision.decisions) {
    if (decisionText.includes("Critical状态")) {
      commands.push({
        type: "restart_service",
        target: "ai_service",
        priority: "high",
        params: { timeout: 30000 }
      });
      commands.push({
        type: "send_alert",
        target: "admin",
        priority: "critical",
        params: { message: decisionText }
      });
    }
    
    if (decisionText.includes("Warning累计")) {
      commands.push({
        type: "optimize_cache",
        target: "system",
        priority: "medium",
        params: { refresh_rate: "fast" }
      });
    }
    
    if (decisionText.includes("稳定7天")) {
      commands.push({
        type: "system_tune",
        target: "performance",
        priority: "low",
        params: { mode: "economy" }
      });
    }
    
    if (decisionText.includes("系统表现优秀")) {
      commands.push({
        type: "send_notification",
        target: "performance_log",
        priority: "info",
        params: { message: "系统性能优化成功" }
      });
    }
  }
  
  return commands;
}

async function executeCommand(env, command) {
  try {
    switch (command.type) {
      case "restart_service":
        return await restartLocalService(env, command);
      case "send_alert":
        return await sendAdminAlert(env, command);
      case "optimize_cache":
        return await optimizeSystemCache(env, command);
      case "system_tune":
        return await tuneSystemParameters(env, command);
      case "send_notification":
        return await sendSystemNotification(env, command);
      case "remote_api_call":
        return await callRemoteApi(env, command);
      default:
        return { success: false, message: `Unknown command type: ${command.type}` };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// 命令执行函数实现
async function restartLocalService(env, command) {
  // 调用本地服务重启API
  const serviceUrl = env.SERVICE_API_URL || "http://localhost:3000";
  const response = await fetch(`${serviceUrl}/api/restart/${command.target}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command.params)
  });
  
  if (response.ok) {
    return { success: true, message: `${command.target} service restarted` };
  }
  return { success: false, message: `Failed to restart ${command.target}` };
}

async function sendAdminAlert(env, command) {
  // 发送管理员警报
  if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
    const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`;
    const response = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `🚨 ADMIN ALERT: ${command.params.message}`,
        parse_mode: "Markdown"
      })
    });
    
    if (response.ok) {
      return { success: true, message: "Admin alert sent via Telegram" };
    }
  }
  return { success: false, message: "Failed to send admin alert" };
}

async function optimizeSystemCache(env, command) {
  // 优化系统缓存
  await env.JEVPI.put("config:cache", JSON.stringify({
    refresh_rate: command.params.refresh_rate,
    last_optimized: new Date().toISOString()
  }));
  return { success: true, message: `Cache optimized to ${command.params.refresh_rate}` };
}

async function tuneSystemParameters(env, command) {
  // 调整系统参数
  const currentConfig = await env.JEVPI.get("config:auto", { type: "json" }) || {};
  
  if (command.params.mode === "economy") {
    currentConfig.log_level = "warn";
    currentConfig.sample_rate = 0.9;
  } else if (command.params.mode === "performance") {
    currentConfig.log_level = "info";
    currentConfig.sample_rate = 0.5;
  }
  
  await env.JEVPI.put("config:auto", JSON.stringify(currentConfig));
  return { success: true, message: `System tuned to ${command.params.mode} mode` };
}

async function sendSystemNotification(env, command) {
  // 发送系统通知
  const logKey = `log:notifications:${new Date().toISOString().split("T")[0]}`;
  const logs = await env.JEVPI.get(logKey, { type: "json" }) || [];
  logs.push({
    timestamp: new Date().toISOString(),
    target: command.target,
    message: command.params.message
  });
  await env.JEVPI.put(logKey, JSON.stringify(logs));
  return { success: true, message: "Notification logged" };
}

async function callRemoteApi(env, command) {
  // 调用远程API
  try {
    const response = await fetch(command.params.url, {
      method: command.params.method || "POST",
      headers: command.params.headers || { "Content-Type": "application/json" },
      body: JSON.stringify(command.params.body)
    });
    
    if (response.ok) {
      return { success: true, message: `Remote API call successful` };
    }
    return { success: false, message: `Remote API call failed` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```


---

## 🧾 验证方式


1️⃣ 配置必要的环境变量：


```
SERVICE_API_URL=http://localhost:3000
TELEGRAM_TOKEN=<bot_token>
TELEGRAM_CHAT_ID=<chat_id>
```


2️⃣ 手动触发命令执行：


```
https://jevshop.bensonlove1986.workers.dev/auto-command
```


3️⃣ 检查执行结果：


* 对应服务是否重启（如AI服务）；
* Telegram是否收到通知；
* KV中`config:cache`和`config:auto`是否更新；
* KV中`log:command:YYYY-MM-DD`是否有执行记录。


---

## 🧱 任务完成标准


| 项目    | 要求                                    |
| ----- | ------------------------------------- |
| 命令生成 | 能根据决策日志正确生成对应命令                      |
| 服务控制 | 能重启本地服务（AI、Agent等）                   |
| 系统优化 | 能调整缓存和系统参数                           |
| 外部通知 | 能发送Telegram警报和通知                    |
| 执行日志 | 完整记录命令执行结果                           |
| 错误处理 | 单个命令失败不影响整体执行                        |


---

## 💬 附加说明


此模块标志着 JEV 系统具备了**完整的自主行为能力**：


1. **感知**：通过日志和监控收集信息
2. **分析**：使用Insight系统识别模式和问题
3. **决策**：由Auto-Decision模块做出判断
4. **执行**：通过Auto-Command直接操作环境
5. **反馈**：记录执行结果形成闭环学习


系统现在不再只是一个观察者和分析师，而是一个能**自主行动**的智能体，
可以：


* 发现问题时主动修复（如重启故障服务）
* 性能下降时自动优化（如调整缓存策略）
* 状态异常时及时告警（如通知管理员）
* 运行良好时记录成功经验（用于未来学习）


这是AI系统向真正自主智能体进化的关键一步，
形成了一个完整的「智能控制系统」，
能够在不需要人工干预的情况下独立运行和维护自身。


---

## 🔮 未来展望


L7.5阶段完成后，JEV系统已具备完整的自主控制能力。
未来可考虑：


* **L8: 预测性维护**：不仅处理当前问题，还能预测潜在故障并提前预防
* **L8.5: 多智能体协作**：多个JEV实例协同工作，共享经验和资源
* **L9: 自主学习系统**：通过机器学习不断改进决策模型和执行策略
* **L9.5: 元认知能力**：系统能够反思自身的决策过程并优化决策方法


---

系统至此完成了从「数据收集」到「自主行动」的全周期进化，
成为一个**真正的自主智能体系统**。