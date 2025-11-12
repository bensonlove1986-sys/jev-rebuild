/**
 * 日志管理模块
 * 提供统一的日志接口，支持不同级别和持久化功能
 */
import config from './config.js';

class Logger {
  constructor() {
    // 日志级别映射
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    // 当前日志级别
    this.currentLevel = this.levels[config.get('logger.level', 'info')];
    
    // 持久化配置
    this.persistEnabled = config.get('logger.persist', false);
    this.maxEntries = config.get('logger.maxEntries', 1000);
    
    // 初始化持久化存储
    if (this.persistEnabled) {
      this._initPersist();
    }
    
    // 监听配置变化
    this._listenForConfigChanges();
  }
  
  /**
   * 调试级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  debug(message, meta = {}) {
    this._log('debug', message, meta);
  }
  
  /**
   * 信息级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  info(message, meta = {}) {
    this._log('info', message, meta);
  }
  
  /**
   * 警告级别日志
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  warn(message, meta = {}) {
    this._log('warn', message, meta);
  }
  
  /**
   * 错误级别日志
   * @param {string} message - 日志消息
   * @param {Object|Error} [meta] - 附加元数据或错误对象
   */
  error(message, meta = {}) {
    // 如果meta是错误对象，提取错误信息
    if (meta instanceof Error) {
      meta = {
        message: meta.message,
        stack: meta.stack,
        name: meta.name
      };
    }
    
    this._log('error', message, meta);
  }
  
  /**
   * 设置日志级别
   * @param {string} level - 日志级别：debug, info, warn, error
   * @returns {boolean} 是否设置成功
   */
  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
      config.set('logger.level', level);
      this.info(`日志级别已设置为 ${level}`);
      return true;
    }
    return false;
  }
  
  /**
   * 启用或禁用持久化
   * @param {boolean} enabled - 是否启用
   */
  setPersist(enabled) {
    this.persistEnabled = enabled;
    config.set('logger.persist', enabled);
    
    if (enabled && typeof localStorage !== 'undefined') {
      this._initPersist();
    }
    
    this.info(`${enabled ? '启用' : '禁用'} 日志持久化`);
  }
  
  /**
   * 获取持久化日志
   * @param {number} [limit] - 返回的最大条目数
   * @returns {Array} 日志条目数组
   */
  getPersistedLogs(limit = 100) {
    if (!this.persistEnabled || typeof localStorage === 'undefined') {
      return [];
    }
    
    try {
      const logs = JSON.parse(localStorage.getItem('daojie_logs') || '[]');
      return logs.slice(-limit);
    } catch (error) {
      console.warn('Failed to retrieve persisted logs:', error);
      return [];
    }
  }
  
  /**
   * 清除持久化日志
   */
  clearPersistedLogs() {
    if (this.persistEnabled && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('daojie_logs');
        this.info('已清除持久化日志');
      } catch (error) {
        console.warn('Failed to clear persisted logs:', error);
      }
    }
  }
  
  /**
   * 记录日志的内部方法
   * @private
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  _log(level, message, meta = {}) {
    const levelValue = this.levels[level];
    
    // 检查日志级别
    if (levelValue < this.currentLevel) {
      return;
    }
    
    // 格式化时间戳
    const timestamp = new Date().toISOString();
    
    // 构建日志消息
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // 根据级别调用对应的console方法
    switch (level) {
      case 'debug':
        console.debug(logMessage, meta);
        break;
      case 'info':
        console.info(logMessage, meta);
        break;
      case 'warn':
        console.warn(logMessage, meta);
        break;
      case 'error':
        console.error(logMessage, meta);
        break;
    }
    
    // 持久化日志（如果启用）
    if (this.persistEnabled && (meta.persist !== false)) {
      this._persistLog(level, message, meta);
    }
  }
  
  /**
   * 持久化日志到localStorage
   * @private
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} [meta] - 附加元数据
   */
  _persistLog(level, message, meta = {}) {
    if (typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        meta: this._sanitizeMeta(meta)
      };
      
      const logs = JSON.parse(localStorage.getItem('daojie_logs') || '[]');
      logs.push(logEntry);
      
      // 限制日志条目数量
      if (logs.length > this.maxEntries) {
        logs.splice(0, logs.length - this.maxEntries);
      }
      
      localStorage.setItem('daojie_logs', JSON.stringify(logs));
    } catch (error) {
      // 避免日志系统本身出错
      console.warn('Failed to persist log:', error);
    }
  }
  
  /**
   * 初始化持久化存储
   * @private
   */
  _initPersist() {
    if (typeof localStorage === 'undefined') {
      this.persistEnabled = false;
      this.warn('浏览器不支持localStorage，日志持久化功能已禁用');
      return;
    }
    
    try {
      // 测试localStorage是否可用
      const testKey = 'daojie_logs_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
    } catch (error) {
      this.persistEnabled = false;
      this.warn('localStorage访问受限，日志持久化功能已禁用:', error.message);
    }
  }
  
  /**
   * 监听配置变化
   * @private
   */
  _listenForConfigChanges() {
    // 这里可以添加配置变化的监听器
    // 例如通过事件系统或定期检查
  }
  
  /**
   * 清理元数据，移除不能序列化的内容
   * @private
   * @param {Object} meta - 原始元数据
   * @returns {Object} 清理后的元数据
   */
  _sanitizeMeta(meta) {
    if (!meta || typeof meta !== 'object') {
      return meta;
    }
    
    const sanitized = {};
    
    for (const key in meta) {
      if (meta.hasOwnProperty(key)) {
        const value = meta[key];
        
        // 跳过函数和循环引用
        if (typeof value === 'function') {
          continue;
        }
        
        try {
          // 尝试序列化，检测循环引用
          JSON.stringify(value);
          sanitized[key] = value;
        } catch (error) {
          // 如果无法序列化，转换为字符串
          sanitized[key] = String(value);
        }
      }
    }
    
    return sanitized;
  }
}

// 导出单例
export default new Logger();