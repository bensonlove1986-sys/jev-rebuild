/**
 * 上传管理模块
 * 整合所有上传相关功能，提供统一接口和智能模式选择
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';

class Uploader {
  constructor() {
    // 缓存检测结果
    this.networkModes = null;
    
    // 上传统计信息
    this.stats = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalSize: 0,
      averageSpeed: 0,
      lastUploadTime: null
    };
    
    // 初始化时进行环境检测
    this.detectNetworkModes();
  }
  
  /**
   * 检测网络模式支持情况
   * @returns {Promise<Object>} 网络模式支持情况
   */
  async detectNetworkModes() {
    // 缓存检测结果，避免重复检测
    if (this.networkModes) {
      return this.networkModes;
    }
    
    logger.info('开始检测网络环境支持情况');
    
    // 基本特性检测
    const modes = {
      fetch: typeof fetch !== 'undefined',
      xhr: typeof XMLHttpRequest !== 'undefined',
      powershell: false // 默认不支持
    };
    
    // 检测PowerShell可用性
    modes.powershell = await this._detectPowerShell();
    
    // 缓存结果
    this.networkModes = modes;
    
    logger.info('网络环境检测完成', modes);
    return modes;
  }
  
  /**
   * 检测PowerShell是否可用
   * @private
   * @returns {Promise<boolean>} 是否可用
   */
  async _detectPowerShell() {
    // 在浏览器环境中，PowerShell通常不可用
    // 这里可以添加特定的检测逻辑
    return false;
  }
  
  /**
   * 统一上传接口
   * @param {File|Blob|string} data - 要上传的数据
   * @param {Object} [options] - 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async upload(data, options = {}) {
    // 合并默认选项和用户选项
    const uploadOptions = {
      ...config.get('upload', {}),
      ...options
    };
    
    // 验证URL
    if (!uploadOptions.baseUrl) {
      throw new Error('上传URL未配置');
    }
    
    if (!utils.isValidUrl(uploadOptions.baseUrl)) {
      throw new Error('无效的上传URL');
    }
    
    // 本地地址警告
    if (utils.isLocalUrl(uploadOptions.baseUrl)) {
      logger.warn('正在上传到本地地址', { url: uploadOptions.baseUrl });
    }
    
    // 确保检测完成
    const modes = await this.detectNetworkModes();
    
    // 选择上传策略
    let uploadStrategy;
    
    if (!uploadOptions.forceXhr && modes.fetch) {
      uploadStrategy = this._uploadWithFetch.bind(this);
      logger.debug('使用Fetch API进行上传');
    } else if (modes.xhr) {
      uploadStrategy = this._uploadWithXhr.bind(this);
      logger.debug('使用XMLHttpRequest进行上传');
    } else if (modes.powershell) {
      uploadStrategy = this._uploadWithPowerShell.bind(this);
      logger.debug('使用PowerShell进行上传');
    } else {
      throw new Error('没有可用的上传方法');
    }
    
    // 记录上传开始时间
    const startTime = Date.now();
    const dataSize = this._getDataSize(data);
    
    try {
      // 执行上传（带重试逻辑）
      const result = await this._withRetry(
        (attempt) => uploadStrategy(data, uploadOptions, attempt),
        uploadOptions
      );
      
      // 更新上传统计
      this._updateStats(true, dataSize, Date.now() - startTime);
      
      return result;
    } catch (error) {
      // 更新上传统计
      this._updateStats(false, dataSize, Date.now() - startTime);
      
      logger.error('上传失败', error);
      throw error;
    }
  }
  
  /**
   * 使用Fetch API上传
   * @private
   * @param {File|Blob|string} data - 要上传的数据
   * @param {Object} options - 上传选项
   * @param {number} attempt - 当前重试次数
   * @returns {Promise<Object>} 上传结果
   */
  async _uploadWithFetch(data, options, attempt = 0) {
    const { baseUrl, headers = {}, timeout, fileFieldName = 'file' } = options;
    
    // 准备FormData
    const formData = new FormData();
    
    if (data instanceof File || data instanceof Blob) {
      formData.append(fileFieldName, data, data.name || 'upload.dat');
    } else if (typeof data === 'string') {
      // 假设是Base64或URL
      if (data.startsWith('data:')) {
        // Base64数据
        const blob = utils.base64ToBlob(data);
        formData.append(fileFieldName, blob, 'upload.dat');
      } else {
        // 可能是URL，这里需要额外处理
        throw new Error('字符串数据需要转换为Blob或File对象');
      }
    }
    
    // 添加自定义字段
    if (options.fields) {
      for (const [key, value] of Object.entries(options.fields)) {
        formData.append(key, value);
      }
    }
    
    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // 发送请求
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          ...headers,
          // 不设置Content-Type，让浏览器自动设置
        },
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`上传失败: ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.responseText = errorText;
        throw error;
      }
      
      // 解析响应
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = { text: await response.text() };
      }
      
      return this._normalizeResult(result);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`上传超时（${timeout}ms）`);
      }
      
      throw error;
    }
  }
  
  /**
   * 使用XMLHttpRequest上传
   * @private
   * @param {File|Blob|string} data - 要上传的数据
   * @param {Object} options - 上传选项
   * @param {number} attempt - 当前重试次数
   * @returns {Promise<Object>} 上传结果
   */
  async _uploadWithXhr(data, options, attempt = 0) {
    const { baseUrl, headers = {}, timeout, fileFieldName = 'file' } = options;
    
    return new Promise((resolve, reject) => {
      // 准备FormData
      const formData = new FormData();
      
      if (data instanceof File || data instanceof Blob) {
        formData.append(fileFieldName, data, data.name || 'upload.dat');
      } else if (typeof data === 'string') {
        // 处理字符串数据
        if (data.startsWith('data:')) {
          const blob = utils.base64ToBlob(data);
          formData.append(fileFieldName, blob, 'upload.dat');
        } else {
          reject(new Error('字符串数据需要转换为Blob或File对象'));
          return;
        }
      }
      
      // 添加自定义字段
      if (options.fields) {
        for (const [key, value] of Object.entries(options.fields)) {
          formData.append(key, value);
        }
      }
      
      // 创建XHR对象
      const xhr = new XMLHttpRequest();
      
      // 设置超时
      xhr.timeout = timeout;
      
      // 监听进度（可选）
      if (options.onProgress && typeof options.onProgress === 'function') {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            options.onProgress({
              loaded: event.loaded,
              total: event.total,
              percent: percentComplete
            });
          }
        });
      }
      
      // 监听完成事件
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            let result;
            
            // 尝试解析JSON
            if (xhr.responseText) {
              try {
                result = JSON.parse(xhr.responseText);
              } catch (e) {
                result = { text: xhr.responseText };
              }
            } else {
              result = {};
            }
            
            resolve(this._normalizeResult(result));
          } catch (error) {
            reject(new Error('解析响应失败: ' + error.message));
          }
        } else {
          const error = new Error(`上传失败: ${xhr.status} ${xhr.statusText}`);
          error.status = xhr.status;
          error.responseText = xhr.responseText;
          reject(error);
        }
      });
      
      // 监听错误事件
      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'));
      });
      
      // 监听超时事件
      xhr.addEventListener('timeout', () => {
        reject(new Error(`上传超时（${timeout}ms）`));
      });
      
      // 打开连接
      xhr.open('POST', baseUrl);
      
      // 设置请求头（不设置Content-Type，让浏览器自动设置）
      for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(key, value);
        }
      }
      
      // 发送请求
      xhr.send(formData);
    });
  }
  
  /**
   * 使用PowerShell上传（备用方案）
   * @private
   * @param {File|Blob|string} data - 要上传的数据
   * @param {Object} options - 上传选项
   * @param {number} attempt - 当前重试次数
   * @returns {Promise<Object>} 上传结果
   */
  async _uploadWithPowerShell(data, options, attempt = 0) {
    // 这个方法在浏览器环境中通常不会被调用
    // 这里提供一个基本框架，实际实现可能需要与原生应用或扩展通信
    logger.warn('尝试使用PowerShell上传，但在当前环境中不可用');
    throw new Error('PowerShell上传在当前环境中不可用');
  }
  
  /**
   * 带重试逻辑的上传包装器
   * @private
   * @param {Function} uploadFn - 上传函数
   * @param {Object} options - 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async _withRetry(uploadFn, options) {
    const { maxRetries, retryDelay, backoff = 2 } = options;
    
    return utils.retry(uploadFn, {
      maxRetries,
      delay: retryDelay,
      backoff,
      shouldRetry: (error) => this._shouldRetryUpload(error, options)
    });
  }
  
  /**
   * 判断是否应该重试上传
   * @private
   * @param {Error} error - 错误对象
   * @param {Object} options - 上传选项
   * @returns {boolean} 是否应该重试
   */
  _shouldRetryUpload(error, options) {
    // 不重试422错误（Unprocessable Entity）
    if (error.status === 422) {
      return false;
    }
    
    // 不重试400错误（Bad Request）
    if (error.status === 400) {
      return false;
    }
    
    // 不重试401错误（Unauthorized）
    if (error.status === 401) {
      return false;
    }
    
    // 不重试403错误（Forbidden）
    if (error.status === 403) {
      return false;
    }
    
    // 不重试404错误（Not Found）
    if (error.status === 404) {
      return false;
    }
    
    // 超时、网络错误等可以重试
    return true;
  }
  
  /**
   * 获取数据大小
   * @private
   * @param {File|Blob|string} data - 数据
   * @returns {number} 数据大小（字节）
   */
  _getDataSize(data) {
    if (data instanceof File || data instanceof Blob) {
      return data.size;
    } else if (typeof data === 'string') {
      // 估算字符串大小
      return new Blob([data]).size;
    }
    return 0;
  }
  
  /**
   * 规范化上传结果
   * @private
   * @param {Object|string} result - 原始结果
   * @returns {Object} 规范化后的结果
   */
  _normalizeResult(result) {
    // 确保结果是对象
    if (typeof result !== 'object') {
      result = { data: result };
    }
    
    // 添加标准字段
    return {
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    };
  }
  
  /**
   * 更新上传统计
   * @private
   * @param {boolean} success - 是否成功
   * @param {number} size - 数据大小
   * @param {number} time - 上传时间（毫秒）
   */
  _updateStats(success, size, time) {
    this.stats.totalUploads++;
    
    if (success) {
      this.stats.successfulUploads++;
      this.stats.totalSize += size;
      this.stats.lastUploadTime = new Date().toISOString();
      
      // 计算平均速度（字节/秒）
      const speed = (size / time) * 1000;
      // 加权平均
      this.stats.averageSpeed = 
        (this.stats.averageSpeed * (this.stats.successfulUploads - 1) + speed) / 
        this.stats.successfulUploads;
    } else {
      this.stats.failedUploads++;
    }
  }
  
  /**
   * 获取上传统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return { ...this.stats };
  }
  
  /**
   * 重置上传统计
   */
  resetStats() {
    this.stats = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalSize: 0,
      averageSpeed: 0,
      lastUploadTime: null
    };
  }
}

// 导出单例
export default new Uploader();