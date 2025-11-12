/**
 * JEV模块化系统入口文件
 * 整合所有模块，提供统一入口点
 */

// 导入外部模块
import { ExternalMemory } from './externalMemory.js';
import { runIntegrationTests } from './integrationTestExternalMemory.js';

// 支持自动模块加载的配置
const MODULE_CONFIG = {
  autoLoadPatterns: [
    /^scripts\/modular\/(\w+)\.js$/,
    /^\.\/([^_][\w-]+)\.js$/
  ],
  excludePatterns: [
    /^test/,
    /^integration/,
    /^index\.js$/
  ],
  moduleNamePatterns: {
    'externalMemory': 'externalMemory',
    'evolver': 'evolver'
  }
};

// 直接定义所有模块
// 配置模块
const Config = {
  _config: {
    debug: false,
    upload: {
      baseUrl: 'http://localhost:8000/upload',
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      fileFieldName: 'file'
    },
    worker: {
      mode: 'local',
      url: 'http://localhost:8000',
      timeout: 60000
    },
    ui: {
      theme: 'default',
      defaultDialogWidth: '400px'
    }
  },
  
  get(key, defaultValue = undefined) {
    if (!key) return this._config;
    
    const keys = key.split('.');
    let value = this._config;
    
    for (const k of keys) {
      if (value[k] === undefined) {
        return defaultValue;
      }
      value = value[k];
    }
    
    return value;
  },
  
  set(key, value) {
    const keys = key.split('.');
    let obj = this._config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }
    
    obj[keys[keys.length - 1]] = value;
    return this;
  },
  
  update(newConfig) {
    Object.assign(this._config, newConfig);
    return this;
  },
  
  reset(key) {
    if (!key) {
      this._config = {
        debug: false,
        upload: {
          baseUrl: 'http://localhost:8000/upload',
          timeout: 30000,
          maxRetries: 3,
          retryDelay: 1000,
          fileFieldName: 'file'
        },
        worker: {
          mode: 'local',
          url: 'http://localhost:8000',
          timeout: 60000
        },
        ui: {
          theme: 'default',
          defaultDialogWidth: '400px'
        }
      };
    } else {
      const keys = key.split('.');
      if (keys.length === 1) {
        // 重置整个子配置
        const defaultConfig = this._getDefaultConfig(keys[0]);
        if (defaultConfig) {
          this._config[keys[0]] = defaultConfig;
        }
      }
    }
    return this;
  },
  
  validate() {
    // 简单的配置验证
    return true;
  },
  
  _getDefaultConfig(key) {
    const defaults = {
      upload: {
        baseUrl: 'http://localhost:8000/upload',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        fileFieldName: 'file'
      },
      worker: {
        mode: 'local',
        url: 'http://localhost:8000',
        timeout: 60000
      },
      ui: {
        theme: 'default',
        defaultDialogWidth: '400px'
      }
    };
    return defaults[key];
  }
};

// 日志模块
const Logger = {
  level: 'info', // debug, info, warn, error
  
  debug(...args) {
    if (this._shouldLog('debug')) {
      console.debug(`[JEV DEBUG] ${new Date().toISOString()}`, ...args);
    }
  },
  
  info(...args) {
    if (this._shouldLog('info')) {
      console.info(`[JEV INFO] ${new Date().toISOString()}`, ...args);
    }
  },
  
  warn(...args) {
    if (this._shouldLog('warn')) {
      console.warn(`[JEV WARN] ${new Date().toISOString()}`, ...args);
    }
  },
  
  error(...args) {
    if (this._shouldLog('error')) {
      console.error(`[JEV ERROR] ${new Date().toISOString()}`, ...args);
    }
  },
  
  log(...args) {
    console.log(`[JEV] ${new Date().toISOString()}`, ...args);
  },
  
  setLevel(level) {
    this.level = level;
  },
  
  _shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.level];
  }
};

// 工具模块
const Utils = {
  safeExecute(fn, options = {}) {
    try {
      return fn();
    } catch (error) {
      if (options.showError !== false) {
        console.error(`[${options.module || 'Utils'}] 执行失败:`, error);
      }
      return options.fallback;
    }
  },
  
  safeGet(obj, path, defaultValue = undefined) {
    try {
      const keys = path.split('.');
      let value = obj;
      
      for (const key of keys) {
        if (value[key] === undefined) {
          return defaultValue;
        }
        value = value[key];
      }
      
      return value;
    } catch (error) {
      return defaultValue;
    }
  },
  
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },
  
  generateId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  },
  
  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  async retry(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const delay = options.delay || 1000;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries - 1) {
          throw error;
        }
        
        console.warn(`重试 (${attempt + 1}/${maxRetries})...`);
        await this.delay(delay * Math.pow(2, attempt)); // 指数退避
      }
    }
  },
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (error) {
      return false;
    }
  },
  
  base64ToBlob(base64, type = 'application/octet-stream') {
    const bytes = atob(base64);
    let len = bytes.length;
    const arr = new Uint8Array(len);
    
    while (len--) {
      arr[len] = bytes.charCodeAt(len);
    }
    
    return new Blob([arr], { type });
  },
  
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  unescapeHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
};

// 上传模块
const Uploader = {
  _stats: {
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalSize: 0,
    averageSpeed: 0
  },
  
  async upload(data, options = {}) {
    this._stats.totalUploads++;
    const startTime = Date.now();
    
    try {
      // 智能选择上传方式
      const supportedModes = await this.detectNetworkModes();
      
      if (supportedModes.fetch && typeof fetch === 'function') {
        return await this._uploadWithFetch(data, options);
      } else if (supportedModes.xhr) {
        return await this._uploadWithXhr(data, options);
      } else {
        throw new Error('没有支持的上传方式');
      }
    } catch (error) {
      this._stats.failedUploads++;
      console.error('上传失败:', error);
      throw error;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;
      // 更新平均速度（如果有大小信息）
      if (data.size && duration > 0) {
        this._stats.averageSpeed = (data.size / duration) * 1000;
      }
    }
  },
  
  async detectNetworkModes() {
    const modes = {
      fetch: typeof fetch === 'function',
      xhr: typeof XMLHttpRequest === 'function',
      cors: false
    };
    
    // 检测CORS支持
    if (modes.xhr) {
      try {
        const xhr = new XMLHttpRequest();
        modes.cors = 'withCredentials' in xhr;
      } catch (e) {
        modes.cors = false;
      }
    }
    
    return modes;
  },
  
  async _uploadWithFetch(data, options = {}) {
    const url = options.baseUrl || Config.get('upload.baseUrl');
    const timeout = options.timeout || Config.get('upload.timeout');
    const fileFieldName = options.fileFieldName || Config.get('upload.fileFieldName');
    
    // 创建FormData
    const formData = new FormData();
    formData.append(fileFieldName, data);
    
    // 添加自定义字段
    if (options.fields) {
      Object.entries(options.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    // 设置超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        credentials: 'include' // 包含cookies
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`上传失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      this._stats.successfulUploads++;
      this._stats.totalSize += data.size || 0;
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('上传超时');
      }
      throw error;
    }
  },
  
  async _uploadWithXhr(data, options = {}) {
    return new Promise((resolve, reject) => {
      const url = options.baseUrl || Config.get('upload.baseUrl');
      const timeout = options.timeout || Config.get('upload.timeout');
      const fileFieldName = options.fileFieldName || Config.get('upload.fileFieldName');
      
      const xhr = new XMLHttpRequest();
      xhr.timeout = timeout;
      
      // 创建FormData
      const formData = new FormData();
      formData.append(fileFieldName, data);
      
      // 添加自定义字段
      if (options.fields) {
        Object.entries(options.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            this._stats.successfulUploads++;
            this._stats.totalSize += data.size || 0;
            resolve(result);
          } catch (e) {
            reject(new Error('响应解析失败'));
          }
        } else {
          reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('网络错误'));
      xhr.ontimeout = () => reject(new Error('上传超时'));
      
      xhr.open('POST', url);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  },
  
  getStats() {
    return { ...this._stats };
  },
  
  resetStats() {
    this._stats = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalSize: 0,
      averageSpeed: 0
    };
    return this;
  }
};

// Worker模块
const WorkerManager = {
  _state: 'disconnected',
  _config: Config.get('worker'),
  
  initialize(options = {}) {
    this._config = { ...this._config, ...options };
    this._state = 'initialized';
    return true;
  },
  
  async callWorker(method, data, options = {}) {
    const timeout = options.timeout || this._config.timeout;
    const mode = options.mode || this._config.mode;
    
    try {
      this._state = 'calling';
      
      // 根据模式选择调用方式
      if (mode === 'local') {
        return await this._callLocalWorker(method, data, timeout);
      } else if (mode === 'webworker' && typeof Worker !== 'undefined') {
        return await this._callWebWorker(method, data, timeout);
      } else {
        return await this._callIframeWorker(method, data, timeout);
      }
    } catch (error) {
      this._state = 'error';
      console.error('Worker调用失败:', error);
      throw error;
    } finally {
      this._state = 'idle';
    }
  },
  
  async processImage(imageData, options = {}) {
    return this.callWorker('processImage', { imageData, ...options });
  },
  
  async _callLocalWorker(method, data, timeout) {
    // 本地模拟Worker调用
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Worker调用超时')), timeout);
      
      // 模拟处理延迟
      setTimeout(() => {
        clearTimeout(timer);
        
        // 模拟处理结果
        if (method === 'processImage') {
          resolve({
            success: true,
            ocr: '示例OCR文本',
            translation: '示例翻译结果',
            confidence: 0.95
          });
        } else {
          resolve({ success: true, method, data });
        }
      }, 1000);
    });
  },
  
  async _callWebWorker(method, data, timeout) {
    // Web Worker调用（暂不实现，返回模拟结果）
    return this._callLocalWorker(method, data, timeout);
  },
  
  async _callIframeWorker(method, data, timeout) {
    // Iframe Worker调用（暂不实现，返回模拟结果）
    return this._callLocalWorker(method, data, timeout);
  },
  
  getState() {
    return this._state;
  },
  
  updateConfig(config) {
    this._config = { ...this._config, ...config };
    return this;
  },
  
  checkStatus() {
    return { state: this._state, config: this._config };
  },
  
  disconnect() {
    this._state = 'disconnected';
    return this;
  }
};

// UI模块
const UIManager = {
  _dialogs: [],
  
  createInputDialog(options = {}) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'jev-dialog';
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 9999;
        width: ${options.width || '300px'};
      `;
      
      dialog.innerHTML = `
        <h3>${options.title || '输入'}</h3>
        <p>${options.message || ''}</p>
        <input type="${options.inputType || 'text'}" class="jev-dialog-input" placeholder="${options.placeholder || ''}">
        <div style="margin-top: 15px; text-align: right;">
          <button class="jev-dialog-cancel">取消</button>
          <button class="jev-dialog-confirm" style="margin-left: 10px;">确定</button>
        </div>
      `;
      
      const overlay = document.createElement('div');
      overlay.className = 'jev-dialog-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9998;
      `;
      
      document.body.appendChild(overlay);
      document.body.appendChild(dialog);
      
      this._dialogs.push({ dialog, overlay });
      
      dialog.querySelector('.jev-dialog-confirm').addEventListener('click', () => {
        const inputValue = dialog.querySelector('.jev-dialog-input').value;
        this._closeDialog(dialog, overlay);
        resolve({ confirmed: true, value: inputValue });
      });
      
      dialog.querySelector('.jev-dialog-cancel').addEventListener('click', () => {
        this._closeDialog(dialog, overlay);
        resolve({ confirmed: false });
      });
      
      // ESC键关闭
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          this._closeDialog(dialog, overlay);
          resolve({ confirmed: false });
        }
      };
      
      document.addEventListener('keydown', handleEsc);
      
      // 存储清理函数
      dialog._cleanup = () => {
        document.removeEventListener('keydown', handleEsc);
      };
    });
  },
  
  createCommandDialog(options = {}) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'jev-command-dialog';
      dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 9999;
        width: ${options.width || '400px'};
      `;
      
      const commandsHtml = options.commands.map(cmd => 
        `<button class="jev-command-btn" data-command="${cmd.id}">
          ${cmd.label}
        </button>`
      ).join('');
      
      dialog.innerHTML = `
        <h3>${options.title || '选择操作'}</h3>
        <p>${options.message || ''}</p>
        <div class="jev-commands" style="margin: 15px 0;">
          ${commandsHtml}
        </div>
        <div style="text-align: right;">
          <button class="jev-dialog-close">关闭</button>
        </div>
      `;
      
      const overlay = document.createElement('div');
      overlay.className = 'jev-dialog-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 9998;
      `;
      
      document.body.appendChild(overlay);
      document.body.appendChild(dialog);
      
      this._dialogs.push({ dialog, overlay });
      
      // 绑定命令按钮事件
      dialog.querySelectorAll('.jev-command-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const commandId = btn.getAttribute('data-command');
          this._closeDialog(dialog, overlay);
          resolve({ confirmed: true, command: commandId });
        });
      });
      
      dialog.querySelector('.jev-dialog-close').addEventListener('click', () => {
        this._closeDialog(dialog, overlay);
        resolve({ confirmed: false });
      });
      
      // ESC键关闭
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          this._closeDialog(dialog, overlay);
          resolve({ confirmed: false });
        }
      };
      
      document.addEventListener('keydown', handleEsc);
      
      // 存储清理函数
      dialog._cleanup = () => {
        document.removeEventListener('keydown', handleEsc);
      };
    });
  },
  
  _closeDialog(dialog, overlay) {
    if (dialog._cleanup) {
      dialog._cleanup();
    }
    
    document.body.removeChild(dialog);
    document.body.removeChild(overlay);
    
    // 从列表中移除
    this._dialogs = this._dialogs.filter(d => d.dialog !== dialog);
  },
  
  closeAllDialogs() {
    this._dialogs.forEach(({ dialog, overlay }) => {
      this._closeDialog(dialog, overlay);
    });
    return this;
  },
  
  updateTranslationUI(element, translation) {
    if (!element) return;
    
    // 清空现有内容
    element.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'jev-translation-container';
    container.style.cssText = `
      padding: 10px;
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 4px solid #2196F3;
    `;
    
    // 原始文本
    if (translation.original) {
      const originalDiv = document.createElement('div');
      originalDiv.className = 'jev-translation-original';
      originalDiv.style.cssText = 'margin-bottom: 8px; font-size: 14px; color: #666;';
      originalDiv.textContent = translation.original;
      container.appendChild(originalDiv);
    }
    
    // 翻译文本
    if (translation.translated) {
      const translatedDiv = document.createElement('div');
      translatedDiv.className = 'jev-translation-translated';
      translatedDiv.style.cssText = 'font-size: 16px; color: #333;';
      translatedDiv.textContent = translation.translated;
      container.appendChild(translatedDiv);
    }
    
    // 置信度
    if (translation.confidence !== undefined) {
      const confidenceDiv = document.createElement('div');
      confidenceDiv.className = 'jev-translation-confidence';
      confidenceDiv.style.cssText = 'margin-top: 5px; font-size: 12px; color: #999;';
      confidenceDiv.textContent = `置信度: ${(translation.confidence * 100).toFixed(1)}%`;
      container.appendChild(confidenceDiv);
    }
    
    element.appendChild(container);
    return container;
  },
  
  escapeHtml(text) {
    return Utils.escapeHtml(text);
  },
  
  fixUI() {
    // 修复页面UI元素
    // 移除重复的元素
    document.querySelectorAll('.jev-duplicate').forEach(el => {
      if (el.previousElementSibling && el.previousElementSibling.classList.contains('jev-duplicate')) {
        el.remove();
      }
    });
    
    // 修复样式问题
    document.querySelectorAll('.jev-fix-style').forEach(el => {
      el.style.visibility = 'visible';
      el.style.opacity = '1';
    });
    
    return this;
  },
  
  initJevUIElements() {
    // 初始化JEV UI元素
    // 确保样式容器存在
    let styleContainer = document.getElementById('jev-style-container');
    if (!styleContainer) {
      styleContainer = document.createElement('style');
      styleContainer.id = 'jev-style-container';
      document.head.appendChild(styleContainer);
    }
    
    // 添加基础样式
    styleContainer.textContent = `
      .jev-dialog {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .jev-dialog h3 {
        margin-top: 0;
        color: #333;
      }
      .jev-dialog-input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-top: 10px;
      }
      .jev-dialog button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      .jev-dialog-confirm {
        background-color: #2196F3;
        color: white;
      }
      .jev-dialog-cancel,
      .jev-dialog-close {
        background-color: #f5f5f5;
        color: #333;
      }
      .jev-command-btn {
        display: block;
        width: 100%;
        text-align: left;
        padding: 10px;
        margin-bottom: 8px;
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        cursor: pointer;
      }
      .jev-command-btn:hover {
        background: #e3f2fd;
      }
    `;
    
    return this;
  }
};

// 主应用模块
const JEVApp = {
  _state: {
    initialized: false,
    isActive: false,
    currentMode: 'default'
  },
  
  async initialize(options = {}) {
    try {
      // 初始化配置
      if (options.config) {
        Config.update(options.config);
      }
      
      // 初始化日志级别
      if (options.debug || Config.get('debug')) {
        Logger.setLevel('debug');
      }
      
      // 初始化各个模块
      Logger.info('正在初始化JEV系统...');
      
      // 初始化Worker
      WorkerManager.initialize();
      
      // 初始化UI
      UIManager.initJevUIElements();
      
      // 更新状态
      this._state.initialized = true;
      this._state.isActive = true;
      
      Logger.info('JEV系统初始化完成');
      return true;
    } catch (error) {
      Logger.error('JEV初始化失败:', error);
      this._state.initialized = false;
      throw error;
    }
  },
  
  async processImage(imageData, options = {}) {
    if (!this._state.initialized) {
      throw new Error('JEV未初始化');
    }
    
    Logger.info('开始处理图片');
    
    try {
      let result = {};
      
      // 上传图片
      if (options.upload !== false) {
        Logger.debug('上传图片');
        const uploadResult = await Uploader.upload(imageData, {
          baseUrl: options.uploadUrl || Config.get('upload.baseUrl'),
          timeout: options.uploadTimeout || Config.get('upload.timeout')
        });
        result.upload = uploadResult;
      }
      
      // 处理图片（OCR和翻译）
      if (options.ocr !== false || options.translate !== false) {
        Logger.debug('调用Worker处理图片');
        const workerResult = await WorkerManager.processImage(imageData, options);
        
        if (workerResult.ocr) {
          result.ocr = workerResult.ocr;
        }
        
        if (workerResult.translation) {
          result.translation = workerResult.translation;
        }
        
        if (workerResult.confidence) {
          result.confidence = workerResult.confidence;
        }
      }
      
      Logger.info('图片处理完成');
      return result;
    } catch (error) {
      Logger.error('图片处理失败:', error);
      throw error;
    }
  },
  
  async translateText(text, options = {}) {
    if (!this._state.initialized) {
      throw new Error('JEV未初始化');
    }
    
    Logger.info('开始翻译文本');
    
    try {
      // 调用Worker进行翻译
      const result = await WorkerManager.callWorker('translateText', {
        text,
        ...options
      });
      
      Logger.info('文本翻译完成');
      return result;
    } catch (error) {
      Logger.error('文本翻译失败:', error);
      throw error;
    }
  },
  
  createJEVUnifiedWindow() {
    // 检查是否已存在
    let windowElement = document.getElementById('jev-unified-window');
    if (windowElement) {
      return windowElement;
    }
    
    // 创建窗口
    windowElement = document.createElement('div');
    windowElement.id = 'jev-unified-window';
    windowElement.className = 'jev-window';
    windowElement.style.cssText = `
      position: fixed;
      top: 50px;
      right: 50px;
      width: 320px;
      height: 400px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;
    
    // 窗口头部
    const header = document.createElement('div');
    header.className = 'jev-window-header';
    header.style.cssText = `
      padding: 12px 16px;
      background: #2196F3;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <h3 style="margin: 0; font-size: 16px;">DAOJIE助手</h3>
      <button id="jev-close-window" style="background: none; border: none; color: white; cursor: pointer;">×</button>
    `;
    
    // 窗口内容
    const content = document.createElement('div');
    content.className = 'jev-window-content';
    content.style.cssText = `
      flex: 1;
      padding: 16px;
      overflow-y: auto;
    `;
    content.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <p>DAOJIE聊天图片采集</p>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">模块化版本 v2.0.0</p>
        <div style="margin-top: 20px;">
          <button id="jev-test-upload" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">测试上传</button>
        </div>
      </div>
    `;
    
    // 窗口底部
    const footer = document.createElement('div');
    footer.className = 'jev-window-footer';
    footer.style.cssText = `
      padding: 12px 16px;
      background: #f5f5f5;
      border-top: 1px solid #ddd;
    `;
    footer.innerHTML = `
      <div style="text-align: center; font-size: 12px; color: #666;">
        点击图片开始处理
      </div>
    `;
    
    // 组装窗口
    windowElement.appendChild(header);
    windowElement.appendChild(content);
    windowElement.appendChild(footer);
    
    // 添加事件监听器
    windowElement.querySelector('#jev-close-window').addEventListener('click', () => {
      windowElement.style.display = 'none';
    });
    
    windowElement.querySelector('#jev-test-upload').addEventListener('click', async () => {
      try {
        const testFile = new Blob(['TEST DATA'], { type: 'text/plain' });
        const result = await Uploader.upload(testFile);
        alert('上传测试成功!');
      } catch (error) {
        alert('上传测试失败: ' + error.message);
      }
    });
    
    // 添加到页面
    document.body.appendChild(windowElement);
    
    return windowElement;
  },
  
  getState() {
    return { ...this._state };
  },
  
  reset() {
    // 重置状态
    this._state = {
      initialized: false,
      isActive: false,
      currentMode: 'default'
    };
    
    // 重置各个模块
    Uploader.resetStats();
    WorkerManager.disconnect();
    UIManager.closeAllDialogs();
    
    return this;
  },
  
  getModules() {
    return {
      config: Config,
      logger: Logger,
      uploader: Uploader,
      worker: WorkerManager,
      ui: UIManager,
      utils: Utils
    };
  },
  
  getVersion() {
    return '2.0.0';
  }
};

/**
 * JEV系统初始化函数
 * 用于初始化整个JEV系统
 */
function initializeJEV(options = {}) {
  try {
    // 初始化JEV应用
    return JEVApp.initialize(options);
  } catch (error) {
    console.error('JEV系统初始化失败:', error);
    throw error;
  }
}

/**
 * 定义全局JEV对象
 * 提供对所有模块的访问
 */
const JEV = {
  // 版本信息
  version: '2.0.0',
  
  // 核心功能
  initialize: initializeJEV,
  processImage: (...args) => JEVApp.processImage(...args),
  translateText: (...args) => JEVApp.translateText(...args),
  createWindow: () => JEVApp.createJEVUnifiedWindow(),
  
  // 模块引用
  _modules: {
    app: JEVApp,
    config: Config,
    logger: Logger,
    uploader: Uploader,
    worker: WorkerManager,
    ui: UIManager,
    utils: Utils
  },
  
  // 工具函数
  getModule: (name) => {
    return JEV._modules[name] || null;
  },
  
  getState: () => JEVApp.getState(),
  
  // 暴露各个模块的主要方法
  // 配置模块
  config: {
    get: (...args) => Config.get(...args),
    set: (...args) => Config.set(...args),
    update: (...args) => Config.update(...args),
    reset: (...args) => Config.reset(...args)
  },
  
  // 日志模块
  log: {
    debug: (...args) => Logger.debug(...args),
    info: (...args) => Logger.info(...args),
    warn: (...args) => Logger.warn(...args),
    error: (...args) => Logger.error(...args),
    log: (...args) => Logger.log(...args),
    setLevel: (...args) => Logger.setLevel(...args)
  },
  
  // 工具模块
  utils: {
    safeExecute: (...args) => Utils.safeExecute(...args),
    safeGet: (...args) => Utils.safeGet(...args),
    formatBytes: (...args) => Utils.formatBytes(...args),
    generateId: (...args) => Utils.generateId(...args),
    generateUniqueId: (...args) => Utils.generateUniqueId(...args),
    delay: (...args) => Utils.delay(...args),
    retry: (...args) => Utils.retry(...args),
    debounce: (...args) => Utils.debounce(...args),
    throttle: (...args) => Utils.throttle(...args),
    isValidUrl: (...args) => Utils.isValidUrl(...args),
    base64ToBlob: (...args) => Utils.base64ToBlob(...args),
    blobToBase64: (...args) => Utils.blobToBase64(...args),
    escapeHtml: (...args) => Utils.escapeHtml(...args),
    unescapeHtml: (...args) => Utils.unescapeHtml(...args)
  },
  
  // 上传模块
  upload: {
    uploadFile: (...args) => Uploader.upload(...args),
    detectModes: (...args) => Uploader.detectNetworkModes(...args),
    getStats: () => Uploader.getStats(),
    resetStats: () => Uploader.resetStats()
  },
  
  // Worker模块
  worker: {
    initialize: (...args) => WorkerManager.initialize(...args),
    call: (...args) => WorkerManager.callWorker(...args),
    processImage: (...args) => WorkerManager.processImage(...args),
    getState: () => WorkerManager.getState(),
    disconnect: () => WorkerManager.disconnect()
  },
  
  // UI模块
  ui: {
    createInputDialog: (...args) => UIManager.createInputDialog(...args),
    createCommandDialog: (...args) => UIManager.createCommandDialog(...args),
    closeAllDialogs: () => UIManager.closeAllDialogs(),
    updateTranslationUI: (...args) => UIManager.updateTranslationUI(...args),
    escapeHtml: (...args) => UIManager.escapeHtml(...args),
    fixUI: () => UIManager.fixUI()
  },
  
  // 外部记忆模块（增强版，支持命名空间）
  externalMemory: {
    // 基本操作（增强版，支持命名空间）
    set: (key, value, options = {}) => {
      // 支持命名空间
      if (options.ns && typeof options.ns === 'string') {
        const namespacedKey = `${options.ns}::${key}`;
        return ExternalMemory.set(namespacedKey, value);
      }
      return ExternalMemory.set(key, value);
    },
    
    get: (key, options = {}) => {
      // 支持命名空间
      if (options.ns && typeof options.ns === 'string') {
        const namespacedKey = `${options.ns}::${key}`;
        return ExternalMemory.get(namespacedKey);
      }
      return ExternalMemory.get(key);
    },
    
    list: (options = {}) => {
      // 支持命名空间过滤
      return ExternalMemory.list().then(keys => {
        if (options.ns && typeof options.ns === 'string') {
          const prefix = `${options.ns}::`;
          return keys.filter(key => key.startsWith(prefix))
            .map(key => key.substring(prefix.length)); // 返回去掉前缀的键
        }
        return keys;
      });
    },
    
    del: (key, options = {}) => {
      // 支持命名空间
      if (options.ns && typeof options.ns === 'string') {
        const namespacedKey = `${options.ns}::${key}`;
        return ExternalMemory.del(namespacedKey);
      }
      return ExternalMemory.del(key);
    },
    
    delete: (key, options = {}) => {
      return JEV.externalMemory.del(key, options);
    },
    
    // 批量操作（增强版，支持命名空间）
    batchSet: (items, options = {}) => {
      // 支持命名空间
      if (options.ns && typeof options.ns === 'string') {
        const namespacedItems = items.map(item => ({
          ...item,
          key: `${options.ns}::${item.key}`
        }));
        return ExternalMemory.batchSet(namespacedItems);
      }
      return ExternalMemory.batchSet(items);
    },
    
    batchGet: (keys, options = {}) => {
      // 支持命名空间
      if (options.ns && typeof options.ns === 'string') {
        const namespacedKeys = keys.map(key => `${options.ns}::${key}`);
        return ExternalMemory.batchGet(namespacedKeys).then(results => {
          // 返回时不修改键名，因为调用者需要知道原始请求的对应关系
          return results;
        });
      }
      return ExternalMemory.batchGet(keys);
    },
    
    batchDel: (keys, options = {}) => {
      // 支持命名空间
      if (options.ns && typeof options.ns === 'string') {
        const namespacedKeys = keys.map(key => `${options.ns}::${key}`);
        return ExternalMemory.batchDel(namespacedKeys);
      }
      return ExternalMemory.batchDel(keys);
    },
    
    // 配置和工具
    configure: (...args) => ExternalMemory.configure(...args),
    healthCheck: (...args) => ExternalMemory.healthCheck(...args),
    
    // 测试功能
    test: {
      runIntegration: () => runIntegrationTests()
    }
  },
  
  // 自进化模块
  evolver: null
};

/**
 * 自动加载模块
 * 扫描scripts/modular目录中的模块文件，自动加载并注册到JEV对象
 */
async function autoLoadModules() {
  try {
    Logger.info('开始自动加载模块...');
    const loadedModules = {};
    
    // 在浏览器环境中使用import.meta.glob（如果支持）
    if (typeof window !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.glob) {
      try {
        const modules = import.meta.glob('./modular/*.js');
        for (const path in modules) {
          try {
            const mod = await modules[path]();
            const name = path.split('/').pop().replace('.js', '');
            // 跳过index.js等不需要重复加载的文件
            if (name === 'index') continue;
            
            JEV[name] = mod.default || mod;
            loadedModules[name] = true;
            Logger.info(`[JEV] 模块已自动加载: ${name}`);
          } catch (err) {
            Logger.error(`[JEV] 模块加载失败: ${path}`, err);
          }
        }
      } catch (e) {
        Logger.warn('import.meta.glob不可用，使用备选方案加载模块');
        // 备选方案：尝试导入已知模块
        const knownModules = ['evolver', 'optimizer', 'memoryBridge', 'autoWake'];
        for (const moduleName of knownModules) {
          try {
            Logger.info(`尝试加载模块: ${moduleName}`);
            const modulePath = `./${moduleName}.js`;
            const module = await import(modulePath);
            const moduleInstance = module.default || module[moduleName.charAt(0).toUpperCase() + moduleName.slice(1)];
            
            if (moduleInstance) {
              JEV[moduleName] = moduleInstance;
              loadedModules[moduleName] = true;
              Logger.info(`成功加载模块: ${moduleName}`);
            }
          } catch (error) {
            Logger.warn(`加载模块 ${moduleName} 失败:`, error);
          }
        }
      }
    }
    
    // 在Node.js环境中，我们可以读取目录
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fs = require('fs');
        const path = require('path');
        const dirPath = path.join(__dirname, '.');
        
        // 读取目录中的文件
        const files = fs.readdirSync(dirPath);
        
        // 过滤出JavaScript文件
        const jsFiles = files.filter(file => {
          return file.endsWith('.js') && 
                 file !== 'index.js' &&
                 !MODULE_CONFIG.excludePatterns.some(pattern => pattern.test(file));
        });
        
        // 尝试加载每个模块
        for (const file of jsFiles) {
          try {
            const filePath = path.join(dirPath, file);
            const moduleName = file.replace('.js', '');
            
            // 跳过已经存在的模块
            if (JEV[moduleName]) continue;
            
            Logger.info(`尝试加载模块: ${moduleName}`);
            const module = require(filePath);
            const moduleInstance = module.default || module[moduleName.charAt(0).toUpperCase() + moduleName.slice(1)];
            
            if (moduleInstance) {
              JEV[moduleName] = moduleInstance;
              loadedModules[moduleName] = true;
              Logger.info(`成功加载模块: ${moduleName}`);
            }
          } catch (error) {
            Logger.warn(`加载模块 ${file} 失败:`, error);
          }
        }
      } catch (error) {
        Logger.warn('在Node.js环境中读取目录失败:', error);
      }
    }
    
    Logger.info(`自动模块加载完成，成功加载 ${Object.keys(loadedModules).length} 个模块`);
    return loadedModules;
  } catch (error) {
    Logger.error('自动模块加载失败:', error);
    return {};
  }
}

/**
 * 自动记忆绑定TREA
 * 将TREA对话上下文存档到externalMemory，使用命名空间ns=trea
 */
function bindTREAMemory(messages) {
  try {
    if (Array.isArray(messages) && messages.length > 0) {
      Logger.info('正在将TREA对话上下文存档到externalMemory');
      return JEV.externalMemory.set('trea_history', messages, { ns: 'trea' });
    }
    return Promise.resolve();
  } catch (error) {
    Logger.error('TREA记忆绑定失败:', error);
    return Promise.reject(error);
  }
}

// 暴露TREA记忆绑定函数
JEV.bindTREAMemory = bindTREAMemory;

/**
 * 自动初始化JEV系统
 * 当DOM加载完成时自动执行
 */
async function autoInitializeJEV() {
  try {
    // 尝试初始化JEV系统
    initializeJEV();
    
    // 自动加载模块
    await autoLoadModules();
    
    // 修复UI
    setTimeout(() => {
      JEV.ui.fixUI();
    }, 1000);
    
  } catch (error) {
    console.error('JEV自动初始化失败:', error);
  }
}

// 暴露autoLoadModules函数到JEV对象
JEV.autoLoadModules = autoLoadModules;

// 设置全局JEV对象
if (typeof window !== 'undefined') {
  window.JEV = JEV;
  
  // 自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeJEV);
  } else {
    // 延迟初始化，确保页面完全加载
    setTimeout(autoInitializeJEV, 100);
  }
}

// 支持CommonJS导出（如果在Node环境中）
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = JEV;
}

// 支持AMD模块（如RequireJS）
if (typeof define === 'function' && define.amd) {
  define(() => JEV);
}

// 为用户脚本环境设置JEV变量
if (typeof unsafeWindow !== 'undefined') {
  unsafeWindow.JEV = JEV;
}