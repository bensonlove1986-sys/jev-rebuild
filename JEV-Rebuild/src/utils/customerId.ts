export function normalizeCustomerId(raw:string){ 
 if(!raw) return raw; 

 let id = raw.trim(); 
 id = id.replace(/^whatsapp:/i,""); 
 id = id.replace(/[^\d]/g,""); 

 return `whatsapp:+${id}`; 
 }
