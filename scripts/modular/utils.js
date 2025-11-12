/**
 * 工具函数模块
 * 提供通用的辅助函数
 */
import logger from './logger.js';

const utils = {
  /**
   * 安全执行函数，捕获所有异常
   * @param {Function} fn - 要执行的函数
   * @param {Object} [context] - 函数执行上下文
   * @param {...*} args - 传递给函数的参数
   * @returns {Promise<*>} 函数执行结果或null
   */
  async safeExec(fn, context = null, ...args) {
    try {
      return await fn.apply(context, args);
    } catch (error) {
      logger.error('安全执行函数失败', error);
      return null;
    }
  },
  
  /**
   * 安全访问对象属性
   * @param {Object} obj - 目标对象
   * @param {string|string[]} path - 属性路径
   * @param {*} defaultValue - 默认值
   * @returns {*} 属性值或默认值
   */
  safeAccess(obj, path, defaultValue = undefined) {
    if (!obj || typeof obj !== 'object') {
      return defaultValue;
    }
    
    const keys = Array.isArray(path) ? path : path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === undefined || current === null) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
  },
  
  /**
   * 安全调用方法
   * @param {Object} obj - 目标对象
   * @param {string} methodName - 方法名
   * @param {Array} args - 参数数组
   * @param {*} defaultValue - 默认返回值
   * @returns {*} 方法调用结果或默认值
   */
  safeCall(obj, methodName, args = [], defaultValue = undefined) {
    if (!obj || typeof obj !== 'object' || typeof obj[methodName] !== 'function') {
      return defaultValue;
    }
    
    try {
      return obj[methodName](...args);
    } catch (error) {
      logger.error(`调用方法 ${methodName} 失败`, error);
      return defaultValue;
    }
  },
  
  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  /**
   * 延迟指定毫秒数
   * @param {number} ms - 毫秒数
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * 重试函数，直到成功或达到最大重试次数
   * @param {Function} fn - 要执行的函数
   * @param {Object} options - 配置选项
   * @param {number} options.maxRetries - 最大重试次数
   * @param {number} options.delay - 初始延迟（毫秒）
   * @param {number} options.backoff - 退避因子
   * @param {Function} options.shouldRetry - 判断是否应该重试的函数
   * @returns {Promise<*>} 函数执行结果
   */
  async retry(fn, options = {}) {
    const {
      maxRetries = 3,
      delay = 1000,
      backoff = 2,
      shouldRetry = (error) => true
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;
        
        // 如果是最后一次尝试或者不应该重试，抛出错误
        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }
        
        // 计算下一次尝试的延迟
        const nextDelay = delay * Math.pow(backoff, attempt);
        logger.warn(`操作失败，${nextDelay}ms 后重试 (${attempt + 1}/${maxRetries})`, {
          error: error.message,
          attempt,
          delay: nextDelay
        });
        
        await this.delay(nextDelay);
      }
    }
    
    // 这里理论上不会执行到，因为最后一次失败会直接抛出
    throw lastError;
  },
  
  /**
   * 节流函数
   * @param {Function} func - 要节流的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 节流后的函数
   */
  throttle(func, wait) {
    let timeout;
    let previous = 0;
    
    return function executedFunction(...args) {
      const now = Date.now();
      const remaining = wait - (now - previous);
      
      if (remaining <= 0) {
        clearTimeout(timeout);
        previous = now;
        func.apply(this, args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          previous = Date.now();
          timeout = null;
          func.apply(this, args);
        }, remaining);
      }
    };
  },
  
  /**
   * 防抖函数
   * @param {Function} func - 要防抖的函数
   * @param {number} wait - 等待时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  /**
   * 检查URL是否有效
   * @param {string} url - 要检查的URL
   * @returns {boolean} 是否为有效URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * 规范化URL
   * @param {string} url - 要规范化的URL
   * @returns {string} 规范化后的URL
   */
  normalizeUrl(url) {
    try {
      return new URL(url).toString();
    } catch (error) {
      logger.error('URL规范化失败', { url, error });
      return url;
    }
  },
  
  /**
   * HTML转义
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  /**
   * HTML反转义
   * @param {string} html - 要反转义的HTML
   * @returns {string} 反转义后的文本
   */
  unescapeHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  },
  
  /**
   * 检测是否为本地地址
   * @param {string} url - 要检查的URL
   * @returns {boolean} 是否为本地地址
   */
  isLocalUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '[::1]' ||
        hostname.match(/^192\.168\.\d+\.\d+$/) ||
        hostname.match(/^10\.\d+\.\d+\.\d+$/) ||
        hostname.match(/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/)
      );
    } catch (error) {
      return false;
    }
  },
  
  /**
   * 将Blob转换为Base64
   * @param {Blob} blob - Blob对象
   * @returns {Promise<string>} Base64字符串
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
  
  /**
   * 将Base64转换为Blob
   * @param {string} base64 - Base64字符串
   * @returns {Blob} Blob对象
   */
  base64ToBlob(base64) {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
  },
  
  /**
   * 检测浏览器支持的功能
   * @returns {Object} 功能支持情况
   */
  detectFeatures() {
    return {
      fetch: typeof fetch !== 'undefined',
      xhr: typeof XMLHttpRequest !== 'undefined',
      fileApi: typeof FileReader !== 'undefined' && typeof Blob !== 'undefined',
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      webWorkers: typeof Worker !== 'undefined',
      promises: typeof Promise !== 'undefined',
      es6: typeof Symbol !== 'undefined' && typeof Array.from !== 'undefined'
    };
  },
  
  /**
   * 合并多个对象
   * @param {...Object} objects - 要合并的对象
   * @returns {Object} 合并后的对象
   */
  mergeObjects(...objects) {
    return objects.reduce((result, obj) => {
      if (!obj || typeof obj !== 'object') return result;
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            result[key] = this.mergeObjects(result[key] || {}, obj[key]);
          } else {
            result[key] = obj[key];
          }
        }
      }
      
      return result;
    }, {});
  },
  
  /**
   * 复制对象（深拷贝）
   * @param {*} obj - 要复制的对象
   * @returns {*} 复制后的对象
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }
    
    if (obj instanceof Object) {
      const clonedObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
  }
};

export default utils;