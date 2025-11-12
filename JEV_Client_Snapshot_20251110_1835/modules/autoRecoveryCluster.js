/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.566Z */
// modules/autoRecoveryCluster.js
import { RecoveryAgent } from "../lib/recoveryAgent.js";

export class JEVAutoRecoveryCluster {
  constructor() {
    this.recoveryAgents = {};
    this.history = [];
    this.interval = null;
  }

  init() {
    console.log("冒聼漏潞 [L6.7][AutoRecovery] 猫聡陋忙聞聢茅聸聠莽戮陇氓聢聺氓搂聥氓聦聳...");
    this.loadAgents();
    this.startWatcher();
  }

  loadAgents() {
    const modules = [
      "daoCollector",
      "realtimeTranslate",
      "aiAutoReply",
      "aiBridge",
      "uiDashboard",
      "watchdog"
    ];
    modules.forEach(id => (this.recoveryAgents[id] = new RecoveryAgent(id)));
  }

  startWatcher() {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.checkModules(), 12000);
  }

  async checkModules() {
    for (const [id, agent] of Object.entries(this.recoveryAgents)) {
      const health = await agent.getHealth();
      if (health < 0.6) {
        console.warn(`[AutoRecovery] ${id} 氓录聜氓赂赂茂录聦氓聬炉氓聤篓忙聛垄氓陇聧忙碌聛莽篓聥...`);
        const result = await agent.recover();
        this.logEvent(id, result ? "recovered" : "failed");
      }
    }
  }

  logEvent(id, result) {
    const entry = {
      id,
      result,
      timestamp: new Date().toISOString()
    };
    this.history.push(entry);
    localStorage.setItem("recovery_events", JSON.stringify(this.history));
    console.log(`[AutoRecovery] ${id} 芒聠聮 ${result}`);
  }
}

window.JEVAutoRecoveryCluster = new JEVAutoRecoveryCluster();
window.addEventListener("load", () => window.JEVAutoRecoveryCluster.init());