/**
 * 主应用模块
 * 整合所有子模块，提供统一的应用接口
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';
import uploader from './uploader.js';
import worker from './worker.js';
import legacyUI from './ui.js'; // 保留老的UI模块用于兼容
import translate from './translate.js';
import uiManager from '../components/UIManager.js'; // 新的UI管理器

class JEVApp {
  constructor() {
    // 应用状态
    this.state = {
      initialized: false,
      isActive: false,
      currentMode: 'normal',
      lastError: null
    };
    
    // 模块引用
    this.modules = {
      config,
      logger,
      utils,
      uploader,
      worker,
      legacyUI,
      translate
    };
    
    // 使用新的UI管理器
    this.ui = uiManager;
  }
  
  /**
   * 初始化应用
   * @param {Object} [initialConfig] - 初始配置
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async initialize(initialConfig = {}) {
    try {
      logger.info('开始初始化JEV应用');
      
      // 合并初始配置
      if (Object.keys(initialConfig).length > 0) {
        config.update(initialConfig);
      }
      
      // 初始化新的UI管理器
      await this.ui.initialize();
      logger.info('新UI管理器初始化完成');
      
      // 初始化各个模块
      await this._initializeModules();
      
      // 设置应用状态
      this.state.initialized = true;
      this.state.isActive = true;
      
      logger.info('JEV应用初始化完成');
      return true;
    } catch (error) {
      logger.error('JEV应用初始化失败', error);
      this.state.lastError = error;
      return false;
    }
  }
  
  /**
   * 初始化各个模块
   * @private
   * @returns {Promise<void>}
   */
  async _initializeModules() {
    // 初始化顺序很重要，依赖关系：config -> logger -> 其他模块
    
    // 确保配置模块已初始化
    config.initialize();
    
    // 初始化旧UI模块（兼容）
    legacyUI.initJevUIElements();
    legacyUI.fixUI();
    
    // 初始化翻译模块
    if (translate.initialize) {
      await translate.initialize();
      logger.info('翻译模块初始化完成');
    }
    
    // 检查Worker状态
    const workerStatus = await worker.checkStatus();
    if (workerStatus) {
      logger.info('Worker服务可用');
    } else {
      logger.warn('Worker服务不可用，部分功能可能受限');
    }
    
    // 记录初始化完成的模块
    logger.info('模块初始化完成', { 
      modules: Object.keys(this.modules).join(', ') 
    });
  }
  
  /**
   * 处理图片上传和翻译
   * @param {File|Blob|string} imageData - 图片数据
   * @param {Object} [options] - 处理选项
   * @returns {Promise<Object>} 处理结果
   */
  async processImage(imageData, options = {}) {
    try {
      // 验证应用是否已初始化
      if (!this.state.initialized) {
        await this.initialize();
      }
      
      logger.info('开始处理图片');
      
      // 合并默认选项
      const processOptions = {
        upload: true,
        ocr: true,
        translate: true,
        ...options
      };
      
      let result = {};
      
      // 上传图片（如果需要）
      if (processOptions.upload) {
        const uploadResult = await this._uploadImage(imageData, processOptions);
        result.upload = uploadResult;
      }
      
      // 处理图片（通过Worker）
      if (processOptions.ocr || processOptions.translate) {
        const workerResult = await this._processImageWithWorker(imageData, processOptions);
        result = { ...result, ...workerResult };
      }
      
      logger.info('图片处理完成', { hasOcr: !!result.ocr, hasTranslation: !!result.translation });
      return result;
    } catch (error) {
      logger.error('图片处理失败', error);
      throw error;
    }
  }
  
  /**
   * 上传图片
   * @private
   * @param {File|Blob|string} imageData - 图片数据
   * @param {Object} options - 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async _uploadImage(imageData, options) {
    try {
      const uploadOptions = {
        baseUrl: options.uploadUrl || config.get('upload.baseUrl'),
        timeout: options.uploadTimeout || config.get('upload.timeout'),
        maxRetries: options.maxRetries || config.get('upload.maxRetries'),
        ...options.uploadOptions
      };
      
      // 确保设置了文件字段名（修复422错误）
      uploadOptions.fileFieldName = uploadOptions.fileFieldName || 'file';
      
      const result = await uploader.upload(imageData, uploadOptions);
      return result;
    } catch (error) {
      // 如果上传失败但不是强制的，可以继续处理
      if (options.uploadRequired !== true) {
        logger.warn('图片上传失败，继续处理', error);
        return { success: false, error: error.message };
      }
      throw error;
    }
  }
  
  /**
   * 通过Worker处理图片
   * @private
   * @param {File|Blob|string} imageData - 图片数据
   * @param {Object} options - 处理选项
   * @returns {Promise<Object>} 处理结果
   */
  async _processImageWithWorker(imageData, options) {
    try {
      // 准备处理选项
      const processOptions = {
        quality: options.quality || 0.9,
        maxWidth: options.maxWidth || 1024,
        maxHeight: options.maxHeight || 1024,
        format: options.format || 'jpeg',
        timeout: options.workerTimeout || config.get('worker.timeout', 60000),
        ...options.workerOptions
      };
      
      // 如果需要OCR或翻译
      if (options.ocr || options.translate) {
        const workerResult = await worker.processImage(imageData, processOptions);
        
        // 整理结果
        const result = {};
        
        if (workerResult.ocr) {
          result.ocr = workerResult.ocr;
        }
        
        if (workerResult.translation || workerResult.translated) {
          result.translation = workerResult.translation || workerResult.translated;
        }
        
        return result;
      }
      
      return {};
    } catch (error) {
      logger.error('Worker处理图片失败', error);
      
      // 如果处理失败但不是强制的，可以返回部分结果
      if (options.workerRequired !== true) {
        return { success: false, error: error.message };
      }
      throw error;
    }
  }
  
  /**
   * 处理翻译请求
   * @param {string} text - 要翻译的文本
   * @param {Object} [options] - 翻译选项
   * @returns {Promise<Object>} 翻译结果
   */
  async translateText(text, options = {}) {
    try {
      // 验证应用是否已初始化
      if (!this.state.initialized) {
        await this.initialize();
      }
      
      logger.info('开始翻译文本');
      
      // 合并默认选项
      const translateOptions = {
        from: options.from || 'auto',
        to: options.to || 'zh-CN',
        ...options
      };
      
      // 调用Worker进行翻译
      const result = await worker.callWorker('translate', {
        text,
        ...translateOptions
      });
      
      logger.info('文本翻译完成');
      return result;
    } catch (error) {
      logger.error('文本翻译失败', error);
      throw error;
    }
  }
  
  /**
   * 创建统一的JEV窗口
   * @returns {HTMLElement|null} 创建的窗口元素
   */
  createJEVUnifiedWindow() {
    try {
      logger.info('创建JEV统一窗口');
      
      // 检查是否已存在窗口
      if (document.getElementById('jev-unified-window')) {
        logger.warn('JEV统一窗口已存在');
        return document.getElementById('jev-unified-window');
      }
      
      // 使用新的Panel组件创建窗口
      const panel = this.ui.createPanel({
        id: 'jev-unified-window',
        title: 'JEV 助手',
        width: 300,
        height: 400,
        position: 'bottom-right',
        draggable: true,
        closeable: true,
        content: document.createElement('div')
      });
      
      panel.initialize().then(() => {
        // 添加基本功能按钮
        const featuresContainer = document.createElement('div');
        featuresContainer.className = 'jev-features';
        
        // 图片处理按钮
        const imageProcessBtn = this.ui.createButton({
          text: '图片处理',
          type: 'default',
          onClick: () => {
            this._openImageProcessDialog();
          }
        });
        imageProcessBtn.initialize().then(() => {
          imageProcessBtn.element.style.width = '100%';
          imageProcessBtn.element.style.marginBottom = '10px';
          featuresContainer.appendChild(imageProcessBtn.element);
        });
        
        // 文本翻译按钮
        const translateBtn = this.ui.createButton({
          text: '文本翻译',
          type: 'default',
          onClick: () => {
            this._openTranslateDialog();
          }
        });
        translateBtn.initialize().then(() => {
          translateBtn.element.style.width = '100%';
          translateBtn.element.style.marginBottom = '10px';
          featuresContainer.appendChild(translateBtn.element);
        });
        
        // 统计信息按钮
        const statsBtn = this.ui.createButton({
          text: '统计信息',
          type: 'default',
          onClick: () => {
            this._showStats();
          }
        });
        statsBtn.initialize().then(() => {
          statsBtn.element.style.width = '100%';
          featuresContainer.appendChild(statsBtn.element);
        });
        
        // 添加到面板内容
        const contentElement = panel.element.querySelector('.jev-panel-content');
        contentElement.appendChild(featuresContainer);
        
        // 挂载面板
        panel.mount();
      });
      
      logger.info('JEV统一窗口创建成功');
      return panel.element;
    } catch (error) {
      logger.error('创建JEV统一窗口失败', error);
      return null;
    }
  }
  
  /**
   * 打开图片处理对话框
   * @private
   */
  async _openImageProcessDialog() {
    try {
      // 创建文件输入
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
          try {
            // 创建进度条组件
            const progressBar = this.ui.createProgressBar({
              label: '处理进度',
              showPercentage: true
            });
            await progressBar.initialize();
            
            // 创建进度对话框
            const progressDialog = this.ui.createDialog({
              title: '处理中',
              content: document.createElement('div'),
              closeable: false,
              buttons: []
            });
            
            await progressDialog.initialize();
            
            // 将进度条添加到对话框内容中
            const contentElement = progressDialog.element.querySelector('.jev-dialog-content');
            contentElement.appendChild(progressBar.element);
            
            progressDialog.mount();
            progressDialog.open();
            
            // 更新进度
            progressBar.update(10, '正在解析图片...');
            
            // 处理图片
            const result = await this.processImage(file);
            
            progressBar.update(70, '正在生成结果...');
            
            // 延迟显示最终结果
            await new Promise(resolve => setTimeout(resolve, 500));
            progressBar.update(100, '处理完成');
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 关闭进度对话框
            progressDialog.close();
            
            // 准备结果内容
            let resultContent = '';
            let resultText = '';
            
            if (result.translation) {
              resultContent = '<div class="jev-mb-md"><strong>翻译结果:</strong> ' + result.translation + '</div>';
              resultText = result.translation;
            } else if (result.ocr) {
              resultContent = '<div class="jev-mb-md"><strong>OCR结果:</strong> ' + result.ocr + '</div>';
              resultText = result.ocr;
            } else {
              resultContent = '<div class="jev-mb-md">图片处理成功，但没有识别到文本</div>';
            }
            
            // 显示结果对话框
            const resultDialog = this.ui.createDialog({
              title: '处理结果',
              content: resultContent,
              buttons: [
                {
                  text: '关闭',
                  onClick: () => resultDialog.close()
                }
              ]
            });
            
            await resultDialog.initialize();
            resultDialog.mount();
            resultDialog.open();
            
          } catch (error) {
            logger.error('图片处理失败', error);
            this.ui.showMessage('图片处理失败: ' + error.message, {
              type: 'error',
              duration: 5000
            });
          }
        }
      });
      
      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
    } catch (error) {
      logger.error('打开图片处理对话框失败', error);
    }
  }
  
  /**
   * 打开翻译对话框
   * @private
   */
  async _openTranslateDialog() {
    try {
      const result = await this.ui.showInputDialog({
        title: '文本翻译',
        placeholder: '请输入要翻译的文本',
        validate: (value) => {
          if (!value.trim()) {
            return '请输入文本';
          }
          return '';
        }
      });
      
      if (!result.canceled && result.value) {
        try {
          // 显示加载消息
          const loadingMessage = this.ui.showMessage('正在翻译中...', {
            type: 'info',
            duration: 0 // 不自动关闭
          });
          
          // 翻译文本
          const translateResult = await this.translateText(result.value);
          
          // 关闭加载消息
          if (loadingMessage && loadingMessage.parentNode) {
            loadingMessage.parentNode.removeChild(loadingMessage);
          }
          
          // 创建结果对话框
          const resultDialog = this.ui.createDialog({
            title: '翻译结果',
            content: `
              <div class="jev-mb-md">
                <strong>原文:</strong>
                <div class="jev-mt-sm" style="padding: var(--jev-spacing-md); background-color: rgba(255, 255, 255, 0.05); border-radius: var(--jev-border-radius); max-height: 150px; overflow-y: auto;">
                  ${result.value}
                </div>
              </div>
              <div>
                <strong>译文:</strong>
                <div class="jev-mt-sm" style="padding: var(--jev-spacing-md); background-color: rgba(255, 255, 255, 0.05); border-radius: var(--jev-border-radius); max-height: 150px; overflow-y: auto;">
                  ${translateResult.translated || translateResult.text}
                </div>
              </div>
            `,
            buttons: [
              {
                text: '关闭',
                onClick: () => resultDialog.close()
              }
            ]
          });
          
          await resultDialog.initialize();
          resultDialog.mount();
          resultDialog.open();
          
        } catch (error) {
          logger.error('翻译失败', error);
          this.ui.showMessage('翻译失败: ' + error.message, {
            type: 'error',
            duration: 5000
          });
        }
      }
    } catch (error) {
      logger.error('打开翻译对话框失败', error);
    }
  }
  
  /**
   * 显示统计信息
   * @private
   */
  _showStats() {
    try {
      const uploadStats = uploader.getStats();
      
      // 创建统计对话框
      const statsDialog = this.ui.createDialog({
        title: '统计信息',
        content: `
          <div class="jev-mb-md">
            <h4>上传统计：</h4>
            <ul style="list-style: none; padding-left: 0;">
              <li class="jev-mb-xs">- 总上传次数：${uploadStats.totalUploads}</li>
              <li class="jev-mb-xs">- 成功上传：${uploadStats.successfulUploads}</li>
              <li class="jev-mb-xs">- 失败上传：${uploadStats.failedUploads}</li>
              <li class="jev-mb-xs">- 总上传大小：${(uploadStats.totalSize / 1024).toFixed(2)} KB</li>
              <li class="jev-mb-xs">- 平均速度：${(uploadStats.averageSpeed / 1024).toFixed(2)} KB/s</li>
              <li class="jev-mb-xs">- 最后上传时间：${uploadStats.lastUploadTime || '从未上传'}</li>
            </ul>
          </div>
          <div>
            <h4>应用状态：</h4>
            <ul style="list-style: none; padding-left: 0;">
              <li class="jev-mb-xs">- 是否已初始化：${this.state.initialized ? '是' : '否'}</li>
              <li class="jev-mb-xs">- 是否激活：${this.state.isActive ? '是' : '否'}</li>
              <li class="jev-mb-xs">- 当前模式：${this.state.currentMode}</li>
            </ul>
          </div>
        `,
        buttons: [
          {
            text: '确定',
            type: 'primary',
            onClick: () => statsDialog.close()
          }
        ]
      });
      
      statsDialog.initialize().then(() => {
        statsDialog.mount();
        statsDialog.open();
      });
    } catch (error) {
      logger.error('显示统计信息失败', error);
    }
  }
  
  /**
   * 应用全局错误处理
   */
  applyGlobalErrorHandling() {
    // 捕获未处理的Promise错误
    window.addEventListener('unhandledrejection', (event) => {
      logger.error('未处理的Promise错误', { 
        reason: event.reason,
        promise: event.promise
      });
      
      this.state.lastError = event.reason;
      
      // 使用新的UI管理器显示错误消息
      this.ui.showMessage('发生未处理的错误: ' + (event.reason.message || '未知错误'), {
        type: 'error',
        duration: 5000
      });
    });
    
    // 捕获全局错误
    window.addEventListener('error', (event) => {
      logger.error('全局错误', { 
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
      
      this.state.lastError = event.error;
      
      // 使用新的UI管理器显示错误消息
      this.ui.showMessage('发生全局错误: ' + (event.error.message || '未知错误'), {
        type: 'error',
        duration: 5000
      });
    });
    
    logger.info('全局错误处理已应用');
  }
  
  /**
   * 获取应用状态
   * @returns {Object} 应用状态
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * 重置应用
   */
  reset() {
    try {
      logger.info('重置JEV应用');
      
      // 重置各个模块
      uploader.resetStats();
      worker.disconnect();
      
      // 重置翻译模块（如果有重置方法）
      if (translate.reset) {
        translate.reset();
      }
      
      // 重置应用状态
      this.state = {
        initialized: false,
        isActive: false,
        currentMode: 'normal',
        lastError: null
      };
      
      // 关闭所有UI对话框
      this.ui.closeAllDialogs();
      
      logger.info('JEV应用重置完成');
    } catch (error) {
      logger.error('重置JEV应用失败', error);
    }
  }
}

// 导出单例
const app = new JEVApp();

// 应用全局错误处理
app.applyGlobalErrorHandling();

export default app;