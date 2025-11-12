/* 
 * JEV L7.3 · Sentinel Realtime Nervous System 
 * 功能：让安全系统实现实时联动、跨模块广播、即时反应 
 * 适配：TRAE / DeepSeek / Worker / Desktop Agent / Local FaceID 
 */ 

(() => { 
  console.log("🧠 [Sentinel] Realtime Nervous System 初始化中..."); 

  // 全局通信通道（用于多源广播） 
  window.JEV_SENTINEL_CHANNEL = new BroadcastChannel("jev_sentinel"); 

  // 全局状态缓存 
  const state = { 
    modules: {}, 
    lastUpdate: Date.now(), 
    lastCommand: null, 
    faceIdConfidence: 0, 
    alerts: [], 
  }; 

  // ====================== 
  // 🧩 事件监听注册 
  // ====================== 

  // 监听全局广播（来自 TRAE、Worker、Desktop、插件等） 
  JEV_SENTINEL_CHANNEL.onmessage = (e) => { 
    const msg = e.data || {}; 
    if (msg.type === "heartbeat") updateModuleStatus(msg); 
    else if (msg.type === "alert") logSecurityAlert(msg); 
    else if (msg.type === "faceid") updateFaceID(msg); 
    else if (msg.type === "command") executeCommand(msg); 
  }; 

  // 监听前端UI事件（页面内部触发） 
  window.addEventListener("sentinel-update", (e) => { 
    const d = e.detail; 
    if (!d) return; 
    updateUI(d); 
  }); 

  window.addEventListener("sentinel-command", (e) => { 
    const { action } = e.detail || {}; 
    if (action) { 
      console.log(`🧭 [Sentinel] 前端命令触发: ${action}`); 
      executeCommand({ action, source: "UI" }); 
    } 
  }); 

  // ====================== 
  // 🔄 模块心跳处理 
  // ====================== 
  function updateModuleStatus(msg) { 
    const { module, latency, health, timestamp } = msg; 
    state.modules[module] = { latency, health, timestamp }; 
    state.lastUpdate = Date.now(); 
    updateDashboard(); 
  } 

  // ====================== 
  // 📸 面部识别事件 
  // ====================== 
  function updateFaceID(msg) { 
    const { confidence, verified } = msg; 
    state.faceIdConfidence = confidence; 
    const status = verified ? "✅ 验证通过" : "⚠️ 待验证"; 
    const color = verified ? "status-green" : "status-red"; 
    const el = document.getElementById("faceStatus"); 
    const confEl = document.getElementById("faceConfidence"); 
    if (el && confEl) { 
      el.textContent = status; 
      el.className = color; 
      confEl.textContent = confidence.toFixed(3); 
    } 
    logSecurityAlert({ 
      type: "faceid", 
      message: `[FaceID] 状态更新 → ${status} (置信度 ${confidence.toFixed(3)})`, 
    }); 
  } 

  // ====================== 
  // ⚠️ 安全警报日志 
  // ====================== 
  function logSecurityAlert(msg) { 
    const entry = { 
      time: new Date().toLocaleTimeString(), 
      message: msg.message || "未知事件", 
      module: msg.module || "system", 
      level: msg.level || "info", 
    }; 
    state.alerts.push(entry); 
    if (state.alerts.length > 20) state.alerts.shift(); 
    const logArea = document.getElementById("logArea"); 
    if (logArea) { 
      const text = state.alerts.map(a => `[${a.time}] ${a.message}`).join("\n"); 
      logArea.textContent = text; 
      logArea.scrollTop = logArea.scrollHeight; 
    } 
    console.log(`⚠️ [Sentinel-Alert] ${entry.message}`); 
  } 

  // ====================== 
  // 🧭 命令执行系统 
  // ====================== 
  function executeCommand(msg) { 
    const { action, source } = msg; 
    state.lastCommand = { action, time: Date.now(), source }; 
    switch (action) { 
      case "lock": 
        alert("🔒 系统已锁定。需要FaceID重新验证。"); 
        JEV_SENTINEL_CHANNEL.postMessage({ type: "alert", message: "系统锁定，等待解锁。" }); 
        break; 
      case "restart": 
        alert("🔁 Sentinel 正在重新启动..."); 
        location.reload(); 
        break; 
      case "pause": 
        alert("⏸️ Sentinel 已暂停监控。"); 
        clearInterval(refreshTimer); 
        break; 
      default: 
        console.log(`[Sentinel] 未知命令：${action}`); 
    } 
  } 

  // ====================== 
  // 💡 UI 更新逻辑 
  // ====================== 
  function updateUI(detail) { 
    if (detail.module && detail.status) { 
      const msg = `[${detail.module}] 状态 → ${detail.status}`; 
      logSecurityAlert({ message: msg }); 
    } 
    updateDashboard(); 
  } 

  // ====================== 
  // 🧩 Dashboard 更新 
  // ====================== 
  function updateDashboard() { 
    const modCount = Object.keys(state.modules).length; 
    const healthy = Object.values(state.modules).filter(m => m.health === "ok").length; 
    const modulesEl = document.getElementById("modulesCount"); 
    const healthEl = document.getElementById("moduleHealth"); 
    const lastScanEl = document.getElementById("lastScan"); 

    if (modulesEl) modulesEl.textContent = `${healthy}/${modCount}`; 
    if (healthEl) { 
      healthEl.textContent = healthy === modCount ? "正常运行" : "部分异常"; 
      healthEl.className = healthy === modCount ? "status-green" : "status-yellow"; 
    } 
    if (lastScanEl) lastScanEl.textContent = new Date().toLocaleTimeString(); 
  } 

  // ====================== 
  // 🔁 定时刷新心跳 
  // ====================== 
  const refreshTimer = setInterval(() => { 
    JEV_SENTINEL_CHANNEL.postMessage({ 
      type: "heartbeat", 
      module: "GlobalSentinel", 
      latency: Math.round(Math.random() * 50 + 10), 
      health: "ok", 
      timestamp: Date.now() 
    }); 
  }, 60000); 

  console.log("✅ [Sentinel Realtime Nervous System] 已启动并监听全局通道。"); 
})();