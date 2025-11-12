/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.575Z */
export default {
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