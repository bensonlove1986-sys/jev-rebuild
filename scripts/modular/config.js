/**
 * 配置管理模块
 * 集中管理所有配置项，提供类型检查和默认值验证
 */
class Config {
  constructor() {
    // 默认配置
    this.defaults = {
      // 应用配置
      app: {
        name: 'DAOJIE Chat Capture',
        version: '1.0.0',
        debug: false
      },
      
      // 日志配置
      logger: {
        level: 'info', // debug, info, warn, error
        persist: false,
        maxEntries: 1000
      },
      
      // 上传配置
      upload: {
        baseUrl: '',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        forceXhr: false,
        chunkSize: 1024 * 1024, // 1MB
        fileFieldName: 'file',
        headers: {}
      },
      
      // UI配置
      ui: {
        autoShowPanel: true,
        showNotifications: true,
        animationSpeed: 300
      },
      
      // 功能开关
      features: {
        translate: true,
        ocr: true,
        imageProcessing: true,
        autoRetry: true
      }
    };
    
    // 从存储加载配置
    this.userConfig = this._loadUserConfig();
    
    // 合并默认配置和用户配置
    this.config = this._mergeConfigs(this.defaults, this.userConfig);
    
    // 验证配置
    this._validateConfig(this.config);
  }
  
  /**
   * 获取配置值
   * @param {string} path - 配置路径，如 'upload.timeout'
   * @param {*} defaultValue - 默认值
   * @returns {*} 配置值或默认值
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value === undefined || value === null || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[key];
    }
    
    return value !== undefined ? value : defaultValue;
  }
  
  /**
   * 设置配置值
   * @param {string} path - 配置路径，如 'upload.timeout'
   * @param {*} value - 配置值
   * @returns {boolean} 是否设置成功
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let obj = this.config;
    
    // 遍历路径创建必要的对象
    for (const key of keys) {
      if (obj[key] === undefined) {
        obj[key] = {};
      } else if (typeof obj[key] !== 'object') {
        return false;
      }
      obj = obj[key];
    }
    
    // 设置值
    obj[lastKey] = value;
    
    // 保存到用户配置
    this._updateUserConfig(path, value);
    
    return true;
  }
  
  /**
   * 重置配置到默认值
   * @param {string} [path] - 可选的配置路径，如果不提供则重置所有配置
   */
  reset(path = undefined) {
    if (path) {
      const keys = path.split('.');
      const lastKey = keys.pop();
      let defaultObj = this.defaults;
      let userObj = this.userConfig;
      
      // 遍历路径
      for (const key of keys) {
        if (defaultObj[key] === undefined || userObj[key] === undefined) {
          return;
        }
        defaultObj = defaultObj[key];
        userObj = userObj[key];
      }
      
      // 重置指定配置项
      if (defaultObj[lastKey] !== undefined) {
        delete userObj[lastKey];
      }
    } else {
      // 重置所有配置
      this.userConfig = {};
    }
    
    // 重新合并配置
    this.config = this._mergeConfigs(this.defaults, this.userConfig);
    
    // 保存到存储
    this._saveUserConfig();
  }
  
  /**
   * 获取完整配置对象
   * @returns {Object} 完整配置
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }
  
  /**
   * 从存储加载用户配置
   * @private
   * @returns {Object} 用户配置
   */
  _loadUserConfig() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('daojie_config');
        return stored ? JSON.parse(stored) : {};
      }
    } catch (error) {
      console.warn('Failed to load user config from localStorage:', error);
    }
    return {};
  }
  
  /**
   * 保存用户配置到存储
   * @private
   */
  _saveUserConfig() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('daojie_config', JSON.stringify(this.userConfig));
      }
    } catch (error) {
      console.warn('Failed to save user config to localStorage:', error);
    }
  }
  
  /**
   * 更新用户配置中的特定值
   * @private
   * @param {string} path - 配置路径
   * @param {*} value - 配置值
   */
  _updateUserConfig(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let obj = this.userConfig;
    
    // 遍历路径创建必要的对象
    for (const key of keys) {
      if (obj[key] === undefined) {
        obj[key] = {};
      }
      obj = obj[key];
    }
    
    // 设置值
    obj[lastKey] = value;
    
    // 保存到存储
    this._saveUserConfig();
  }
  
  /**
   * 合并配置对象
   * @private
   * @param {Object} defaults - 默认配置
   * @param {Object} user - 用户配置
   * @returns {Object} 合并后的配置
   */
  _mergeConfigs(defaults, user) {
    const result = JSON.parse(JSON.stringify(defaults));
    
    function mergeRecursive(target, source) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) {
              target[key] = {};
            }
            mergeRecursive(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      }
    }
    
    mergeRecursive(result, user);
    return result;
  }
  
  /**
   * 验证配置
   * @private
   * @param {Object} config - 配置对象
   */
  _validateConfig(config) {
    // 验证日志级别
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(config.logger.level)) {
      config.logger.level = 'info';
    }
    
    // 验证上传配置
    if (config.upload.timeout < 1000 || config.upload.timeout > 300000) {
      config.upload.timeout = 30000;
    }
    
    if (config.upload.maxRetries < 0 || config.upload.maxRetries > 10) {
      config.upload.maxRetries = 3;
    }
    
    if (config.upload.retryDelay < 100 || config.upload.retryDelay > 10000) {
      config.upload.retryDelay = 1000;
    }
    
    // 验证UI配置
    if (config.ui.animationSpeed < 0 || config.ui.animationSpeed > 2000) {
      config.ui.animationSpeed = 300;
    }
  }
}

// 导出单例
export default new Config();