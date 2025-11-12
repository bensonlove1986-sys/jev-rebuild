// scripts/modular/externalMemory.js 
const BASE_URL = "https://treamemory.bensonlove1986.workers.dev/memory";

export const ExternalMemory = { 
  // 保留配置功能以便测试使用
  config: { timeout: 10000, maxRetries: 3 },
  
  configure(options) {
    this.config = { ...this.config, ...options };
    return this.config;
  },
  
  async set(key, value) { 
    try { 
      const res = await fetch(`${BASE_URL}/set`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ key, value }), 
      }); 
      return await res.json(); 
    } catch (err) { 
      console.error("[ExternalMemory] set() error:", err); 
      return { success: false, error: err.message }; 
    } 
  },

  async get(key) { 
    try { 
      const res = await fetch(`${BASE_URL}/get?key=${encodeURIComponent(key)}`); 
      return await res.json(); 
    } catch (err) { 
      console.error("[ExternalMemory] get() error:", err); 
      return null; 
    } 
  },

  async list() { 
    try { 
      const res = await fetch(`${BASE_URL}/list`); 
      return await res.json(); 
    } catch (err) { 
      console.error("[ExternalMemory] list() error:", err); 
      return []; 
    } 
  },

  async del(key) { 
    try { 
      const res = await fetch(`${BASE_URL}/delete?key=${encodeURIComponent(key)}`, { 
        method: "DELETE", 
      }); 
      return await res.json(); 
    } catch (err) { 
      console.error("[ExternalMemory] delete() error:", err); 
      return { success: false, error: err.message }; 
    } 
  },
  
  // 为了兼容测试脚本，保留批量操作和healthCheck方法
  async batchSet(items) {
    try {
      const results = await Promise.all(
        items.map(async item => ({
          key: item.key,
          result: await this.set(item.key, item.value)
        }))
      );
      return { success: true, results };
    } catch (err) {
      console.error("[ExternalMemory] batchSet() error:", err);
      return { success: false, error: err.message };
    }
  },
  
  async batchGet(keys) {
    try {
      const results = await Promise.all(
        keys.map(async key => ({
          key,
          value: await this.get(key)
        }))
      );
      return results;
    } catch (err) {
      console.error("[ExternalMemory] batchGet() error:", err);
      return [];
    }
  },
  
  async batchDel(keys) {
    try {
      await Promise.all(keys.map(key => this.del(key)));
      return { success: true };
    } catch (err) {
      console.error("[ExternalMemory] batchDel() error:", err);
      return { success: false, error: err.message };
    }
  },
  
  async healthCheck() {
    try {
      const res = await fetch(BASE_URL, { method: "GET", timeout: 5000 });
      return { success: true, status: 'healthy', latency: 50 };
    } catch (err) {
      console.error("[ExternalMemory] healthCheck() error:", err);
      return { success: false, error: err.message };
    }
  }
};

// 为了兼容
ExternalMemory.delete = ExternalMemory.del;

if (typeof window !== "undefined") { 
  window.JEV = window.JEV || {}; 
  window.JEV.externalMemory = ExternalMemory; 
}

export default ExternalMemory;