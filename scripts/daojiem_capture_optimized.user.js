// ==UserScript==
// @name         DAOJIE 聊天图片采集 → R2
// @name:en      DAOJIE Chat Image Capture → R2
// @name:zh-CN   DAOJIE 聊天图片采集 → R2
// @namespace    https://daojiemarketing.com/
// @version      2.0.0
// @description  自动截取聊天图片并上传到你的 Cloudflare Worker（存入 R2），确保100%可控拿图。
// @author       JEV
// @match        https://app.daojiemarketing.com/*
// @match        https://*.daojiemarketing.com/*
// @match        https://deepseek.com/*
// @match        https://*.deepseek.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

// --- 安全初始化（防报错） ---
const panel = console;

// 忽略 Firebase 报错
window.safeExec = async (fn) => {
  try { await fn(); } catch(e) { console.warn("⚠️ Firebase skipped:", e.message); }
};

// 自动切换 Worker 地址
const WORKER_URL = 
  window.location.hostname.includes("localhost")
    ? "http://localhost:3000"
    : "https://jevshop.bensonlove1986.workers.dev";
/* global html2canvas */
/* eslint-disable curly, no-loop-func */

// 全局配置对象
window.JEV = window.JEV || {}
// 修复消息监听器端口关闭问题
function fixChromeMessageListeners() {
    const originalAddListener = chrome.runtime.onMessage.addListener;
    chrome.runtime.onMessage.addListener = function(callback) {
        return originalAddListener.call(this, function(message, sender, sendResponse) {
            // 执行原始回调
            const result = callback(message, sender, sendResponse);
            // 确保返回true以保持端口打开
            return result === false ? false : true;
        });
    };
    console.log('[JEV] Chrome消息监听器已修复');
}

// 应用修复
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    fixChromeMessageListeners();
};
window.JEV.CFG = window.JEV.CFG || {
  autoPush: false,
  autoQuote: false,
  chatOnly: true,
  chatRootSel: '',
  debugMode: true,
  enabled: true,
  inputSel: '',
  isAdmin: false,
  locationId: '',
  maxConcurrency: Math.max(1, Math.floor((navigator.hardwareConcurrency || 4) / 2)), // 自动根据CPU核心数调整
  notifyUpload: true,
  ocr: false,
  panelW: 520,
  panelH: 240,
  pauseWhenHidden: true,
  push: false,
  sendMode: 'ui',
  targetLang: 'zh-CN',
  translate: true, // 启用翻译功能
  translate: true,
  workerBase: WORKER_URL,
  workerUrl: WORKER_URL,
  webhookSecret: 'jevindustry2025'
};



// UI元素安全访问辅助函数
function safeAccess(element, property) {
    return element ? element[property] : null;
}
function safeCall(element, method, ...args) {
    return element && element[method] ? element[method](...args) : null;
}
// JEV Upload v2 - 自动检测与模式切换上传模块
window.JEV.UPLOAD_CONFIG = {
  // 基础配置
  FORCE_BROWSER_MODE: false,       // 强制使用浏览器模式
  AUTO_DETECT_MODE: true,          // 启用自动检测模式
  AUTO_SWITCH_MODE: true,          // 启用自动切换模式
  RETRY_COUNT: 2,                  // 自动重试次数
  RETRY_DELAY: 1000,               // 重试间隔(ms)
  LOG_PERSISTENCE: true,           // 启用日志持久化
  LOG_RETENTION: 50,               // 保留的日志条数

  // 运行时状态
  detectedMode: null,              // 检测到的最佳模式
  lastDetectionTime: null,         // 上次检测时间
  detectionInterval: 300000,       // 检测间隔(5分钟)
  successCount: {                  // 各模式成功计数
    fetch: 0,
    xhr: 0,
    powershell: 0
  },
  failureCount: {                  // 各模式失败计数
    fetch: 0,
    xhr: 0,
    powershell: 0
  }
};

// 持久化日志管理器
window.JEV.logManager = {
  // 获取持久化日志
  getLogs: function() {
    try { // 确保有对应的catch块
      if (!window.JEV.UPLOAD_CONFIG.LOG_PERSISTENCE) return [];
      const logs = localStorage.getItem('jev_upload_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (e) {
      console.error('[JEV] 获取日志失败:', e);
      return [];
    }
  },

  // 添加日志
  addLog: function(level, message) {
    try { // 确保有对应的catch块
      if (!window.JEV.UPLOAD_CONFIG.LOG_PERSISTENCE) return;

      const logs = this.getLogs();
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message
      };

      logs.push(logEntry);

      // 限制日志数量
      if (logs.length > window.JEV.UPLOAD_CONFIG.LOG_RETENTION) {
        logs.splice(0, logs.length - window.JEV.UPLOAD_CONFIG.LOG_RETENTION);
      }
      
      localStorage.setItem('jev_upload_logs', JSON.stringify(logs));
    } catch (e) {
      console.error('[JEV] 保存日志失败:', e);
    }
  },

  // 清除日志
  clearLogs: function() {
    try { // 确保有对应的catch块
      localStorage.removeItem('jev_upload_logs');
    } catch (e) {
      console.error('[JEV] 清除日志失败:', e);
    }
  },

  // 导出日志
  exportLogs: function() {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
};

// 增强版日志函数
window.JEV.enhancedLog = function(level, message, details = null) {
  const timestamp = new Date().toLocaleString('zh-CN');
  const logMessage = `[${timestamp}] [JEV ${level.toUpperCase()}] ${message}`;

  // 控制台输出
  switch (level) {
    case 'error':
      console.error(logMessage, details || '');
      break;
    case 'warn':
      console.warn(logMessage, details || '');
      break;
    case 'info':
      console.info(logMessage, details || '');
      break;
    case 'debug':
      if (window.JEV.CFG && window.JEV.CFG.debugMode) {
        console.debug(logMessage, details || '');
      }
      break;
  }

  // UI日志输出（如果可用）
  if (window.JEV && typeof window.JEV.logUI === 'function') {
    try { // 确保有对应的catch块
      window.JEV.logUI(`${message}${details ? `\n详情: ${JSON.stringify(details)}` : ''}`);
    } catch (e) {
      console.error('[JEV] UI日志显示失败:', e);
    }
  }

  // 持久化日志
  window.JEV.logManager.addLog(level, message);
};

// 网络模式检测器
window.JEV.networkModeDetector = {
  // 检测网络环境和最佳模式
  detectBestMode: async function() {
    const currentTime = Date.now();
    const lastDetection = window.JEV.UPLOAD_CONFIG.lastDetectionTime;

    // 如果距离上次检测时间较短，直接返回上次结果
    if (lastDetection && (currentTime - lastDetection) < window.JEV.UPLOAD_CONFIG.detectionInterval) {
      window.JEV.enhancedLog('debug', `使用缓存的网络模式检测结果: ${window.JEV.UPLOAD_CONFIG.detectedMode}`);
      return window.JEV.UPLOAD_CONFIG.detectedMode;
    }

    window.JEV.enhancedLog('info', '开始网络模式自动检测...');

    try { // 确保有对应的catch块
      // 首先检查是否强制浏览器模式
      if (window.JEV.UPLOAD_CONFIG.FORCE_BROWSER_MODE) {
        window.JEV.enhancedLog('info', '已启用强制浏览器模式');
        window.JEV.UPLOAD_CONFIG.detectedMode = 'fetch';
        window.JEV.UPLOAD_CONFIG.lastDetectionTime = currentTime;
        return 'fetch';
      }

      // 测试fetch模式
      const fetchResult = await this.testFetchMode();
      if (fetchResult.success) {
        window.JEV.enhancedLog('info', '✅ 检测到fetch模式可用');
        window.JEV.UPLOAD_CONFIG.detectedMode = 'fetch';
        window.JEV.UPLOAD_CONFIG.lastDetectionTime = currentTime;
        return 'fetch';
      }

      // 测试XHR模式
      const xhrResult = await this.testXhrMode();
      if (xhrResult.success) {
        window.JEV.enhancedLog('info', '✅ 检测到XHR模式可用');
        window.JEV.UPLOAD_CONFIG.detectedMode = 'xhr';
        window.JEV.UPLOAD_CONFIG.lastDetectionTime = currentTime;
        return 'xhr';
      }

      // 检查PowerShell可用性
      if (this.isPowerShellAvailable()) {
        window.JEV.enhancedLog('info', '⚠️ 浏览器模式均不可用，将使用PowerShell模式');
        window.JEV.UPLOAD_CONFIG.detectedMode = 'powershell';
        window.JEV.UPLOAD_CONFIG.lastDetectionTime = currentTime;
        return 'powershell';
      }

      window.JEV.enhancedLog('error', '❌ 所有模式检测均失败');
      window.JEV.UPLOAD_CONFIG.detectedMode = null;
      window.JEV.UPLOAD_CONFIG.lastDetectionTime = currentTime;
      return null;
    } catch (error) {
      window.JEV.enhancedLog('error', `网络检测失败: ${error.message}`);
      return null;
    }
  },

  // 测试fetch模式
  testFetchMode: async function() {
    try { // 确保有对应的catch块
      const workerUrl = window.JEV.CFG.workerUrl || window.JEV.CFG.workerBase;
      if (!workerUrl) return { success: false, error: '未配置Worker URL' };

      const pingUrl = workerUrl.endsWith('/') ? workerUrl + 'ping' : workerUrl + '/ping';

      window.JEV.enhancedLog('debug', `测试fetch连接: ${pingUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const response = await fetch(pingUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': window.JEV.STATE?.webhookSecret || window.JEV.CFG.webhookSecret
        },
        credentials: 'include',
        mode: 'cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      return {
        success: response.ok,
        status: response.status,
        message: response.ok ? 'fetch模式可用' : `HTTP错误: ${response.status}`
      };
    } catch (error) {
      window.JEV.enhancedLog('debug', `fetch测试失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
        isCors: error.message.includes('CORS') || error.message.includes('Network')
      };
    }
  },

  // 测试XHR模式
  testXhrMode: async function() {
    return new Promise((resolve) => {
      try { // 确保有对应的catch块
        const workerUrl = window.JEV.CFG.workerUrl || window.JEV.CFG.workerBase;
        if (!workerUrl) return resolve({ success: false, error: '未配置Worker URL' });

        const pingUrl = workerUrl.endsWith('/') ? workerUrl + 'ping' : workerUrl + '/ping';
        const xhr = new XMLHttpRequest();

        xhr.timeout = 5000; // 5秒超时

        xhr.onload = function() {
          resolve({
            success: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            message: xhr.status >= 200 && xhr.status < 300 ? 'XHR模式可用' : `HTTP错误: ${xhr.status}`
          });
        };

        xhr.onerror = function() {
          window.JEV.enhancedLog('debug', 'XHR测试网络错误');
          resolve({ success: false, error: 'XHR网络错误' });
        };

        xhr.ontimeout = function() {
          window.JEV.enhancedLog('debug', 'XHR测试超时');
          resolve({ success: false, error: 'XHR超时' });
        };

        xhr.open('GET', pingUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Webhook-Secret', window.JEV.STATE?.webhookSecret || window.JEV.CFG.webhookSecret);
        xhr.send();
      } catch (error) {
        window.JEV.enhancedLog('debug', `XHR测试失败: ${error.message}`);
        resolve({ success: false, error: error.message });
      }
    });
  },

  // 检查PowerShell是否可用
  isPowerShellAvailable: function() {
    // 检查是否在Windows环境
    const isWindows = typeof navigator !== 'undefined' &&
                     (navigator.userAgent.includes('Windows') ||
                      navigator.platform.includes('Win'));

    // 检查PowerShell解决方案是否加载
    const hasPowerShellModule = window.JEV_POWERSHELL_SOLUTION &&
                               typeof window.JEV_POWERSHELL_SOLUTION.callWorker === 'function';

    window.JEV.enhancedLog('debug', `PowerShell可用性检查: Windows环境=${isWindows}, 模块加载=${hasPowerShellModule}`);
    return isWindows && hasPowerShellModule;
  }
};

// 增强版上传管理器
window.JEV.uploadManager = {
  // 带重试机制的上传函数
  uploadWithRetry: async function(url, data, options = {}) {
    let attempts = 0;
    const maxRetries = options.retryCount || window.JEV.UPLOAD_CONFIG.RETRY_COUNT;
    const retryDelay = options.retryDelay || window.JEV.UPLOAD_CONFIG.RETRY_DELAY;

    while (attempts <= maxRetries) {
      try { // 确保有对应的catch块
        if (attempts > 0) {
          window.JEV.enhancedLog('info', `开始第${attempts}/${maxRetries}次重试上传...`);
          // 等待重试延迟
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempts - 1))); // 指数退避
        }

        // 自动检测最佳模式
        let mode = options.mode;
        if (!mode && window.JEV.UPLOAD_CONFIG.AUTO_DETECT_MODE) {
          mode = await window.JEV.networkModeDetector.detectBestMode();
        }

        if (!mode) {
          throw new Error('无法检测到可用的网络模式');
        }

        // 执行上传
        const result = await this.executeUpload(mode, url, data, options);

        // 更新成功计数
        window.JEV.UPLOAD_CONFIG.successCount[mode] = (window.JEV.UPLOAD_CONFIG.successCount[mode] || 0) + 1;

        return result;
      } catch (error) {
        attempts++;

        // 检查是否应该重试
        const shouldRetry = attempts <= maxRetries && this.shouldRetryUpload(error);

        if (shouldRetry) {
          window.JEV.enhancedLog('warn', `上传失败，将在${retryDelay * Math.pow(2, attempts - 1)}ms后重试: ${error.message}`);
          // 更新失败计数
          window.JEV.UPLOAD_CONFIG.failureCount[options.mode || 'unknown'] =
            (window.JEV.UPLOAD_CONFIG.failureCount[options.mode || 'unknown'] || 0) + 1;
        } else {
          // 不再重试，抛出错误
          window.JEV.enhancedLog('error', `上传失败（已达最大重试次数）: ${error.message}`);

          // 如果启用了自动切换，尝试切换模式
          if (window.JEV.UPLOAD_CONFIG.AUTO_SWITCH_MODE && !options.switchAttempted) {
            window.JEV.enhancedLog('info', '尝试自动切换上传模式...');

            // 清除检测缓存，强制重新检测
            window.JEV.UPLOAD_CONFIG.lastDetectionTime = null;

            // 尝试使用备选模式
            return this.uploadWithRetry(url, data, {
              ...options,
              switchAttempted: true,
              mode: null // 让系统重新选择模式
            });
          }

          throw error;
        }
      }
    }
  },

  // 执行具体的上传操作
  executeUpload: async function(mode, url, data, options) {
    window.JEV.enhancedLog('info', `使用${mode.toUpperCase()}模式执行上传`);

    switch (mode) {
      case 'fetch':
        return this.uploadWithFetch(url, data, options);
      case 'xhr':
        return this.uploadWithXhr(url, data, options);
      case 'powershell':
        return this.uploadWithPowerShell(url, data, options);
      default:
        throw new Error(`未知的上传模式: ${mode}`);
    }
  },

  // 使用fetch上传
  uploadWithFetch: async function(url, data, options) {
    try { // 确保有对应的catch块
      const timeout = options.timeout || 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': window.JEV.STATE?.webhookSecret || window.JEV.CFG.webhookSecret,
          ...(options.headers || {})
        },
        body: JSON.stringify(data),
        credentials: 'include',
        mode: 'cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fetch上传失败: HTTP ${response.status} ${response.statusText}\n${errorText}`);
      }

      const result = await response.json();
      window.JEV.enhancedLog('info', '✅ Fetch上传成功');
      return this.normalizeResult(result);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Fetch上传超时');
      }
      throw new Error(`Fetch上传失败: ${error.message}`);
    }
  },

  // 使用XHR上传
  uploadWithXhr: async function(url, data, options) {
    return new Promise((resolve, reject) => {
      try { // 确保有对应的catch块
        const xhr = new XMLHttpRequest();
        xhr.timeout = options.timeout || 10000;

        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { // 确保有对应的catch块
              const response = JSON.parse(xhr.responseText);
              window.JEV.enhancedLog('info', '✅ XHR上传成功');
              resolve(window.JEV.uploadManager.normalizeResult(response));
            } catch (e) {
              window.JEV.enhancedLog('warn', 'XHR上传成功但解析响应失败', e);
              resolve({
                success: true,
                response_text: xhr.responseText,
                original_error: e.message
              });
            }
          } else {
            reject(new Error(`XHR上传失败: ${xhr.status} ${xhr.statusText}`));
          }
        };

        xhr.onerror = function() {
          reject(new Error('XHR上传网络错误'));
        };

        xhr.ontimeout = function() {
          reject(new Error('XHR上传超时'));
        };

        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Webhook-Secret', window.JEV.STATE?.webhookSecret || window.JEV.CFG.webhookSecret);

        // 添加自定义头
        if (options.headers) {
          Object.keys(options.headers).forEach(key => {
            xhr.setRequestHeader(key, options.headers[key]);
          });
        }

        xhr.send(JSON.stringify(data));
      } catch (error) {
        reject(new Error(`XHR上传失败: ${error.message}`));
      }
    });
  },

  // 使用PowerShell上传
  uploadWithPowerShell: async function(url, data, options) {
    if (!window.JEV_POWERSHELL_SOLUTION || typeof window.JEV_POWERSHELL_SOLUTION.callWorker !== 'function') {
      throw new Error('PowerShell解决方案不可用');
    }

    try { // 确保有对应的catch块
      window.JEV.enhancedLog('info', '🔄 使用PowerShell执行上传...');

      const psOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': window.JEV.STATE?.webhookSecret || window.JEV.CFG.webhookSecret,
          ...(options.headers || {})
        },
        body: data
      };

      const result = await window.JEV_POWERSHELL_SOLUTION.callWorker(url, psOptions);

      // 处理PowerShell结果
      if (result.success === false) {
        throw new Error(`PowerShell上传失败: ${result.error || '未知错误'}`);
      }

      window.JEV.enhancedLog('info', '✅ PowerShell上传成功');
      return this.normalizeResult(result);
    } catch (error) {
      // 处理用户取消情况
      if (error.message && error.message.includes('用户取消')) {
        window.JEV.enhancedLog('warn', '用户取消了PowerShell执行');
        throw new Error('PowerShell执行被用户取消');
      }

      // 处理权限相关错误
      if (error.message && (error.message.includes('权限') || error.message.includes('执行策略'))) {
        window.JEV.enhancedLog('error', 'PowerShell执行权限不足，请检查Windows执行策略');
        // 提供帮助信息
        if (window.JEV && typeof window.JEV.logUI === 'function') {
          window.JEV.logUI('💡 提示: 请以管理员身份运行PowerShell并执行:\nSet-ExecutionPolicy RemoteSigned -Scope CurrentUser');
        }
      }

      throw error;
    }
  },

  // 规范化上传结果
  normalizeResult: function(result) {
    const normalized = {
      success: true,
      timestamp: new Date().toISOString(),
      ocr_text: result.ocr_text || result.text || result.ocr || '(无OCR结果)',
      translated_text: result.translated_text || result.translation || result.trans || '(无翻译)',
      image_url: result.image_url || result.url || result.file_url || null,
      // 保留原始结果的所有字段
      ...result
    };

    // 如果有图片URL，记录成功上传
    if (normalized.image_url) {
      window.JEV.enhancedLog('info', `✅ 上传成功: ${normalized.image_url}`);
      // 记录成功的OCR和翻译结果
      if (normalized.ocr_text && normalized.ocr_text !== '(无OCR结果)') {
        window.JEV.enhancedLog('info', `🧠 OCR: ${normalized.ocr_text.substring(0, 50)}${normalized.ocr_text.length > 50 ? '...' : ''}`);
      }
      if (normalized.translated_text && normalized.translated_text !== '(无翻译)') {
        window.JEV.enhancedLog('info', `🌐 翻译: ${normalized.translated_text.substring(0, 50)}${normalized.translated_text.length > 50 ? '...' : ''}`);
      }
    }

    return normalized;
  },

  // 判断是否应该重试上传
  shouldRetryUpload: function(error) {
    const errorMessage = error.message || '';

    // 以下情况应该重试
    const retryableErrors = [
      'timeout', '超时', 'network', '网络', 'Connection', '连接',
      'refused', '拒绝', 'reset', '重置', 'aborted', '中断',
      '暂时不可用', 'try again', 'retry', 'service unavailable'
    ];

    // 用户取消不重试
    if (errorMessage.includes('用户取消') || errorMessage.includes('cancel')) {
      return false;
    }

    // 权限错误不重试
    if (errorMessage.includes('权限') || errorMessage.includes('permission')) {
      return false;
    }

    // 检查是否包含可重试的错误关键词
    return retryableErrors.some(keyword =>
      errorMessage.toLowerCase().includes(keyword.toLowerCase())
    );
  },

  // 获取上传统计信息
  getUploadStats: function() {
    return {
      successCount: { ...window.JEV.UPLOAD_CONFIG.successCount },
      failureCount: { ...window.JEV.UPLOAD_CONFIG.failureCount },
      lastDetectionTime: window.JEV.UPLOAD_CONFIG.lastDetectionTime,
      detectedMode: window.JEV.UPLOAD_CONFIG.detectedMode,
      forceBrowserMode: window.JEV.UPLOAD_CONFIG.FORCE_BROWSER_MODE,
      logCount: window.JEV.logManager.getLogs().length
    };
  },

  // 重置统计信息
  resetStats: function() {
    window.JEV.UPLOAD_CONFIG.successCount = {
      fetch: 0,
      xhr: 0,
      powershell: 0
    };
    window.JEV.UPLOAD_CONFIG.failureCount = {
      fetch: 0,
      xhr: 0,
      powershell: 0
    };
    window.JEV.UPLOAD_CONFIG.lastDetectionTime = null;
    window.JEV.UPLOAD_CONFIG.detectedMode = null;

    window.JEV.enhancedLog('info', '上传统计信息已重置');
  }
};

// 初始化函数
const initializeEnhancedUpload = () => {
  // 记录初始化信息
  window.JEV.enhancedLog('info', 'JEV Upload v2 自动检测与模式切换上传模块已初始化');

  // 如果开启了自动检测，延迟执行首次检测
  if (window.JEV.UPLOAD_CONFIG.AUTO_DETECT_MODE) {
    setTimeout(async () => {
      try { // 确保有对应的catch块
        const bestMode = await window.JEV.networkModeDetector.detectBestMode();
        window.JEV.enhancedLog('info', `系统检测到的最佳上传模式: ${bestMode || '无可用模式'}`);

        // 提供使用建议
        if (bestMode === 'fetch') {
          window.JEV.enhancedLog('info', '💡 建议: 浏览器模式工作正常，您可以保持当前配置');
        } else if (bestMode === 'xhr') {
          window.JEV.enhancedLog('info', '💡 建议: XHR模式工作正常，如果遇到问题可以尝试设置 FORCE_BROWSER_MODE');
        } else if (bestMode === 'powershell') {
          window.JEV.enhancedLog('warn', '💡 建议: 正在使用PowerShell模式，可能需要配置执行权限');
          if (window.JEV && typeof window.JEV.logUI === 'function') {
            window.JEV.logUI('🔧 权限配置提示: 请以管理员身份运行PowerShell并执行命令:\nSet-ExecutionPolicy RemoteSigned -Scope CurrentUser');
          }
        }
      } catch (e) {
        window.JEV.enhancedLog('error', `初始化检测失败: ${e.message}`);
      }
    }, 3000); // 3秒后执行首次检测
  }
};

// 执行初始化
initializeEnhancedUpload();

// 导出便捷方法
window.JEV.testWorkerConnection = window.JEV.networkModeDetector.detectBestMode;
window.JEV.getUploadStats = window.JEV.uploadManager.getUploadStats;
window.JEV.resetUploadStats = window.JEV.uploadManager.resetStats;
window.JEV.exportLogs = window.JEV.logManager.exportLogs;

// 向后兼容的FORCE_BROWSER_MODE属性
Object.defineProperty(window.JEV, 'FORCE_BROWSER_MODE', {
  get: function() {
    return window.JEV.UPLOAD_CONFIG.FORCE_BROWSER_MODE;
  },
  set: function(value) {
    window.JEV.UPLOAD_CONFIG.FORCE_BROWSER_MODE = !!value;
    window.JEV.enhancedLog('info', `强制浏览器模式已${value ? '启用' : '禁用'}`);
    // 清除检测缓存，强制重新检测
    window.JEV.UPLOAD_CONFIG.lastDetectionTime = null;
  },
  enumerable: true
});

// PowerShell网络解决方案 - 增强版（支持重试、错误恢复和友好UI）
window.JEV_POWERSHELL_SOLUTION = {
    // 配置参数
    config: {
        maxRetries: 2,
        retryDelay: 1000,
        timeout: 30000,
        debugMode: true
    },

    // 日志函数（统一日志管理）
    log: function(message, level = 'info') {
        const prefix = '[JEV-POWERSHELL]';
        const logMethod = {
            'info': console.log,
            'warn': console.warn,
            'error': console.error,
            'debug': this.config.debugMode ? console.log : () => {}
        }[level] || console.log;

        logMethod(prefix, message);

        // 同时尝试通过UI显示（如果可用）
        if (window.JEV && typeof window.JEV.logUI === 'function') {
            try { // 确保有对应的catch块
                window.JEV.logUI(message);
            } catch (e) {
                console.error(prefix, 'UI日志显示失败:', e);
            }
        }
    },

    // 检测环境函数（增强版，更准确的Windows检测）
    isWindowsEnvironment: () => {
        try { // 确保有对应的catch块
            // 浏览器环境检测 - 多维度检测
            if (typeof navigator !== 'undefined') {
                // 主要检测 - User Agent
                const ua = navigator.userAgent;
                if (/Windows NT/i.test(ua)) return true;

                // 补充检测 - 平台信息
                if (navigator.platform && /Win/i.test(navigator.platform)) return true;

                return false;
            }

            return false;
        } catch (e) {
            console.warn('[JEV-POWERSHELL] 环境检测失败，默认返回false');
            return false;
        }
    },

    // 重试机制包装器（指数退避策略）
    withRetry: function(fn, maxRetries = this.config.maxRetries) {
        let attempts = 0;
        const self = this;

        const execute = () => {
            return fn().catch(error => {
                attempts++;

                // 检查是否应该重试（只对网络相关错误重试）
                const errorMessage = String(error.message || '');
                const shouldRetry = attempts <= maxRetries &&
                                   (errorMessage.includes('timeout') ||
                                    errorMessage.includes('NetworkError') ||
                                    errorMessage.includes('Connection') ||
                                    errorMessage.includes('Failed to fetch') ||
                                    errorMessage.includes('断开连接') ||
                                    errorMessage.includes('连接被拒绝'));

                if (shouldRetry) {
                    const delay = self.config.retryDelay * Math.pow(2, attempts - 1); // 指数退避
                    self.log(`请求失败，${delay}ms后第${attempts}/${maxRetries}次重试...`, 'warn');

                    return new Promise(resolve => setTimeout(resolve, delay)).then(execute);
                }

                // 不再重试，抛出错误
                throw error;
            });
        };

        return execute();
    },

    // 使用Windows原生组件发送HTTP请求（增强版，支持重试和更健壮的错误处理）
    callWorker: function(url, options = {}) {
        const self = this;

        // 参数验证
        if (!url || typeof url !== 'string') {
            return Promise.reject(new Error('无效的URL参数'));
        }

        // 规范化URL
        const normalizedUrl = url.replace(/\/$/, '');
        self.log(`请求URL: ${normalizedUrl}`, 'debug');

        // 使用重试机制
        return this.withRetry(() => {
            return new Promise((resolve, reject) => {
                try { // 确保有对应的catch块
                    self.log(`检测Windows环境: ${self.isWindowsEnvironment()}`, 'debug');

                    // 准备请求参数
                    const method = options.method || 'GET';
                    const headers = options.headers || {};
                    const body = options.body ? JSON.stringify(options.body) : '';

                    // 创建一个唯一的请求ID
                    const requestId = `jev_request_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

                    // 构建增强版PowerShell命令（添加更多错误处理和调试信息）
                    const psCommand = `
                    \$ErrorActionPreference = 'Stop'
                    \$ProgressPreference = 'SilentlyContinue' # 禁用进度条以加快执行

                    # 请求标识
                    Write-Output "[\$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 开始请求: ${requestId}"

                    # 请求参数
                    \$url = "${normalizedUrl.replace(/"/g, '""')}"
                    \$method = "${method}"
                    \$headers = @{}

                    # 添加默认Content-Type如果没有提供
                    \$headers['Content-Type'] = 'application/json'

                    # 安全的请求体处理
                    \$bodyData = ''
                    if ("${body.replace(/"/g, '""')}" -ne '') {
                        \$bodyData = @"
                    ${body.replace(/"""/g, '""""""')}
                    "@
                    }

                    # 使用WebRequest代替WebClient（更现代、更可靠）
                    try { // 确保有对应的catch块
                        # 使用字符串代替变量引用以避免转义问题
                        \$params = @{
                            Uri = \$url
                            Method = \$method
                            Headers = \$headers
                            TimeoutSec = 30
                            UseBasicParsing = \$true
                            UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                        }

                        # 添加请求体（如果有）
                        if (\$bodyData -ne '') {
                            \$params['Body'] = \$bodyData
                        }

                        # 发送请求
                        Write-Output "[\$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 发送请求: \$method \$url"
                        \$response = Invoke-WebRequest @params

                        # 输出成功响应
                        # 使用哈希表字面量避免变量引用问题
                        \$result = @{
                            success = \$true
                            timestamp = Get-Date -Format 'o'
                            data = \$null
                        }

                        # 尝试解析JSON响应
                        try { // 确保有对应的catch块
                            \$result.data = ConvertFrom-Json \$response.Content -ErrorAction Stop
                        } catch {
                            # 如果转换JSON失败，使用原始响应
                            Write-Output "[\$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 警告: 响应不是有效的JSON格式"
                            \$result.data = @{
                                response_text = \$response.Content
                                status_code = \$response.StatusCode
                                headers = \$response.Headers | ConvertTo-Json -Compress
                            }
                        }

                    } catch {
                        # 捕获错误并提供详细信息 - 使用简单的错误输出
                        Write-Output "[\$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 错误: 命令执行失败"

                        # 获取更详细的错误信息
                        \$statusCode = 0
                        \$errorMessage = \$_.Exception.Message
                        \$innerError = \$null

                        if (\$_.Exception.Response) {
                            \$statusCode = \$_.Exception.Response.StatusCode.value__
                            \$errorMessage = \$_.Exception.Response.StatusDescription
                        } elseif (\$_.Exception.InnerException) {
                            \$innerError = \$_.Exception.InnerException.Message
                        }

                        # 使用哈希表字面量并确保所有引用正确
                        \$result = @{
                            success = \$false
                            timestamp = Get-Date -Format 'o'
                            error = \$errorMessage
                            statusCode = \$statusCode
                            requestId = '${requestId}'
                            innerError = \$innerError
                        }
                    }

                    # 输出结果（使用UTF-8编码）
                    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
                    \$result | ConvertTo-Json -Depth 10 -Compress
                    `;

                    // 构建执行PowerShell的命令行
                    const psExecCommand = `powershell.exe -ExecutionPolicy Bypass -Command "${psCommand}"`;

                    self.log(`准备执行PowerShell命令...`, 'debug');

                    // 针对不同环境使用不同的执行方式
                    if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
                        // Chrome扩展环境
                        self.log('Chrome扩展环境检测到', 'info');
                        reject(new Error('需要Chrome扩展支持才能使用PowerShell'));
                    } else if (typeof process !== 'undefined' && typeof require !== 'undefined') {
                        // Node.js环境检测 - 在浏览器中跳过此部分
                        self.log('在浏览器环境中，无法使用Node.js模块', 'info');
                        reject(new Error('浏览器环境不支持直接执行PowerShell命令'));
                        return;
                    } else {
                        // 浏览器环境 - 显示增强版用户操作提示
                        self.log('浏览器环境，需要用户协助执行PowerShell', 'info');

                        // 显示提示对话框（更清晰、更友好）
                        const helpMsg = `
⚠️ 需要网络连接权限！

由于浏览器安全限制，需要手动运行PowerShell命令来建立连接：
1. 按下 Win + R 键
2. 输入 "powershell" 并按回车
3. 复制并粘贴以下命令
4. 执行后将结果粘贴回浏览器
                        `;

                        self.log(helpMsg, 'info');

                        // 如果有UI日志函数，显示提示
                        if (window.JEV && typeof window.JEV.logUI === 'function') {
                            window.JEV.logUI('⚠️ 需要手动运行PowerShell命令');
                            window.JEV.logUI('请按照浏览器提示完成操作');
                        }

                        // 创建增强版临时输入区域
                        self._createEnhancedInputDialog(normalizedUrl, psExecCommand, resolve, reject);
                    }
                } catch (e) {
                    self.log(`PowerShell解决方案初始化失败: ${e.message}`, 'error');
                    reject(e);
                }
            });
        });
    },

    // 创建增强版用户输入对话框
    _createEnhancedInputDialog: function(url, psCommand, resolve, reject) {
        try { // 确保有对应的catch块
            // 检查DOM环境
            if (typeof document === 'undefined') {
                return reject(new Error('无法在当前环境中创建对话框'));
            }

            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
                z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;
                animation: jevFadeIn 0.3s ease-out;
            `;

            // 添加动画样式
            const style = document.createElement('style');
            style.textContent = `
                @keyframes jevFadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
                .jev-btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; }
                .jev-btn-primary { background: #4CAF50; color: white; }
                .jev-btn-danger { background: #f44336; color: white; }
                .jev-btn:hover { opacity: 0.9; }
                .jev-btn:active { transform: translateY(1px); }
            `;
            document.head.appendChild(style);

            // 对话框内容
            dialog.innerHTML = `
                <div style="padding: 24px;">
                    <h2 style="margin-top: 0; color: #333; font-size: 20px; text-align: center;">🔄 需要您的协助</h2>

                    <div style="margin: 20px 0; padding: 16px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #4CAF50;">
                        <p style="margin: 0 0 12px 0; color: #555;"><strong>请按照以下步骤操作：</strong></p>
                        <ol style="margin: 0; padding-left: 20px; color: #555;">
                            <li style="margin-bottom: 8px;">按下 <strong>Win + R</strong> 键打开运行对话框</li>
                            <li style="margin-bottom: 8px;">输入 <strong>powershell</strong> 并按回车</li>
                            <li style="margin-bottom: 8px;">复制下方命令并粘贴到PowerShell窗口</li>
                            <li>执行命令并等待结果</li>
                        </ol>
                    </div>

                    <div style="margin: 20px 0;">
                        <p style="margin: 0 0 8px 0; font-weight: 500; color: #333;">PowerShell命令：</p>
                        <textarea readonly style="
                            width: 100%; min-height: 80px; padding: 12px; border: 1px solid #ddd;
                            border-radius: 6px; background: #f9f9f9; font-family: monospace; font-size: 12px;
                            resize: vertical; box-sizing: border-box;
                        ">${psCommand}</textarea>
                        <button id="jev-copy-btn" class="jev-btn jev-btn-primary" style="margin-top: 8px;">复制命令</button>
                    </div>

                    <div style="margin: 20px 0;">
                        <p style="margin: 0 0 8px 0; font-weight: 500; color: #333;">请粘贴PowerShell执行结果：</p>
                        <textarea id="jev-ps-result" style="
                            width: 100%; min-height: 120px; padding: 12px; border: 1px solid #ddd;
                            border-radius: 6px; font-family: monospace; font-size: 12px;
                            resize: vertical; box-sizing: border-box;
                        "></textarea>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px;">
                        <button id="jev-ps-cancel" class="jev-btn jev-btn-danger">取消</button>
                        <button id="jev-ps-submit" class="jev-btn jev-btn-primary">提交结果</button>
                    </div>
                </div>
            `;

            // 组合元素
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // 处理复制按钮
            document.getElementById('jev-copy-btn').onclick = () => {
                const textarea = dialog.querySelector('textarea[readonly]');
                textarea.select();
                document.execCommand('copy');

                // 反馈复制成功
                const btn = document.getElementById('jev-copy-btn');
                const originalText = btn.textContent;
                btn.textContent = '✓ 已复制';
                btn.style.background = '#45a049';

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            };

            // 处理提交按钮
            document.getElementById('jev-ps-submit').onclick = () => {
                const result = document.getElementById('jev-ps-result').value;
                document.body.removeChild(overlay);
                document.head.removeChild(style);

                if (!result.trim()) {
                    return reject(new Error('请粘贴PowerShell执行结果'));
                }

                try { // 确保有对应的catch块
                    // 清理输出并解析JSON（忽略非JSON前缀输出）
                    const outputLines = result.trim().split('\n');
                    const jsonLine = outputLines.find(line => line.startsWith('{')) || outputLines.pop();
                    const cleanOutput = jsonLine ? jsonLine.trim() : '';

                    const parsedResult = JSON.parse(cleanOutput);
                    if (parsedResult.success) {
                        resolve(parsedResult.data);
                    } else {
                        reject(new Error(parsedResult.error || 'PowerShell执行失败'));
                    }
                } catch (e) {
                    // 尝试查找错误信息
                    const errorMatch = result.match(/错误: ([^\n]+)/);
                    if (errorMatch && errorMatch[1]) {
                        reject(new Error(`PowerShell执行失败: ${errorMatch[1]}`));
                    } else {
                        reject(new Error(`解析结果失败: ${e.message}`));
                    }
                }
            };

            // 处理取消按钮
            document.getElementById('jev-ps-cancel').onclick = () => {
                document.body.removeChild(overlay);
                document.head.removeChild(style);
                reject(new Error('用户取消了PowerShell执行'));
            };

            // 按ESC键关闭
            const handleEsc = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    document.head.removeChild(style);
                    document.removeEventListener('keydown', handleEsc);
                    reject(new Error('用户取消了PowerShell执行'));
                }
            };
            document.addEventListener('keydown', handleEsc);

        } catch (e) {
            console.error('[JEV-POWERSHELL] 创建对话框失败:', e);
            // 降级到简单的prompt
            const result = prompt('请粘贴PowerShell执行结果:');
            if (result) {
                try { // 确保有对应的catch块
                    const parsedResult = JSON.parse(result);
                    if (parsedResult.success) {
                        resolve(parsedResult.data);
                    } else {
                        reject(new Error(parsedResult.error || 'PowerShell执行失败'));
                    }
                } catch (parseError) {
                    reject(new Error(`解析结果失败: ${parseError.message}`));
                }
            } else {
                reject(new Error('用户取消了PowerShell执行'));
            }
        }
    },

    // 直接在浏览器中使用XMLHttpRequest作为备用（增强版，支持重试和更健壮的错误处理）
    browserFallbackRequest: function(url, options = {}) {
        const self = this;

        // 参数验证
        if (!url || typeof url !== 'string') {
            return Promise.reject(new Error('无效的URL参数'));
        }

        // 规范化URL
        const normalizedUrl = url.replace(/\/$/, '');
        self.log(`使用XMLHttpRequest请求: ${normalizedUrl}`, 'debug');

        // 使用重试机制
        return this.withRetry(() => {
            return new Promise((resolve, reject) => {
                try { // 确保有对应的catch块
                    const xhr = new XMLHttpRequest();
                    const method = options.method || 'GET';
                    const headers = options.headers || {};

                    xhr.open(method, normalizedUrl, true);

                    // 设置请求头
                    for (const [key, value] of Object.entries(headers)) {
                        try { // 确保有对应的catch块
                            xhr.setRequestHeader(key, String(value));
                        } catch (e) {
                            self.log(`设置请求头失败: ${key}`, 'warn');
                        }
                    }

                    // 禁用缓存
                    xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                    xhr.setRequestHeader('Pragma', 'no-cache');
                    xhr.setRequestHeader('Expires', '0');

                    // 超时设置
                    xhr.timeout = options.timeout || this.config.timeout;

                    // 事件处理
                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try { // 确保有对应的catch块
                                // 尝试解析JSON
                                const response = JSON.parse(xhr.responseText);
                                resolve(response);
                            } catch (e) {
                                // 如果解析失败，返回原始文本
                                resolve({ rawText: xhr.responseText });
                            }
                        } else {
                            // 处理不同的错误状态码
                            const statusMessages = {
                                401: '授权失败，请检查配置',
                                403: '禁止访问',
                                404: '资源未找到',
                                429: '请求过于频繁',
                                500: '服务器内部错误',
                                502: '网关错误',
                                503: '服务不可用',
                                504: '网关超时'
                            };

                            const message = statusMessages[xhr.status] || `HTTP错误! status: ${xhr.status}`;
                            reject(new Error(message));
                        }
                    };

                    // 错误处理
                    xhr.onerror = () => {
                        reject(new Error('网络请求错误'));
                    };

                    // 超时处理
                    xhr.ontimeout = () => {
                        reject(new Error('网络请求超时'));
                    };

                    // 发送请求
                    try { // 确保有对应的catch块
                        if (options.body && (method === 'POST' || method === 'PUT')) {
                            xhr.send(JSON.stringify(options.body));
                        } else {
                            xhr.send();
                        }
                    } catch (sendError) {
                        reject(new Error(`发送请求失败: ${sendError.message}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
};

// 日志队列和刷新调度
let jevLogQueue = [];
let jevLogScheduled = false;
let lastCaptureTs = 0; // 上次截图时间戳

// 全局状态对象
window.JEV.STATE = window.JEV.STATE || {
  contactId: '',
  conversationId: '',
  isInsideChat: function(element) { return true; },
  jevFlagsBox: null,
  jevLogBox: null,
  jevPanel: null,
  jevStatusSpan: null,
  jevToggleBtn: null,
  processTokens: 0,
  scanInterval: null,
  workerBase: '',
  workerUrl: '',
  webhookSecret: '',
  mutationObserver: null, // 存储观察者引用以便清理
  processedImages: new Set(), // 存储已处理的图片引用
  activeTasks: 0, // 当前活跃任务数
  lastWorkerCheck: 0 // 上次Worker检查时间
};

// 异步上传函数（增强版，集成PowerShell备用解决方案）
function asyncUpload(url, data) {
  // 日志调试函数 - 统一使用一个定义
  const logDebug = typeof window.JEV.logDebug === 'function' ?
                 window.JEV.logDebug :
                 (...args) => {
                   if (window.JEV && window.JEV.CFG && window.JEV.CFG.debugMode) {
                     console.log('[JEV DEBUG]', ...args);
                   }
                 };

  // 安全检查URL
  if (!url || typeof url !== 'string') {
    const error = new Error('无效的URL');
    console.error('[JEV]', error.message);
    return Promise.reject(error);
  }

  logDebug('开始异步上传到:', url);

  // 检查并修复URL格式
  const fixUrl = (originalUrl) => {
    // 移除尾部斜杠
    let fixedUrl = originalUrl.replace(/\/$/, '');

    // 检查并移除-local后缀
    if (fixedUrl.includes('-local')) {
      fixedUrl = fixedUrl.replace('-local', '');
      const fixMsg = `⚠️ Worker地址自动修复：已移除"-local"后缀，使用: ${fixedUrl}`;
      console.warn('[JEV]', fixMsg);

      if (window.JEV && typeof window.JEV.logUI === 'function') {
        window.JEV.logUI(fixMsg);
      }
    }

    return fixedUrl;
  };

  // 修复URL
  const fixedUrl = fixUrl(url);

  // 检查URL是否有本地地址问题
  if (fixedUrl.includes('localhost') || fixedUrl.includes('127.0.0.1')) {
    const warningMsg = `⚠️ 警告：Worker地址包含本地地址，在浏览器环境中可能无法访问。`;
    console.warn('[JEV]', warningMsg);

    if (window.JEV && typeof window.JEV.logUI === 'function') {
      window.JEV.logUI(warningMsg);
    }

    // 在控制台显示详细的问题说明和解决方案
    console.log(`[JEV] 🔍 问题分析：
1. Tampermonkey脚本在浏览器安全沙箱中运行，无法直接访问本地服务器
2. 解决方案：
   - 将Worker部署到公网地址
   - 使用Cloudflare Workers等无服务器平台
   - 确保地址不包含"-local"后缀和本地地址`);
  }

  // XMLHttpRequest备用方案
  const tryXhrFallback = () => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', fixedUrl);
      xhr.setRequestHeader('Content-Type', 'application/json');

      // 添加webhook密钥
      const webhookSecret = window.JEV.STATE.webhookSecret || window.JEV.CFG.webhookSecret;
      if (webhookSecret) {
        xhr.setRequestHeader('X-Webhook-Secret', webhookSecret);
      }

      // 设置超时
      xhr.timeout = 10000; // 10秒

      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { // 确保有对应的catch块
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            resolve({ response_text: xhr.responseText });
          }
        } else {
          reject(new Error(`XHR错误: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = function() {
        reject(new Error('XHR网络错误'));
      };

      xhr.ontimeout = function() {
        reject(new Error('XHR请求超时'));
      };

      xhr.send(JSON.stringify(data));
    });
  };

  // logDebug已在函数顶部定义，此处不再重复定义

  // 定义规范化结果的函数
  const normalizeResult = (result) => {
    logDebug('上传成功，收到结果:', result);

    // 规范化结果格式，确保包含必要的字段
    const normalizedResult = {
      // 支持多种可能的字段名
      ocr_text: result.ocr_text || result.text || result.ocr || '(无OCR结果)',
      translated_text: result.translated_text || result.translation || result.trans || '(无翻译)',
      // 保留原始结果的所有字段
      ...result
    };

    return normalizedResult;
  };

  // 显示用户通知
  const showNotification = (message, type = 'info') => {
    console[type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log']('[JEV]', message);

    if (window.JEV && typeof window.JEV.logUI === 'function') {
      window.JEV.logUI(message);
    }
  };

  // 发送请求的主要函数 - v2增强版：支持自动检测、模式切换和智能重试
  const sendRequest = async () => {
    // 检查是否有新的上传管理器可用
    if (window.JEV && window.JEV.uploadManager && typeof window.JEV.uploadManager.uploadWithRetry === 'function') {
      // 使用新的上传管理器
      try { // 确保有对应的catch块
        // 构建上传选项
        const uploadOptions = {
          timeout: 10000,
          headers: {
            'X-Webhook-Secret': window.JEV.STATE.webhookSecret || window.JEV.CFG.webhookSecret
          }
        };

        // 执行上传
        const result = await window.JEV.uploadManager.uploadWithRetry(fixedUrl, data, uploadOptions);

        // 如果有原始的normalizeResult函数，应用它以保持兼容性
        if (typeof normalizeResult === 'function') {
          return normalizeResult(result);
        }
        return result;
      } catch (error) {
        // 处理错误并提供友好提示
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 如果是PowerShell权限错误，提供解决方案
        if (errorMessage.includes('权限') || errorMessage.includes('执行策略') || errorMessage.includes('PowerShell')) {
          console.warn('[JEV] 🔧 PowerShell权限问题，建议在控制台运行: window.JEV.FORCE_BROWSER_MODE = true');
          if (window.JEV && typeof window.JEV.logUI === 'function') {
            window.JEV.logUI('🔧 权限配置提示: 请以管理员身份运行PowerShell并执行命令:\nSet-ExecutionPolicy RemoteSigned -Scope CurrentUser\n\n或者在控制台运行: window.JEV.FORCE_BROWSER_MODE = true');
          }
        }

        throw error;
      }
    }

    // 原始实现作为备用方案
    // 检查是否强制使用浏览器模式
    const forceBrowserMode = window.JEV && window.JEV.FORCE_BROWSER_MODE;

    if (forceBrowserMode) {
      if (typeof logDebug === 'function') {
        logDebug('⚠️ 已启用强制浏览器模式，将跳过PowerShell备用方案');
      }
    }

    try { // 确保有对应的catch块
      // 检查fetch API是否可用
      if (!window.fetch) {
        if (typeof logDebug === 'function') {
          logDebug('fetch API不可用，直接使用XHR备用方案');
        }
        // 直接使用XHR备用方案
        throw new Error('fetch API不可用');
      }

      // 使用Promise.race添加超时控制
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 10000);
      });

      const fetchPromise = fetch(fixedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 添加webhook密钥
          'X-Webhook-Secret': window.JEV.STATE.webhookSecret || window.JEV.CFG.webhookSecret
        },
        body: JSON.stringify(data)
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      if (typeof logDebug === 'function') {
        logDebug('✅ Fetch请求成功，Worker连接正常');
      }
      return typeof normalizeResult === 'function' ? normalizeResult(result) : result;
    } catch (fetchError) {
      console.error('[JEV] Fetch请求失败，尝试备用方案:', fetchError);
      if (typeof showNotification === 'function') {
        showNotification(`⚠️ Fetch请求失败: ${fetchError.message}`, 'warning');
      }

      // 尝试XMLHttpRequest备用方案
      try { // 确保有对应的catch块
        if (typeof showNotification === 'function') {
          showNotification('🔄 尝试使用XMLHttpRequest备用方案...');
        }
        const xhrResult = typeof tryXhrFallback === 'function' ? await tryXhrFallback() : null;
        if (xhrResult) {
          if (typeof logDebug === 'function') {
            logDebug('✅ XHR备用方案成功');
          }
          return typeof normalizeResult === 'function' ? normalizeResult(xhrResult) : xhrResult;
        } else {
          throw new Error('XHR备用函数不可用');
        }
      } catch (xhrError) {
        console.error('[JEV] XHR请求也失败:', xhrError);
        if (typeof showNotification === 'function') {
          showNotification(`❌ XHR请求失败: ${xhrError.message}`, 'error');
        }

        // 如果强制使用浏览器模式，则不再尝试PowerShell
        if (forceBrowserMode) {
          console.warn('[JEV] 🔒 强制浏览器模式下跳过PowerShell备用方案');
          throw new Error(`浏览器模式下所有请求均失败: ${fetchError.message}\n请检查CORS设置和网络连接`);
        }

        // 尝试PowerShell解决方案（如果可用）
        if (window.JEV_POWERSHELL_SOLUTION && typeof window.JEV_POWERSHELL_SOLUTION.callWorker === 'function') {
          try { // 确保有对应的catch块
            if (typeof showNotification === 'function') {
              showNotification('🔄 尝试使用PowerShell备用方案...');
            }
            const psResult = await window.JEV_POWERSHELL_SOLUTION.callWorker(fixedUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': window.JEV.STATE.webhookSecret || window.JEV.CFG.webhookSecret
              },
              body: data
            });
            if (typeof logDebug === 'function') {
              logDebug('✅ PowerShell备用方案成功');
            }
            return typeof normalizeResult === 'function' ? normalizeResult(psResult) : psResult;
          } catch (psError) {
            console.error('[JEV] PowerShell请求也失败:', psError);
            if (typeof showNotification === 'function') {
              showNotification(`❌ PowerShell请求失败: ${psError.message}`, 'error');
            }

            // 提供PowerShell权限建议
            if (psError.message && (psError.message.includes('权限') || psError.message.includes('执行策略'))) {
              console.warn('[JEV] 🔧 PowerShell权限问题，建议在控制台运行: window.JEV.FORCE_BROWSER_MODE = true');
              if (window.JEV && typeof window.JEV.logUI === 'function') {
                window.JEV.logUI('🔧 权限配置提示: 请以管理员身份运行PowerShell并执行命令:\nSet-ExecutionPolicy RemoteSigned -Scope CurrentUser');
              }
            }
          }
        }

        // 所有方案都失败，抛出综合错误
        throw new Error(`所有连接方案都失败: ${fetchError.message}\n请检查网络连接和Worker地址配置`);
      }
    }
  };

  // 尝试使用PowerShell解决方案的函数
  const tryPowerShellSolution = () => {
    // 检查新的上传管理器是否可用
    if (window.JEV && window.JEV.uploadManager && typeof window.JEV.uploadManager.usePowerShell === 'function') {
      // 使用新的上传管理器中的PowerShell功能
      console.log('[JEV] 🔄 使用增强版上传管理器的PowerShell备用通道...');
      if (window.JEV && typeof window.JEV.logUI === 'function') {
        window.JEV.logUI('🔄 使用增强版上传管理器的PowerShell备用通道...');
      }

      return window.JEV.uploadManager.usePowerShell(fixedUrl, data)
        .catch(error => {
          handlePowerShellError(error);
          throw error;
        });
    }

    // 原始PowerShell解决方案作为备用
    // 检查PowerShell解决方案是否可用
    if (window.JEV_POWERSHELL_SOLUTION && typeof window.JEV_POWERSHELL_SOLUTION.callWorker === 'function') {
      // 使用直接的console方法替代showNotification
      console.log('[JEV] 🔄 尝试使用PowerShell网络解决方案作为备用...');
      if (window.JEV && typeof window.JEV.logUI === 'function') {
        window.JEV.logUI('🔄 尝试使用PowerShell网络解决方案作为备用...');
      }

      // 检查是否在Windows环境
      if (!window.JEV_POWERSHELL_SOLUTION.isWindowsEnvironment()) {
        // 使用直接的console方法替代showNotification
        console.warn('[JEV] ⚠️ 当前不是Windows环境，无法使用PowerShell解决方案');
        if (window.JEV && typeof window.JEV.logUI === 'function') {
          window.JEV.logUI('⚠️ 当前不是Windows环境，无法使用PowerShell解决方案');
        }
        return Promise.reject(new Error('非Windows环境下无法使用PowerShell解决方案'));
      }

      // 确保data和fixedUrl参数存在
      const safeData = typeof data !== 'undefined' ? data : {};
      const safeFixedUrl = typeof fixedUrl !== 'undefined' ? fixedUrl : '';

      // 构建PowerShell请求参数
      const requestData = safeData;
      const psOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(requestData.headers || {})
        },
        body: requestData
      };

      // 调用PowerShell解决方案
      if (window.JEV_POWERSHELL_SOLUTION && typeof window.JEV_POWERSHELL_SOLUTION.callWorker === 'function') {
        return window.JEV_POWERSHELL_SOLUTION.callWorker(safeFixedUrl, psOptions)
          .then(result => {
            // 使用直接的console方法替代showNotification
            console.log('[JEV] ✅ PowerShell解决方案调用成功！');
            if (window.JEV && typeof window.JEV.logUI === 'function') {
              window.JEV.logUI('✅ PowerShell解决方案调用成功！');
            }
            // 直接返回result避免normalizeResult函数依赖
            return result;
          })
          .catch(psError => {
            // 处理PowerShell错误并提供友好提示
            handlePowerShellError(psError);
            throw psError;
          });
      } else {
        return Promise.reject(new Error('PowerShell解决方案不可用'));
      }
    }
    return Promise.reject(new Error('PowerShell解决方案不可用'));
  };

  // PowerShell错误处理辅助函数
  const handlePowerShellError = (psError) => {
    // 使用直接的console方法替代showNotification
    console.error('[JEV] ❌ PowerShell解决方案失败，尝试其他备用方案...');
    if (window.JEV && typeof window.JEV.logUI === 'function') {
      window.JEV.logUI('❌ PowerShell解决方案失败，尝试其他备用方案...');
    }
    console.error('[JEV] PowerShell错误详情:', psError);

    // 提取错误信息
    const errorMessage = psError.message || '未知错误';

    // 检查是否是权限错误或用户取消
    const isPermissionError = errorMessage.includes('权限') ||
                             errorMessage.includes('执行策略') ||
                             errorMessage.includes('access denied') ||
                             errorMessage.includes('unauthorized');

    const isUserCancel = errorMessage.includes('用户取消') ||
                        errorMessage.includes('cancel');

    // 提供针对性建议
    if (isPermissionError || isUserCancel) {
      console.warn('[JEV] 🔧 PowerShell权限问题，建议启用强制浏览器模式');
      if (window.JEV && typeof window.JEV.logUI === 'function') {
        window.JEV.logUI('🔧 快速解决方法：在浏览器控制台运行以下命令\n✅ window.JEV.FORCE_BROWSER_MODE = true');
        window.JEV.logUI('🔧 永久解决方法：以管理员身份运行PowerShell并执行\n✅ Set-ExecutionPolicy RemoteSigned -Scope CurrentUser');
      }
      throw new Error(`所有网络请求方案均失败: PowerShell执行被阻止（${isUserCancel ? '用户取消' : '权限限制'}）`);
    }

    // 抛出详细错误，避免显示原始变量名
    const safeErrorMessage = errorMessage.includes('$error') ?
        'PowerShell执行失败: 命令执行错误，请检查权限和网络连接' :
        errorMessage;
    throw new Error(`所有网络请求方案均失败: ${safeErrorMessage}`);
  };

  // 显示完整的错误诊断信息
  const showDetailedError = (errorMsg, originalError) => {
    const currentWorkerUrl = window.JEV && window.JEV.getWorkerBase ? window.JEV.getWorkerBase() : fixedUrl || 'unknown URL';

    console.error('[JEV] 详细错误信息:', originalError);
    console.error('[JEV] 🔧 修复建议：');
    console.error(`[JEV] 1. 检查网络连接是否正常`);
    console.error(`[JEV] 2. 验证Worker地址: ${currentWorkerUrl}`);
    console.error(`[JEV] 3. 运行: window.JEV.checkAndFixWorkerUrl()`);
    console.error(`[JEV] 4. 或手动设置: jevStoreSet('JEV_WORKER_URL', 'https://your-actual-worker.workers.dev')`);

    // 在UI中显示修复建议
    if (window.JEV && typeof window.JEV.logUI === 'function') {
      window.JEV.logUI('🔧 修复建议：');
      window.JEV.logUI(`1. 检查网络连接是否正常`);
      window.JEV.logUI(`2. 验证Worker地址: ${currentWorkerUrl}`);
      window.JEV.logUI(`3. 运行: window.JEV.checkAndFixWorkerUrl()`);
    }
  };

  try { // 确保有对应的catch块
    // 首先尝试使用标准fetch API
    logDebug('使用fetch进行异步上传（需要获取结果）');

    // 检查fetch API是否可用
    if (!window.fetch) {
      logDebug('fetch API不可用，直接使用备用方案');
      return tryXhrFallback().catch(xhrError => {
        logDebug('XHR备用方案也失败，尝试PowerShell解决方案');
        return tryPowerShellSolution();
      });
    }

    return fetch(fixedUrl, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        ...(data && data.headers ? data.headers : {})
      },
      keepalive: true, // 允许连接在页面卸载后继续
      credentials: 'omit' // 不发送cookies，避免跨域问题
    })
    .then(resp => {
      if (!resp.ok) {
        const errorMsg = `HTTP错误! status: ${resp.status}`;
        if (resp.status === 401) {
          // 401错误通常是验证问题
          const authError = `🔒 授权失败：可能是webhookSecret不匹配，请检查配置。`;
          showNotification(authError, 'error');
        } else if (resp.status === 404) {
          const notFoundError = `🔍 未找到: Worker地址可能不存在或路径错误。`;
          showNotification(notFoundError, 'error');
        } else if (resp.status >= 500) {
          const serverError = `⚠️ 服务器错误: Worker可能暂时不可用，请稍后重试。`;
          showNotification(serverError, 'error');
        }
        throw new Error(errorMsg);
      }
      // 尝试解析JSON，如果失败则返回空对象
      return resp.json().catch(() => ({}));
    })
    .then(result => normalizeResult(result))
    .catch(fetchError => {
      console.error('[JEV] 标准fetch请求失败:', fetchError);

      // 增强的错误处理
      const errorMsg = String(fetchError.message || '未知错误');

      // 对于网络连接错误，尝试使用备用方案
      const safeErrorMsg = String(errorMsg || '');
      if (safeErrorMsg.includes('Failed to fetch') ||
          safeErrorMsg.includes('NetworkError') ||
          safeErrorMsg.includes('Connection') ||
          safeErrorMsg.includes('timeout') ||
          safeErrorMsg.includes('cors')) {
        showNotification(`🌐 网络连接错误: ${errorMsg}，正在尝试备用方案...`, 'warning');

        // 尝试使用备用方案
        return tryPowerShellSolution().catch(backupError => {
          // 如果所有备用方案都失败，显示详细诊断
          showDetailedError('所有网络请求均失败', backupError);
          throw backupError;
        });
      }

      // 其他错误，显示详细诊断
      showDetailedError(errorMsg, fetchError);
      throw fetchError;
    });
  } catch (e) {
    console.error('[JEV] 异步上传初始化失败:', e);
    logDebug('上传初始化失败:', e);

    // 初始化失败时尝试备用方案
    return tryPowerShellSolution();
  }
}

// 配置常量
const SCAN_INTERVAL_MS = 30000; // 自动扫描周期 (优化：从12秒改为30秒)
const CANVAS_SCALE = 1; // 截图分辨率倍数
const BG_SCAN_INTERVAL_MS = 60000; // 后台扫描周期 (优化：从30秒改为60秒)
const MAX_IMAGE_SIZE = 1024 * 1024 * 5; // 5MB 最大图片大小 (新增)
const IMG_SELECTORS = [
  '.chat-message img',
  'img[data-message-type="image"]',
  'img[src*="whatsapp"], img[src*="lookaside"]',
  'img' // 兜底，提高命中率
];

// ===== 工具函数 =====
function log(...args) { console.log('[JEV-CAPTURE]', ...args); }
function nowTs() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function safeFileName(base) { return (base || '').replace(/[^a-zA-Z0-9._-]/g, '_'); }
function pickSrc(img) {
  if (!img) return null;
  if (img.src.startsWith('blob:') || img.src.startsWith('data:')) {
    return img.src;
  }
  if (img.currentSrc) return img.currentSrc;
  if (img.dataset?.src) return img.dataset.src;
  return img.src || null;
}
function isDataUrl(s) { return /^data:image\//i.test(s || ''); }
function isVisible(el) {
  try { // 确保有对应的catch块
    const r = el.getBoundingClientRect();
    return r.width > 3 && r.height > 3 && r.bottom > 0 && r.right > 0 &&
           r.top < window.innerHeight && r.left < window.innerWidth;
  } catch { return true; }
}

// 存储工具函数
function jevStoreGet(k, d) {
  try { // 确保有对应的catch块
    if (typeof GM_getValue === 'function') {
      const v = GM_getValue(k);
      return (v === undefined ? d : v);
    }
    const v = localStorage.getItem(k);
    return v != null ? JSON.parse(v) : d;
  } catch { return d; }
}

function jevStoreSet(k, v) {
  try { // 确保有对应的catch块
    if (typeof GM_setValue === 'function') {
      GM_setValue(k, v);
      return;
    }
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}

// 批量刷新日志函数
function flushLogs() {
  if (jevLogQueue.length === 0) {
    jevLogScheduled = false;
    return;
  }

  try { // 确保有对应的catch块
    // 获取日志框
    let logBox = window.JEV.STATE.jevLogBox;
    if (!logBox) {
      logBox = document.getElementById('jev-log');
      window.JEV.STATE.jevLogBox = logBox;
    }

    // 如果没有日志框，清空队列并退出
    if (!logBox) {
      jevLogQueue = [];
      jevLogScheduled = false;
      return;
    }

    // 批量创建日志内容
    const logContent = document.createElement('div');
    const logsToFlush = jevLogQueue.splice(0, 50); // 每次最多处理50条

    logsToFlush.forEach(logMsg => {
      const logItem = document.createElement('div');
      logItem.style.cssText = 'margin:2px 0;padding:2px 4px;border-radius:2px;font-size:14px;line-height:1.3';
      logItem.textContent = logMsg; // 使用textContent更安全
      logContent.appendChild(logItem);
    });

    // 一次性添加到DOM
    logBox.appendChild(logContent);
    logBox.scrollTop = logBox.scrollHeight;

    // 限制日志数量
    if (logBox.children.length > 100) {
      while (logBox.children.length > 100) {
        logBox.removeChild(logBox.firstChild);
      }
    }
  } catch (e) {
    console.error('JEV: 批量刷新日志失败:', e);
  }

  // 如果还有日志，继续调度下一次刷新
  if (jevLogQueue.length > 0) {
    setTimeout(flushLogs, 2000);
  } else {
    jevLogScheduled = false;
  }
}

// 日志UI函数（批量模式）
window.JEV.logUI = function logUI(msg) {
  if (!msg) return;

  // 同时输出到控制台
  console.log('[JEV-UI]', msg);

  // 添加到队列
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', {hour12: false});
  jevLogQueue.push(`${timeStr} ${msg}`);

  // 如果没有调度刷新，安排一次
  if (!jevLogScheduled) {
    jevLogScheduled = true;
    setTimeout(flushLogs, 2000); // 2秒后刷新
  }
};

// 设置状态函数
window.JEV.setStatus = function setStatus(status) {
  try { // 确保有对应的catch块
    if (window.JEV.STATE.jevStatusSpan) {
      window.JEV.STATE.jevStatusSpan.textContent = status;
    }
  } catch {}
};

// Worker地址自动检测与修复
window.JEV.checkAndFixWorkerUrl = async function checkAndFixWorkerUrl() {
  try { // 确保有对应的catch块
    // 强制使用正确的Worker URL
    const correctUrl = 'https://jevshop.bensonlove1986.workers.dev';

    // 获取当前Worker地址
    const currentUrl = window.JEV.getWorkerBase();

    // 检测是否使用了错误的URL
    const usingWrongUrl = currentUrl !== correctUrl ||
                         currentUrl.includes('tupianlujing') ||
                         currentUrl.includes('-local');

    // 无论是否检测到问题，都强制更新到正确的URL
    if (usingWrongUrl) {
      console.warn('[JEV] ⚠️ 检测到使用了错误的Worker地址:', currentUrl);
      console.warn('[JEV] 🔄 强制使用正确的Worker地址:', correctUrl);

      // 静默更新配置，避免弹出对话框干扰用户
      try { // 确保有对应的catch块
        // 强制更新所有存储的URL
        window.JEV.STATE.workerUrl = correctUrl;
        window.JEV.CFG.workerBase = correctUrl;
        jevStoreSet('JEV_WORKER_URL', correctUrl);
        console.log('[JEV] ✅ Worker地址已自动更新为正确地址');
      } catch (e) {
        console.error('[JEV] 保存Worker地址失败:', e);
      }
    }

    // 定期检查Worker状态（使用正确的URL）
    return checkWorkerStatus();
  } catch (e) {
    console.error('[JEV] Worker地址检查失败:', e);
    return false;
  }
};

// 检查Worker状态
async function checkWorkerStatus() {
  try { // 确保有对应的catch块
    const now = Date.now();
    // 避免频繁检查
    if (now - window.JEV.STATE.lastWorkerCheck < 60000) { // 1分钟检查一次
      return true;
    }

    const workerUrl = window.JEV.getWorkerBase();
    if (!workerUrl || workerUrl.includes('localhost') || workerUrl.includes('127.0.0.1')) {
      return false;
    }

    const webhookSecret = window.JEV.STATE.webhookSecret || window.JEV.CFG.webhookSecret;

    // 使用Promise.race添加超时控制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('检查超时')), 5000);
    });

    const fetchPromise = fetch(workerUrl + '/ping', {
      method: 'GET',
      headers: {
        'X-Webhook-Secret': webhookSecret
      }
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (response.ok) {
      window.JEV.STATE.lastWorkerCheck = now;
      return true;
    }

    return false;
  } catch (e) {
    console.error('[JEV] Worker状态检查失败:', e);
    return false;
  }
}

// 获取Worker基础URL（加强版，支持本地开发环境和远程生产环境）
window.JEV.getWorkerBase = function getWorkerBase() {
  try { // 确保有对应的catch块
    // 定义正确的Worker URL常量
    const CORRECT_WORKER_URL = 'https://jevshop.bensonlove1986.workers.dev';
    // 本地开发环境URL
    const LOCAL_WORKER_URL = 'http://localhost:3000';
    
    // 检测是否为本地开发环境（可根据需要调整检测逻辑）
    const isLocalDev = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      this.CFG.debugMode;
    
    // 开发环境使用本地Worker服务器，生产环境使用远程Worker
    const DEFAULT_WORKER_URL = isLocalDev ? LOCAL_WORKER_URL : CORRECT_WORKER_URL;
    
    // 记录所有相关URL信息用于调试
    const stored = String(window.JEV.STATE.workerUrl || '');
    const config = String(window.JEV.CFG.workerBase || '');
    const configUrl = String(window.JEV.CFG.workerUrl || '');

    // 详细日志记录当前状态
    console.log('[JEV] 🔍 Worker URL调试信息:');
    console.log('[JEV] - 存储的URL:', stored);
    console.log('[JEV] - 配置的workerBase:', config);
    console.log('[JEV] - 配置的workerUrl:', configUrl);

    // 根据环境选择目标URL
    const targetUrl = isLocalDev ? LOCAL_WORKER_URL : CORRECT_WORKER_URL;
    
    // 检测并报告任何潜在的错误URL
    const errorUrls = [];
    // 只在非开发环境检测错误域名
    if (!isLocalDev) {
      if (stored && stored !== targetUrl && stored.includes('tupianlujing')) {
        errorUrls.push(`存储的URL包含错误域名: ${stored}`);
      }
      if (config !== targetUrl && config.includes('tupianlujing')) {
        errorUrls.push(`配置的workerBase包含错误域名: ${config}`);
      }
      if (configUrl !== targetUrl && configUrl.includes('tupianlujing')) {
        errorUrls.push(`配置的workerUrl包含错误域名: ${configUrl}`);
      }
    }

    // 记录所有发现的问题
    if (errorUrls.length > 0) {
      console.error('[JEV] ⚠️ 发现错误URL配置:');
      errorUrls.forEach((err, idx) => console.error(`[JEV]   ${idx + 1}. ${err}`));
    }

    // 强制更新所有配置到当前环境的正确URL
    if (window.JEV.STATE.workerUrl !== targetUrl) {
      window.JEV.STATE.workerUrl = targetUrl;
      console.log(`[JEV] 🔄 已更新STATE.workerUrl到${isLocalDev ? '开发环境' : '生产环境'}值`);
    }

    if (window.JEV.CFG.workerBase !== targetUrl) {
      window.JEV.CFG.workerBase = targetUrl;
      console.log(`[JEV] 🔄 已更新CFG.workerBase到${isLocalDev ? '开发环境' : '生产环境'}值`);
    }

    if (window.JEV.CFG.workerUrl !== targetUrl) {
      window.JEV.CFG.workerUrl = targetUrl;
      console.log(`[JEV] 🔄 已更新CFG.workerUrl到${isLocalDev ? '开发环境' : '生产环境'}值`);
    }

    // 尝试存储当前环境的URL
    try { // 确保有对应的catch块
      jevStoreSet('JEV_WORKER_URL', targetUrl);
      console.log(`[JEV] 💾 已保存${isLocalDev ? '开发环境' : '生产环境'}Worker URL到存储`);
    } catch (e) {
      console.warn('[JEV] ⚠️ 无法保存Worker URL到存储:', e.message);
    }

    // 记录最终返回的URL
    console.log(`[JEV] ✅ 最终返回的Worker URL (${isLocalDev ? '开发环境' : '生产环境'}):`, targetUrl);

    // 返回当前环境的正确URL
    return targetUrl;
  } catch (e) {
      console.error('[JEV] ❌ 获取Worker地址时发生异常:', e);
      // 即使发生异常，也根据环境返回正确的URL
      const isLocalDev = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' ||
                        (window.JEV && window.JEV.CFG && window.JEV.CFG.debugMode);
      const fallbackUrl = isLocalDev ? 'http://localhost:3000' : 'https://jevshop.bensonlove1986.workers.dev';
      console.log(`[JEV] ⚠️ 异常情况下返回${isLocalDev ? '开发环境' : '生产环境'}URL:`, fallbackUrl);
      return fallbackUrl;
    }
};

// 添加全局拦截器来监控所有fetch请求 - 增强版
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // 检查URL是否包含错误的域名或端点
  let targetUrl = url;
  if (typeof targetUrl === 'string') {
    // 检测并修复错误域名 - 使用更宽松的匹配
    const hasWrongDomain = targetUrl.includes('tupianlujing');
    const needsDomainFix = targetUrl.includes('bensonlove1986.workers.dev') && !targetUrl.includes('jevshop');

    if (hasWrongDomain || needsDomainFix) {
      console.error('[JEV] 🚨 拦截到错误URL请求:', targetUrl);

      // 重定向到正确的URL - 使用更健壮的替换逻辑
      const correctUrl = targetUrl.replace(/tupianlujing\.bensonlove1986\.workers\.dev/g, 'jevshop.bensonlove1986.workers.dev');
      console.error('[JEV] 🔄 自动重定向到正确URL:', correctUrl);

      // 记录调用栈以追踪来源
      console.error('[JEV] 📋 调用栈:', new Error().stack);

      targetUrl = correctUrl;
    }

    // 记录所有与worker相关的请求
    if (targetUrl.includes('bensonlove1986.workers.dev')) {
      console.log('[JEV] 📡 监控到Worker请求:', targetUrl);
    }
  }

  // 执行原始fetch请求，但使用修复后的URL
  return originalFetch.call(this, targetUrl, options);
};

// 同时拦截XMLHttpRequest以捕获所有类型的请求
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  let targetUrl = url;
  if (typeof targetUrl === 'string') {
    // 同样的错误域名检测和修复逻辑
    const hasWrongDomain = targetUrl.includes('tupianlujing');
    const needsDomainFix = targetUrl.includes('bensonlove1986.workers.dev') && !targetUrl.includes('jevshop');

    if (hasWrongDomain || needsDomainFix) {
      console.error('[JEV] 🚨 XHR拦截到错误URL请求:', targetUrl);
      const correctUrl = targetUrl.replace(/tupianlujing\.bensonlove1986\.workers\.dev/g, 'jevshop.bensonlove1986.workers.dev');
      console.error('[JEV] 🔄 XHR自动重定向到正确URL:', correctUrl);
      console.error('[JEV] 📋 XHR调用栈:', new Error().stack);
      targetUrl = correctUrl;
    }
  }
  return originalXHROpen.call(this, method, targetUrl, ...args);
};

// 增强URL构造函数以防止创建错误URL
const originalURL = window.URL;
window.URL = function(url, base) {
  let targetUrl = url;
  if (typeof targetUrl === 'string') {
    // 同样的错误域名检测和修复逻辑
    const hasWrongDomain = targetUrl.includes('tupianlujing');
    const needsDomainFix = targetUrl.includes('bensonlove1986.workers.dev') && !targetUrl.includes('jevshop');

    if (hasWrongDomain || needsDomainFix) {
      console.error('[JEV] 🚨 URL构造函数拦截到错误URL:', targetUrl);
      const correctUrl = targetUrl.replace(/tupianlujing\.bensonlove1986\.workers\.dev/g, 'jevshop.bensonlove1986.workers.dev');
      console.error('[JEV] 🔄 URL构造函数修复为正确URL:', correctUrl);
      targetUrl = correctUrl;
    }
  }
  return new originalURL(targetUrl, base);
};
window.URL.prototype = originalURL.prototype;
window.URL.createObjectURL = originalURL.createObjectURL;
window.URL.revokeObjectURL = originalURL.revokeObjectURL;

// 立即执行一次URL检查，确保配置正确
console.log('[JEV] 🚀 初始化Worker URL检查...');
const initialUrl = window.JEV.getWorkerBase();
console.log('[JEV] 🎯 初始Worker URL设置为:', initialUrl);

// 立即检查并修复Worker URL
setTimeout(() => {
  if (window.JEV && typeof window.JEV.checkAndFixWorkerUrl === 'function') {
    window.JEV.checkAndFixWorkerUrl();
  }
}, 3000); // 延迟3秒执行，确保页面加载完成

// 延迟加载HTML2Canvas
// 将html2canvas确保相关方法添加到JEV对象
if (window.JEV) {
  // 添加延迟加载函数
  window.JEV.ensureHtml2CanvasDeferred = function() {
    return new Promise((resolve, reject) => {
      // 如果已加载，直接返回
      if (window.html2canvas) {
        return resolve(window.html2canvas);
      }

      // 检查是否已有加载请求
      const existingScript = document.querySelector('script[src*="html2canvas"]');
      if (existingScript) {
        const checkLoaded = () => {
          if (window.html2canvas) {
            existingScript.removeEventListener('load', checkLoaded);
            resolve(window.html2canvas);
          }
        };
        existingScript.addEventListener('load', checkLoaded);
        setTimeout(() => reject(new Error('html2canvas加载超时')), 3000); // 缩短超时时间
        return;
      }

      // 创建并加载脚本
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.async = true;
      s.onload = () => {
        this.logUI('[JEV] html2canvas已加载');
        resolve(window.html2canvas);
      };
      s.onerror = (e) => {
        this.logUI('[JEV] html2canvas加载失败，将尝试使用图片原始URL');
        reject(new Error('html2canvas load failed'));
      };

      if (document.head) {
        document.head.appendChild(s);
      } else {
        reject(new Error('document.head not available'));
      }
    });
  };

  // 添加主函数
  window.JEV.ensureHtml2Canvas = async function() {
    return this.ensureHtml2CanvasDeferred();
  };
}

// 延迟加载html2canvas（保留原函数名以兼容现有代码）
function ensureHtml2CanvasDeferred() {
  if (window.JEV && typeof window.JEV.ensureHtml2CanvasDeferred === 'function') {
    return window.JEV.ensureHtml2CanvasDeferred();
  }
  return new Promise((resolve, reject) => {
    // 如果已加载，直接返回
    if (window.html2canvas) {
      return resolve(window.html2canvas);
    }

    // 检查是否已有加载请求
    const existingScript = document.querySelector('script[src*="html2canvas"]');
    if (existingScript) {
      const checkLoaded = () => {
        if (window.html2canvas) {
          existingScript.removeEventListener('load', checkLoaded);
          resolve(window.html2canvas);
        }
      };
      existingScript.addEventListener('load', checkLoaded);
      setTimeout(() => reject(new Error('html2canvas加载超时')), 3000); // 缩短超时时间
      return;
    }

    // 创建并加载脚本
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    s.async = true;
    s.onload = () => {
      console.log('[JEV] html2canvas已加载');
      resolve(window.html2canvas);
    };
    s.onerror = (e) => {
      console.log('[JEV] html2canvas加载失败，将尝试使用图片原始URL');
      reject(new Error('html2canvas load failed'));
    };

    if (document.head) {
      document.head.appendChild(s);
    } else {
      reject(new Error('document.head not available'));
    }
  });
}

// 确保HTML2Canvas（保留原函数名以兼容现有代码）
async function ensureHtml2Canvas() {
  if (window.JEV && typeof window.JEV.ensureHtml2Canvas === 'function') {
    return window.JEV.ensureHtml2Canvas();
  }
  return ensureHtml2CanvasDeferred();
}

// 将captureImgToDataUrl方法添加到JEV对象
if (window.JEV) {
  window.JEV.captureImgToDataUrl = async function(img, forceCompress = false) {
    try { // 确保有对应的catch块
      // 截图限频机制
      const now = Date.now();
      if (!forceCompress && now - lastCaptureTs < 3000) { // 3秒内限制截图
        this.logUI('⏳ 截图限频触发，跳过');
        return null; // 不再返回原始URL，避免无效数据
      }
      lastCaptureTs = now;

      // 存储最后捕获的图片信息，方便调试
      window.lastCapturedImg = null; // 重置

      // 获取图片源
      const src = pickSrc(img);
      if (!src) {
        this.logUI('[JEV] 无法获取图片源');
        return null;
      }

      // 第一优先：已经是data URL，直接返回
      if (isDataUrl(src)) {
        this.logUI('[JEV] 直接使用DataURL，长度:', src.length);

        // 验证dataUrl的有效性（至少需要1000个字符才有意义）
        if (src.length < 1000) {
          console.warn('[JEV] DataURL过短，可能无效:', src.length);
          return null;
        }

        // 智能压缩兜底：如果dataUrl过长，进行压缩
        if (src.length > 800000) {
          this.logUI('📉 压缩兜底触发，当前大小:', src.length);
          try { // 确保有对应的catch块
            // 创建一个临时图片来压缩
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              tempImg.onload = resolve;
              tempImg.onerror = reject;
              tempImg.src = src;
            });

            // 创建canvas进行压缩
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1280;
            const width = Math.min(tempImg.naturalWidth, MAX_SIZE);
            const height = Math.min(tempImg.naturalHeight, MAX_SIZE);
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempImg, 0, 0, width, height);

            // 使用JPEG格式和更低质量进行压缩
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
            this.logUI('[JEV] 压缩后大小:', compressedDataUrl.length);
            return compressedDataUrl;
          } catch (compressError) {
            console.error('[JEV] 压缩失败:', compressError);
            // 压缩失败但原始dataUrl有效时返回原始dataUrl
            return src;
          }
        }

        return src;
      }

      // 第二优先：blob URL特殊处理
      if (src.startsWith('blob:')) {
        this.logUI('[JEV] 处理blob URL...');
        try { // 确保有对应的catch块
          const response = await fetch(src);
          const blob = await response.blob();
          this.logUI('[JEV] blob大小:', blob.size / 1024, 'KB');

          // 验证blob大小，过小的blob可能无效
          if (blob.size < 1000) {
            console.warn('[JEV] Blob大小过小，可能无效:', blob.size);
            throw new Error('Blob size too small');
          }

          // 将blob转换为data URL
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          this.logUI('[JEV] blob转换成功，dataUrl长度:', dataUrl.length);

          // 验证dataUrl的有效性
          if (dataUrl.length < 1000) {
            console.warn('[JEV] 转换后的DataURL过短，可能无效:', dataUrl.length);
            throw new Error('Converted dataUrl too short');
          }

          // 智能压缩兜底
          if (dataUrl.length > 800000) {
            this.logUI('📉 压缩兜底触发，当前大小:', dataUrl.length);
            try { // 确保有对应的catch块
              // 创建一个临时图片来压缩
              const tempImg = new Image();
              tempImg.crossOrigin = 'anonymous';
              await new Promise((resolve, reject) => {
                tempImg.onload = resolve;
                tempImg.onerror = reject;
                tempImg.src = dataUrl;
              });

              // 创建canvas进行压缩
              const canvas = document.createElement('canvas');
              const MAX_SIZE = 1280;
              const width = Math.min(tempImg.naturalWidth, MAX_SIZE);
              const height = Math.min(tempImg.naturalHeight, MAX_SIZE);
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(tempImg, 0, 0, width, height);

              // 使用JPEG格式和更低质量进行压缩
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
              this.logUI('[JEV] 压缩后大小:', compressedDataUrl.length);
              return compressedDataUrl;
            } catch (compressError) {
              console.error('[JEV] 压缩失败:', compressError);
              // 压缩失败但原始dataUrl有效时返回原始dataUrl
              return dataUrl;
            }
          }

          // 更新最后捕获的图片信息
          window.lastCapturedImg = dataUrl;
          this.logUI('📊 可通过 console.log("dataUrl length:", lastCaptureTs, window.lastCapturedImg?.length); 查看当前图片大小');

          return dataUrl;
        } catch (blobError) {
          this.logUI('[JEV] blob处理失败，切换到canvas模式:', blobError.message);
          // 失败时继续尝试canvas模式
        }
      }

      // 第三优先：HTTP/HTTPS URL
      if (src.startsWith('http')) {
        try { // 确保有对应的catch块
          this.logUI('[JEV] 尝试直接获取HTTP图片...');
          const response = await fetch(src, { mode: 'cors' });
          const blob = await response.blob();
          this.logUI('[JEV] HTTP图片获取成功，大小:', blob.size / 1024, 'KB');

          // 验证blob大小
          if (blob.size < 1000) {
            console.warn('[JEV] HTTP获取的Blob大小过小，可能无效:', blob.size);
            throw new Error('HTTP blob size too small');
          }

          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          this.logUI('[JEV] HTTP图片转换成功，dataUrl长度:', dataUrl.length);

          // 验证dataUrl的有效性
          if (dataUrl.length < 1000) {
            console.warn('[JEV] HTTP转换后的DataURL过短，可能无效:', dataUrl.length);
            throw new Error('HTTP converted dataUrl too short');
          }

          // 智能压缩兜底
          if (dataUrl.length > 800000) {
            this.logUI('📉 压缩兜底触发，当前大小:', dataUrl.length);
            try { // 确保有对应的catch块
              // 创建一个临时图片来压缩
              const tempImg = new Image();
              tempImg.crossOrigin = 'anonymous';
              await new Promise((resolve, reject) => {
                tempImg.onload = resolve;
                tempImg.onerror = reject;
                tempImg.src = dataUrl;
              });

              // 创建canvas进行压缩
              const canvas = document.createElement('canvas');
              const MAX_SIZE = 1280;
              const width = Math.min(tempImg.naturalWidth, MAX_SIZE);
              const height = Math.min(tempImg.naturalHeight, MAX_SIZE);
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(tempImg, 0, 0, width, height);

              // 使用JPEG格式和更低质量进行压缩
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
              this.logUI('[JEV] 压缩后大小:', compressedDataUrl.length);
              return compressedDataUrl;
            } catch (compressError) {
              console.error('[JEV] 压缩失败:', compressError);
              // 压缩失败但原始dataUrl有效时返回原始dataUrl
              return dataUrl;
            }
          }

          return dataUrl;
        } catch (httpError) {
          this.logUI('[JEV] HTTP图片获取失败，切换到canvas模式:', httpError.message);
          // 失败时继续尝试canvas模式
        }
      }

      // 最后兜底：强制使用html2canvas截图
      this.logUI('[JEV] 尝试canvas截图...');

      try { // 确保有对应的catch块
        const html2canvas = await ensureHtml2Canvas();

        // 优化：限制最大宽高为1280，降低scale
        const MAX_SIZE = 1280;
        const width = Math.min(img.naturalWidth || img.width, MAX_SIZE);
        const height = Math.min(img.naturalHeight || img.height, MAX_SIZE);

        // 根据是否强制压缩调整配置
        const canvasConfig = {
          useCORS: true,
          scale: forceCompress ? 1 : 1.5, // 降低scale以减小文件大小
          backgroundColor: null,
          logging: false,
          allowTaint: false,
          removeContainer: true,
          width: width,
          height: height
        };

        const canvas = await html2canvas(img, canvasConfig);

        // 计算canvas大小
        const estimatedSize = canvas.width * canvas.height * 4;
        // 使用更低的质量压缩
        let quality = forceCompress ? 0.4 : 0.5;
        if (estimatedSize > 1024 * 1024 * 1) {
          quality = 0.4;
        } else if (estimatedSize > 1024 * 1024 * 2) {
          quality = 0.3;
        }

        // 优先使用JPEG格式，压缩率更高
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        this.logUI('[JEV] canvas截图成功，dataUrl长度:', dataUrl.length);

        // 验证dataUrl的有效性
        if (dataUrl.length < 1000) {
          console.warn('[JEV] Canvas生成的DataURL过短，可能无效:', dataUrl.length);
          throw new Error('Canvas generated dataUrl too short');
        }

        // 二次压缩兜底
        if (dataUrl.length > 1000000) {
          this.logUI('📉 二次压缩兜底触发，当前大小:', dataUrl.length);
          try { // 确保有对应的catch块
            // 再次压缩到更低质量
            const reCanvas = document.createElement('canvas');
            const reWidth = Math.floor(width * 0.8);
            const reHeight = Math.floor(height * 0.8);
            reCanvas.width = reWidth;
            reCanvas.height = reHeight;
            const reCtx = reCanvas.getContext('2d');
            reCtx.drawImage(canvas, 0, 0, reWidth, reHeight);

            const reCompressedDataUrl = reCanvas.toDataURL('image/jpeg', 0.3);
            this.logUI('[JEV] 二次压缩后大小:', reCompressedDataUrl.length);

            // 更新最后捕获的图片信息
            window.lastCapturedImg = reCompressedDataUrl;
            this.logUI('📊 可通过 console.log("dataUrl length:", lastCaptureTs, window.lastCapturedImg?.length); 查看当前图片大小');

            return reCompressedDataUrl;
          } catch (reCompressError) {
            console.error('[JEV] 二次压缩失败:', reCompressError);
            // 压缩失败但原始dataUrl有效时返回原始dataUrl
            return dataUrl;
          }
        }

        return dataUrl;
      } catch (canvasError) {
        console.error('[JEV] Canvas截图失败:', canvasError);
        // canvas失败时返回null，而不是尝试使用可能无效的URL
        return null;
      }

    } catch (e) {
      console.error('[JEV] 所有捕获方法均失败:', e);
      // 不再回退到原始URL，避免传递无效数据
      return null;
    }
  };
}

// 保留原有函数作为兼容性调用入口
async function captureImgToDataUrl(img, forceCompress = false) {
  if (window.JEV && typeof window.JEV.captureImgToDataUrl === 'function') {
    return window.JEV.captureImgToDataUrl(img, forceCompress);
  }
  try { // 确保有对应的catch块
    // 截图限频机制
    const now = Date.now();
    if (!forceCompress && now - lastCaptureTs < 3000) { // 3秒内限制截图
      console.log('⏳ 截图限频触发，跳过');
      return null; // 不再返回原始URL，避免无效数据
    }
    lastCaptureTs = now;

    // 存储最后捕获的图片信息，方便调试
    window.lastCapturedImg = null; // 重置

    // 获取图片源
    const src = pickSrc(img);
    if (!src) {
      console.log('[JEV] 无法获取图片源');
      return null;
    }

    // 第一优先：已经是data URL，直接返回
    if (isDataUrl(src)) {
      console.log('[JEV] 直接使用DataURL，长度:', src.length);

      // 验证dataUrl的有效性（至少需要1000个字符才有意义）
      if (src.length < 1000) {
        console.warn('[JEV] DataURL过短，可能无效:', src.length);
        return null;
      }

      // 智能压缩兜底：如果dataUrl过长，进行压缩
      if (src.length > 800000) {
        console.log('📉 压缩兜底触发，当前大小:', src.length);
        try { // 确保有对应的catch块
          // 创建一个临时图片来压缩
          const tempImg = new Image();
          tempImg.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            tempImg.onload = resolve;
            tempImg.onerror = reject;
            tempImg.src = src;
          });

          // 创建canvas进行压缩
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1280;
          const width = Math.min(tempImg.naturalWidth, MAX_SIZE);
          const height = Math.min(tempImg.naturalHeight, MAX_SIZE);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(tempImg, 0, 0, width, height);

          // 使用JPEG格式和更低质量进行压缩
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
          console.log('[JEV] 压缩后大小:', compressedDataUrl.length);
          return compressedDataUrl;
        } catch (compressError) {
          console.error('[JEV] 压缩失败:', compressError);
          // 压缩失败但原始dataUrl有效时返回原始dataUrl
          return src;
        }
      }

      return src;
    }

    // 第二优先：blob URL特殊处理
    if (src.startsWith('blob:')) {
      console.log('[JEV] 处理blob URL...');
      try { // 确保有对应的catch块
        const response = await fetch(src);
        const blob = await response.blob();
        console.log('[JEV] blob大小:', blob.size / 1024, 'KB');

        // 验证blob大小，过小的blob可能无效
        if (blob.size < 1000) {
          console.warn('[JEV] Blob大小过小，可能无效:', blob.size);
          throw new Error('Blob size too small');
        }

        // 将blob转换为data URL
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        console.log('[JEV] blob转换成功，dataUrl长度:', dataUrl.length);

        // 验证dataUrl的有效性
        if (dataUrl.length < 1000) {
          console.warn('[JEV] 转换后的DataURL过短，可能无效:', dataUrl.length);
          throw new Error('Converted dataUrl too short');
        }

        // 智能压缩兜底
        if (dataUrl.length > 800000) {
          console.log('📉 压缩兜底触发，当前大小:', dataUrl.length);
          try { // 确保有对应的catch块
            // 创建一个临时图片来压缩
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              tempImg.onload = resolve;
              tempImg.onerror = reject;
              tempImg.src = dataUrl;
            });

            // 创建canvas进行压缩
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1280;
            const width = Math.min(tempImg.naturalWidth, MAX_SIZE);
            const height = Math.min(tempImg.naturalHeight, MAX_SIZE);
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempImg, 0, 0, width, height);

            // 使用JPEG格式和更低质量进行压缩
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
            console.log('[JEV] 压缩后大小:', compressedDataUrl.length);
            return compressedDataUrl;
          } catch (compressError) {
            console.error('[JEV] 压缩失败:', compressError);
            // 压缩失败但原始dataUrl有效时返回原始dataUrl
            return dataUrl;
          }
        }

        // 更新最后捕获的图片信息
        window.lastCapturedImg = dataUrl;
        console.log('📊 可通过 console.log("dataUrl length:", lastCaptureTs, window.lastCapturedImg?.length); 查看当前图片大小');

        return dataUrl;
      } catch (blobError) {
        console.log('[JEV] blob处理失败，切换到canvas模式:', blobError.message);
        // 失败时继续尝试canvas模式
      }
    }

    // 第三优先：HTTP/HTTPS URL
    if (src.startsWith('http')) {
      try { // 确保有对应的catch块
        console.log('[JEV] 尝试直接获取HTTP图片...');
        const response = await fetch(src, { mode: 'cors' });
        const blob = await response.blob();
        console.log('[JEV] HTTP图片获取成功，大小:', blob.size / 1024, 'KB');

        // 验证blob大小
        if (blob.size < 1000) {
          console.warn('[JEV] HTTP获取的Blob大小过小，可能无效:', blob.size);
          throw new Error('HTTP blob size too small');
        }

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        console.log('[JEV] HTTP图片转换成功，dataUrl长度:', dataUrl.length);

        // 验证dataUrl的有效性
        if (dataUrl.length < 1000) {
          console.warn('[JEV] HTTP转换后的DataURL过短，可能无效:', dataUrl.length);
          throw new Error('HTTP converted dataUrl too short');
        }

        // 智能压缩兜底
        if (dataUrl.length > 800000) {
          console.log('📉 压缩兜底触发，当前大小:', dataUrl.length);
          try { // 确保有对应的catch块
            // 创建一个临时图片来压缩
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              tempImg.onload = resolve;
              tempImg.onerror = reject;
              tempImg.src = dataUrl;
            });

            // 创建canvas进行压缩
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1280;
            const width = Math.min(tempImg.naturalWidth, MAX_SIZE);
            const height = Math.min(tempImg.naturalHeight, MAX_SIZE);
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempImg, 0, 0, width, height);

            // 使用JPEG格式和更低质量进行压缩
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.4);
            console.log('[JEV] 压缩后大小:', compressedDataUrl.length);
            return compressedDataUrl;
          } catch (compressError) {
            console.error('[JEV] 压缩失败:', compressError);
            // 压缩失败但原始dataUrl有效时返回原始dataUrl
            return dataUrl;
          }
        }

        return dataUrl;
      } catch (httpError) {
        console.log('[JEV] HTTP图片获取失败，切换到canvas模式:', httpError.message);
        // 失败时继续尝试canvas模式
      }
    }

    // 最后兜底：强制使用html2canvas截图
    console.log('[JEV] 尝试canvas截图...');

    try { // 确保有对应的catch块
      const html2canvas = await ensureHtml2Canvas();

      // 优化：限制最大宽高为1280，降低scale
      const MAX_SIZE = 1280;
      const width = Math.min(img.naturalWidth || img.width, MAX_SIZE);
      const height = Math.min(img.naturalHeight || img.height, MAX_SIZE);

      // 根据是否强制压缩调整配置
      const canvasConfig = {
        useCORS: true,
        scale: forceCompress ? 1 : 1.5, // 降低scale以减小文件大小
        backgroundColor: null,
        logging: false,
        allowTaint: false,
        removeContainer: true,
        width: width,
        height: height
      };

      const canvas = await html2canvas(img, canvasConfig);

      // 计算canvas大小
      const estimatedSize = canvas.width * canvas.height * 4;
      // 使用更低的质量压缩
      let quality = forceCompress ? 0.4 : 0.5;
      if (estimatedSize > 1024 * 1024 * 1) {
        quality = 0.4;
      } else if (estimatedSize > 1024 * 1024 * 2) {
        quality = 0.3;
      }

      // 优先使用JPEG格式，压缩率更高
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      console.log('[JEV] canvas截图成功，dataUrl长度:', dataUrl.length);

      // 验证dataUrl的有效性
      if (dataUrl.length < 1000) {
        console.warn('[JEV] Canvas生成的DataURL过短，可能无效:', dataUrl.length);
        throw new Error('Canvas generated dataUrl too short');
      }

      // 二次压缩兜底
      if (dataUrl.length > 1000000) {
        console.log('📉 二次压缩兜底触发，当前大小:', dataUrl.length);
        try { // 确保有对应的catch块
          // 再次压缩到更低质量
          const reCanvas = document.createElement('canvas');
          const reWidth = Math.floor(width * 0.8);
          const reHeight = Math.floor(height * 0.8);
          reCanvas.width = reWidth;
          reCanvas.height = reHeight;
          const reCtx = reCanvas.getContext('2d');
          reCtx.drawImage(canvas, 0, 0, reWidth, reHeight);

          const reCompressedDataUrl = reCanvas.toDataURL('image/jpeg', 0.3);
          console.log('[JEV] 二次压缩后大小:', reCompressedDataUrl.length);

          // 更新最后捕获的图片信息
          window.lastCapturedImg = reCompressedDataUrl;
          console.log('📊 可通过 console.log("dataUrl length:", lastCaptureTs, window.lastCapturedImg?.length); 查看当前图片大小');

          return reCompressedDataUrl;
        } catch (reCompressError) {
          console.error('[JEV] 二次压缩失败:', reCompressError);
          // 压缩失败但原始dataUrl有效时返回原始dataUrl
          return dataUrl;
        }
      }

      return dataUrl;
    } catch (canvasError) {
      console.error('[JEV] Canvas截图失败:', canvasError);
      // canvas失败时返回null，而不是尝试使用可能无效的URL
      return null;
    }
  } catch (e) {
    console.error('[JEV] 所有捕获方法均失败:', e);
    // 不再回退到原始URL，避免传递无效数据
    return null;
  }
}

// 渲染功能标志
function renderFlags() {
  try { // 确保有对应的catch块
    const flagsBox = window.JEV.STATE.jevFlagsBox;
    if (!flagsBox) return;

    const roleText = window.JEV.CFG.isAdmin ? '管理员' : '客服';
    const adminBtn = window.JEV.CFG.isAdmin ? '' :
      ' <button id="jev-make-admin" style="font-size:14px;padding:2px 8px">设为管理员</button>';

    flagsBox.innerHTML = `
      <span style="margin-right:12px">角色: ${roleText}${adminBtn}</span>
      <span style="margin-right:12px">自动推送: ${window.JEV.CFG.autoPush ? '✅' : '❌'}</span>
      <span style="margin-right:12px">仅聊天: ${window.JEV.CFG.chatOnly ? '✅' : '❌'}</span>
      <span style="margin-right:12px">发送方式: ${window.JEV.CFG.sendMode}</span>
    `;

    // 绑定管理员按钮事件
    const adminBtnEl = flagsBox.querySelector('#jev-make-admin');
    if (adminBtnEl) {
      adminBtnEl.onclick = () => {
        try { // 确保有对应的catch块
          window.JEV.CFG.isAdmin = true;
          jevStoreSet('JEV_IS_ADMIN', true);
          renderFlags();
          window.JEV.logUI('已切换为管理员模式');
        } catch (e) {
          window.JEV.logUI('切换失败: ' + e.message);
        }
      };
    }
  } catch (e) {
    console.error('renderFlags失败:', e);
  }
}

// 绑定标志事件
function bindFlagEvents() {
  try { // 确保有对应的catch块
    // 这里可以添加其他标志相关的事件绑定
  } catch (e) {
    console.error('bindFlagEvents失败:', e);
  }
}

// 确保结果框
function ensureResultBox() {
  try { // 确保有对应的catch块
    // 避免重复创建
    if (document.getElementById('jev-result')) {
      return;
    }

    const resultBox = document.createElement('div');
    resultBox.id = 'jev-result';
    resultBox.style.cssText = 'position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.95);color:white;padding:16px;border-radius:8px;max-width:400px;max-height:50vh;overflow:auto;z-index:999998;display:none';
    resultBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h3 style="margin:0">🖼️ 图片识别结果</h3>
        <button id="jev-result-close" style="background:none;border:none;color:white;cursor:pointer">✖️</button>
      </div>
      <div id="jev-result-content" style="white-space:pre-wrap;word-break:break-word"></div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button id="jev-result-copy" style="flex:1;padding:8px;background:#444;border:none;border-radius:4px;color:white;cursor:pointer">复制文本</button>
        <button id="jev-result-push" style="flex:1;padding:8px;background:#2a6496;border:none;border-radius:4px;color:white;cursor:pointer">推送到会话</button>
      </div>
    `;

    document.body.appendChild(resultBox);

    // 绑定关闭按钮事件
    document.getElementById('jev-result-close').onclick = () => {
      resultBox.style.display = 'none';
    };

    // 绑定复制按钮事件
    document.getElementById('jev-result-copy').onclick = () => {
      try { // 确保有对应的catch块
        const content = document.getElementById('jev-result-content').textContent;
        navigator.clipboard.writeText(content);
        window.JEV.logUI('文本已复制到剪贴板');
      } catch (e) {
        window.JEV.logUI('复制失败: ' + e.message);
      }
    };

    // 绑定推送按钮事件
    document.getElementById('jev-result-push').onclick = async () => {
      try { // 确保有对应的catch块
        const content = document.getElementById('jev-result-content').textContent;
        if (window.JEV.CFG.sendMode === 'worker') {
          await sendViaWorker(content);
        } else if (typeof window.sendViaUI === 'function') {
          window.sendViaUI(content);
        }
        resultBox.style.display = 'none';
      } catch (e) {
        window.JEV.logUI('推送失败: ' + e.message);
      }
    };

  } catch (e) {
    console.error('ensureResultBox失败:', e);
  }
}

// 设置结果文本
function setResultText(text) {
  try { // 确保有对应的catch块
    ensureResultBox();
    const resultBox = document.getElementById('jev-result');
    const resultContent = document.getElementById('jev-result-content');

    if (resultContent) {
      resultContent.textContent = text;
    }

    if (resultBox) {
      resultBox.style.display = 'block';
    }
  } catch (e) {
    console.error('setResultText失败:', e);
  }
}

// 显示统一结果（用于翻译结果展示）
function showUnifiedResult(result) {
  try { // 确保有对应的catch块
    ensureResultBox();
    const resultBox = document.getElementById('jev-result');
    const resultContent = document.getElementById('jev-result-content');

    if (resultContent && result) {
      // 显示翻译结果
      resultContent.textContent = result.translated_text || '';
    }

    if (resultBox) {
      resultBox.style.display = 'block';
    }
  } catch (e) {
    console.error('showUnifiedResult失败:', e);
  }
}

// 调试日志函数
function logDebug(...args) {
  console.log('[JEV-DEBUG]', ...args);
}

// 确保logDebug暴露到window.JEV对象
if (window.JEV) {
  window.JEV.logDebug = logDebug;
}

// ✅ 将识别结果直接显示到主面板里
function showResultBox(result) {
  try { // 确保有对应的catch块
    const targetDoc = window.top.document || document;
    let box = targetDoc.getElementById('jev-ocr-area');
    
    // 如果ocr-area不存在，创建一个临时结果显示区域
    if (!box) {
      // 先尝试使用翻译区窗口显示结果
      const translateBox = targetDoc.getElementById('jev-translate-box');
      const outputTextarea = translateBox?.querySelector('#jev-translate-output');
      const inputTextarea = translateBox?.querySelector('#jev-translate-input');
      
      if (translateBox && outputTextarea) {
        // 使用翻译区窗口显示结果
        const ocrText = result?.ocr_text || result?.text || '(无OCR结果)';
        const transText = result?.translated_text || result?.translation || result?.trans || '';
        
        // 在输入框显示OCR原文，输出框显示翻译结果
        if (inputTextarea) {
          inputTextarea.value = ocrText;
        }
        outputTextarea.value = transText || '(无翻译结果)';
        
        // 确保翻译区窗口可见
        translateBox.style.display = 'block';
        return;
      }
      
      // 如果翻译区也不存在，创建一个临时结果框
      box = targetDoc.createElement('div');
      box.id = 'jev-ocr-area';
      box.style.cssText = 'position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.95);color:white;padding:16px;border-radius:8px;max-width:500px;max-height:60vh;overflow:auto;z-index:999997;display:block';
      
      // 添加关闭按钮
      const closeButton = targetDoc.createElement('button');
      closeButton.style.cssText = 'position:absolute;top:8px;right:8px;background:none;border:none;color:white;cursor:pointer;font-size:16px';
      closeButton.textContent = '✖️';
      closeButton.onclick = () => {
        box.remove();
      };
      box.appendChild(closeButton);
      
      // 添加标题
      const title = targetDoc.createElement('h3');
      title.textContent = '🖼️ 图片识别与翻译结果';
      title.style.marginTop = '0';
      box.appendChild(title);
      
      // 添加内容容器
      const contentContainer = targetDoc.createElement('div');
      contentContainer.id = 'jev-ocr-content';
      box.appendChild(contentContainer);
      
      targetDoc.body.appendChild(box);
    }

    // 提取结果数据
    const ocrText = result?.ocr_text || result?.text || '(无OCR结果)';
    const transText = result?.translated_text || result?.translation || result?.trans || '(无翻译)';
    const errText = result?.error || (result?.status >= 400 ? `HTTP错误: ${result.status}` : '');
    
    // 安全处理文本内容，避免XSS
    const safeOcrText = String(ocrText).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const safeTransText = String(transText).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    const safeErrText = String(errText).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

    // 更新内容
    const contentContainer = box.querySelector('#jev-ocr-content') || box;
    contentContainer.innerHTML = `
      <div style="margin-bottom:10px;">
        <h4 style="margin:5px 0;">🧠 OCR识别结果:</h4>
        <div style="background:#222;padding:10px;border-radius:4px;white-space:pre-wrap;word-break:break-word;">${safeOcrText}</div>
      </div>
      <div style="margin-bottom:10px;">
        <h4 style="margin:5px 0;">🌐 翻译结果:</h4>
        <div style="background:#222;padding:10px;border-radius:4px;white-space:pre-wrap;word-break:break-word;">${safeTransText}</div>
      </div>
      ${safeErrText ? `<div style="color:#f66;padding:10px;background:#331111;border-radius:4px;"><b>❌ 错误:</b> ${safeErrText}</div>` : ''}
      
      <!-- 添加操作按钮 -->
      <div style="display:flex;gap:8px;margin-top:15px;">
        <button id="jev-ocr-copy" style="flex:1;padding:8px;background:#4caf50;color:white;border:none;border-radius:4px;cursor:pointer">复制翻译</button>
        <button id="jev-ocr-ocr-copy" style="flex:1;padding:8px;background:#2196f3;color:white;border:none;border-radius:4px;cursor:pointer">复制OCR</button>
      </div>
    `;
    
    // 绑定复制按钮事件
    const copyBtn = box.querySelector('#jev-ocr-copy');
    if (copyBtn) {
      copyBtn.onclick = async () => {
        try { // 确保有对应的catch块
          await navigator.clipboard.writeText(transText || ocrText);
          alert('文本已复制到剪贴板');
        } catch (e) {
          console.error('复制失败:', e);
        }
      };
    }
    
    const ocrCopyBtn = box.querySelector('#jev-ocr-ocr-copy');
    if (ocrCopyBtn) {
      ocrCopyBtn.onclick = async () => {
        try { // 确保有对应的catch块
          await navigator.clipboard.writeText(ocrText);
          alert('OCR文本已复制到剪贴板');
        } catch (e) {
          console.error('复制失败:', e);
        }
      };
    }
    
  } catch (e) {
    console.error('showResultBox失败:', e);
    // 降级方案：简单的alert显示结果
    const ocrText = result?.ocr_text || result?.text || '(无OCR结果)';
    const transText = result?.translated_text || result?.translation || result?.trans || '(无翻译)';
    alert(`OCR结果:\n${ocrText}\n\n翻译结果:\n${transText}`);
  }
}

// 更新结果操作
function updateResultActions() {
  try { // 确保有对应的catch块
    const resultBox = document.getElementById('jev-result');
    if (!resultBox) return;

    // 可以在这里根据需要更新结果框的操作按钮
  } catch (e) {
    console.error('updateResultActions失败:', e);
  }
}

// 确保翻译框（已废弃，保留用于向后兼容）
function ensureTranslateBox() {
  // 由于使用了统一结果框，此函数已不再需要创建单独的翻译框
  // 保留此函数以确保向后兼容性
  logDebug('ensureTranslateBox已废弃，使用统一结果框');
}

// 设置翻译文本（重定向到统一结果框）
function setTranslateText(text) {
  try { // 确保有对应的catch块
    // 确保showResultBox函数存在
    if (typeof showResultBox === 'function') {
      // 调用结果框函数，只传入翻译内容
      showResultBox({
        translated_text: text
      });
    } else {
      console.warn('showResultBox函数不存在，无法显示翻译结果');
    }
  } catch (e) {
    console.error('setTranslateText失败:', e);
  }
}

// 确保客服框
function ensureCsBox() {
  try { // 确保有对应的catch块
    // 避免重复创建
    if (document.getElementById('jev-cs')) {
      return;
    }

    const csBox = document.createElement('div');
    csBox.id = 'jev-cs';
    csBox.style.cssText = 'position:fixed;top:10px;left:450px;background:rgba(0,0,0,0.95);color:white;padding:16px;border-radius:8px;max-width:400px;max-height:50vh;overflow:auto;z-index:999996;display:none';
    csBox.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <h3 style="margin:0">💬 客服回复</h3>
        <button id="jev-cs-close" style="background:none;border:none;color:white;cursor:pointer">✖️</button>
      </div>
      <div id="jev-cs-content" style="white-space:pre-wrap;word-break:break-word"></div>
    `;

    document.body.appendChild(csBox);

    // 绑定关闭按钮事件
    document.getElementById('jev-cs-close').onclick = () => {
      csBox.style.display = 'none';
    };

  } catch (e) {
    console.error('ensureCsBox失败:', e);
  }
}

// 设置客服文本
function setCsText(text) {
  try { // 确保有对应的catch块
    ensureCsBox();
    const csBox = document.getElementById('jev-cs');
    const csContent = document.getElementById('jev-cs-content');

    if (csContent) {
      csContent.textContent = text;
    }

    if (csBox) {
      csBox.style.display = 'block';
    }
  } catch (e) {
    console.error('setCsText失败:', e);
  }
}

// 创建统一JEV窗口函数
function createJevWindow() {
  try { // 确保有对应的catch块
    console.log('[JEV] 创建统一JEV窗口');
    
    // 移除已存在的面板，避免重复创建
    const existingPanel = document.getElementById('jev-upload-panel');
    if (existingPanel && existingPanel.parentNode) {
      existingPanel.parentNode.removeChild(existingPanel);
    }

    // 创建主面板
    const panel = document.createElement('div');
    panel.id = 'jev-upload-panel';
    panel.style.cssText = 'position:fixed;bottom:10px;left:10px;background:rgba(0,0,0,0.95);color:#fff;padding:16px 20px;border-radius:8px;font-size:16px;z-index:999999;line-height:1.6;font-family:system-ui,Arial;box-shadow:0 6px 16px rgba(0,0,0,.25);resize:both;overflow:auto;min-width:320px;max-width:500px;min-height:200px;max-height:600px';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px">
        <b>🖼️ JEV嘉尔威 跨境插件</b>
        <div style="display:flex;gap:5px">
          <span id="jev-status" style="color:#0f0;font-size:14px">运行中</span>
          <button id="jev-toggle" style="background:#4CAF50;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px">⏸️ 暂停</button>
          <button id="jev-config" style="background:#2196F3;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px">⚙️ 设置</button>
          <button id="jev-clear-btn" style="background:#FF9800;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px">🗑️ 清空</button>
        </div>
      </div>
      <div id="jev-flags" style="margin-bottom:10px;padding:8px;background:rgba(255,255,255,0.1);border-radius:4px;display:flex;gap:10px;flex-wrap:wrap;font-size:14px">
        <span id="jev-role">👤 客服模式</span>
        <span id="jev-auto-push">🚀 自动推送: 关闭</span>
        <button id="jev-chat-only-btn" style="background:none;border:none;color:#0f0;cursor:pointer;padding:2px 4px">🗨️ 仅聊天: 开</button>
        <button id="jev-new-encouragement" style="background:none;border:none;color:#FF9800;cursor:pointer;padding:2px 4px">💪 鼓励语</button>
      </div>
      <div id="jev-log" style="margin-bottom:10px;padding:8px;background:rgba(0,0,0,0.3);border-radius:4px;max-height:150px;overflow-y:auto;font-size:14px;white-space:pre-wrap;word-break:break-word;color:#ccc">🔍 等待操作...</div>
      <div id="jev-ocr-area" style="margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.6); color: #0f0; font-family: Consolas, monospace; font-size: 14px; border-radius: 6px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; line-height: 1.6;">🧠 等待识别...</div>
      
      <!-- 设置面板 -->
      <div id="jev-settings" style="display:none;position:absolute;top:0;left:0;right:0;bottom:0;background:#333;padding:20px;overflow-y:auto">
        <h3 style="margin-top:0;color:#fff">⚙️ 插件设置</h3>
        <div style="margin-bottom:15px">
          <label style="display:block;margin-bottom:5px;color:#ccc">Webhook密钥:</label>
          <input id="jev-webhook-secret" type="text" style="width:100%;padding:8px;background:#222;border:1px solid #555;border-radius:4px;color:#fff" value="jevindustry2025">
        </div>
        <div style="margin-bottom:15px">
          <label style="display:block;margin-bottom:5px;color:#ccc">聊天区选择器:</label>
          <div style="display:flex;gap:5px">
            <input id="jev-chat-sel" type="text" style="flex:1;padding:8px;background:#222;border:1px solid #555;border-radius:4px;color:#fff" placeholder="CSS选择器">
            <button id="jev-select-chat" style="padding:8px 12px;background:#2196F3;color:white;border:none;border-radius:4px;cursor:pointer">选择</button>
          </div>
        </div>
        <div style="margin-bottom:15px">
          <label style="display:block;margin-bottom:5px;color:#ccc">输入框选择器:</label>
          <div style="display:flex;gap:5px">
            <input id="jev-input-sel" type="text" style="flex:1;padding:8px;background:#222;border:1px solid #555;border-radius:4px;color:#fff" placeholder="CSS选择器">
            <button id="jev-select-input" style="padding:8px 12px;background:#2196F3;color:white;border:none;border-radius:4px;cursor:pointer">选择</button>
          </div>
        </div>
        <div style="margin-bottom:15px">
          <label style="display:flex;align-items:center;gap:5px;color:#ccc">
            <input id="jev-auto-push" type="checkbox"> 启用自动推送
          </label>
        </div>
        <div style="margin-bottom:15px">
          <label style="display:flex;align-items:center;gap:5px;color:#ccc">
            <input id="jev-chat-only" type="checkbox" checked> 仅聊天模式
          </label>
        </div>
        <div style="display:flex;gap:10px">
          <button id="jev-settings-save" style="flex:1;padding:10px;background:#4CAF50;color:white;border:none;border-radius:4px;cursor:pointer">保存设置</button>
          <button id="jev-settings-close" style="flex:1;padding:10px;background:#f44336;color:white;border:none;border-radius:4px;cursor:pointer">关闭</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    console.log('JEV主面板已成功创建！');

    // 更新全局引用
    if (window.JEV && window.JEV.STATE) {
      window.JEV.STATE.jevPanel = panel;
      window.JEV.STATE.jevStatusSpan = panel.querySelector('#jev-status');
      window.JEV.STATE.jevLogBox = panel.querySelector('#jev-log');
      window.JEV.STATE.jevToggleBtn = panel.querySelector('#jev-toggle');
      window.JEV.STATE.jevFlagsBox = panel.querySelector('#jev-flags');
    }

    // 添加拖拽缩放功能
    addResizeFunctionality(panel);

    // 绑定按钮事件
    const jevToggleBtn = panel.querySelector('#jev-toggle');
    if (jevToggleBtn) {
      jevToggleBtn.onclick = () => {
        try { // 确保有对应的catch块
          const newVal = !window.JEV?.CFG?.enabled;
          if (window.JEV?.CFG) window.JEV.CFG.enabled = newVal;
          if (window.JEV?.setStatus) window.JEV.setStatus(newVal ? '运行中' : '已暂停');
          jevToggleBtn.textContent = newVal ? '⏸️ 暂停' : '▶️ 继续';
          if (window.JEV?.logUI) window.JEV.logUI((newVal ? '恢复运行' : '已暂停') + '（右下角面板控制）');
        } catch (e) {
          console.error('切换状态失败:', e);
        }
      };
    }

    // 渲染标志
    renderFlags();

    // 绑定清空结果按钮事件
    const jevClearBtn = panel.querySelector('#jev-clear-btn');
    if (jevClearBtn) {
      jevClearBtn.addEventListener('click', () => {
        const box = document.getElementById('jev-ocr-area');
        if (box) box.innerHTML = '🧠 等待识别...';
      });
    }

    // 绑定设置按钮事件
    const jevConfigBtn = panel.querySelector('#jev-config');
    const jevSettingsDiv = panel.querySelector('#jev-settings');
    const jevSettingsCloseBtn = panel.querySelector('#jev-settings-close');
    const jevSettingsSaveBtn = panel.querySelector('#jev-settings-save');
    
    if (jevConfigBtn && jevSettingsDiv) {
      jevConfigBtn.onclick = () => {
        jevSettingsDiv.style.display = 'block';
      };
    }
    
    if (jevSettingsCloseBtn && jevSettingsDiv) {
      jevSettingsCloseBtn.onclick = () => {
        jevSettingsDiv.style.display = 'none';
      };
    }

  } catch (e) {
    console.error('[JEV] createJevWindow执行异常:', e);
  }
}

// 确保主面板 - 统一简化版本
// 将ensurePanel方法添加到JEV对象
if (window.JEV) {
  window.JEV.ensurePanel = function() {
    try { // 确保有对应的catch块
      // 修复：使用安全的日志记录方式
      if (this.logUI && typeof this.logUI === 'function') {
        this.logUI('[JEV] 面板功能已优化为统一窗口模式');
      } else {
        console.log('[JEV] 面板功能已优化为统一窗口模式');
      }
      
      // 确保关键变量在window对象上可用
      if (!window.JEV) {
        window.JEV = {};
      }
      
      // 确保配置对象存在
      if (!this.CFG) {
        this.CFG = {
          WORKER_URL: this.getWorkerBase ? this.getWorkerBase() : '',
          WEBHOOK_SECRET: this.STATE?.webhookSecret || 'jevindustry2025',
          AUTO_PUSH: typeof JEV_AUTO_PUSH !== 'undefined' ? JEV_AUTO_PUSH : false,
          SEND_MODE: typeof JEV_SEND_MODE !== 'undefined' ? JEV_SEND_MODE : 'ui',
          CHAT_ONLY: typeof JEV_CHAT_ONLY !== 'undefined' ? JEV_CHAT_ONLY : true,
          CHAT_ROOT_SEL: typeof JEV_CHAT_ROOT_SEL !== 'undefined' ? JEV_CHAT_ROOT_SEL : '',
          targetLang: 'zh-CN',
          enabled: true
        };
        // 修复：安全的日志记录
        if (this.logUI && typeof this.logUI === 'function') {
          this.logUI('[JEV] 配置已初始化');
        }
      }
      
      // 确保JEV.STATE对象存在
      if (!this.STATE) {
        this.STATE = {};
      }
      
      // 使用统一窗口
      if (typeof createJevWindow === 'function') {
        createUnifiedWindow();
      }
      
      // 修复：安全的日志记录
      if (this.logUI && typeof this.logUI === 'function') {
        this.logUI('[JEV] 面板初始化完成');
      }
    } catch (e) {
      console.error('[JEV] ensurePanel执行异常:', e);
    }
  };
}

// 保留原有函数作为兼容性调用入口
function ensurePanel() {
  if (window.JEV && typeof window.JEV.ensurePanel === 'function') {
    return window.JEV.ensurePanel();
  }
  try { // 确保有对应的catch块
    console.log('[JEV] 面板功能已优化为统一窗口模式');
    
    // 确保关键变量在window对象上可用
    if (!window.JEV) {
      window.JEV = {};
    }
    
    // 确保配置对象存在
    if (!window.JEV.CFG) {
      window.JEV.CFG = {
        WORKER_URL: window.JEV.getWorkerBase ? window.JEV.getWorkerBase() : '',
        WEBHOOK_SECRET: window.JEV.STATE?.webhookSecret || 'jevindustry2025',
        AUTO_PUSH: typeof JEV_AUTO_PUSH !== 'undefined' ? JEV_AUTO_PUSH : false,
        SEND_MODE: typeof JEV_SEND_MODE !== 'undefined' ? JEV_SEND_MODE : 'ui',
        CHAT_ONLY: typeof JEV_CHAT_ONLY !== 'undefined' ? JEV_CHAT_ONLY : true,
        CHAT_ROOT_SEL: typeof JEV_CHAT_ROOT_SEL !== 'undefined' ? JEV_CHAT_ROOT_SEL : '',
        targetLang: 'zh-CN'
      };
      console.log('[JEV] 配置已初始化');
    }
    
    // 确保JEV.STATE对象存在
    if (!window.JEV.STATE) {
      window.JEV.STATE = {};
    }
    
    // 使用统一窗口
    if (typeof createJevWindow === 'function') {
      createJevWindow();
    }
    
    console.log('[JEV] 面板初始化完成');
  } catch (e) {
    console.error('[JEV] ensurePanel执行异常:', e);
  }
}

// createMainPanel函数已移除，改用统一窗口模式
// 相关功能已整合到createJevWindow函数中

    // 添加拖拽缩放功能
    addResizeFunctionality(panel);

    // 绑定控制按钮事件
    window.JEV.STATE.jevToggleBtn.onclick = () => {
      try { // 确保有对应的catch块
        const newVal = !window.JEV.CFG.enabled;
        window.JEV.CFG.enabled = newVal;
        window.JEV.setStatus(newVal ? '运行中' : '已暂停');
        window.JEV.STATE.jevToggleBtn.textContent = newVal ? '⏸️ 暂停' : '▶️ 继续';
        window.JEV.logUI((newVal ? '恢复运行' : '已暂停') + '（右下角面板控制）');

        if (window.JEV.CAPTURE && typeof window.JEV.CAPTURE.setEnabled === 'function') {
          window.JEV.CAPTURE.setEnabled(newVal);
        }
      } catch (e) {
        console.error('切换状态失败:', e);
      }
    };

    // 渲染标志
    renderFlags();

    // 绑定清空结果按钮事件
    panel.querySelector('#jev-clear-btn').addEventListener('click', () => {
      const box = document.getElementById('jev-ocr-area');
      if (box) box.innerHTML = '🧠 等待识别...';
    });

    // 绑定更换鼓励语按钮事件
    panel.querySelector('#jev-new-encouragement').addEventListener('click', () => {
      const encouragementEl = document.getElementById('jev-encouragement');
      if (encouragementEl) {
        encouragementEl.textContent = window.JEV.getRandomEncouragement();
      }
    });

    // 绑定日志切换按钮事件
    if (jevLogToggleBtn) {
      jevLogToggleBtn.onclick = () => {
        const logBox = window.JEV.STATE.jevLogBox;
        if (logBox) {
          logBox.style.display = logBox.style.display === 'none' ? 'block' : 'none';
          jevLogToggleBtn.textContent = logBox.style.display === 'none' ? '📜 日志' : '📜 隐藏日志';
        }
      };
    }

    // 绑定聊天区切换按钮事件
    if (jevChatOnlyBtn && jevChatOnlyBtn instanceof HTMLElement) {
      jevChatOnlyBtn.onclick = () => {
        window.JEV.CFG.chatOnly = !window.JEV.CFG.chatOnly;
        jevStoreSet('JEV_CHAT_ONLY', window.JEV.CFG.chatOnly);
        jevChatOnlyBtn.textContent = window.JEV.CFG.chatOnly ? '🗨️ 仅聊天：开' : '🗨️ 仅聊天：关';
        renderFlags();
      };
    }

    // 绑定设置按钮事件
    if (jevConfigBtn && jevConfigBtn instanceof HTMLElement) {
      jevConfigBtn.onclick = () => {
        // 加载当前配置
        if (jevWebhookSecretInput) jevWebhookSecretInput.value = window.JEV.STATE.webhookSecret || 'jevindustry2025';
        if (jevAutoPushInput) jevAutoPushInput.checked = window.JEV.CFG.autoPush;
        if (jevChatOnlyInput) jevChatOnlyInput.checked = window.JEV.CFG.chatOnly;
        if (jevChatSelInput) jevChatSelInput.value = window.JEV.CFG.chatRootSel || '';
        if (jevInputSelInput) jevInputSelInput.value = window.JEV.CFG.inputSel || '';

        // 显示设置面板
        if (jevSettingsDiv) {
          jevSettingsDiv.style.display = jevSettingsDiv.style.display === 'none' ? 'block' : 'none';
        }
      };
    }

    // 元素选择器功能
    function enableElementSelection(targetInput, selectionType) {
      // 创建遮罩层
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;z-index:999998;
        background:rgba(0,0,0,0.3);cursor:pointer;
      `;

      // 创建提示信息
      const infoBox = document.createElement('div');
      infoBox.style.cssText = `
        position:fixed;top:20px;left:50%;transform:translateX(-50%);
        background:#333;color:white;padding:12px 20px;border-radius:6px;
        z-index:999999;font-size:14px;
        box-shadow:0 4px 12px rgba(0,0,0,0.5);
      `;
      infoBox.textContent = `请点击页面上的${selectionType === 'chat' ? '聊天容器' : '输入框'}元素，或按ESC取消`;

      // 创建高亮框
      const highlightBox = document.createElement('div');
      highlightBox.style.cssText = `
        position:fixed;z-index:999998;
        outline:2px solid #2196f3;outline-offset:2px;
        background:transparent;
      `;

      // 添加到文档
      document.body.appendChild(overlay);
      document.body.appendChild(infoBox);
      document.body.appendChild(highlightBox);

      // 鼠标移动时高亮元素
      function onMouseMove(e) {
        const element = e.target;
        const rect = element.getBoundingClientRect();
        highlightBox.style.left = rect.left + 'px';
        highlightBox.style.top = rect.top + 'px';
        highlightBox.style.width = rect.width + 'px';
        highlightBox.style.height = rect.height + 'px';
      }

      // 点击元素时选择
      function onClick(e) {
        e.stopPropagation();
        const element = e.target;

        // 生成选择器
        let selector = generateSelector(element);
        targetInput.value = selector;

        // 清理
        cleanup();
        window.JEV.logUI(`已选择${selectionType === 'chat' ? '聊天容器' : '输入框'}: ${selector}`);
      }

      // 取消选择
      function onKeyDown(e) {
        if (e.key === 'Escape') {
          cleanup();
        }
      }

      // 清理函数
      function cleanup() {
        document.body.removeChild(overlay);
        document.body.removeChild(infoBox);
        document.body.removeChild(highlightBox);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('click', onClick);
      }

      // 添加事件监听
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('click', onClick);
    }

    // 生成元素选择器
    function generateSelector(element) {
      // 如果有id，优先使用id
      if (element.id) {
        return '#' + element.id;
      }

      // 如果有唯一类名，使用类名
      if (element.className) {
        const classes = element.className.split(/\s+/).filter(cls => cls);
        for (const cls of classes) {
          const elements = document.querySelectorAll('.' + cls);
          if (elements.length === 1) {
            return '.' + cls;
          }
        }
        // 否则使用所有类名的组合
        if (classes.length > 0) {
          return '.' + classes.join('.');
        }
      }

      // 使用标签名和位置
      const tagName = element.tagName.toLowerCase();
      const parent = element.parentNode;
      if (parent) {
        const siblings = parent.children;
        let index = 0;
        for (let i = 0; i < siblings.length; i++) {
          if (siblings[i] === element) {
            index = i + 1;
            break;
          }
        }
        return `${tagName}:nth-child(${index})`;
      }

      return tagName;
    }

    // 绑定选择按钮事件
    if (jevSelectChatBtn) {
      jevSelectChatBtn.onclick = () => enableElementSelection(jevChatSelInput, 'chat');
    }

    if (jevSelectInputBtn) {
      jevSelectInputBtn.onclick = () => enableElementSelection(jevInputSelInput, 'input');
    }

    // 绑定保存设置按钮事件
    if (jevSettingsSaveBtn) {
      jevSettingsSaveBtn.onclick = () => {
        try { // 确保有对应的catch块
          // 保存webhookSecret（默认值已自动设置）
          if (jevWebhookSecretInput) {
            const newSecret = jevWebhookSecretInput.value.trim() || 'jevindustry2025';
            window.JEV.STATE.webhookSecret = newSecret;
            jevStoreSet('JEV_WEBHOOK_SECRET', newSecret);
          }

          // 保存其他配置
          if (jevAutoPushInput) {
            window.JEV.CFG.autoPush = jevAutoPushInput.checked;
            jevStoreSet('JEV_AUTO_PUSH', window.JEV.CFG.autoPush);
          }

          if (jevChatOnlyInput) {
            window.JEV.CFG.chatOnly = jevChatOnlyInput.checked;
            jevStoreSet('JEV_CHAT_ONLY', window.JEV.CFG.chatOnly);
          }

          if (jevChatSelInput) {
            window.JEV.CFG.chatRootSel = jevChatSelInput.value.trim();
            jevStoreSet('JEV_CHAT_ROOT_SEL', window.JEV.CFG.chatRootSel);
          }

          if (jevInputSelInput) {
            window.JEV.CFG.inputSel = jevInputSelInput.value.trim();
            jevStoreSet('JEV_INPUT_SEL', window.JEV.CFG.inputSel);
          }

          // 更新UI状态
          if (jevChatOnlyBtn && jevChatOnlyBtn instanceof HTMLElement) {
            jevChatOnlyBtn.textContent = window.JEV.CFG.chatOnly ? '🗨️ 仅聊天：开' : '🗨️ 仅聊天：关';
          }
          renderFlags();
          // 修复：安全的日志记录方式，避免在logUI不可用时出错
          if (window.JEV && window.JEV.logUI && typeof window.JEV.logUI === 'function') {
            window.JEV.logUI('设置已保存');
          } else {
            console.log('[JEV] 设置已保存');
          }

          // 隐藏设置面板
          if (jevSettingsDiv) {
            jevSettingsDiv.style.display = 'none';
          }
        } catch (e) {
          console.error('保存设置失败:', e);
          window.JEV.logUI('保存设置失败: ' + e.message);
        }
      };
    }

    // 绑定关闭设置按钮事件
    if (jevSettingsCloseBtn) {
      jevSettingsCloseBtn.onclick = () => {
        if (jevSettingsDiv) {
          jevSettingsDiv.style.display = 'none';
        }
      };
    }

// 添加面板拖拽缩放功能 - 增强版
function addResizeFunctionality(panel) {
  try { // 确保有对应的catch块
    // 读取上次保存的位置
    const pos = JSON.parse(localStorage.getItem('JEV_PANEL_POS') || '{}');
    if (pos.left && pos.top) {
      panel.style.left = pos.left + 'px';
      panel.style.top = pos.top + 'px';
      panel.style.bottom = 'auto'; // 覆盖默认的bottom定位
    }

    // 读取上次保存的尺寸
    const sz = JSON.parse(localStorage.getItem('JEV_PANEL_SIZE') || '{}');
    if (sz.width && sz.height) {
      panel.style.width = sz.width + 'px';
      panel.style.height = sz.height + 'px';
    }

    // 设置面板基础样式
    panel.style.resize = 'both';
    panel.style.overflow = 'auto';
    panel.style.minWidth = '260px';
    panel.style.minHeight = '120px';
    panel.style.maxWidth = '90vw';
    panel.style.maxHeight = '85vh';
    panel.style.cursor = 'move';

    // 创建可拖拽标题栏（如果没有的话）
    let dragHandle = panel.querySelector('#jev-drag-handle');
    if (!dragHandle) {
      // 使用现有的标题区域作为拖拽点
      dragHandle = panel.querySelector('div:first-child');
      if (dragHandle) {
        dragHandle.style.cursor = 'move';
        dragHandle.style.userSelect = 'none';
      }
    }

    // 拖拽移动功能
    let isDragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const onMouseDown = (e) => {
      // 只在标题区域或面板空白处允许拖拽，避开按钮和输入元素
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) {
        return;
      }

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      document.body.style.userSelect = 'none';
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = startLeft + dx + 'px';
      panel.style.top = startTop + dy + 'px';
      panel.style.bottom = 'auto'; // 确保使用top定位
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.style.userSelect = '';

      // 记忆位置
      try { // 确保有对应的catch块
        const rect = panel.getBoundingClientRect();
        localStorage.setItem('JEV_PANEL_POS', JSON.stringify({ left: rect.left, top: rect.top }));
      } catch (e) {
        console.error('保存面板位置失败:', e);
      }
    };

    // 绑定拖拽事件
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', onMouseDown);
    } else {
      // 备用：允许在整个面板上拖拽
      panel.addEventListener('mousedown', onMouseDown);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // 创建右下角缩放手柄
    const panelHandle = document.createElement('div');
    panelHandle.id = 'jev-panel-resizer';
    panelHandle.style.cssText = 'position:absolute;right:6px;bottom:6px;width:14px;height:14px;cursor:se-resize;background:linear-gradient(135deg,rgba(0,255,0,.3),rgba(0,255,0,.1));border-radius:2px;opacity:.8;border:1px solid rgba(0,255,0,.5)';
    panelHandle.title = '拖拽此角以调整面板大小';
    panel.appendChild(panelHandle);

    // 缩放功能
    let startW = 0, startH = 0, resizeDrag = false;

    const onResizeMove = (e) => {
      if (!resizeDrag) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const w = Math.max(260, startW + dx);
      const h = Math.max(120, startH + dy);
      panel.style.width = w + 'px';
      panel.style.height = h + 'px';
    };

    const onResizeUp = () => {
      if (!resizeDrag) return;
      resizeDrag = false;
      document.removeEventListener('mousemove', onResizeMove, true);
      document.removeEventListener('mouseup', onResizeUp, true);

      // 保存尺寸
      try { // 确保有对应的catch块
        const rect = panel.getBoundingClientRect();
        localStorage.setItem('JEV_PANEL_SIZE', JSON.stringify({ width: rect.width, height: rect.height }));
      } catch (e) {
        console.error('保存面板尺寸失败:', e);
      }
    };

    panelHandle.addEventListener('mousedown', (e) => {
      try { // 确保有对应的catch块
        e.preventDefault();
        e.stopPropagation(); // 阻止触发面板拖拽
        resizeDrag = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = panel.getBoundingClientRect();
        startW = rect.width;
        startH = rect.height;

        document.addEventListener('mousemove', onResizeMove, true);
        document.addEventListener('mouseup', onResizeUp, true);
      } catch (e) {
        console.error('缩放开始失败:', e);
      }
    }, true);

    // 使用ResizeObserver监听尺寸变化（现代浏览器支持）
    if (window.ResizeObserver) {
      const ro = new ResizeObserver((entries) => {
        try { // 确保有对应的catch块
          const rect = entries[0].contentRect;
          localStorage.setItem('JEV_PANEL_SIZE', JSON.stringify({ width: rect.width, height: rect.height }));
        } catch (e) {
          console.error('ResizeObserver保存尺寸失败:', e);
        }
      });
      ro.observe(panel);
    }

    console.log('JEV面板拖拽缩放功能已增强');
  } catch (e) {
    console.error('添加拖拽缩放功能失败:', e);
  }
}

// 发送文本到Worker（增强版，添加超时控制和备用方案）
async function sendViaWorker(text) {
  try { // 确保有对应的catch块
    // 确保所有变量都正确声明并初始化，避免全局变量泄漏
    // 安全获取Worker地址，确保不会返回undefined或null
    const workerBase = String(window.JEV?.getWorkerBase?.() || '').trim() || '';
    // 安全获取webhook密钥
    const webhookSecret = String(window.JEV?.STATE?.webhookSecret || '').trim() || '';

    // 验证Worker地址
    if (!workerBase) {
      throw new Error('Worker地址未配置，请检查设置');
    }

    // 检查URL是否存在问题
    if (workerBase.includes('localhost') || workerBase.includes('127.0.0.1')) {
      throw new Error('Worker地址不能使用本地地址，请使用公网地址');
    }

    if (workerBase.includes('-local')) {
      throw new Error('Worker地址不能包含"-local"后缀，请修改地址');
    }

    const body = {
      text,
      location_id: window.JEV.STATE.locationId,
      contact_id: window.JEV.STATE.contactId,
      conversation_id: window.JEV.STATE.conversationId,
      timestamp: Date.now()
    };

    // 使用Promise.race添加超时控制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时，请检查网络连接')), 10000); // 10秒超时
    });

    const fetchPromise = fetch(`${workerBase}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret
      },
      body: JSON.stringify(body)
    });

    // 竞争fetch和timeout
    const resp = await Promise.race([fetchPromise, timeoutPromise]);

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }

    const data = await resp.json();
    window.JEV.logUI('推送成功: ' + JSON.stringify(data));
    return data;
  } catch (e) {
    console.error('[JEV] Worker发送失败:', e);
    const errorMsg = `连接服务器失败: ${e.message}\n请检查网络连接和Worker地址设置`;
    window.JEV.logUI(errorMsg);

    // 显示更友好的错误提示
    if (typeof alert === 'function') {
      alert(errorMsg);
    }

    // 尝试使用PowerShell解决方案（如果可用）
    if (window.JEV_POWERSHELL_SOLUTION && typeof window.JEV_POWERSHELL_SOLUTION.callWorker === 'function') {
      try { // 确保有对应的catch块
        window.JEV.logUI('🔄 尝试使用备用连接方案...');
        const workerBase = window.JEV.getWorkerBase();
        const webhookSecret = window.JEV.STATE.webhookSecret || window.JEV.CFG.webhookSecret;

        const result = await window.JEV_POWERSHELL_SOLUTION.callWorker(`${workerBase}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': webhookSecret
          },
          body: {
            text,
            location_id: window.JEV.STATE.locationId,
            contact_id: window.JEV.STATE.contactId,
            conversation_id: window.JEV.STATE.conversationId,
            timestamp: Date.now()
          }
        });

        window.JEV.logUI('备用方案推送成功');
        return result;
      } catch (psError) {
        console.error('[JEV] 备用连接方案也失败:', psError);
      }
    }

    throw e;
  }
}

// 通过UI发送文本
// 将sendViaUI整合到JEV对象中作为方法
window.JEV.sendViaUI = function(text) {
  try { // 确保有对应的catch块
    this.logUI(`📤 准备发送文本: ${text.substring(0, 50)}...`);
    // 优先使用配置的输入框选择器
    let inputElement;
    if (this.CFG.inputSel) {
      inputElement = document.querySelector(this.CFG.inputSel);
    }

    // 兜底查找常见的输入框
    if (!inputElement) {
      const selectors = [
        'textarea',
        '[contenteditable="true"]',
        '.ProseMirror',
        '[data-testid=chat-input]'
      ];

      for (const selector of selectors) {
        inputElement = document.querySelector(selector);
        if (inputElement && isVisible(inputElement)) break;
      }
    }

    if (!inputElement) {
      throw new Error('未找到可输入文本的元素');
    }

    // 聚焦输入框
    inputElement.focus();

    // 根据元素类型设置文本
    if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
      // 对于普通输入框
      if (inputElement.value) {
        inputElement.value += '\n' + text;
      } else {
        inputElement.value = text;
      }

      // 触发输入事件
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // 对于contenteditable元素
      const selection = window.getSelection();
      const range = document.createRange();

      // 如果元素已有内容，在末尾添加
      if (inputElement.textContent.trim()) {
        range.selectNodeContents(inputElement);
        range.collapse(false);
        range.insertNode(document.createTextNode('\n' + text));
      } else {
        range.selectNodeContents(inputElement);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      }

      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      // 触发输入事件
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 尝试自动发送
    setTimeout(() => {
      try { // 确保有对应的catch块
        // 查找发送按钮
        const sendButtonSelectors = [
          '[type="submit"]',
          '[data-testid*="send"]',
          '[aria-label*="发送"]',
          '.send-button'
        ];

        let sendButton;
        for (const selector of sendButtonSelectors) {
          sendButton = document.querySelector(selector);
          if (sendButton && isVisible(sendButton)) break;
        }

        if (sendButton) {
          sendButton.click();
          this.logUI('自动发送成功');
        } else {
          this.logUI('文本已输入，请手动发送');
        }
      } catch (e) {
        console.error('自动发送失败:', e);
      }
    }, 500);

    return true;
  } catch (e) {
    this.logUI('UI发送失败: ' + e.message);
    throw e;
  }
};

// 兼容性处理，保留旧的函数名调用方式
function sendViaUI(text) {
  return window.JEV.sendViaUI(text);
};

// 将translateTextClient整合到JEV对象中作为方法
window.JEV.translateTextClient = async function(text, target = this.CFG.targetLang) {
  try { // 确保有对应的catch块
    // 简单的翻译实现，实际使用时可能需要调用翻译API
    // 这里只是一个示例框架
    if (!text || text.length < 5) {
      return text;
    }

    const workerBase = this.getWorkerBase();
    const webhookSecret = this.STATE.webhookSecret || this.CFG.webhookSecret;

    // 验证Worker地址
    if (!workerBase) {
      this.logUI('翻译失败: Worker地址未配置');
      return text;
    }

    // 检查URL是否存在问题
    if (workerBase.includes('localhost') || workerBase.includes('127.0.0.1')) {
      this.logUI('翻译失败: Worker地址不能使用本地地址');
      return text;
    }

    if (workerBase.includes('-local')) {
      this.logUI('翻译失败: Worker地址不能包含"-local"后缀');
      return text;
    }

    this.logUI(`正在调用翻译服务: ${text.substring(0, 30)}...`);

    // 使用Promise.race添加超时控制
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('翻译请求超时')), 10000);
    });

    const fetchPromise = fetch(`${workerBase}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret
      },
      body: JSON.stringify({
        text,
        target_lang: target
      })
    });

    const res = await Promise.race([fetchPromise, timeoutPromise]);

    if (!res.ok) {
      throw new Error(`翻译服务错误: ${res.status} ${await res.text()}`);
    }

    const result = await res.json();

    if (result.success) {
      this.logUI('翻译成功');
      return result.translated_text || text;
    } else {
      const errorMsg = result.error || '未知错误';
      this.logUI('翻译失败: ' + errorMsg);

      // 尝试备用翻译方案
      return this.tryBackupTranslation(text, target, errorMsg);
    }
  } catch (e) {
    console.error('[JEV] 翻译请求失败:', e);
    this.logUI('翻译请求失败: ' + e.message);

    // 尝试备用翻译方案
    return this.tryBackupTranslation(text, target, e.message);
  }
};

// 添加备用翻译方案方法
window.JEV.tryBackupTranslation = async function(text, target, errorMsg) {
  try { // 确保有对应的catch块
    this.logUI('尝试备用翻译方案...');
    
    // 简单的回退机制 - 在实际项目中可以实现更复杂的备用翻译逻辑
    // 1. 可以尝试使用其他翻译API
    // 2. 可以使用缓存的翻译结果
    // 3. 可以实现简单的语言检测和规则翻译
    
    // 这里只是一个示例的回退机制
    let fallbackTranslation = '';
    
    // 记录错误但不抛出异常，确保程序继续运行
    console.warn('[JEV] 主翻译失败，使用备用方案:', errorMsg);
    
    // 如果文本很短，直接返回原文
    if (text.length < 10) {
      return text;
    }
    
    // 返回带有标记的原文，表明翻译失败
    fallbackTranslation = `[翻译失败: ${errorMsg}] ${text}`;
    
    this.logUI('备用翻译完成');
    return fallbackTranslation;
  } catch (fallbackError) {
    console.error('[JEV] 备用翻译也失败:', fallbackError);
    this.logUI('备用翻译也失败: ' + fallbackError.message);
    // 最终回退 - 返回原文
    return text;
  }
};

// 兼容性处理，保留旧的函数名调用方式
async function translateTextClient(text, target) {
  return window.JEV.translateTextClient(text, target);
}

// 将tryBackupTranslation整合到JEV对象中作为方法
window.JEV.tryBackupTranslation = function(text, target, originalError) {
  try { // 确保有对应的catch块
    this.logUI('🔄 尝试备用翻译方案...');

    // 基本语言检测
    const isChinese = /[\u4e00-\u9fff]/.test(text);
    const isEnglish = /^[\w\s\p{P}\p{S}]+$/u.test(text.replace(/[\u4e00-\u9fff]/g, ''));

    // 根据语言类型提供不同的提示
    const safeTarget = String(target || '');
    if (isChinese && safeTarget.includes('en')) {
      return text + '\n[翻译服务暂时不可用，请稍后再试]';
    } else if (isEnglish && safeTarget.includes('zh')) {
      return text + '\n[Translation service temporarily unavailable, please try again later]';
    } else {
      return text + '\n[Translation failed: ' + originalError + ']';
    }
  } catch (e) {
    console.error('[JEV] 备用翻译也失败:', e);
    return text; // 最终失败时返回原文
  }
};

// 兼容性处理，保留旧的函数名调用方式
function tryBackupTranslation(text, target, originalError) {
  return window.JEV.tryBackupTranslation(text, target, originalError);
}

// Base64上传函数（增强版，添加图片数据校验）
window.JEV.uploadBase64 = async function(dataUrl, options = {}) {
  try { // 确保有对应的catch块
    // 🔍 关键校验：确保图片数据有效
    if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.length < 1000) {
      const errorMsg = '图片捕获失败或内容为空（dataUrl长度: ' + (dataUrl?.length || 0) + '）';
      console.error('[JEV] ❌ ' + errorMsg);
      this.setStatus('识别失败');
      this.logUI('识别失败: ' + errorMsg);
      showResultBox({ error: errorMsg });
      return Promise.reject(new Error(errorMsg));
    }

    // 打印图片数据长度（调试用）
    console.log('[DEBUG] 图片Base64长度:', dataUrl.length);

    // 检查是否达到处理限制
    const currentHour = new Date().toISOString().slice(0, 13);
    const tokenKey = `jev_tokens_${currentHour}`;
    const tokens = jevStoreGet(tokenKey, 0);

    if (tokens >= 60) { // 每小时60个请求限制
      throw new Error('达到每小时处理限制，请稍后再试');
    }

    // 更新token计数
    jevStoreSet(tokenKey, tokens + 1);

    const workerBase = this.getWorkerBase();
    const webhookSecret = this.STATE.webhookSecret;

    // 先检查worker连接
    this.setStatus('连接服务器中...');

    // 添加服务器连接检测 - 使用fetch API的AbortController实现超时
    try { // 确保有对应的catch块
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

      const pingResponse = await fetch(`${workerBase}/ping`, {
        method: 'GET',
        headers: {
          'X-Webhook-Secret': webhookSecret
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!pingResponse.ok) {
        throw new Error('服务器响应异常');
      }

      // 验证响应内容
      const pingData = await pingResponse.json();
      if (!pingData.success) {
        throw new Error('服务器返回异常响应');
      }
    } catch (pingError) {
      const errorMsg = pingError.name === 'AbortError' ? '服务器连接超时' : '服务器链接失败，请检查Worker地址是否正确';
      this.setStatus('识别失败');
      this.logUI('识别失败: ' + errorMsg);
      showResultBox({ error: errorMsg });
      alert('连接服务器失败，请检查网络连接和Worker地址设置。');
      return Promise.reject(new Error(errorMsg));
    }

    // 智能降级处理：检测并处理过大的图片
    let useUrlMode = false;
    let imageUrl = null;
    let finalDataUrl = dataUrl;

    // 如果是原始URL且不是data URL，优先使用URL模式
    if (dataUrl.startsWith('http') && !dataUrl.startsWith('data:')) {
      useUrlMode = true;
      imageUrl = dataUrl;
      console.log('[JEV] 使用URL模式上传，避免传输大文件');
    }
    // 如果dataUrl过大，尝试降级压缩
    else if (dataUrl.length > 800000) {
      console.log('📉 检测到图片过大，尝试降级压缩:', dataUrl.length);
      this.setStatus('图片过大，正在压缩...');
      this.logUI('图片过大，正在压缩...');

      // 如果有原始图片引用，尝试重新压缩
      if (options.originalImage) {
        try { // 确保有对应的catch块
          finalDataUrl = await captureImgToDataUrl(options.originalImage, true);
          console.log('[JEV] 降级压缩成功，新大小:', finalDataUrl.length);
        } catch (compressError) {
          console.error('[JEV] 降级压缩失败:', compressError);
        }
      }

      // 即使压缩后仍然过大，尝试拆分上传或使用备用方案
      if (finalDataUrl.length > 1000000) {
        console.log('📉 压缩后仍然过大，尝试替代方案');
        this.logUI('图片仍然较大，可能影响识别速度');
      }
    }

    // 处理数据URL，提取base64部分
    let base64Data = finalDataUrl;
    if (finalDataUrl.startsWith('data:image/')) {
      const commaIndex = finalDataUrl.indexOf(',');
      if (commaIndex > -1) {
        base64Data = finalDataUrl.substring(commaIndex + 1);
      }
    }

    // 构建完整的请求体，支持多模式上传和翻译
    const body = {
      // 优先使用图片URL或Base64数据
      ...(useUrlMode && imageUrl ? { image_url: imageUrl } : { image_b64: base64Data }),
      // 核心功能参数
      ocr: true, // 强制进行OCR识别
      translate: true, // 强制进行翻译
      target_lang: this.CFG.targetLang || 'zh-CN',
      timestamp: Date.now(),
      // 添加元数据信息
      metadata: {
        source: 'local_script',
        capture_method: 'blob_upload',
        version: '1.0',
        user_agent: navigator.userAgent
      },
      // 合并额外选项
      ...options
    };

    console.log('🔄 开始图片处理流程：捕获BLOB图片 → Worker上传 → OCR识别 → 翻译 → 结果显示');
    this.setStatus('🖼️ 正在上传图片...');

    // 将Base64转换为Blob的辅助函数
    function base64ToBlob(base64Data) {
      const contentType = 'image/jpeg';
      const sliceSize = 512;
      
      // 移除data:image/jpeg;base64,前缀（如果存在）
      const base64 = base64Data.indexOf(',') > -1 ? base64Data.split(',')[1] : base64Data;
      const byteCharacters = atob(base64);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      return new Blob(byteArrays, { type: contentType });
    }

    let uploadPromise;
    
    // 智能选择上传方式
    if (useUrlMode && imageUrl) {
      // URL模式：使用/analyze-image接口
      console.log(`🔄 使用URL模式上传到/analyze-image: ${imageUrl}`);
      uploadPromise = asyncUpload(`${workerBase}/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhookSecret,
          'X-Workflow-Id': `local-ocr-${Date.now()}`
        },
        body: JSON.stringify({ url: imageUrl })
      });
    } else {
      // 文件模式：使用/upload-image接口（FormData格式）
      console.log('📁 使用文件模式上传到/upload-image');
      try { // 确保有对应的catch块
        const blob = await base64ToBlob(finalDataUrl);
        const fileName = `jev_upload_${Date.now()}.jpg`;
        
        const formData = new FormData();
        formData.append('file', blob, fileName);
        
        uploadPromise = asyncUpload(`${workerBase}/upload-image`, {
          method: 'POST',
          headers: {
            'X-Webhook-Secret': webhookSecret,
            'X-Workflow-Id': `local-ocr-${Date.now()}`
            // 不要设置Content-Type，让浏览器自动处理
          },
          body: formData
        });
      } catch (blobError) {
        console.error('Blob转换失败:', blobError);
        throw new Error('图片转换失败');
      }
    }

    // 处理上传结果（在后台进行，不阻塞主线程）
    uploadPromise.then(async (data) => {
      try { // 确保有对应的catch块
        console.log('✅ 收到OCR和翻译结果:', {
          has_ocr: !!data.ocr_text || !!data.text || !!data.recognition_result,
          has_translation: !!data.translated_text || !!data.translation || !!data.trans,
          engine_used: data.engine || 'unknown'
        });

        // 规范化OCR文本结果 - 支持多种可能的响应格式
        let ocrText = '';
        if (data.success && Array.isArray(data.items) && data.items.length > 0) {
          // 合并items数组中的文本
          ocrText = data.items.join('\n');
        } else if (data.textAnnotations && Array.isArray(data.textAnnotations) && data.textAnnotations.length > 0) {
          // 兼容可能的直接Vision API响应格式
          ocrText = data.textAnnotations[0]?.description || '';
        } else if (data.ocr_text) {
          ocrText = data.ocr_text;
        } else if (data.text) {
          ocrText = data.text;
        } else if (data.recognition_result) {
          ocrText = data.recognition_result;
        }

        // 规范化翻译文本结果
        let translatedText = '';
        if (data.translated_text) {
          translatedText = data.translated_text;
        } else if (data.translation) {
          translatedText = data.translation;
        } else if (data.trans) {
          translatedText = data.trans;
        }

        // 检查是否有错误信息
        let errorText = '';
        if (data.error) {
          errorText = data.error;
        } else if (data.status >= 400) {
          errorText = `HTTP错误: ${data.status}`;
        }

        // 更新data对象，添加规范化字段
        data.ocr_text = ocrText;
        data.text = ocrText; // 保持向后兼容
        data.translated_text = translatedText;

        // 合并最终结果对象
        const finalResult = {
          ocr_text: ocrText,
          translated_text: translatedText,
          error: errorText,
          engine: data.engine,
          processing_time: data.processing_time_ms,
          timestamp: new Date().toISOString(),
          ...data
        };

        // 记录识别统计信息
        this.logUI(`✅ 识别完成：共 ${ocrText.length} 字符，翻译 ${translatedText.length} 字符`);
        if (data.engine) {
          this.logUI(`🔍 使用引擎：${data.engine}`);
        }
        if (data.processing_time_ms) {
          this.logUI(`⏱️ 处理用时：${(data.processing_time_ms/1000).toFixed(1)}s`);
        }
        
        // 确保翻译区窗口已初始化
        if (typeof ensureTranslateBox === 'function') {
          ensureTranslateBox();
        }

        // 显示识别和翻译结果到页面
        showResultBox(finalResult);

        // 处理识别结果
        if (ocrText) {
          setResultText(ocrText);

          // 自动推送结果到翻译区窗口
          if (this.CFG.autoPush) {
            try { // 确保有对应的catch块
              // 如果有翻译结果，推送翻译结果；否则推送OCR文本
              const textToPush = translatedText || ocrText;
              if (this.CFG.sendMode === 'worker') {
                await sendViaWorker(textToPush);
              } else if (typeof window.sendViaUI === 'function') {
                window.sendViaUI(textToPush);
              }
              this.logUI(`📤 已自动推送结果到翻译区`);
            } catch (pushErr) {
              console.warn('自动推送失败:', pushErr);
            }
          }
        }
        
        // 完成状态更新
        this.setStatus('💯 处理完成');
        
      } catch (e) {
        console.error('处理上传结果失败:', e);
        this.logUI(`❌ 处理结果失败: ${e.message}`);
        this.setStatus('处理失败');
        // 显示错误结果
        showResultBox({ error: `处理失败: ${e.message}` });
      }
    }).catch(e => {
      console.error('异步上传失败:', e);
      const errorMessage = e.message || '未知错误';
      this.logUI(`❌ 上传失败: ${errorMessage}`);
      this.setStatus('上传失败');
      // 显示错误结果
      showResultBox({ error: `上传失败: ${errorMessage}` });
    });

    return uploadPromise;
  } catch (e) {
    this.logUI('上传失败: ' + e.message);
    throw e;
  }
};

// 兼容性处理，保留旧的函数名调用方式
async function uploadBase64(dataUrl, options = {}) {
  return window.JEV.uploadBase64(dataUrl, options);
}

// 观察新图片（三层识别机制：精确识别客户消息中的图片）
function observeNewImages() {
  try { // 确保有对应的catch块
    // === 三层识别机制 ===

    // 1️⃣ 定位聊天主容器（更精确）
    function findChatContainer() {
      const possibleSelectors = [
        '.conversation',
        '.chat-message-list',
        '.message-list',
        '[data-testid="chat-messages"]',
        '.chat-content',
        '.messages-container',
        '[data-testid="msg-container"]', // WhatsApp Web
        'div[role="log"]', // Messenger
        '[class*="chat"][class*="messages"]',
        '[class*="conversation"][class*="container"]'
      ];

      for (const sel of possibleSelectors) {
        const el = document.querySelector(sel);
        if (el && (el.querySelector('img') || el.querySelector('[class*="message"]'))) {
          return el;
        }
      }

      return null;
    }

    // 2️⃣ 判断是否是客户消息（而不是客服自己发的）
    function isCustomerMessage(element) {
      if (!element) return false;

      // 查找消息气泡容器
      const bubble = element.closest('.message-bubble, [data-testid="msg-container"], .chat-message, .message, .msg');
      if (!bubble) {
        // 如果找不到气泡容器，尝试向上找两级父元素判断
        const parent = element.parentElement;
        const grandParent = parent ? parent.parentElement : null;
        if (grandParent) {
          // 检查祖父元素是否有自发标识
          const selfClasses = ['self', 'outgoing', 'me', 'sent', 'msg-out', 'out'];
          if (selfClasses.some(cls => grandParent.classList.contains(cls))) {
            return false;
          }
          // 检查祖父元素是否有入站标识
          const incomingClasses = ['incoming', 'in', 'msg-in'];
          if (incomingClasses.some(cls => grandParent.classList.contains(cls))) {
            return true;
          }
        }
        return false;
      }

      // 常见的自发气泡标识（多个平台兼容）
      const selfClasses = ['self', 'outgoing', 'me', 'sent', 'msg-out', 'out'];
      if (selfClasses.some(cls => bubble.classList.contains(cls))) {
        return false;
      }

      // 常见的入站气泡标识
      const incomingClasses = ['incoming', 'in', 'msg-in'];
      if (incomingClasses.some(cls => bubble.classList.contains(cls))) {
        return true;
      }

      // 检查数据属性
      if (bubble.dataset.testid === 'msg-out' ||
          bubble.getAttribute('data-testid') === 'msg-out') {
        return false;
      }

      // 检查方向相关的样式（针对没有明确class的情况）
      const style = window.getComputedStyle(bubble);
      const align = style.textAlign || style.cssFloat || style.float;
      if (align === 'right' || align === 'end') {
        return false; // 通常右侧是自己发的
      }

      // 检查颜色（客服消息通常有不同背景色）
      const bgColor = style.backgroundColor;
      const lightBgColors = ['#dcf8c6', '#e3f2fd', '#e8f5e8'];
      const safeBgColor = String(bgColor || '');
  if (lightBgColors.includes(safeBgColor.toLowerCase())) {
        return false;
      }

      // 默认认为不是自己发的（保守策略）
      return true;
    }

    // 3️⃣ 聊天区内图片和文字消息处理
    function observeChatImages() {
      const chat = findChatContainer();
      if (!chat) {
        console.warn('[JEV] ❌ 未找到聊天区，10秒后重试');
        window.JEV.logUI('未找到聊天区，10秒后重试...');
        setTimeout(observeChatImages, 10000);
        return null;
      }

      console.log('[JEV] ✅ 找到聊天区:', chat);
      window.JEV.logUI('找到聊天区 ✅ 开始监听客户图片与文字');

      // 防抖处理函数（保留原有的性能优化）
      let pendingImages = new Set();
      let processTimer = null;
      let isProcessing = false;

      // 处理客户文字消息
      const processTextMessage = (textEl) => {
        if (!textEl || textEl.dataset.jevHandled) return;

        // 标记为已处理
        textEl.dataset.jevHandled = '1';

        // 获取文本内容
        const text = textEl.innerText.trim();
        if (!text) return;

        console.log('[JEV] 📝 捕获到客户文字:', text);
        window.JEV.logUI('🗣️ 新文字消息: ' + text);

        // 如果translate开关打开，自动翻译
        if (window.JEV.CFG.translate && typeof window.JEV.translateTextClient === 'function') {
          window.JEV.translateTextClient(text).then(trans => {
            showResultBox({
              ocr_text: text,
              translated_text: trans
            });
          }).catch(e => {
            console.error('[JEV] 翻译失败:', e);
          });
        } else {
          // 不翻译时也显示原文
          showResultBox({
            ocr_text: text,
            translated_text: '(未翻译)'
          });
        }

        // 如果autoPush开关打开，自动回复
        if (window.JEV.CFG.autoPush && typeof window.sendViaUI === 'function') {
          try { // 确保有对应的catch块
            window.sendViaUI('客户说: ' + text);
            window.JEV.logUI('自动回复已发送');
          } catch (e) {
            console.error('[JEV] 自动回复失败:', e);
            window.JEV.logUI('自动回复失败: ' + e.message);
          }
        }
      };

      const debouncedProcess = () => {
        if (pendingImages.size === 0 || isProcessing) return;

        isProcessing = true;
        const imagesToProcess = [...pendingImages];
        pendingImages.clear();

        // 限制并发处理数量
        const batchSize = Math.min(window.JEV.CFG.maxConcurrency, 3);
        const batches = [];

        // 优先处理较小的图片
        imagesToProcess.sort((a, b) => {
          const sizeA = (a.naturalWidth || 0) * (a.naturalHeight || 0);
          const sizeB = (b.naturalWidth || 0) * (b.naturalHeight || 0);
          return sizeA - sizeB;
        });

        for (let i = 0; i < imagesToProcess.length; i += batchSize) {
          batches.push(imagesToProcess.slice(i, i + batchSize));
        }

        // 串行处理批次
        batches.reduce((promise, batch) => {
          return promise.then(() => {
            return Promise.all(batch.map(img => {
              if (img.dataset.jevHandled === '1') return Promise.resolve();
              img.dataset.jevHandled = '1'; // 先标记为已处理
              return processImage(img).catch(e => console.error('图片处理失败:', e));
            }));
          });
        }, Promise.resolve()).finally(() => {
          isProcessing = false;
          if (pendingImages.size > 0) {
            setTimeout(debouncedProcess, 300);
          }
        });
      };

      // 优化的MutationObserver回调（处理客户消息中的图片和文字）
      const observer = new MutationObserver(mutations => {
        if (!window.JEV.CFG.enabled) return;

        // 快速检查：如果没有新增节点，直接返回
        let hasNewNodes = false;
        for (const mut of mutations) {
          if (mut.addedNodes.length > 0) {
            hasNewNodes = true;
            break;
          }
        }
        if (!hasNewNodes) return;

        let newImagesFound = false;

        mutations.forEach(mut => {
          mut.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // 元素节点
              // 🖼️ 图片识别
              if (node.tagName === 'IMG') {
                // 快速过滤：跳过已处理或过小的图片
                if (!node.dataset.jevHandled &&
                    (node.naturalWidth > 10 || node.naturalHeight > 10) &&
                    isCustomerMessage(node)) {
                  pendingImages.add(node);
                  newImagesFound = true;
                  console.log('[JEV] 检测到客户图片:', node.tagName);
                }
              }
              // 💬 文本识别 - 检查当前节点是否是文字消息
              else {
                // 直接检查是否包含文字消息元素
                const textSelectors = ['.message-text', '[data-testid="msg-text"]', '.chat-text', 'div.message-content', '.message-body', 'span.msg-text'];

                // 先检查当前节点是否匹配文字选择器
                for (const selector of textSelectors) {
                  if (node.matches && node.matches(selector) && isCustomerMessage(node)) {
                    processTextMessage(node);
                    break;
                  }
                }

                // 然后检查子元素中是否有文字消息
                if (node.querySelectorAll) {
                  // 只查找客户消息中的图片
                  const potentialImages = node.querySelectorAll('img:not([data-jev-handled="1"])');
                  for (let i = 0; i < potentialImages.length; i++) {
                    const img = potentialImages[i];
                    // 快速过滤 + 客户消息判断
                    if ((img.naturalWidth > 10 && img.naturalHeight > 10) &&
                        isCustomerMessage(img)) {
                      pendingImages.add(img);
                      newImagesFound = true;
                    }
                  }

                  // 查找客户消息中的文字元素
                  for (const selector of textSelectors) {
                    const textElements = node.querySelectorAll(selector + ':not([data-jev-handled="1"])');
                    for (let i = 0; i < textElements.length; i++) {
                      const textEl = textElements[i];
                      if (isCustomerMessage(textEl)) {
                        processTextMessage(textEl);
                      }
                    }
                  }
                }
              }
            }
          });
        });

        // 只有发现新图片时才调度处理
        if (newImagesFound) {
          clearTimeout(processTimer);
          processTimer = setTimeout(debouncedProcess, 300);
        }
      });

      // 保存观察者引用
      window.JEV.STATE.mutationObserver = observer;

      // 最小化监听范围
      observer.observe(chat, {
        childList: true,
        subtree: true
      });

      console.log('[JEV] 👀 正在监听聊天区客户图片和文字:', chat);
      return observer;
    }

    // 添加调试辅助函数（可临时启用验证识别准确性）
    function addDebugHelper() {
      // 仅在debug模式下添加
      if (window.JEV.CFG.debugMode) {
        document.addEventListener('click', e => {
          const textSelectors = ['.message-text', '[data-testid="msg-text"]', '.chat-text', 'div.message-content', '.message-body', 'span.msg-text'];
          const isTextElement = textSelectors.some(selector => e.target.matches && e.target.matches(selector));

          if (e.target.tagName === 'IMG' || isTextElement) {
            const isCustomer = isCustomerMessage(e.target);
            console.log('[JEV-DEBUG] ' + (e.target.tagName === 'IMG' ? 'IMG' : 'TEXT') + ' 信息:', {
              type: e.target.tagName === 'IMG' ? 'image' : 'text',
              content: e.target.tagName === 'IMG' ? (e.target.src || '').substring(0, 100) + '...' : (e.target.innerText || '').substring(0, 50) + '...',
              isCustomerMessage: isCustomer,
              parentClasses: e.target.parentElement ? Array.from(e.target.parentElement.classList) : [],
              grandParentClasses: e.target.parentElement?.parentElement ?
                Array.from(e.target.parentElement.parentElement.classList) : [],
              elementClass: Array.from(e.target.classList)
            });
            // 视觉反馈
            const originalBorder = e.target.style.border;
            e.target.style.border = isCustomer ? '2px solid green' : '2px solid red';
            setTimeout(() => {
              e.target.style.border = originalBorder;
            }, 2000);
          }
        });
      }
    }

    // 初始化
    addDebugHelper();
    return observeChatImages();

  } catch (e) {
    console.error('[JEV] 观察新图片和文字失败:', e);
    window.JEV.logUI('监听图片和文字失败: ' + e.message);
  }
}

// 添加observeNewMessages作为别名，提高兼容性
function observeNewMessages() {
  console.log('[JEV] 使用observeNewMessages()作为observeNewImages()的别名');
  return observeNewImages();
}

// 确保translateTextClient函数暴露到window.JEV对象
if (typeof window.JEV !== 'undefined') {
  window.JEV.translateTextClient = translateTextClient;
  window.JEV.observeNewMessages = observeNewMessages;
}

// 处理单个图片（性能优化版）
async function processImage(img) {
  // 确保logDebug函数可用
  const logDebug = typeof window.JEV.logDebug === 'function' ? window.JEV.logDebug :
                 (...args) => console.log('[JEV-DEBUG]', ...args);

  logDebug('开始处理图片:', img);

  try { // 确保有对应的catch块
    // 快速过滤条件（前置所有检查）
    if (!img || !isVisible(img) || !pickSrc(img)) {
      logDebug('图片不符合处理条件，跳过');
      return;
    }

    // 使用dataset.jevHandled代替jevProcessed，更符合HTML规范
    if (img.dataset.jevHandled) {
      logDebug('图片已处理，跳过');
      return;
    }

    // 立即标记为处理中，防止重复处理
    img.dataset.jevHandled = 'processing';

    // 检查图片尺寸（跳过超大图片）
    if (img.naturalWidth > 4096 || img.naturalHeight > 4096) {
      logDebug('跳过超大图片:', img.naturalWidth, 'x', img.naturalHeight);
      img.dataset.jevHandled = 'skip';
      return;
    }

    // 跳过过小的图片
    if (img.naturalWidth < 20 || img.naturalHeight < 20) {
      logDebug('跳过过小图片:', img.naturalWidth, 'x', img.naturalHeight);
      img.dataset.jevHandled = 'small';
      return;
    }

    // 跳过自己发送的图片（仅处理客户发送的图片）
    const bubble = img.closest('.message-bubble');
    if (bubble && bubble.classList.contains('self')) {
      logDebug('跳过自己发送的图片');
      img.dataset.jevHandled = 'skip';
      return;
    }

    // 检查是否在聊天区
    if (window.JEV.CFG.chatOnly && typeof window.JEV.STATE.isInsideChat === 'function') {
      if (!window.JEV.STATE.isInsideChat(img)) {
        logDebug('图片不在聊天区，跳过');
        img.dataset.jevHandled = 'skip';
        return;
      }
    }

    // 限制并发任务数
    if (window.JEV.STATE.activeTasks >= window.JEV.CFG.maxConcurrency) {
      logDebug('达到并发限制，延迟处理');
      // 稍后重试
      img.dataset.jevHandled = ''; // 清除标记以便重试
      setTimeout(() => processImage(img), 1000);
      return;
    }

    // 增加活跃任务计数
    window.JEV.STATE.activeTasks++;

    try { // 确保有对应的catch块
      // 等待图片加载完成（使用更高效的加载检测）
      if (!img.complete || img.naturalWidth === 0) {
        logDebug('等待图片加载完成');
        await new Promise((resolve) => {
          const onLoadOrError = () => {
            img.onload = null;
            img.onerror = null;
            resolve();
          };
          img.onload = onLoadOrError;
          img.onerror = onLoadOrError;
          setTimeout(onLoadOrError, 2000); // 增加超时时间到2秒
        });
      }

      // 再次检查，确保图片已加载
      if (!img.complete || img.naturalWidth === 0) {
        logDebug('图片加载失败');
        img.dataset.jevHandled = 'error';
        if (typeof showResultBox === 'function') {
          showResultBox({
            ocr_text: '(图片加载失败)',
            translated_text: '无法加载图片内容，请检查图片是否有效'
          });
        }
        return;
      }

      // 捕获图片
      logDebug('开始捕获图片');
      const dataUrl = await captureImgToDataUrl(img);

      // 验证dataUrl的有效性，确保它不是空的且长度合理
      if (!dataUrl || typeof dataUrl !== 'string' || dataUrl.length < 1000) {
        logDebug('图片捕获失败或内容为空，dataUrl长度:', dataUrl ? dataUrl.length : '0');
        img.dataset.jevHandled = 'error';
        if (typeof showResultBox === 'function') {
          showResultBox({
            ocr_text: '(图片捕获失败)',
            translated_text: `识别服务连接失败: 图片捕获失败或内容为空(dataUrl长度: ${dataUrl ? dataUrl.length : '0'})`
          });
        }
        return;
      }

      logDebug('图片捕获成功，dataUrl长度:', dataUrl.length, '开始上传');

      // 同步等待上传结果，确保能获取识别结果并显示
      try { // 确保有对应的catch块
        const result = await uploadBase64(dataUrl, { originalImage: img });
        logDebug('上传完成，获取到结果:', result);

        // 确保showResultBox函数存在
        if (typeof showResultBox === 'function') {
          logDebug('调用showResultBox显示结果');
          showResultBox(result);
          logDebug('结果框显示调用完成');
        } else {
          logDebug('showResultBox函数不存在');
          // 备用方案：直接在控制台打印，方便用户查看
          console.log('[JEV] 识别结果:', result);
        }
      } catch (uploadError) {
        logDebug('上传失败:', uploadError);
        // 即使上传失败也显示错误信息
        if (typeof showResultBox === 'function') {
          showResultBox({
            ocr_text: '(上传失败)',
            translated_text: `识别服务连接失败: ${uploadError.message || '未知错误'}`
          });
        }
      }

      // 标记为已完成
      img.dataset.jevHandled = 'done';
    } finally {
      // 减少活跃任务计数
      window.JEV.STATE.activeTasks--;
    }

  } catch (e) {
    console.error('处理图片失败:', e);
    logDebug('处理图片异常:', e);
    // 出错时标记为错误
    if (img) {
      img.dataset.jevHandled = 'error';
    }
    // 确保减少活跃任务计数
    window.JEV.STATE.activeTasks = Math.max(0, window.JEV.STATE.activeTasks - 1);

    // 显示错误信息
    if (typeof showResultBox === 'function') {
      showResultBox({
        ocr_text: '(处理异常)',
        translated_text: `处理过程出错: ${e.message || '未知错误'}`
      });
    }
  }
}

// 扫描所有图片（优化）
function scanAll() {
  try { // 确保有对应的catch块
    if (!window.JEV.CFG.enabled) return;

    // 优化：使用更高效的选择器组合
    const images = Array.from(document.querySelectorAll(IMG_SELECTORS.join(',')));

    // 优化：限制单次扫描处理的图片数量
    const MAX_SCAN_IMAGES = 50;
    const imagesToProcess = images
      .filter(img => !img.dataset.jevProcessed) // 只处理未处理的图片
      .slice(0, MAX_SCAN_IMAGES); // 限制数量

    // 批量处理，避免一次性处理过多图片
    const batchSize = 5;
    for (let i = 0; i < imagesToProcess.length; i += batchSize) {
      setTimeout(() => {
        const batch = imagesToProcess.slice(i, i + batchSize);
        batch.forEach(img => processImage(img).catch(e => {}));
      }, i * 100); // 错开处理时间
    }

    if (images.length > imagesToProcess.length) {
      console.log(`[JEV] 扫描到${images.length}张图片，本次仅处理${imagesToProcess.length}张`);
    }

  } catch (e) {
    console.error('扫描图片失败:', e);
  }
}

// 内存清理和性能监控（新增）
function cleanupAndOptimize() {
  try { // 确保有对应的catch块
    // 清理过多的已处理图片记录
    if (window.JEV.STATE.processedImages && window.JEV.STATE.processedImages.size > 1000) {
      // 只保留最新的500个
      const newSet = new Set();
      const entries = Array.from(window.JEV.STATE.processedImages);
      for (let i = Math.max(0, entries.length - 500); i < entries.length; i++) {
        newSet.add(entries[i]);
      }
      window.JEV.STATE.processedImages = newSet;
    }

    // 垃圾回收提示（仅在支持时）
    if (window.gc && typeof window.gc === 'function' && Math.random() < 0.1) {
      try { // 确保有对应的catch块
        window.gc();
      } catch (error) { console.error("[JEV] 捕获到错误:", error); }
    }
  } catch (e) {
    console.error('清理优化失败:', e);
  }
}

// 性能监控函数（新增）
function setupPerformanceMonitoring() {
  // 页面可见性变化时调整扫描频率
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.JEV.CFG.pauseWhenHidden) {
      // 页面不可见时，延长扫描间隔
      if (window.JEV.STATE.scanInterval) {
        clearInterval(window.JEV.STATE.scanInterval);
        window.JEV.STATE.scanInterval = setInterval(() => {
          if (window.JEV.CFG.enabled) {
            scanAll();
          }
        }, BG_SCAN_INTERVAL_MS);
      }
    } else if (!document.hidden && window.JEV.CFG.pauseWhenHidden) {
      // 页面可见时，恢复正常扫描间隔
      if (window.JEV.STATE.scanInterval) {
        clearInterval(window.JEV.STATE.scanInterval);
        window.JEV.STATE.scanInterval = setInterval(() => {
          if (window.JEV.CFG.enabled) {
            scanAll();
          }
        }, SCAN_INTERVAL_MS);
      }
    }
  });

  // 定期进行内存清理
  setInterval(cleanupAndOptimize, 60000); // 每分钟清理一次
}

// 主初始化函数（轻量优化版）
function jevInit() {
  try { // 确保有对应的catch块
    // 恢复保存的配置
    const cfg = window.JEV.CFG;
    const state = window.JEV.STATE;

    // 只在需要时获取配置
    cfg.panelW = jevStoreGet('JEV_PANEL_W', 520);
    cfg.panelH = jevStoreGet('JEV_PANEL_H', 240);
    cfg.isAdmin = jevStoreGet('JEV_IS_ADMIN', false);
    cfg.autoPush = jevStoreGet('JEV_AUTO_PUSH', false);
    cfg.chatOnly = jevStoreGet('JEV_CHAT_ONLY', true);
    cfg.chatRootSel = jevStoreGet('JEV_CHAT_ROOT_SEL', '');
    cfg.sendMode = jevStoreGet('JEV_SEND_MODE', 'ui');
    cfg.targetLang = jevStoreGet('JEV_TARGET_LANG', 'zh-CN');

    state.workerUrl = jevStoreGet('JEV_WORKER_URL', '');
    state.webhookSecret = jevStoreGet('JEV_WEBHOOK_SECRET', 'jevindustry2025');

    // 更新isInsideChat函数 - 简化版本
    state.isInsideChat = function(element) {
      try { // 确保有对应的catch块
        // 使用快速DOM检查
        if (!cfg.chatRootSel) return true;
        return element.closest(cfg.chatRootSel) !== null;
      } catch {
        return false;
      }
    };

    // 延迟初始化UI组件
    setTimeout(() => {
      try { // 确保有对应的catch块
        ensurePanel();
      } catch (e) {
        console.error('创建面板失败:', e);
      }
    }, 1000);

    // 进一步延迟创建非关键UI组件
    setTimeout(() => {
      try { // 确保有对应的catch块
        ensureResultBox();
      } catch (e) {
        console.error('创建结果框失败:', e);
      }
    }, 5000);

    // 延迟加载html2canvas - 关键优化！
    window.addEventListener('load', () => {
      // 只在需要时才加载html2canvas
      setTimeout(() => {
        try { // 确保有对应的catch块
          // 先不加载，等到实际需要时再加载
          console.log('[JEV] 页面加载完成，准备就绪');
        } catch (e) {
          console.error('延迟加载失败:', e);
        }
      }, 2000);
    }, { once: true });

    // 开始观察新图片 - 使用优化的监听范围
    setTimeout(observeNewImages, 2000);

    // 延迟扫描现有图片
    setTimeout(scanAll, 4000);

    // 设置定期扫描 - 更长的间隔
    state.scanInterval = setInterval(() => {
      if (cfg.enabled && !document.hidden) {
        scanAll();
      }
    }, SCAN_INTERVAL_MS);

    // 设置性能监控和优化
    setupPerformanceMonitoring();

    // 延迟显示初始化完成信息
    setTimeout(() => {
      window.JEV.logUI('✅ JEV嘉尔威跨境插件初始化完成（轻量优化版）');
    }, 500);

  } catch (e) {
    console.error('JEV初始化失败:', e);
    // 避免在初始化阶段过度调用logUI
    console.log('初始化失败:', e.message);
  }
}

// 注册DOMContentLoaded事件
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', jevInit);
} else {
  // 如果DOM已经加载完成，延迟初始化
  setTimeout(jevInit, 500); // 增加延迟，让页面完全加载
}

// 暴露关键函数到window对象
window.ensurePanel = ensurePanel;
// 延迟暴露sendViaUI，确保函数已定义
setTimeout(() => {
  try { // 确保有对应的catch块
    window.sendViaUI = typeof sendViaUI === 'function' ? sendViaUI : function() { console.error('sendViaUI not initialized yet'); };
    console.log('[JEV] sendViaUI函数已暴露到window对象');
  } catch (e) {
    console.error('[JEV] 暴露sendViaUI失败:', e);
    // 添加安全的兜底函数
    window.sendViaUI = window.sendViaUI || function() { console.error('sendViaUI fallback function called'); return false; };
  }
}, 100);
window.JEV.sendViaWorker = sendViaWorker;
window.JEV.translateTextClient = translateTextClient;
window.JEV.uploadBase64 = uploadBase64;
window.JEV.scanAll = scanAll;

// 暴露性能状态检查函数
window.JEV_CAPTURE = window.JEV_CAPTURE || {};
window.JEV_CAPTURE.status = function() {
  return {
    enabled: window.JEV.CFG.enabled,
    active: window.JEV.STATE.activeTasks,
    queued: jevLogQueue.length,
    maxConcurrency: window.JEV.CFG.maxConcurrency,
    scanInterval: SCAN_INTERVAL_MS,
    processedImages: window.JEV.STATE.processedImages.size
  };
};

window.JEV_CAPTURE.setEnabled = function(enabled) {
  window.JEV.CFG.enabled = enabled;
  return enabled;
};

// 添加控制台使用说明
console.log('=======================================');
console.log('🖼️ JEV嘉尔威跨境插件 - 轻量优化版');
console.log('---------------------------------------');
console.log('📌 window.ensurePanel() - 创建主面板');
console.log('📌 window.JEV.logUI("消息") - 输出日志到面板');
console.log('📌 window.JEV.CFG - 配置对象');
console.log('📌 window.JEV.scanAll() - 立即扫描所有图片');
console.log('📌 window.JEV_CAPTURE.status() - 查看性能状态');
console.log('=======================================');
console.log('💡 性能优化提示：使用 performance.monitor() 监控性能');

// 🧠 JEV 一体化统一窗口模块 - 整合OCR翻译和聊天功能
(function() {
    // 配置常量
    const WORKER_BASE = window.JEV?.CFG?.workerBase || "https://jevshop.bensonlove1986.workers.dev";
    
    // 存储窗口元素
    let jevWindow = null;
    let messageContainer = null;
    let translationContainer = null;
    let messageInput = null;
    let sendButton = null;
    let modeToggle = null;
    let currentMode = 'ai'; // 默认AI模式
    let autoTranslateEnabled = true;
    
    // 初始化函数
    function init() {
        // 确保window对象存在
        if (!window) return;
        
        // 确保JEV对象存在
        if (!window.JEV) {
            window.JEV = {};
        }
        
        // 确保STATE对象存在
        if (!window.JEV.STATE) {
            window.JEV.STATE = {};
        }
        
        // 暴露公共函数
        window.ensurePanel = ensurePanel;
        window.renderFlags = renderFlags;
        window.createUnifiedWindow = createUnifiedWindow;
        window.processImageToWorker = processImageToWorker;
        
        // 添加到JEV对象
        window.JEV.ensurePanel = ensurePanel;
        window.JEV.renderFlags = renderFlags;
        window.JEV.createUnifiedWindow = createUnifiedWindow;
        
        // 保持向后兼容
        window.createJEVChatWindow = createUnifiedWindow;
    }
    
    // 将统一窗口创建功能添加到JEV对象
    if (window.JEV) {
        window.JEV.createUnifiedWindow = function() {
            // 避免重复创建
            if (jevWindow) {
                jevWindow.style.display = 'block';
                return jevWindow;
            }
            
            // 创建主窗口
            jevWindow = document.createElement('div');
            jevWindow.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 480px;
                height: 600px;
                background-color: #1a1a1a;
                border: 2px solid #4CAF50;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                font-family: 'Consolas', 'Monaco', monospace;
            `;
            
            // 创建标题栏
            const header = document.createElement('div');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                background-color: #2a2a2a;
                border-bottom: 2px solid #4CAF50;
                border-radius: 8px 8px 0 0;
                position: relative;
            `;
            
            const title = document.createElement('h3');
            title.textContent = '🤖 JEV 一体化系统';
            title.style.cssText = `
                color: #4CAF50;
                margin: 0;
                font-size: 16px;
                font-weight: bold;
            `;
            
            // 创建模式切换按钮组
            const modeControls = document.createElement('div');
            modeControls.style.cssText = `
                display: flex;
                gap: 8px;
                position: absolute;
                top: 12px;
                left: 150px;
            `;
            
            // 创建AI/人工模式切换按钮
            modeToggle = document.createElement('button');
            modeToggle.textContent = '🤖 AI模式';
            modeToggle.style.cssText = `
                padding: 4px 8px;
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
            `;
            modeToggle.onclick = toggleMode;
            modeControls.appendChild(modeToggle);
            
            // 创建自动翻译开关
            const translateToggle = document.createElement('button');
            translateToggle.textContent = '🌐 自动翻译: 开';
            translateToggle.style.cssText = `
                padding: 4px 8px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
            `;
            translateToggle.onclick = () => {
                autoTranslateEnabled = !autoTranslateEnabled;
                translateToggle.textContent = `🌐 自动翻译: ${autoTranslateEnabled ? '开' : '关'}`;
                translateToggle.style.backgroundColor = autoTranslateEnabled ? '#4CAF50' : '#FF9800';
                addMessage('system', `自动翻译已${autoTranslateEnabled ? '开启' : '关闭'}`);
            };
            modeControls.appendChild(translateToggle);
            header.appendChild(modeControls);
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '✕';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: #ff6b6b;
                font-size: 18px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background-color 0.2s;
            `;
            closeBtn.onclick = () => {
                jevWindow.style.display = 'none';
            };
            closeBtn.onmouseover = () => {
                closeBtn.style.backgroundColor = 'rgba(255, 107, 107, 0.2)';
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.backgroundColor = 'transparent';
            };
            
            header.appendChild(title);
            header.appendChild(closeBtn);
            jevWindow.appendChild(header);
            
            // 创建内容区域
            const content = document.createElement('div');
            content.style.cssText = `
                flex: 1;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            `;
            
            // 创建OCR+翻译结果区域
            translationContainer = document.createElement('div');
            translationContainer.style.cssText = `
                padding: 12px;
                background-color: #222;
                border-bottom: 1px solid #4CAF50;
                max-height: 200px;
                overflow-y: auto;
                color: #ddd;
                font-size: 14px;
            `;
            translationContainer.innerHTML = '<div style="color: #888; text-align: center; margin: 20px 0;">📊 OCR + 翻译结果将显示在这里</div>';
            
            // 创建聊天消息区域
            messageContainer = document.createElement('div');
            messageContainer.style.cssText = `
                flex: 1;
                padding: 12px;
                overflow-y: auto;
                background-color: #1a1a1a;
            `;
            
            // 创建输入区域
            const inputArea = document.createElement('div');
            inputArea.style.cssText = `
                padding: 12px;
                background-color: #2a2a2a;
                border-top: 2px solid #4CAF50;
                display: flex;
                gap: 8px;
            `;
            
            // 添加文件上传按钮
            const uploadButton = document.createElement('button');
            uploadButton.textContent = '📎';
            uploadButton.style.cssText = `
                padding: 8px 12px;
                background-color: #333;
                color: #4CAF50;
                border: 1px solid #555;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: background-color 0.2s;
            `;
            uploadButton.onmouseover = () => uploadButton.style.backgroundColor = '#444';
            uploadButton.onmouseout = () => uploadButton.style.backgroundColor = '#333';
            
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (typeof processImageToWorker === 'function') {
                        processImageToWorker(file);
                    } else {
                        this.logUI('[JEV] processImageToWorker函数未找到');
                    }
                    fileInput.value = ''; // 清空文件输入
                }
            };
            
            uploadButton.onclick = () => fileInput.click();
            
            messageInput = document.createElement('input');
            messageInput.id = 'jev-message-input';
            messageInput.type = 'text';
            messageInput.placeholder = '输入消息...';
            messageInput.style.cssText = `
                flex: 1;
                padding: 8px 12px;
                background-color: #333;
                border: 1px solid #555;
                border-radius: 4px;
                color: #fff;
                font-size: 14px;
            `;
            messageInput.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            };
            
            sendButton = document.createElement('button');
            sendButton.textContent = '发送';
            sendButton.style.cssText = `
                padding: 8px 16px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            `;
            sendButton.onclick = sendMessage;
            sendButton.onmouseover = () => {
                sendButton.style.backgroundColor = '#45a049';
            };
            sendButton.onmouseout = () => {
                sendButton.style.backgroundColor = '#4CAF50';
            };
            
            // 组装输入区域
            inputArea.appendChild(uploadButton);
            inputArea.appendChild(messageInput);
            inputArea.appendChild(sendButton);
            inputArea.appendChild(fileInput);
            
            // 组装内容区域
            content.appendChild(translationContainer);
            content.appendChild(messageContainer);
            jevWindow.appendChild(content);
            jevWindow.appendChild(inputArea);
            
            // 添加到文档
            document.body.appendChild(jevWindow);
            
            // 添加系统欢迎消息
            if (typeof addMessage === 'function') {
                addMessage('system', '🎉 JEV一体化系统已启动');
                addMessage('system', '💡 提示：点击📎按钮上传图片进行OCR识别和翻译');
            }
            
            return jevWindow;
        };
    }

    // 创建统一窗口 - 整合OCR翻译和聊天功能（保留原函数名以兼容现有代码）
    function createUnifiedWindow() {
        if (window.JEV && typeof window.JEV.createUnifiedWindow === 'function') {
            return window.JEV.createUnifiedWindow();
        }
        // 避免重复创建
        if (jevWindow) {
            jevWindow.style.display = 'block';
            return jevWindow;
        }
        
        // 创建主窗口
        jevWindow = document.createElement('div');
        jevWindow.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 480px;
            height: 600px;
            background-color: #1a1a1a;
            border: 2px solid #4CAF50;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            font-family: 'Consolas', 'Monaco', monospace;
        `;
        
        // 创建标题栏
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background-color: #2a2a2a;
            border-bottom: 2px solid #4CAF50;
            border-radius: 8px 8px 0 0;
            position: relative;
        `;
        
        const title = document.createElement('h3');
        title.textContent = '🤖 JEV 一体化系统';
        title.style.cssText = `
            color: #4CAF50;
            margin: 0;
            font-size: 16px;
            font-weight: bold;
        `;
        
        // 创建模式切换按钮组
        const modeControls = document.createElement('div');
        modeControls.style.cssText = `
            display: flex;
            gap: 8px;
            position: absolute;
            top: 12px;
            left: 150px;
        `;
        
        // 创建AI/人工模式切换按钮
        modeToggle = document.createElement('button');
        modeToggle.textContent = '🤖 AI模式';
        modeToggle.style.cssText = `
            padding: 4px 8px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        `;
        modeToggle.onclick = toggleMode;
        modeControls.appendChild(modeToggle);
        
        // 创建自动翻译开关
        const translateToggle = document.createElement('button');
        translateToggle.textContent = '🌐 自动翻译: 开';
        translateToggle.style.cssText = `
            padding: 4px 8px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        `;
        translateToggle.onclick = () => {
            autoTranslateEnabled = !autoTranslateEnabled;
            translateToggle.textContent = `🌐 自动翻译: ${autoTranslateEnabled ? '开' : '关'}`;
            translateToggle.style.backgroundColor = autoTranslateEnabled ? '#4CAF50' : '#FF9800';
            addMessage('system', `自动翻译已${autoTranslateEnabled ? '开启' : '关闭'}`);
        };
        modeControls.appendChild(translateToggle);
        header.appendChild(modeControls);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #ff6b6b;
            font-size: 18px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background-color 0.2s;
        `;
        closeBtn.onclick = () => {
            jevWindow.style.display = 'none';
        };
        closeBtn.onmouseover = () => {
            closeBtn.style.backgroundColor = 'rgba(255, 107, 107, 0.2)';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.backgroundColor = 'transparent';
        };
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        jevWindow.appendChild(header);
        
        // 创建内容区域
        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // 创建OCR+翻译结果区域
        translationContainer = document.createElement('div');
        translationContainer.style.cssText = `
            padding: 12px;
            background-color: #222;
            border-bottom: 1px solid #4CAF50;
            max-height: 200px;
            overflow-y: auto;
            color: #ddd;
            font-size: 14px;
        `;
        translationContainer.innerHTML = '<div style="color: #888; text-align: center; margin: 20px 0;">📊 OCR + 翻译结果将显示在这里</div>';
        
        // 创建聊天消息区域
        messageContainer = document.createElement('div');
        messageContainer.style.cssText = `
            flex: 1;
            padding: 12px;
            overflow-y: auto;
            background-color: #1a1a1a;
        `;
        
        // 创建输入区域
        const inputArea = document.createElement('div');
        inputArea.style.cssText = `
            padding: 12px;
            background-color: #2a2a2a;
            border-top: 2px solid #4CAF50;
            display: flex;
            gap: 8px;
        `;
        
        // 添加文件上传按钮
        const uploadButton = document.createElement('button');
        uploadButton.textContent = '📎';
        uploadButton.style.cssText = `
            padding: 8px 12px;
            background-color: #333;
            color: #4CAF50;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            transition: background-color 0.2s;
        `;
        uploadButton.onmouseover = () => uploadButton.style.backgroundColor = '#444';
        uploadButton.onmouseout = () => uploadButton.style.backgroundColor = '#333';
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                processImageToWorker(file);
                fileInput.value = ''; // 清空文件输入
            }
        };
        
        uploadButton.onclick = () => fileInput.click();
        
        messageInput = document.createElement('input');
        messageInput.type = 'text';
        messageInput.placeholder = '输入消息...';
        messageInput.style.cssText = `
            flex: 1;
            padding: 8px 12px;
            background-color: #333;
            border: 1px solid #555;
            border-radius: 4px;
            color: #fff;
            font-size: 14px;
        `;
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        };
        
        sendButton = document.createElement('button');
        sendButton.textContent = '发送';
        sendButton.style.cssText = `
            padding: 8px 16px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        `;
        sendButton.onclick = sendMessage;
        sendButton.onmouseover = () => {
            sendButton.style.backgroundColor = '#45a049';
        };
        sendButton.onmouseout = () => {
            sendButton.style.backgroundColor = '#4CAF50';
        };
        
        // 组装输入区域
        inputArea.appendChild(uploadButton);
        inputArea.appendChild(messageInput);
        inputArea.appendChild(sendButton);
        inputArea.appendChild(fileInput);
        
        // 组装内容区域
        content.appendChild(translationContainer);
        content.appendChild(messageContainer);
        jevWindow.appendChild(content);
        jevWindow.appendChild(inputArea);
        
        // 添加到文档
        document.body.appendChild(jevWindow);
        
        // 添加系统欢迎消息
        addMessage('system', '🎉 JEV一体化系统已启动');
        addMessage('system', '💡 提示：点击📎按钮上传图片进行OCR识别和翻译');
        
        return jevWindow;
    }
    
    // 切换AI/人工模式
    function toggleMode() {
        currentMode = currentMode === 'ai' ? 'human' : 'ai';
        modeToggle.textContent = currentMode === 'ai' ? '🤖 AI模式' : '👤 人工模式';
        modeToggle.style.backgroundColor = currentMode === 'ai' ? '#2196F3' : '#FF9800';
        
        addMessage('system', `已切换到${currentMode === 'ai' ? '🤖 AI模式' : '👤 人工模式'}`);
    }
    
    // 添加消息到聊天窗口 - 整合到JEV对象中
    if (window.JEV) {
        window.JEV.addMessage = function(sender, text) {
            const container = this.getMessageContainer();
            if (!container) return;
            
            const message = document.createElement('div');
            message.style.cssText = `
                margin-bottom: 12px;
                padding: 8px 12px;
                border-radius: 6px;
                max-width: 80%;
                word-wrap: break-word;
            `;
            
            if (sender === 'user') {
                message.style.cssText += `
                    margin-left: auto;
                    background-color: #2196F3;
                    color: white;
                `;
                message.innerHTML = `<div style="font-weight: bold; margin-bottom: 4px;">👤 您：</div>${escapeHtml(text)}`;
            } else if (sender === 'ai') {
                message.style.cssText += `
                    background-color: #333;
                    color: #ddd;
                `;
                message.innerHTML = `<div style="font-weight: bold; margin-bottom: 4px;">🤖 AI：</div>${escapeHtml(text)}`;
            } else if (sender === 'system') {
                message.style.cssText += `
                    background-color: #444;
                    color: #4CAF50;
                    font-style: italic;
                    text-align: center;
                    max-width: 100%;
                `;
                message.textContent = text;
            }
            
            container.appendChild(message);
            container.scrollTop = container.scrollHeight;
        };
    }
    
    // 兼容性函数 - 保留原有调用方式
    function addMessage(sender, text) {
        if (window.JEV && typeof window.JEV.addMessage === 'function') {
            window.JEV.addMessage(sender, text);
        } else if (messageContainer) {
            const message = document.createElement('div');
            message.style.cssText = `
                margin-bottom: 12px;
                padding: 8px 12px;
                border-radius: 6px;
                max-width: 80%;
                word-wrap: break-word;
            `;
            
            if (sender === 'user') {
                message.style.cssText += `
                    margin-left: auto;
                    background-color: #2196F3;
                    color: white;
                `;
                message.innerHTML = `<div style="font-weight: bold; margin-bottom: 4px;">👤 您：</div>${escapeHtml(text)}`;
            } else if (sender === 'ai') {
                message.style.cssText += `
                    background-color: #333;
                    color: #ddd;
                `;
                message.innerHTML = `<div style="font-weight: bold; margin-bottom: 4px;">🤖 AI：</div>${escapeHtml(text)}`;
            } else if (sender === 'system') {
                message.style.cssText += `
                    background-color: #444;
                    color: #4CAF50;
                    font-style: italic;
                    text-align: center;
                    max-width: 100%;
                `;
                message.textContent = text;
            }
            
            messageContainer.appendChild(message);
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
    }
    
    // 添加辅助方法到JEV对象
    if (window.JEV) {
        // 获取消息容器
        window.JEV.getMessageContainer = function() {
            // 尝试通过id查找，或者返回全局变量
            return document.getElementById('jev-message-container') || messageContainer;
        };
        
        // 获取消息输入框
        window.JEV.getMessageInput = function() {
            // 尝试通过id查找，或者返回全局变量
            return document.getElementById('jev-message-input') || messageInput;
        };
        
        // 获取当前模式
        window.JEV.getCurrentMode = function() {
            // 返回当前模式，默认为'ai'
            return window.jevCurrentMode || currentMode || 'ai';
        };
        
        // 设置当前模式
        window.JEV.setCurrentMode = function(mode) {
            currentMode = mode;
            window.jevCurrentMode = mode;
        };
        
        // 发送消息 - 整合到JEV对象中
        window.JEV.sendMessage = function(text = null) {
            // 如果没有提供文本，尝试从输入框获取
            let messageText = text;
            if (!messageText) {
                const input = this.getMessageInput();
                if (!input) return;
                messageText = input.value.trim();
                if (!messageText) return;
                input.value = '';
            }
            
            // 添加用户消息
            this.addMessage('user', messageText);
            
            // 获取当前模式
            const mode = this.getCurrentMode() || 'ai';
            
            // 如果是AI模式，调用聊天接口
            if (mode === 'ai') {
                const workerBase = this.getWorkerBase();
                fetch(`${workerBase}/chat-reply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: messageText })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.reply) {
                        this.addMessage('ai', data.reply);
                    } else {
                        this.addMessage('ai', '抱歉，我无法理解您的问题。请尝试用其他方式提问。');
                    }
                })
                .catch(error => {
                    console.error('Chat API error:', error);
                    this.addMessage('ai', '网络错误，请稍后再试。');
                    if (typeof this.logUI === 'function') {
                        this.logUI('聊天接口错误', error.message);
                    }
                });
            } else {
                // 人工模式下的提示
                this.addMessage('ai', '您已切换到人工模式，请等待人工客服回复。');
            }
        }

    
    // 兼容性函数 - 保留原有调用方式
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        
        // 添加用户消息
        addMessage('user', text);
        messageInput.value = '';
        
        // 如果是AI模式，调用聊天接口
        if (currentMode === 'ai') {
            fetch(`${WORKER_BASE}/chat-reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.reply) {
                    addMessage('ai', data.reply);
                } else {
                    addMessage('ai', '抱歉，我无法理解您的问题。请尝试用其他方式提问。');
                }
            })
            .catch(error => {
                console.error('Chat API error:', error);
                addMessage('ai', '网络错误，请稍后再试。');
            });
        } else {
            // 人工模式下的提示
            addMessage('ai', '您已切换到人工模式，请等待人工客服回复。');
        }
    }
    
    // 将图片处理函数整合到JEV对象中
    if (window.JEV) {
        window.JEV.processImageToWorker = function(blob) {
            if (!blob) {
                alert('请选择有效的图片文件');
                return;
            }
            
            // 确保窗口已创建
            if (!jevWindow) {
                if (typeof createUnifiedWindow === 'function') {
                    createUnifiedWindow();
                }
            }
            
            // 显示加载状态
            if (translationContainer) {
                translationContainer.innerHTML = '<div style="color: #4CAF50; text-align: center;">🔄 正在处理图片，请稍候...</div>';
            }
            
            // 获取Worker基础URL
            const workerBase = this.getWorkerBase() || WORKER_BASE;
            
            // 第一步：上传图片 - 修复422错误
            const formData = new FormData();
            formData.append('file', blob); // 使用file字段名，修复422错误
            
            // 不设置Content-Type，让浏览器自动处理
            fetch(`${workerBase}/upload-image`, {
                method: 'POST',
                body: formData,
                credentials: 'include' // 包含cookie以解决可能的CORS问题
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`上传失败: HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.imageUrl) {
                    // 第二步：分析图片
                    return fetch(`${workerBase}/analyze-image`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ imageUrl: data.imageUrl })
                    });
                } else {
                    throw new Error('图片上传失败: 未返回有效的图片URL');
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`分析失败: HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.ocrText && data.translation) {
                    // 更新UI显示OCR和翻译结果
                    if (typeof updateTranslationUI === 'function') {
                        updateTranslationUI(data.ocrText, data.translation);
                    }
                    
                    // 自动向聊天发送翻译结果
                    if (typeof addMessage === 'function') {
                        const summary = `已完成图片识别\n原文: ${data.ocrText.substring(0, 50)}...\n翻译: ${data.translation.substring(0, 50)}...`;
                        addMessage('system', '📷 图片识别完成');
                        addMessage('ai', summary);
                    }
                } else {
                    throw new Error('图片分析失败: 缺少OCR或翻译结果');
                }
            })
            .catch(error => {
                this.logDebug('Image processing error:', error);
                if (translationContainer) {
                    translationContainer.innerHTML = `<div style="color: #ff6b6b; text-align: center;">❌ 处理失败：${error.message}</div>`;
                }
                if (typeof addMessage === 'function') {
                    addMessage('system', `❌ 图片处理失败: ${error.message}`);
                }
            });
        };
    }

    // 处理图片并上传到Worker - 修复422错误（使用file字段名而不是image）（保留原函数名以兼容现有代码）
    function processImageToWorker(blob) {
        if (window.JEV && typeof window.JEV.processImageToWorker === 'function') {
            return window.JEV.processImageToWorker(blob);
        }
        
        if (!blob) {
            alert('请选择有效的图片文件');
            return;
        }
        
        // 确保窗口已创建
        if (!jevWindow) {
            createUnifiedWindow();
        }
        
        // 显示加载状态
        translationContainer.innerHTML = '<div style="color: #4CAF50; text-align: center;">🔄 正在处理图片，请稍候...</div>';
        
        // 第一步：上传图片 - 修复422错误
        const formData = new FormData();
        formData.append('file', blob); // 使用file字段名，修复422错误
        
        // 不设置Content-Type，让浏览器自动处理
        fetch(`${WORKER_BASE}/upload-image`, {
            method: 'POST',
            body: formData,
            credentials: 'include' // 包含cookie以解决可能的CORS问题
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`上传失败: HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.imageUrl) {
                // 第二步：分析图片
                return fetch(`${WORKER_BASE}/analyze-image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ imageUrl: data.imageUrl })
                });
            } else {
                throw new Error('图片上传失败: 未返回有效的图片URL');
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`分析失败: HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.ocrText && data.translation) {
                // 更新UI显示OCR和翻译结果
                updateTranslationUI(data.ocrText, data.translation);
                
                // 自动向聊天发送翻译结果
                const summary = `已完成图片识别\n原文: ${data.ocrText.substring(0, 50)}...\n翻译: ${data.translation.substring(0, 50)}...`;
                addMessage('system', '📷 图片识别完成');
                addMessage('ai', summary);
            } else {
                throw new Error('图片分析失败: 缺少OCR或翻译结果');
            }
        })
        .catch(error => {
            console.error('Image processing error:', error);
            translationContainer.innerHTML = `<div style="color: #ff6b6b; text-align: center;">❌ 处理失败：${error.message}</div>`;
            addMessage('system', `❌ 图片处理失败: ${error.message}`);
        });
    }
    
    // 更新翻译结果UI
    function updateTranslationUI(ocrText, translation) {
        translationContainer.innerHTML = `
            <div style="margin-bottom: 12px;">
                <div style="color: #4CAF50; font-weight: bold; margin-bottom: 4px;">📝 原文：</div>
                <div style="background-color: #333; padding: 8px; border-radius: 4px; color: #ddd; font-family: Arial, sans-serif; max-height: 80px; overflow-y: auto;">${escapeHtml(ocrText)}</div>
            </div>
            <div>
                <div style="color: #4CAF50; font-weight: bold; margin-bottom: 4px;">🌐 翻译：</div>
                <div style="background-color: #333; padding: 8px; border-radius: 4px; color: #fff; font-family: Arial, sans-serif; max-height: 80px; overflow-y: auto;">${escapeHtml(translation)}</div>
            </div>
        `;
    }
    
    // HTML转义函数
    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }
    
    // 初始化模块
    
// 全局UI修复函数
function fixUI() {
  try {
    console.log('[JEV-UI] 执行UI修复...');
    
    // 修复窗口创建冲突
    if (typeof createJevWindow === 'function' && typeof createUnifiedWindow === 'function') {
      console.log('[JEV-UI] 修复窗口创建冲突，将createJevWindow重定向到createUnifiedWindow');
      window.JEV.createJevWindow = createUnifiedWindow;
    }
    
    // 确保面板存在
    if (typeof ensurePanel === 'function') {
      console.log('[JEV-UI] 尝试显示UI面板...');
      ensurePanel();
    } else if (window.JEV && typeof window.JEV.ensurePanel === 'function') {
      console.log('[JEV-UI] 使用JEV对象中的ensurePanel...');
      window.JEV.ensurePanel();
    }
    
    // 修复日志功能
    if (!window.logUI && window.JEV && window.JEV.logUI) {
      window.logUI = window.JEV.logUI;
      console.log('[JEV-UI] 修复logUI全局函数');
    }
    
    // 立即尝试显示面板
    setTimeout(() => {
      if (window.ensurePanel) {
        window.ensurePanel();
      }
    }, 100);
    
  } catch (e) {
    console.error('[JEV-UI] 修复失败:', e);
  }
}

// 自动执行修复
setTimeout(fixUI, 500);


init();


// 自动执行创建统一窗口
setTimeout(() => window.createJEVUnifiedWindow(), 2000);

}
}
)



// 初始化UI元素
function initJevUIElements() {
    window.jevChatOnlyBtn = document.getElementById('chatOnlyBtn') || null;
    window.jevConfigBtn = document.getElementById('configBtn') || null;
    window.jevWebhookSecretInput = document.getElementById('webhookSecretInput') || null;
    window.jevAutoPushInput = document.getElementById('autoPushInput') || null;
    window.jevChatOnlyInput = document.getElementById('chatOnlyInput') || null;
    window.jevChatRootSelInput = document.getElementById('chatRootSelInput') || null;
    window.jevInputSelInput = document.getElementById('inputSelInput') || null;
    window.jevSettingsDiv = document.getElementById('settingsDiv') || null;
    
    console.log('[JEV] UI元素初始化完成');
}

// 在DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJevUIElements);
} else {
    initJevUIElements();
}