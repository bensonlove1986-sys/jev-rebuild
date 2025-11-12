// === JEV Control Center v11.1 ===
const RELAY_URL = "http://localhost:8080/Cloud_Relay/api/relay";
const AGENT_CONFIG = "./config/agents.json";
const LOG_PATH = "./control_audit.log";

// 初始化系统状态
async function initializeSystem() {
  // 设置模拟状态
  document.getElementById("worker-status").textContent = "Worker: 🟢 Online";
  document.getElementById("relay-status").textContent = "Relay: 🟢 Linked";
  document.getElementById("clients-status").textContent = "Clients: 🟢 Connected";
  
  // 加载客服列表
  await loadAgents();
  
  // 记录初始化日志
  log("System initialized - v11.1 Global Multi-Agent Edition");
}

// 加载客服账号列表
async function loadAgents() {
  try {
    const res = await fetch(AGENT_CONFIG);
    const agents = await res.json();
    const tbody = document.getElementById("agent-list");
    tbody.innerHTML = "";
    agents.forEach(a => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${a.name}</td>
        <td>${a.region}</td>
        <td>${a.language}</td>
        <td>${a.status === "active" ? "🟢" : "🔴"}</td>
        <td>
          <button onclick="syncAgent('${a.id}')">🔄 Sync</button>
          <button onclick="restartAgent('${a.id}')">🔄 Restart</button>
          <button onclick="pauseAgent('${a.id}')">⏸️ Pause</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    log(`Loaded ${agents.length} agents from configuration`);
  } catch (error) {
    log(`Error loading agents: ${error.message}`);
  }
}

// 同步客服数据
async function syncAgent(id) {
  try {
    // 模拟API调用
    log(`[SYNC] Initiating sync for agent ${id}`);
    setTimeout(() => {
      log(`[SYNC] Agent ${id}: OK`);
      // 记录到审计日志
      logToAudit(`SYNC_AGENT: ${id}`);
    }, 500);
  } catch (error) {
    log(`[SYNC] Agent ${id}: FAIL - ${error.message}`);
  }
}

// 重启客服模块
async function restartAgent(id) {
  log(`[RESTART] Initiating restart for agent ${id}`);
  setTimeout(() => {
    log(`[RESTART] Agent ${id}: OK`);
    logToAudit(`RESTART_AGENT: ${id}`);
  }, 1000);
}

// 暂停客服
async function pauseAgent(id) {
  log(`[PAUSE] Pausing agent ${id}`);
  setTimeout(() => {
    log(`[PAUSE] Agent ${id}: PAUSED`);
    logToAudit(`PAUSE_AGENT: ${id}`);
    // 重新加载列表以更新状态
    loadAgents();
  }, 500);
}

// 记录操作日志
function log(msg) {
  const panel = document.getElementById("log-panel");
  const line = document.createElement("div");
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  panel.prepend(line);
  
  // 限制日志行数
  if (panel.children.length > 50) {
    panel.removeChild(panel.lastChild);
  }
}

// 记录到审计日志
function logToAudit(action) {
  const logEntry = `${new Date().toISOString()} - ${action}\n`;
  console.log(`[AUDIT] ${logEntry}`);
  
  // 尝试写入文件（在浏览器环境中模拟）
  try {
    // 实际环境中可通过API调用服务器端写入
    fetch("/api/log-audit", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: logEntry
    }).catch(e => console.error("Failed to log to audit file:", e));
  } catch (e) {
    console.error("Audit logging failed:", e);
  }
}

// 定期刷新状态
setInterval(() => {
  loadAgents();
}, 30000); // 每30秒刷新一次

// 初始化系统
initializeSystem();