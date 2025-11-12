const AGENT_BASE = "https://jevshop.bensonlove1986.workers.dev/";
const REFRESH_INTERVAL = 20000; // 每20秒刷新


const agentRoot = document.getElementById("agent-monitor-root");
agentRoot.innerHTML = `
  <div class="agent-header">
    <span>💬 JEV L11C-A1 · 客服监控中心</span>
    <span id="agent-timestamp"></span>
  </div>
  <div id="agent-status" class="agent-grid"></div>
`;


async function fetchSafe(path) {
  try {
    const r = await fetch(AGENT_BASE + path, { method: "GET", cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.warn("Agent fetch failed:", path, e);
    return null;
  }
}


function renderAgents(agents = [], convSummary = []) {
  const grid = document.getElementById("agent-status");
  const now = new Date().toLocaleTimeString();
  document.getElementById("agent-timestamp").textContent = now;

  grid.innerHTML = agents.map(a => {
    const summary = convSummary.find(c => c.agent_id === a.id);
    const aiRatio = summary ? `${summary.ai_ratio}%` : "--";
    const delay = summary ? `${summary.avg_delay}s` : "--";

    // 去隐私化的最近事件流
    const events = (summary?.events || [])
      .slice(0, 10)
      .map(ev => `
        <div class="timeline-item ${ev.type}">
          [${ev.time}] ${ev.type === "ai" ? "AI" : "人工"} 回复
        </div>`).join("");

    return `
      <div class="agent-card">
        <div class="agent-name">${a.name || "未知客服"}</div>
        <div class="agent-meta">
          状态：${a.online ? "🟢 在线" : "⚫ 离线"}<br>
          AI比例：${aiRatio}<br>
          平均延迟：${delay}
        </div>
        <div class="timeline">${events || "<i>暂无近期会话</i>"}</div>
      </div>
    `;
  }).join("");
}


async function updateAgents() {
  const [agents, convs] = await Promise.all([
    fetchSafe("agents/status"),
    fetchSafe("conversations/summary")
  ]);

  if (!agents) {
    agentRoot.innerHTML = `<div class="agent-header">无法连接监控服务。</div>`;
    return;
  }

  renderAgents(agents.data || [], convs?.data || []);
}


// 暴露刷新函数
window.MonitorAgent = {
  refresh: updateAgents
};


setInterval(updateAgents, REFRESH_INTERVAL);
updateAgents();