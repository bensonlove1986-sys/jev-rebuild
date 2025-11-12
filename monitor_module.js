const WORKER_BASE = "https://jevshop.bensonlove1986.workers.dev/";
const CHECK_INTERVAL = 15000; // 15秒刷新
const LOG_CLEAN_INTERVAL = 3600000; // 1小时清理
let lastHeartbeat = 0;


const root = document.getElementById("monitor-root");
root.innerHTML = `
  <div class="monitor-header">
    <span>🧠 JEV L11C · 系统监控中心</span>
    <span id="monitor-timestamp"></span>
  </div>
  <div class="monitor-status" id="monitor-status">
    <div class="monitor-card"><div class="monitor-title">Worker</div><div class="monitor-value" id="val-worker">--</div></div>
    <div class="monitor-card"><div class="monitor-title">KV 存储</div><div class="monitor-value" id="val-kv">--</div></div>
    <div class="monitor-card"><div class="monitor-title">Heartbeat</div><div class="monitor-value" id="val-heart">--</div></div>
    <div class="monitor-card"><div class="monitor-title">日志</div><div class="monitor-value" id="val-log">--</div></div>
  </div>
  <div id="monitor-alert"></div>
`;


function setValue(id, val, ok = true) {
  const el = document.getElementById(id);
  el.textContent = val;
  el.style.color = ok ? "#00ffff" : "#ff6666";
}


async function checkEndpoint(path) {
  try {
    const resp = await fetch(WORKER_BASE + path, { method: "GET", cache: "no-cache" });
    if (!resp.ok) throw new Error(resp.status);
    const data = await resp.json();
    return { ok: true, data };
  } catch (e) {
    console.warn("Check failed:", path, e);
    return { ok: false, error: e };
  }
}


async function updateStatus() {
  const ts = new Date().toLocaleTimeString();
  document.getElementById("monitor-timestamp").textContent = ts;

  const [worker, kv, hb] = await Promise.all([
    checkEndpoint("ping"),
    checkEndpoint("kv-test"),
    checkEndpoint("heartbeat")
  ]);

  setValue("val-worker", worker.ok ? "在线" : "异常", worker.ok);
  setValue("val-kv", kv.ok ? "正常" : "错误", kv.ok);
  setValue("val-heart", hb.ok ? "活跃" : "中断", hb.ok);

  lastHeartbeat = hb.ok ? Date.now() : lastHeartbeat;
  const delay = Date.now() - lastHeartbeat;
  if (delay > 60000) showAlert("⚠️ 心跳中断超过 1 分钟，尝试自修复中…");
  else clearAlert();

  await cleanLogs();
}


function showAlert(msg) {
  const box = document.getElementById("monitor-alert");
  box.innerHTML = `<div class="monitor-alert">${msg}</div>`;
}


function clearAlert() {
  document.getElementById("monitor-alert").innerHTML = "";
}


async function cleanLogs() {
  const el = document.getElementById("val-log");
  el.textContent = "清理中…";
  // 模拟日志清理任务（可改为真实 /log-clean）
  await new Promise(r => setTimeout(r, 500));
  el.textContent = "已清理";
}


window.Monitor = {
  repair: async () => {
    showAlert("🛠 正在尝试重新连接...");
    await updateStatus();
    clearAlert();
  }
};


// 定时刷新与日志清理
setInterval(updateStatus, CHECK_INTERVAL);
setInterval(cleanLogs, LOG_CLEAN_INTERVAL);
updateStatus();