/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.623Z */
(function(){
  const MODULE_ID = "multiChannelCollector";
  const MultiCollector = {
    channels: {},
    messageCount: 0,
    init(){
      console.log(`[L6.4][${MODULE_ID}] 氓陇職茅聙職茅聛聯茅聡聡茅聸聠忙篓隆氓聺聴氓聬炉氓聤篓`);
      this.loadAdapters();
      this.startPolling();
      window.dispatchEvent(new CustomEvent("jev-module-ready",{detail:{module:MODULE_ID}}));
    },
    async loadAdapters(){
      const adapters = [
        "daoJieAdapter.js",
        "whatsappAdapter.js",
        "telegramAdapter.js",
        "facebookAdapter.js"
      ];
      for(const file of adapters){
        try{
          // 氓聤篓忙聙聛氓炉录氓聟楼茅聙聜茅聟聧氓聶篓
          const script = document.createElement('script');
          script.type = 'module';
          script.src = `./channelAdapters/${file}?t=${Date.now()}`;
          script.onload = async () => {
            // 盲陆驴莽聰篓氓聟篓氓卤聙氓聫聵茅聡聫盲赂麓忙聴露氓颅聵氓聜篓茅聙聜茅聟聧氓聶篓氓庐聻盲戮聥
            const adapter = window.__tempAdapter;
            if (adapter) {
              this.channels[adapter.id] = adapter;
              console.log(`[Collector] 氓聤聽猫陆陆茅聙聜茅聟聧氓卤聜: ${adapter.id}`);
              adapter.init?.(this.onMessage.bind(this));
              window.__tempAdapter = null; // 忙赂聟莽聬聠盲赂麓忙聴露氓聫聵茅聡聫
            }
          };
          script.onerror = (err) => {
            console.warn(`[Collector] 茅聙聜茅聟聧氓聶篓氓聤聽猫陆陆氓陇卤猫麓楼: ${file}`, err);
          };
          document.head.appendChild(script);
          
          // 莽颅聣氓戮聟氓聤聽猫陆陆氓庐聦忙聢聬
          await new Promise(resolve => setTimeout(resolve, 100));
        }catch(err){
          console.warn(`[Collector] 茅聙聜茅聟聧氓聶篓氓聤聽猫陆陆氓陇卤猫麓楼: ${file}`, err);
        }
      }
    },
    onMessage(msg){
      this.messageCount++;
      const unified = this.normalize(msg);
      console.log(`[Collector] 忙聰露氓聢掳忙露聢忙聛炉 (${unified.source}): ${unified.content}`);
      window.dispatchEvent(new CustomEvent("jev-message-collected",{detail:unified}));
      
      // 鏇存柊缁熻忙聤楼氓聭聤
      this.updateReport();
    },
    normalize(raw){
      return {
        id: raw.id || `msg_${Date.now()}`,
        source: raw.source || "unknown",
        sender: raw.sender || "anonymous",
        content: raw.content || "",
        timestamp: raw.timestamp || Date.now()
      };
    },
    startPolling(){
      setInterval(()=>this.healthCheck(), 120000); // 2氓聢聠茅聮聼忙拢聙忙聼楼盲赂聙忙卢隆
    },
    healthCheck(){
      const status = Object.entries(this.channels).map(([id,adapter])=>{
        return { id, healthy: adapter.isAlive ? adapter.isAlive() : false };
      });
      
      // 淇濆瓨氓聛楼氓潞路莽聤露忙聙聛
      localStorage.setItem("JEV_CHANNEL_HEALTH", JSON.stringify(status));
      
      // 莽聰聼忙聢聬茅聙職茅聛聯氓聛楼氓潞路忙聤楼氓聭聤
      try {
        const healthReportPath = "../logs/channel_health.json";
        fetch(healthReportPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(status)
        }).catch(e => console.warn("忙聴聽忙鲁聲淇濆瓨茅聙職茅聛聯氓聛楼氓潞路忙聤楼氓聭聤", e));
      } catch (e) {
        console.warn("忙聴聽忙鲁聲淇濆瓨茅聙職茅聛聯氓聛楼氓潞路忙聤楼氓聭聤", e);
      }
      
      // 猫搂娄氓聫聭氓聛楼氓潞路莽聤露忙聙聛盲潞聥盲禄露
      window.dispatchEvent(new CustomEvent("jev-channel-health",{detail:status}));
    },
    updateReport(){
      // 莽聰聼忙聢聬氓陇職茅聙職茅聛聯忙聤楼氓聭聤
      const report = {
        timestamp: new Date().toISOString(),
        channelsActive: Object.keys(this.channels).length,
        messagesReceived: this.messageCount,
        sources: Object.keys(this.channels)
      };
      
      // 淇濆瓨氓聢掳忙聴楼氓驴聴忙聳聡盲禄露
      try {
        const reportPath = "../logs/multichannel_report.json";
        fetch(reportPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        }).catch(e => console.warn("忙聴聽忙鲁聲淇濆瓨氓陇職茅聙職茅聛聯忙聤楼氓聭聤", e));
      } catch (e) {
        console.warn("忙聴聽忙鲁聲淇濆瓨氓陇職茅聙職茅聛聯忙聤楼氓聭聤", e);
      }
      
      // 鏇存柊忙聹卢氓聹掳氓颅聵氓聜篓
      localStorage.setItem("JEV_MULTICHANNEL_REPORT", JSON.stringify(report));
    }
  };
  
  // 盲驴庐忙聰鹿茅聙聜茅聟聧氓聶篓忙篓隆氓录聫盲禄楼茅聛驴氓聟聧ES忙篓隆氓聺聴氓炉录氓聟楼茅聴庐茅垄聵
  const originalAdapters = [
    {
      id: "daoJieAdapter.js",
      content: `
        window.__tempAdapter = {
          id: "DAOJIE",
          async init(onMessage){
            console.log("[DAOJIE] 莽聸聭氓聬卢盲赂颅...");
            window.addEventListener("daoJieMessage", e => onMessage({
              id: e.detail.id,
              source: "DAOJIE",
              sender: e.detail.sender,
              content: e.detail.body
            }));
          },
          isAlive(){ return true; }
        };
      `
    },
    {
      id: "whatsappAdapter.js",
      content: `
        window.__tempAdapter = {
          id: "WhatsApp",
          async init(onMessage){
            console.log("[WhatsApp] 忙篓隆忙聥聼莽聸聭氓聬卢 WABA API...");
            setInterval(()=>{
              const simulated = {
                id: "wa_"+Date.now(),
                source: "WhatsApp",
                sender: "+9198xxxxxx",
                content: "Hi, need price?",
                timestamp: Date.now()
              };
              onMessage(simulated);
            }, 15000);
          },
          isAlive(){ return true; }
        };
      `
    },
    {
      id: "telegramAdapter.js",
      content: `
        window.__tempAdapter = {
          id: "Telegram",
          async init(onMessage){
            console.log("[Telegram] 氓聢聺氓搂聥氓聦聳 Bot 莽聸聭氓聬卢盲赂颅...");
            setInterval(()=>{
              onMessage({
                id: "tg_"+Date.now(),
                source: "Telegram",
                sender: "@customer_bot",
                content: "Xin ch脙聽o, b谩潞隆n c脙鲁 h脙聽ng kh脙麓ng?"
              });
            }, 20000);
          },
          isAlive(){ return true; }
        };
      `
    },
    {
      id: "facebookAdapter.js",
      content: `
        window.__tempAdapter = {
          id: "Facebook",
          async init(onMessage){
            console.log("[Facebook] 忙篓隆忙聥聼莽聸聭氓聬卢 Messenger 忙露聢忙聛炉...");
            setTimeout(()=>onMessage({
              id: "fb_"+Date.now(),
              source: "Facebook",
              sender: "User-32",
              content: "Hello, need a quotation."
            }), 25000);
          },
          isAlive(){ return true; }
        };
      `
    }
  ];
  
  // 猫娄聠莽聸聳loadAdapters忙聳鹿忙鲁聲茂录聦盲陆驴莽聰篓氓聠聟猫聛聰猫聞職忙聹卢忙聳鹿氓录聫氓聤聽猫陆陆茅聙聜茅聟聧氓聶篓
  MultiCollector.loadAdapters = function() {
    originalAdapters.forEach(adapterConfig => {
      try {
        const script = document.createElement('script');
        script.textContent = adapterConfig.content;
        script.onload = () => {
          const adapter = window.__tempAdapter;
          if (adapter) {
            this.channels[adapter.id] = adapter;
            console.log(`[Collector] 氓聤聽猫陆陆茅聙聜茅聟聧氓卤聜: ${adapter.id}`);
            adapter.init?.(this.onMessage.bind(this));
            window.__tempAdapter = null;
          }
        };
        document.head.appendChild(script);
      } catch (err) {
        console.warn(`[Collector] 茅聙聜茅聟聧氓聶篓氓聤聽猫陆陆氓陇卤猫麓楼: ${adapterConfig.id}`, err);
      }
    });
  };
  
  window.JEV = window.JEV || {};
  window.JEV[MODULE_ID] = MultiCollector;
  
  // 氓陆聯茅隆碌茅聺垄氓聤聽猫陆陆氓庐聦忙聢聬氓聬聨氓聢聺氓搂聥氓聦聳
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => MultiCollector.init());
  } else {
    setTimeout(() => MultiCollector.init(), 100);
  }
})();