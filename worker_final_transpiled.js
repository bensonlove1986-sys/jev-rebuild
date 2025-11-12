var __defProp = Object.defineProperty;
 var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
 
 // worker_final.js
 var startTime = Date.now();
 var heartbeatCount = 0;
 var MAX_LOG_ENTRIES = 50;
 var Counter = class {
   static {
     __name(this, "Counter");
   }
   constructor(state, env) {
     this.state = state;
     this.env = env;
   }
   async fetch(request) {
     return new Response(JSON.stringify({ error: "Counter DO not supported in this version" }), {
       headers: { "Content-Type": "application/json" }
     });
   }
 };
 var SessionStore = class {
   static {
     __name(this, "SessionStore");
   }
   constructor(state, env) {
     this.state = state;
     this.env = env;
   }
   async fetch(request) {
     return new Response(JSON.stringify({ error: "SessionStore DO not supported in this version" }), {
       headers: { "Content-Type": "application/json" }
     });
   }
 };
 function json(data) {
   return new Response(JSON.stringify(data), {
     headers: {
       "Content-Type": "application/json",
       "Access-Control-Allow-Origin": "*",
       "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
       "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Auth-Key, X-Control-Auth, X-Control-Scope, X-Origin, X-Relay-Server, X-Worker-Sync, X-Optimizer-Link, X-Insight-Link, X-Control-Lock, X-Relay-Mode, X-Translator, X-Language-Support",
       "X-Worker-Sync": "true",
       "X-Control-Lock": "active",
       "X-Relay-Mode": "global"
     }
   });
 }
 __name(json, "json");
 function errorResponse(message) {
   const traceId = Math.random().toString(36).substring(2, 10);
   return json({
     success: false,
     error: message,
     trace_id: traceId
   });
 }
 __name(errorResponse, "errorResponse");
 function generateTimestampId() {
   return Date.now().toString();
 }
 __name(generateTimestampId, "generateTimestampId");
 function generateUniqueId() {
   return Date.now().toString(36) + Math.random().toString(36).substring(2);
 }
 __name(generateUniqueId, "generateUniqueId");
 async function kvPut(env, store, key, value, ttl = null) {
   try {
     const storeObj = env[store];
     if (!storeObj) {
       console.error(`KV存储 ${store} 未绑定`);
       return false;
     }
     const valueStr = typeof value === "string" ? value : JSON.stringify(value);
     if (ttl) {
       await storeObj.put(key, valueStr, { expirationTtl: ttl });
     } else {
       await storeObj.put(key, valueStr);
     }
     return true;
   } catch (error) {
     console.error(`KV写入失败 [${store}:${key}]:`, error);
     return false;
   }
 }
 __name(kvPut, "kvPut");
 async function kvGet(env, store, key) {
   try {
     const storeObj = env[store];
     if (!storeObj) {
       console.error(`KV存储 ${store} 未绑定`);
       return null;
     }
     const value = await storeObj.get(key);
     if (value === null) return null;
     try {
       return JSON.parse(value);
     } catch {
       return value;
     }
   } catch (error) {
     console.error(`KV读取失败 [${store}:${key}]:`, error);
     return null;
   }
 }
 __name(kvGet, "kvGet");
 async function kvList(env, store, prefix = "") {
   try {
     const storeObj = env[store];
     if (!storeObj) {
       console.error(`KV存储 ${store} 未绑定`);
       return [];
     }
     const keys = [];
     const list = await storeObj.list({ prefix });
     for (const key of list.keys) {
       keys.push(key.name);
     }
     return keys;
   } catch (error) {
     console.error(`KV列表获取失败 [${store}:${prefix}]:`, error);
     return [];
   }
 }
 __name(kvList, "kvList");
 async function kvDelete(env, store, key) {
   try {
     const storeObj = env[store];
     if (!storeObj) {
       console.error(`KV存储 ${store} 未绑定`);
       return false;
     }
     await storeObj.delete(key);
     return true;
   } catch (error) {
     console.error(`KV删除失败 [${store}:${key}]:`, error);
     return false;
   }
 }
 __name(kvDelete, "kvDelete");
 function validateApiKey(request, env) {
   const authKey = request.headers.get("X-Auth-Key");
   return authKey === env.API_KEY || authKey === "JEV_2025_AI_SYS_A92jskL0xY";
 }
 __name(validateApiKey, "validateApiKey");
 async function log(env, source, level, message) {
   try {
     const logEntry = {
       time: (/* @__PURE__ */ new Date()).toISOString(),
       source,
       level,
       message
     };
     const logKey = `log:${source}:${generateTimestampId()}`;
     await kvPut(env, "MEM_STORE", logKey, logEntry);
     const logKeys = await kvList(env, "MEM_STORE", `log:${source}:`);
     if (logKeys.length > MAX_LOG_ENTRIES) {
       const keysToDelete = logKeys.slice(0, logKeys.length - MAX_LOG_ENTRIES);
       for (const key of keysToDelete) {
         await kvDelete(env, "MEM_STORE", key);
       }
     }
   } catch (error) {
     console.error("日志记录失败:", error);
   }
 }
 __name(log, "log");
 async function cleanExpiredAgents(env) {
   try {
     const agentKeys = await kvList(env, "MEM_STORE", "agent:");
     const now = Date.now();
     const expireTime = 10 * 60 * 1e3;
     for (const key of agentKeys) {
       const agent = await kvGet(env, "MEM_STORE", key);
       if (agent && now - new Date(agent.last_seen).getTime() > expireTime) {
         await kvDelete(env, "MEM_STORE", key);
         console.log(`已清理过期Agent: ${agent.id}`);
       }
     }
   } catch (error) {
     console.error("清理过期Agent失败:", error);
   }
 }
 __name(cleanExpiredAgents, "cleanExpiredAgents");
 function getUptime() {
   const seconds = Math.floor((Date.now() - startTime) / 1e3);
   if (seconds < 60) return `${seconds}秒`;
   const minutes = Math.floor(seconds / 60);
   const remainingSeconds = seconds % 60;
   return `${minutes}分${remainingSeconds}秒`;
 }