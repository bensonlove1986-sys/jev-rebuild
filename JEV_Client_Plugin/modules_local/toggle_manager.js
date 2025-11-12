/**
 * JEV Plugin v2.0 - 开关状态控制模块
 * 负责管理所有功能开关、状态同步与事件触发
 */

// 默认功能开关配置
const DEFAULT_TOGGLES = {
  // AI功能类
  ai_auto: {
    id: 'ai_auto',
    name: 'AI自动回复',
    description: '启用AI自动回复功能',
    icon: '🤖',
    category: 'ai',
    default: false,
    permission: 'ai_auto_reply'
  },
  auto_translate: {
    id: 'auto_translate',
    name: '自动翻译',
    description: '自动翻译聊天内容',
    icon: '🌐',
    category: 'ai',
    default: false,
    permission: 'auto_translate'
  },
  
  // 工具功能类
  ocr_engine: {
    id: 'ocr_engine',
    name: 'OCR文字识别',
    description: '识别图片中的文字内容',
    icon: '📝',
    category: 'tools',
    default: false,
    permission: 'ocr_recognition'
  },
  profit_calc: {
    id: 'profit_calc',
    name: '自动报价',
    description: '自动计算并生成报价',
    icon: '💰',
    category: 'tools',
    default: false,
    permission: 'profit_calculation'
  },
  pi_generator: {
    id: 'pi_generator',
    name: 'PI生成器',
    description: '自动生成形式发票',
    icon: '📋',
    category: 'tools',
    default: false,
    permission: 'pi_generation'
  },
  
  // 模式控制类
  human_mode: {
    id: 'human_mode',
    name: '人工模式',
    description: '启用人工干预模式',
    icon: '👤',
    category: 'mode',
    default: true,
    permission: 'human_mode'
  },
  security_lock: {
    id: 'security_lock',
    name: '安全锁',
    description: '启用安全保护机制',
    icon: '🔒',
    category: 'mode',
    default: true,
    permission: 'security_lock'
  },
  cloud_sync: {
    id: 'cloud_sync',
    name: '云端同步',
    description: '同步设置到云端',
    icon: '☁️',
    category: 'mode',
    default: true,
    permission: 'cloud_sync'
  }
};

// 功能到权限的映射
const featureToPermissionMap = {
  ai_auto: 'ai_auto_reply',
  auto_translate: 'auto_translate',
  ocr_engine: 'ocr_recognition',
  profit_calc: 'profit_calculation',
  pi_generator: 'pi_generation',
  human_mode: 'human_mode',
  security_lock: 'security_lock',
  cloud_sync: 'cloud_sync'
};

// 权限信息
const permissions = {
  ai_auto_reply: {
    name: 'AI自动回复权限',
    description: '允许使用AI自动回复功能'
  },
  auto_translate: {
    name: '自动翻译权限',
    description: '允许使用自动翻译功能'
  },
  ocr_recognition: {
    name: 'OCR识别权限',
    description: '允许使用OCR文字识别功能'
  },
  profit_calculation: {
    name: '报价计算权限',
    description: '允许使用自动报价计算功能'
  },
  pi_generation: {
    name: 'PI生成权限',
    description: '允许使用形式发票生成功能'
  },
  human_mode: {
    name: '人工模式权限',
    description: '允许切换到人工干预模式'
  },
  security_lock: {
    name: '安全锁权限',
    description: '允许管理安全锁功能'
  },
  cloud_sync: {
    name: '云端同步权限',
    description: '允许同步设置到云端'
  }
};

// 开关管理器实例
const toggleManager = {
  // 存储实际的开关状态
  toggles: {},
  
  // 事件监听器存储
  eventListeners: {},
  
  /**
   * 初始化开关管理器
   */
  init: function() {
    // 从存储加载开关状态
    this.loadToggles();
    
    // 监听认证成功事件
    this.listenForAuthEvents();
    
    console.log('[JEV Plugin] Toggle Manager initialized');
  },
  
  /**
   * 从存储加载开关状态
   */
  loadToggles: function() {
    try {
      let savedToggles = null;
      
      // 尝试从storageManager加载
      if (window.storageManager) {
        savedToggles = storageManager.get('feature_toggles');
      }
      
      // 如果没有保存的状态，使用默认值
      if (!savedToggles) {
        savedToggles = {};
        Object.keys(DEFAULT_TOGGLES).forEach(key => {
          savedToggles[key] = DEFAULT_TOGGLES[key].default;
        });
      }
      
      this.toggles = savedToggles;
      console.log('[JEV Plugin] Toggle states loaded');
    } catch (error) {
      console.error('[JEV Plugin] Failed to load toggle states:', error);
      // 发生错误时重置为默认值
      this.resetToDefaults();
    }
  },
  
  /**
   * 保存开关状态到存储
   */
  saveToggles: function() {
    try {
      if (window.storageManager) {
        storageManager.set('feature_toggles', this.toggles);
        console.log('[JEV Plugin] Toggle states saved');
      }
    } catch (error) {
      console.error('[JEV Plugin] Failed to save toggle states:', error);
    }
  },
  
  /**
   * 获取指定开关的状态
   * @param {string} id - 开关ID
   * @returns {boolean|null} 开关状态
   */
  getToggle: function(id) {
    if (!DEFAULT_TOGGLES[id]) {
      console.error(`[JEV Plugin] Toggle with id '${id}' not found`);
      return null;
    }
    
    return this.toggles[id] !== undefined ? this.toggles[id] : DEFAULT_TOGGLES[id].default;
  },
  
  /**
   * 设置指定开关的状态
   * @param {string} id - 开关ID
   * @param {boolean} value - 开关状态
   * @returns {boolean} 操作结果
   */
  setToggle: async function(id, value) {
    if (!DEFAULT_TOGGLES[id]) {
      console.error(`[JEV Plugin] Toggle with id '${id}' not found`);
      return false;
    }
    
    try {
      // 检查依赖关系
      if (!this.checkDependencies(id, value)) {
        console.error(`[JEV Plugin] Toggle '${id}' cannot be set to ${value} due to dependencies`);
        return false;
      }
      
      // 检查权限（如果有register模块）
      if (window.registerModule && !this.hasPermission(id)) {
        console.error(`[JEV Plugin] No permission to toggle '${id}'`);
        return false;
      }
      
      // 更新开关状态
      this.toggles[id] = value;
      
      // 保存到存储
      this.saveToggles();
      
      // 通知云端（如果启用了云端同步且有relayConnector）
      if (this.toggles.cloud_sync && window.relayConnector) {
        try {
          await relayConnector.relayCall('toggle_update', {
            id: id,
            state: value
          });
        } catch (error) {
          console.error('[JEV Plugin] Failed to sync toggle to cloud:', error);
        }
      }
      
      // 触发事件
      this.emitEvent('toggleChange', { id, value });
      
      // 触发自定义DOM事件
      this.triggerDomEvent(id, value);
      
      console.log(`[JEV Plugin] Toggle '${id}' set to ${value}`);
      return true;
    } catch (error) {
      console.error(`[JEV Plugin] Failed to set toggle '${id}':`, error);
      return false;
    }
  },
  
  /**
   * 切换开关状态
   * @param {string} id - 开关ID
   * @returns {boolean} 新的开关状态
   */
  toggleFeature: function(id) {
    const currentState = this.getToggle(id);
    if (currentState !== null) {
      this.setToggle(id, !currentState);
      return !currentState;
    }
    return currentState;
  },
  
  /**
   * 批量设置多个开关状态
   * @param {Object} toggleStates - 开关状态对象 {id: value, ...}
   */
  setFeatures: function(toggleStates) {
    Object.entries(toggleStates).forEach(([id, value]) => {
      this.setToggle(id, value);
    });
  },
  
  /**
   * 清除所有开关状态（重置为默认值）
   */
  clearFeatures: function() {
    Object.keys(DEFAULT_TOGGLES).forEach(key => {
      this.toggles[key] = DEFAULT_TOGGLES[key].default;
    });
    this.saveToggles();
    this.emitEvent('reset');
    console.log('[JEV Plugin] All toggles reset to defaults');
  },
  
  /**
   * 检查功能是否启用
   * @param {string} id - 开关ID
   * @returns {boolean} 是否启用
   */
  isFeatureEnabled: function(id) {
    // 检查开关是否存在且启用，同时检查权限
    return this.getToggle(id) && this.hasPermission(id);
  },
  
  /**
   * 获取功能配置信息
   * @param {string} id - 开关ID
   * @returns {Object|null} 功能配置
   */
  getFeature: function(id) {
    return DEFAULT_TOGGLES[id] || null;
  },
  
  /**
   * 获取所有功能
   * @returns {Object} 所有功能配置
   */
  getAllFeatures: function() {
    return { ...DEFAULT_TOGGLES };
  },
  
  /**
   * 按分类获取功能
   * @param {string} category - 分类名称
   * @returns {Object} 分类下的功能
   */
  getFeaturesByCategory: function(category) {
    const result = {};
    Object.entries(DEFAULT_TOGGLES).forEach(([id, config]) => {
      if (config.category === category) {
        result[id] = { ...config, enabled: this.getToggle(id) };
      }
    });
    return result;
  },
  
  /**
   * 检查依赖关系
   * @param {string} id - 开关ID
   * @param {boolean} value - 要设置的值
   * @returns {boolean} 是否满足依赖
   */
  checkDependencies: function(id, value) {
    // 这里可以添加复杂的依赖逻辑
    // 例如：AI功能需要cloud_sync启用
    if (value && ['ai_auto', 'auto_translate'].includes(id)) {
      return this.getToggle('cloud_sync');
    }
    return true;
  },
  
  /**
   * 验证所有依赖关系
   * @returns {Object} 依赖验证结果
   */
  validateDependencies: function() {
    const issues = [];
    
    Object.keys(this.toggles).forEach(id => {
      if (this.toggles[id] && !this.checkDependencies(id, true)) {
        issues.push({
          id,
          message: `${DEFAULT_TOGGLES[id]?.name || id} 功能依赖其他功能`
        });
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  },
  
  /**
   * 检查是否有权限使用功能
   * @param {string} id - 功能ID
   * @returns {boolean} 是否有权限
   */
  hasPermission: function(id) {
    const permission = featureToPermissionMap[id];
    
    // 如果没有权限映射，默认为有权限
    if (!permission) return true;
    
    // 尝试从register模块获取权限
    if (window.registerModule && registerModule.getPermissions) {
      const userPermissions = registerModule.getPermissions();
      return userPermissions.includes(permission);
    }
    
    return true;
  },
  
  /**
   * 获取所有权限信息
   * @returns {Object} 权限信息
   */
  getPermissionsInfo: function() {
    return permissions;
  },
  
  /**
   * 同步开关状态到云端
   * @returns {Promise<boolean>} 同步结果
   */
  syncToggles: async function() {
    try {
      if (!window.relayConnector) {
        console.error('[JEV Plugin] relayConnector not available for sync');
        return false;
      }
      
      const response = await relayConnector.relayCall('sync_toggles', {
        toggles: this.toggles
      });
      
      if (response && response.success) {
        console.log('[JEV Plugin] Toggles synced to cloud successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[JEV Plugin] Failed to sync toggles to cloud:', error);
      return false;
    }
  },
  
  /**
   * 从云端同步开关状态
   * @returns {Promise<boolean>} 同步结果
   */
  syncFromCloud: async function() {
    try {
      if (!window.relayConnector) {
        console.error('[JEV Plugin] relayConnector not available for sync');
        return false;
      }
      
      const response = await relayConnector.relayCall('get_toggles');
      
      if (response && response.toggles) {
        // 合并云端状态，但只更新已有的开关
        Object.keys(response.toggles).forEach(key => {
          if (DEFAULT_TOGGLES[key]) {
            this.toggles[key] = response.toggles[key];
          }
        });
        
        this.saveToggles();
        this.emitEvent('syncFromCloud');
        console.log('[JEV Plugin] Toggles synced from cloud successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[JEV Plugin] Failed to sync toggles from cloud:', error);
      return false;
    }
  },
  
  /**
   * 监听认证事件
   */
  listenForAuthEvents: function() {
    // 监听认证成功事件
    document.addEventListener('jev_authenticated', () => {
      // 认证成功后尝试从云端同步
      if (this.getToggle('cloud_sync')) {
        this.syncFromCloud();
      }
    });
    
    // 监听连接状态变化
    document.addEventListener('jev_connection_status_changed', (e) => {
      const { status } = e.detail;
      if (status === 'connected' && this.getToggle('cloud_sync')) {
        this.syncFromCloud();
      }
    });
  },
  
  /**
   * 注册事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   */
  on: function(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
  },
  
  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   */
  off: function(eventName, callback) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName] = this.eventListeners[eventName]
        .filter(cb => cb !== callback);
    }
  },
  
  /**
   * 触发事件
   * @param {string} eventName - 事件名称
   * @param {Object} data - 事件数据
   */
  emitEvent: function(eventName, data = {}) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[JEV Plugin] Error in event listener for '${eventName}':`, error);
        }
      });
    }
  },
  
  /**
   * 触发DOM事件
   * @param {string} id - 开关ID
   * @param {boolean} value - 开关状态
   */
  triggerDomEvent: function(id, value) {
    const event = new CustomEvent('jev_feature_toggled', {
      detail: {
        feature: id,
        enabled: value
      },
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  },
  
  /**
   * 重置为默认值
   */
  resetToDefaults: function() {
    this.clearFeatures();
  },
  
  /**
   * 获取状态摘要
   * @returns {Object} 状态摘要
   */
  getStatusSummary: function() {
    const enabledCount = Object.values(this.toggles).filter(v => v).length;
    const totalCount = Object.keys(DEFAULT_TOGGLES).length;
    
    return {
      enabledCount,
      totalCount,
      percentage: Math.round((enabledCount / totalCount) * 100),
      lastUpdated: new Date().toISOString()
    };
  },
  
  /**
   * 批量更新开关状态
   * @param {Object} updates - 要更新的开关状态
   */
  batchUpdateToggles: function(updates) {
    let hasChanges = false;
    
    Object.entries(updates).forEach(([id, value]) => {
      if (DEFAULT_TOGGLES[id] && this.toggles[id] !== value) {
        this.toggles[id] = value;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.saveToggles();
      this.emitEvent('batchUpdate', updates);
    }
  }
};

// 初始化开关管理器
toggleManager.init();

// 全局导出
if (typeof window !== 'undefined') {
  window.toggleManager = toggleManager;
}

// 模块导出
module.exports = toggleManager;
