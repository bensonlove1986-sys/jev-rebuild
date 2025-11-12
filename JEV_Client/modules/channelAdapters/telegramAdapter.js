/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.582Z */
export default {
  id: "Telegram",
  async init(onMessage){
    console.log("[Telegram] 氓聢聺氓搂聥氓聦聳 Bot 莽聸聭氓聬卢盲赂颅...");
    // 忙篓隆忙聥聼 API 忙聥聣氓聫聳
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