/**
 * JEV Plugin v2.0 - 本地存储与缓存模块
 * 负责管理插件内部缓存、持久化存储与数据同步
 */

// 存储键前缀
const STORAGE_PREFIX = 'jev_plugin_';

// 定期同步间隔（6小时）
const SYNC_INTERVAL = 6 * 60 * 60 * 1000;

// 存储管理器实例
const storageManager = {
  /**
   * 获取存储值
   * @param {string} key - 存储键名
   * @returns {*} 存储的值
   */
  get: function(key) {
    try {
      const fullKey = `${STORAGE_PREFIX}${key}`;
      const value = GM_getValue(fullKey);
      console.log(`[JEV Plugin] Storage get: ${key} = ${value !== undefined ? 'exists' : 'undefined'}`);
      return value;
    } catch (error) {
      console.error(`[JEV Plugin] Storage get error for key ${key}:`, error);
      return undefined;
    }
  },

  /**
   * 设置存储值
   * @param {string} key - 存储键名
   * @param {*} value - 要存储的值
   * @returns {Promise<boolean>} 操作结果
   */
  set: function(key, value) {
    return new Promise((resolve) => {
      try {
        const fullKey = `${STORAGE_PREFIX}${key}`;
        GM_setValue(fullKey, value);
        console.log(`[JEV Plugin] Storage set: ${key} = ${value !== undefined ? 'exists' : 'undefined'}`);
        resolve(true);
      } catch (error) {
        console.error(`[JEV Plugin] Storage set error for key ${key}:`, error);
        resolve(false);
      }
    });
  },

  /**
   * 删除存储值
   * @param {string} key - 存储键名
   * @returns {Promise<boolean>} 操作结果
   */
  remove: function(key) {
    return new Promise((resolve) => {
      try {
        const fullKey = `${STORAGE_PREFIX}${key}`;
        GM_deleteValue(fullKey);
        console.log(`[JEV Plugin] Storage remove: ${key}`);
        resolve(true);
      } catch (error) {
        console.error(`[JEV Plugin] Storage remove error for key ${key}:`, error);
        resolve(false);
      }
    });
  },

  /**
   * 获取所有存储的键
   * @returns {Array<string>} 键名数组
   */
  getAllKeys: function() {
    try {
      // 获取所有键并过滤出JEV相关的键
      const allKeys = GM_listValues() || [];
      return allKeys
        .filter(key => key.startsWith(STORAGE_PREFIX))
        .map(key => key.replace(STORAGE_PREFIX, ''));
    } catch (error) {
      console.error('[JEV Plugin] Storage getAllKeys error:', error);
      return [];
    }
  },

  /**
   * 获取所有存储的数据
   * @returns {Object} 存储数据对象
   */
  getAllData: function() {
    try {
      const keys = this.getAllKeys();
      const data = {};
      
      keys.forEach(key => {
        data[key] = this.get(key);
      });
      
      console.log(`[JEV Plugin] Storage getAllData: ${keys.length} items`);
      return data;
    } catch (error) {
      console.error('[JEV Plugin] Storage getAllData error:', error);
      return {};
    }
  },

  /**
   * 导出数据（用于备份）
   * @returns {string} JSON字符串格式的数据
   */
  exportData: function() {
    try {
      const data = this.getAllData();
      const exportData = {
        version: '2.0',
        exportTime: new Date().toISOString(),
        data: data
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      console.log('[JEV Plugin] Data exported successfully');
      return jsonString;
    } catch (error) {
      console.error('[JEV Plugin] Data export error:', error);
      throw error;
    }
  },

  /**
   * 导入数据（用于恢复）
   * @param {string} jsonString - JSON字符串格式的数据
   * @returns {Promise<boolean>} 操作结果
   */
  importData: function(jsonString) {
    return new Promise(async (resolve) => {
      try {
        const importData = JSON.parse(jsonString);
        
        // 验证数据格式
        if (!importData.data || typeof importData.data !== 'object') {
          throw new Error('Invalid import data format');
        }
        
        // 导入数据
        const promises = Object.entries(importData.data).map(([key, value]) => {
          return this.set(key, value);
        });
        
        await Promise.all(promises);
        console.log('[JEV Plugin] Data imported successfully');
        resolve(true);
      } catch (error) {
        console.error('[JEV Plugin] Data import error:', error);
        resolve(false);
      }
    });
  },

  /**
   * 清除所有存储数据
   * @returns {Promise<boolean>} 操作结果
   */
  clearAll: function() {
    return new Promise(async (resolve) => {
      try {
        const keys = this.getAllKeys();
        
        const promises = keys.map(key => this.remove(key));
        await Promise.all(promises);
        
        console.log(`[JEV Plugin] Storage cleared: ${keys.length} items`);
        resolve(true);
      } catch (error) {
        console.error('[JEV Plugin] Storage clearAll error:', error);
        resolve(false);
      }
    });
  },

  /**
   * 检查License是否有效
   * @returns {Promise<boolean>} License是否有效
   */
  checkLicenseValidity: async function() {
    try {
      const licenseKey = this.get('license');
      
      if (!licenseKey) {
        console.log('[JEV Plugin] License not found');
        return false;
      }
      
      // 如果有relayConnector，尝试与云端验证
      if (window.relayConnector) {
        const result = await window.relayConnector.testAuth();
        return result.valid || false;
      }
      
      // 本地基本验证（检查是否存在）
      return true;
    } catch (error) {
      console.error('[JEV Plugin] License validity check error:', error);
      return false;
    }
  },

  /**
   * 初始化定期同步检查
   */
  initializePeriodicSync: function() {
    // 立即执行一次检查
    this.checkLicenseValidity();
    
    // 设置定期检查
    setInterval(() => {
      console.log('[JEV Plugin] Performing periodic license check');
      this.checkLicenseValidity();
    }, SYNC_INTERVAL);
    
    console.log('[JEV Plugin] Periodic sync initialized');
  },

  /**
   * 获取存储统计信息
   * @returns {Object} 统计信息
   */
  getStats: function() {
    try {
      const keys = this.getAllKeys();
      const size = keys.reduce((total, key) => {
        const value = this.get(key);
        return total + (JSON.stringify(value).length || 0);
      }, 0);
      
      return {
        itemCount: keys.length,
        estimatedSize: size,
        lastSync: this.get('last_sync_time')
      };
    } catch (error) {
      console.error('[JEV Plugin] Storage stats error:', error);
      return {
        itemCount: 0,
        estimatedSize: 0,
        lastSync: null
      };
    }
  },

  /**
   * 更新最后同步时间
   */
  updateLastSyncTime: function() {
    this.set('last_sync_time', new Date().toISOString());
  }
};

// 初始化定期同步
storageManager.initializePeriodicSync();

// 全局导出
if (typeof window !== 'undefined') {
  window.storageManager = storageManager;
}

// 模块导出
module.exports = storageManager;
