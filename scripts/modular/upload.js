/**
 * 上传模块
 * 负责文件/图片上传功能
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';

class UploadModule {
  constructor() {
    this._stats = {
      totalUploads: 0,
      successfulUploads: 0,
      failedUploads: 0,
      totalSize: 0,
      averageSpeed: 0
    };
    
    this._fileInput = null;
    this._statusElement = null;
  }

  /**
   * 模块初始化逻辑
   */
  async init() {
    try {
      logger.info('上传模块初始化开始');
      
      // 确保配置存在
      if (!config.get('upload')) {
        config.set('upload', {
          baseUrl: 'http://localhost:8000/upload',
          timeout: 30000,
          maxRetries: 3,
          fileFieldName: 'file'
        });
      }
      
      logger.info('上传模块初始化完成');
      return true;
    } catch (error) {
      logger.error('上传模块初始化失败', error);
      return false;
    }
  }

  /**
   * UI初始化方法
   */
  async initUI() {
    try {
      logger.info('上传模块UI初始化开始');
      
      // 确保存在全局容器
      let panel = document.querySelector('#jevPanel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'jevPanel';
        panel.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          padding: 16px;
        `;
        document.body.appendChild(panel);
      }
      
      // 创建上传按钮
      const uploadBtn = document.createElement('button');
      uploadBtn.id = 'jevUploadBtn';
      uploadBtn.innerText = '上传文件';
      uploadBtn.style.cssText = `
        padding: 8px 16px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 8px;
      `;
      
      // 创建隐藏的文件输入
      this._fileInput = document.createElement('input');
      this._fileInput.type = 'file';
      this._fileInput.style.display = 'none';
      this._fileInput.accept = 'image/*,.pdf,.doc,.docx,.txt';
      
      // 创建状态提示区
      this._statusElement = document.createElement('div');
      this._statusElement.id = 'jevUploadStatus';
      this._statusElement.style.cssText = `
        margin-top: 12px;
        padding: 8px;
        background: #f5f5f5;
        border-radius: 4px;
        font-size: 12px;
        min-height: 20px;
        color: #666;
      `;
      
      // 添加事件监听
      uploadBtn.addEventListener('click', () => this._fileInput.click());
      this._fileInput.addEventListener('change', (e) => this._handleFileSelect(e));
      
      // 添加到面板
      panel.appendChild(uploadBtn);
      panel.appendChild(this._fileInput);
      panel.appendChild(this._statusElement);
      
      logger.info('上传模块UI初始化完成');
      return true;
    } catch (error) {
      logger.error('上传模块UI初始化失败', error);
      return false;
    }
  }

  /**
   * 执行核心功能
   * @param {Object} data - 包含文件或上传选项的数据
   */
  async run(data = {}) {
    try {
      logger.info('执行上传功能', { data });
      
      let file = data.file;
      if (!file && data.fileInput) {
        file = data.fileInput.files[0];
      }
      
      if (!file) {
        throw new Error('未提供文件');
      }
      
      // 显示上传状态
      this._updateStatus(`正在上传: ${file.name}...`);
      
      // 执行上传
      const result = await this._uploadFile(file, data.options || {});
      
      // 更新状态
      this._updateStatus(`上传成功: ${file.name}`);
      
      logger.info('上传功能执行完成', { result });
      return result;
    } catch (error) {
      logger.error('上传功能执行失败', error);
      this._updateStatus(`上传失败: ${error.message}`, true);
      throw error;
    }
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      logger.info('上传模块清理开始');
      
      // 移除事件监听
      if (this._fileInput) {
        this._fileInput.removeEventListener('change', this._handleFileSelect);
      }
      
      // 移除UI元素
      const uploadBtn = document.querySelector('#jevUploadBtn');
      const statusElement = document.querySelector('#jevUploadStatus');
      if (uploadBtn && uploadBtn.parentNode) uploadBtn.parentNode.removeChild(uploadBtn);
      if (statusElement && statusElement.parentNode) statusElement.parentNode.removeChild(statusElement);
      if (this._fileInput && this._fileInput.parentNode) this._fileInput.parentNode.removeChild(this._fileInput);
      
      // 重置状态
      this._stats = {
        totalUploads: 0,
        successfulUploads: 0,
        failedUploads: 0,
        totalSize: 0,
        averageSpeed: 0
      };
      
      logger.info('上传模块清理完成');
      return true;
    } catch (error) {
      logger.error('上传模块清理失败', error);
      return false;
    }
  }

  /**
   * 处理文件选择
   * @private
   */
  _handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.run({ file });
    }
  }

  /**
   * 上传文件
   * @private
   */
  async _uploadFile(file, options) {
    this._stats.totalUploads++;
    const startTime = Date.now();
    
    try {
      const uploadOptions = {
        ...config.get('upload'),
        ...options
      };
      
      // 创建FormData
      const formData = new FormData();
      formData.append(uploadOptions.fileFieldName, file);
      
      // 添加自定义字段
      if (options.fields) {
        Object.entries(options.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      
      // 设置超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), uploadOptions.timeout);
      
      const response = await fetch(uploadOptions.baseUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        credentials: 'include'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`上传失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 更新统计信息
      this._stats.successfulUploads++;
      this._stats.totalSize += file.size;
      const duration = Date.now() - startTime;
      this._stats.averageSpeed = (file.size / duration) * 1000;
      
      return result;
    } catch (error) {
      this._stats.failedUploads++;
      throw error;
    }
  }

  /**
   * 更新状态显示
   * @private
   */
  _updateStatus(message, isError = false) {
    if (this._statusElement) {
      this._statusElement.textContent = message;
      this._statusElement.style.color = isError ? '#f44336' : '#666';
      
      // 如果是成功消息，3秒后清除
      if (!isError) {
        setTimeout(() => {
          if (this._statusElement) {
            this._statusElement.textContent = '';
          }
        }, 3000);
      }
    }
  }

  /**
   * 获取上传统计
   */
  getStats() {
    return { ...this._stats };
  }
}

// 创建模块实例
const uploadModule = new UploadModule();

// 注册模块
if (typeof JEV !== 'undefined' && JEV.Modules) {
  JEV.Modules.register('upload', uploadModule);
}

export default uploadModule;