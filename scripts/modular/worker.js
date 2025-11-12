/**
 * Worker通信模块
 * 管理与后台服务的通信，提供统一的调用接口
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';

class WorkerManager {
  constructor() {
    // Worker配置
    this.workerConfig = config.get('worker', {});
    
    // 缓存Worker实例
    this.workerInstance = null;
    
    // 请求队列
    this.requestQueue = new Map();
    
    // 当前请求ID
    this.currentRequestId = 0;
    
    // 初始化Worker连接
    this.initialize();
  }
  
  /**
   * 初始化Worker连接
   */
  initialize() {
    // 根据配置选择通信方式
    const { mode = 'local', url = 'http://localhost:8000', timeout = 30000 } = this.workerConfig;
    
    logger.info(`初始化Worker连接: ${mode}模式`, { url, timeout });
    
    // 清除旧连接
    if (this.workerInstance) {
      this.disconnect();
    }
    
    // 根据模式创建不同的连接
    switch (mode) {
      case 'local':
        // 本地HTTP服务器模式
        this._setupHttpConnection(url, timeout);
        break;
      case 'webworker':
        // Web Worker模式（如果支持）
        this._setupWebWorkerConnection();
        break;
      case 'iframe':
        // iframe模式（备用方案）
        this._setupIframeConnection(url);
        break;
      default:
        logger.warn(`未知的Worker模式: ${mode}，使用本地HTTP模式`);
        this._setupHttpConnection(url, timeout);
    }
  }
  
  /**
   * 设置HTTP连接
   * @private
   * @param {string} baseUrl - 基础URL
   * @param {number} timeout - 超时时间
   */
  _setupHttpConnection(baseUrl, timeout) {
    this.workerInstance = {
      type: 'http',
      baseUrl: utils.ensureTrailingSlash(baseUrl),
      timeout
    };
    
    logger.info('HTTP连接已设置', { baseUrl });
  }
  
  /**
   * 设置Web Worker连接
   * @private
   */
  _setupWebWorkerConnection() {
    // 注意：在用户脚本环境中，Web Worker可能受到限制
    try {
      // 这里可以尝试创建Web Worker
      // 但由于用户脚本环境的限制，可能无法直接使用
      logger.warn('Web Worker在当前环境可能受限，降级为HTTP模式');
      this._setupHttpConnection(this.workerConfig.url || 'http://localhost:8000', this.workerConfig.timeout || 30000);
    } catch (error) {
      logger.error('创建Web Worker失败，降级为HTTP模式', error);
      this._setupHttpConnection(this.workerConfig.url || 'http://localhost:8000', this.workerConfig.timeout || 30000);
    }
  }
  
  /**
   * 设置iframe连接
   * @private
   * @param {string} url - iframe URL
   */
  _setupIframeConnection(url) {
    logger.warn('使用iframe作为备用通信方式');
    // 这里可以实现iframe通信逻辑
    // 但由于安全限制，可能不如HTTP方式可靠
    this._setupHttpConnection(url, this.workerConfig.timeout || 30000);
  }
  
  /**
   * 调用Worker方法
   * @param {string} method - 方法名
   * @param {Object} data - 调用数据
   * @param {Object} [options] - 调用选项
   * @returns {Promise<Object>} 调用结果
   */
  async callWorker(method, data = {}, options = {}) {
    // 生成唯一请求ID
    const requestId = this._generateRequestId();
    
    // 合并选项
    const callOptions = {
      ...this.workerConfig,
      ...options,
      timeout: options.timeout || this.workerConfig.timeout || 30000,
      retry: options.retry !== undefined ? options.retry : true,
      maxRetries: options.maxRetries || 3
    };
    
    logger.debug(`调用Worker方法: ${method}`, { requestId, method, data });
    
    // 根据连接类型执行不同的调用逻辑
    switch (this.workerInstance.type) {
      case 'http':
        return this._callWorkerHttp(requestId, method, data, callOptions);
      case 'webworker':
        return this._callWorkerWebWorker(requestId, method, data, callOptions);
      case 'iframe':
        return this._callWorkerIframe(requestId, method, data, callOptions);
      default:
        throw new Error(`未知的Worker连接类型: ${this.workerInstance.type}`);
    }
  }
  
  /**
   * 通过HTTP调用Worker
   * @private
   * @param {string} requestId - 请求ID
   * @param {string} method - 方法名
   * @param {Object} data - 调用数据
   * @param {Object} options - 调用选项
   * @returns {Promise<Object>} 调用结果
   */
  async _callWorkerHttp(requestId, method, data, options) {
    const url = `${this.workerInstance.baseUrl}${method}`;
    
    const httpOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        ...options.headers
      },
      body: JSON.stringify({
        id: requestId,
        method,
        params: data
      })
    };
    
    // 定义执行请求的函数
    const executeRequest = async () => {
      try {
        // 使用fetch API发送请求
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);
        
        const response = await fetch(url, {
          ...httpOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Worker请求失败: ${response.status} ${response.statusText}`);
        }
        
        // 尝试解析JSON响应
        const result = await response.json();
        
        // 验证响应格式
        if (!result || typeof result !== 'object') {
          throw new Error('Worker返回的响应格式无效');
        }
        
        // 检查错误
        if (result.error) {
          const error = new Error(result.error.message || 'Worker执行失败');
          error.code = result.error.code;
          error.details = result.error.details;
          throw error;
        }
        
        logger.debug(`Worker方法调用成功: ${method}`, { requestId, result: result.result });
        return result.result || result;
      } catch (error) {
        logger.error(`Worker方法调用失败: ${method}`, { requestId, error: error.message });
        throw error;
      }
    };
    
    // 如果需要重试，使用重试包装器
    if (options.retry) {
      return utils.retry(executeRequest, {
        maxRetries: options.maxRetries,
        delay: options.retryDelay || 1000,
        backoff: options.backoff || 2,
        shouldRetry: (error) => {
          // 超时、网络错误等可以重试
          return error.name === 'AbortError' || 
                 error.message.includes('Network') ||
                 error.message.includes('timeout');
        }
      });
    }
    
    // 不重试，直接执行
    return executeRequest();
  }
  
  /**
   * 通过Web Worker调用Worker（预留接口）
   * @private
   * @param {string} requestId - 请求ID
   * @param {string} method - 方法名
   * @param {Object} data - 调用数据
   * @param {Object} options - 调用选项
   * @returns {Promise<Object>} 调用结果
   */
  async _callWorkerWebWorker(requestId, method, data, options) {
    // 由于Web Worker在用户脚本环境中可能受限，这里实际上使用HTTP降级
    logger.warn('Web Worker模式不可用，使用HTTP降级');
    return this._callWorkerHttp(requestId, method, data, options);
  }
  
  /**
   * 通过iframe调用Worker（预留接口）
   * @private
   * @param {string} requestId - 请求ID
   * @param {string} method - 方法名
   * @param {Object} data - 调用数据
   * @param {Object} options - 调用选项
   * @returns {Promise<Object>} 调用结果
   */
  async _callWorkerIframe(requestId, method, data, options) {
    // 由于安全限制，iframe通信可能不可靠，这里实际上使用HTTP降级
    logger.warn('iframe模式不可用，使用HTTP降级');
    return this._callWorkerHttp(requestId, method, data, options);
  }
  
  /**
   * 处理图片上传到Worker
   * @param {File|Blob|string} imageData - 图片数据
   * @param {Object} [options] - 处理选项
   * @returns {Promise<Object>} 处理结果
   */
  async processImage(imageData, options = {}) {
    // 合并默认选项
    const processOptions = {
      quality: 0.9,
      maxWidth: 1024,
      maxHeight: 1024,
      format: 'jpeg',
      ...options
    };
    
    // 准备数据
    let dataToSend;
    
    if (imageData instanceof File || imageData instanceof Blob) {
      // 直接使用文件/Blob
      dataToSend = imageData;
    } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      // Base64格式
      dataToSend = utils.base64ToBlob(imageData);
    } else {
      throw new Error('不支持的图片数据格式');
    }
    
    // 创建FormData
    const formData = new FormData();
    formData.append('image', dataToSend, 'image.' + processOptions.format);
    
    // 添加处理选项
    for (const [key, value] of Object.entries(processOptions)) {
      formData.append(key, value.toString());
    }
    
    // 调用Worker的图片处理接口
    const url = `${this.workerInstance.baseUrl}process-image`;
    
    try {
      // 使用fetch发送FormData
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), processOptions.timeout || 60000);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`图片处理失败: ${response.status} ${response.statusText}`);
      }
      
      // 解析JSON响应
      const result = await response.json();
      
      logger.info('图片处理成功');
      return result;
    } catch (error) {
      logger.error('图片处理失败', error);
      throw error;
    }
  }
  
  /**
   * 生成唯一请求ID
   * @private
   * @returns {string} 请求ID
   */
  _generateRequestId() {
    this.currentRequestId++;
    return `req_${Date.now()}_${this.currentRequestId}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 断开连接
   */
  disconnect() {
    if (this.workerInstance) {
      // 根据类型执行不同的断开逻辑
      switch (this.workerInstance.type) {
        case 'webworker':
          // 关闭Web Worker
          if (this.workerInstance.worker) {
            this.workerInstance.worker.terminate();
          }
          break;
        case 'iframe':
          // 移除iframe
          if (this.workerInstance.iframe && this.workerInstance.iframe.parentNode) {
            this.workerInstance.iframe.parentNode.removeChild(this.workerInstance.iframe);
          }
          break;
        // HTTP连接不需要特殊断开
      }
      
      this.workerInstance = null;
      logger.info('Worker连接已断开');
    }
  }
  
  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.workerConfig = { ...this.workerConfig, ...newConfig };
    config.set('worker', this.workerConfig);
    
    // 重新初始化连接
    this.initialize();
  }
  
  /**
   * 检查Worker状态
   * @returns {Promise<boolean>} 是否可用
   */
  async checkStatus() {
    try {
      // 发送心跳请求
      const result = await this.callWorker('ping', {}, {
        timeout: 5000,
        retry: false
      });
      
      return result && result.pong === 'pong';
    } catch (error) {
      logger.warn('Worker状态检查失败', error);
      return false;
    }
  }
}

// 导出单例
export default new WorkerManager();