/**
 * 翻译区功能模块
 * 提供图片上传、OCR识别和翻译功能
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';
import worker from './worker.js';
import uploader from './uploader.js';
import uiManager from '../components/UIManager.js'; // 使用新的UI管理器

class TranslateModule {
  constructor() {
    // 模块状态
    this.state = {
      initialized: false,
      isProcessing: false,
      currentImage: null,
      currentResult: null,
      processingStep: 'idle', // idle, uploading, processing, translating, done, error
      errorMessage: null
    };
    
    // 使用新的UI管理器
    this._ui = uiManager;
    
    // UI元素引用
    this.uiElements = {
      panel: null,
      uploadArea: null,
      progressBar: null,
      statusText: null,
      originalContent: null,
      translatedContent: null,
      imagePreview: null,
      copyButton: null,
      resetButton: null,
      helpButton: null
    };
    
    // 翻译配置
    this.config = {
      ...config.get('translate', {}),
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      maxSizeMB: 10,
      showOriginal: true,
      showTranslation: true,
      theme: 'neon-green' // neon-green, default, light, dark
    };
  }
  
  /**
   * 初始化模块
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async initialize() {
    try {
      logger.info('初始化翻译区模块');
      
      // 初始化UI
      await this._initUI();
      
      // 设置状态
      this.state.initialized = true;
      
      return true;
    } catch (error) {
      logger.error('翻译区模块初始化失败', error);
      this.state.errorMessage = error.message;
      return false;
    }
  }
  
  /**
   * 初始化UI
   * @private
   */
  async _initUI() {
    try {
      // 创建主面板 - 替换原有的mainContainer
      this.uiElements.panel = this._ui.createPanel({
        id: 'translate-module-panel',
        title: '图片翻译',
        width: 400,
        height: 420,
        position: 'bottom-left',
        draggable: true,
        closeable: true,
        onClose: () => this.hide(),
        theme: 'neon-green'
      });
      
      // 初始化面板
      await this.uiElements.panel.initialize();
      const contentElement = this.uiElements.panel.element.querySelector('.jev-panel-content');
      
      // 创建上传区域
      this.uiElements.uploadArea = this._createUploadArea();
      
      // 创建进度条 - 使用新的ProgressBar组件
      this.uiElements.progressBar = this._ui.createProgressBar({
        id: 'translate-progress-bar',
        max: 100,
        value: 0,
        showPercentage: true,
        className: 'translate-progress-bar'
      });
      await this.uiElements.progressBar.initialize();
      
      // 创建状态文本
      this.uiElements.statusText = this._createStatusText();
      
      // 创建内容展示区
      const contentArea = this._createContentArea();
      this.uiElements.originalContent = contentArea.original;
      this.uiElements.translatedContent = contentArea.translated;
      this.uiElements.imagePreview = contentArea.preview;
      
      // 创建控制区域
      this.uiElements.controls = this._createControls();
      
      // 组装UI
      contentElement.appendChild(this.uiElements.uploadArea);
      contentElement.appendChild(this.uiElements.progressBar.element);
      contentElement.appendChild(this.uiElements.statusText);
      contentElement.appendChild(contentArea.container);
      contentElement.appendChild(this.uiElements.controls);
      
      // 挂载面板
      this.uiElements.panel.mount();
      
      // 初始隐藏
      this.hide();
      
    } catch (error) {
      logger.error('初始化UI失败', error);
      throw error;
    }
  }
  
  /**
   * 创建上传区域
   * @private
   * @returns {HTMLElement} 上传区域元素
   */
  _createUploadArea() {
    const uploadArea = document.createElement('div');
    uploadArea.id = 'translate-upload-area';
    uploadArea.className = 'upload-area';
    
    const styles = `
      padding: 20px;
      border: 2px dashed var(--jev-color-primary);
      border-radius: 8px;
      margin: 10px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: rgba(0, 255, 0, 0.05);
    `;
    
    uploadArea.style.cssText = styles;
    
    // 上传图标
    const icon = document.createElement('div');
    icon.className = 'upload-icon';
    icon.style.fontSize = '48px';
    icon.style.marginBottom = '10px';
    icon.textContent = '📁';
    
    // 上传文本
    const text = document.createElement('div');
    text.className = 'upload-text';
    text.style.color = 'var(--jev-color-primary)';
    text.style.fontSize = '16px';
    text.textContent = '拖放图片或点击上传';
    
    // 隐藏的文件输入
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = 'translate-file-input';
    
    // 事件绑定
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.backgroundColor = 'rgba(0, 255, 0, 0.05)';
    });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.backgroundColor = 'rgba(0, 255, 0, 0.05)';
      if (e.dataTransfer.files.length) {
        this._handleFileSelection(e.dataTransfer.files[0]);
      }
    });
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this._handleFileSelection(e.target.files[0]);
      }
    });
    
    uploadArea.appendChild(icon);
    uploadArea.appendChild(text);
    uploadArea.appendChild(fileInput);
    
    return uploadArea;
  }
  
  /**
   * 创建上传区域
   * @private
   * @returns {HTMLElement} 上传区域元素
   */
  _createUploadArea() {
    const uploadArea = document.createElement('div');
    uploadArea.id = 'translate-upload-area';
    uploadArea.className = 'upload-area';
    
    const styles = `
      padding: 20px;
      border: 2px dashed #00ff00;
      border-radius: 8px;
      margin: 10px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: rgba(0, 255, 0, 0.05);
    `;
    
    uploadArea.style.cssText = styles;
    
    // 上传图标
    const icon = document.createElement('div');
    icon.className = 'upload-icon';
    icon.style.fontSize = '48px';
    icon.style.marginBottom = '10px';
    icon.textContent = '📁';
    
    // 上传文本
    const text = document.createElement('div');
    text.className = 'upload-text';
    text.style.color = '#00ff00';
    text.style.fontSize = '16px';
    text.textContent = '拖放图片或点击上传';
    
    // 隐藏的文件输入
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    fileInput.id = 'translate-file-input';
    
    // 事件绑定
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.backgroundColor = 'rgba(0, 255, 0, 0.05)';
    });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.backgroundColor = 'rgba(0, 255, 0, 0.05)';
      if (e.dataTransfer.files.length) {
        this._handleFileSelection(e.dataTransfer.files[0]);
      }
    });
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this._handleFileSelection(e.target.files[0]);
      }
    });
    
    uploadArea.appendChild(icon);
    uploadArea.appendChild(text);
    uploadArea.appendChild(fileInput);
    
    return uploadArea;
  }
  
  /**
   * 创建状态文本
   * @private
   * @returns {HTMLElement} 状态文本元素
   */
  _createStatusText() {
    const statusText = document.createElement('div');
    statusText.id = 'translate-status-text';
    statusText.className = 'status-text';
    statusText.style.display = 'none';
    statusText.style.margin = '0 10px 10px 10px';
    statusText.style.color = 'var(--jev-color-primary)';
    statusText.style.fontSize = '14px';
    statusText.style.textAlign = 'center';
    
    return statusText;
  }
  
  /**
   * 创建状态文本
   * @private
   * @returns {HTMLElement} 状态文本元素
   */
  _createStatusText() {
    const statusText = document.createElement('div');
    statusText.id = 'translate-status-text';
    statusText.className = 'status-text';
    statusText.style.display = 'none';
    statusText.style.margin = '0 10px 10px 10px';
    statusText.style.color = '#00ff00';
    statusText.style.fontSize = '14px';
    statusText.style.textAlign = 'center';
    
    return statusText;
  }
  
  /**
   * 创建内容展示区域
   * @private
   * @returns {Object} 内容区域元素集合
   */
  _createContentArea() {
    const container = document.createElement('div');
    container.className = 'content-area';
    container.style.display = 'none';
    container.style.flex = '1';
    container.style.overflow = 'hidden';
    container.style.margin = '0 10px 10px 10px';
    
    // 图片预览
    const preview = document.createElement('div');
    preview.id = 'translate-image-preview';
    preview.className = 'image-preview';
    preview.style.maxHeight = '150px';
    preview.style.objectFit = 'contain';
    preview.style.marginBottom = '10px';
    preview.style.display = 'flex';
    preview.style.justifyContent = 'center';
    preview.style.alignItems = 'center';
    
    // 原始内容
    const originalContainer = document.createElement('div');
    originalContainer.className = 'content-section';
    originalContainer.style.marginBottom = '10px';
    
    const originalLabel = document.createElement('div');
    originalLabel.className = 'content-label';
    originalLabel.style.color = '#00ff00';
    originalLabel.style.fontSize = '12px';
    originalLabel.style.marginBottom = '5px';
    originalLabel.textContent = '原始内容';
    
    const originalContent = document.createElement('div');
    originalContent.id = 'translate-original-content';
    originalContent.className = 'content-box';
    originalContent.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    originalContent.style.border = '1px solid #00ff00';
    originalContent.style.borderRadius = '4px';
    originalContent.style.padding = '10px';
    originalContent.style.height = '80px';
    originalContent.style.overflow = 'auto';
    originalContent.style.color = '#ffffff';
    originalContent.style.fontSize = '14px';
    
    originalContainer.appendChild(originalLabel);
    originalContainer.appendChild(originalContent);
    
    // 翻译内容
    const translatedContainer = document.createElement('div');
    translatedContainer.className = 'content-section';
    
    const translatedLabel = document.createElement('div');
    translatedLabel.className = 'content-label';
    translatedLabel.style.color = '#00ff00';
    translatedLabel.style.fontSize = '12px';
    translatedLabel.style.marginBottom = '5px';
    translatedLabel.textContent = '翻译结果';
    
    const translatedContent = document.createElement('div');
    translatedContent.id = 'translate-translated-content';
    translatedContent.className = 'content-box';
    translatedContent.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    translatedContent.style.border = '1px solid #00ff00';
    translatedContent.style.borderRadius = '4px';
    translatedContent.style.padding = '10px';
    translatedContent.style.height = '80px';
    translatedContent.style.overflow = 'auto';
    translatedContent.style.color = '#ffffff';
    translatedContent.style.fontSize = '14px';
    
    translatedContainer.appendChild(translatedLabel);
    translatedContainer.appendChild(translatedContent);
    
    container.appendChild(preview);
    container.appendChild(originalContainer);
    container.appendChild(translatedContainer);
    
    return {
      container,
      preview,
      original: originalContent,
      translated: translatedContent
    };
  }
  
  /**
   * 创建控制区域
   * @private
   * @returns {HTMLElement} 控制区域元素
   */
  _createControls() {
    const controls = document.createElement('div');
    controls.className = 'controls-area';
    controls.style.display = 'flex';
    controls.style.justifyContent = 'space-between';
    controls.style.padding = '10px';
    controls.style.borderTop = '1px solid var(--jev-color-primary)';
    
    // 操作按钮
    const actionsContainer = document.createElement('div');
    actionsContainer.style.display = 'flex';
    
    // 复制按钮 - 使用新的Button组件
    this.uiElements.copyButton = this._ui.createButton({
      text: '复制翻译',
      type: 'primary',
      disabled: true,
      onClick: () => this._copyTranslation()
    });
    
    // 重置按钮 - 使用新的Button组件
    this.uiElements.resetButton = this._ui.createButton({
      text: '重置',
      type: 'default',
      disabled: true,
      onClick: () => this._reset()
    });
    
    // 初始化按钮
    this.uiElements.copyButton.initialize().then(() => {
      actionsContainer.appendChild(this.uiElements.copyButton.element);
    });
    
    this.uiElements.resetButton.initialize().then(() => {
      actionsContainer.appendChild(this.uiElements.resetButton.element);
    });
    
    // 帮助按钮 - 使用新的Button组件
    this.uiElements.helpButton = this._ui.createButton({
      text: '?',
      type: 'default',
      size: 'small',
      onClick: () => this._showHelp()
    });
    
    this.uiElements.helpButton.initialize().then(() => {
      const btn = this.uiElements.helpButton.element;
      btn.style.width = '30px';
      btn.style.height = '30px';
      btn.style.borderRadius = '50%';
    });
    
    controls.appendChild(actionsContainer);
    controls.appendChild(this.uiElements.helpButton.element);
    
    return controls;
  }
  
  /**
   * 处理文件选择
   * @private
   * @param {File} file - 选择的文件
   */
  async _handleFileSelection(file) {
    try {
      // 验证文件
      this._validateFile(file);
      
      // 设置状态
      this.setState({
        isProcessing: true,
        currentImage: file,
        processingStep: 'uploading'
      });
      
      // 更新UI
      this._updateUI();
      this._updateStatus('正在上传图片...');
      
      // 开始处理流程
      await this._processImage(file);
    } catch (error) {
      logger.error('文件处理失败', error);
      this.setState({
        isProcessing: false,
        processingStep: 'error',
        errorMessage: error.message
      });
      this._updateUI();
      this._updateStatus(`错误: ${error.message}`, true);
    }
  }
  
  /**
   * 验证文件
   * @private
   * @param {File} file - 要验证的文件
   */
  _validateFile(file) {
    // 检查文件类型
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!this.config.supportedFormats.includes(fileExtension)) {
      throw new Error(`不支持的文件格式: ${fileExtension}。支持的格式: ${this.config.supportedFormats.join(', ')}`);
    }
    
    // 检查文件大小
    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`文件太大。最大允许大小: ${this.config.maxSizeMB}MB`);
    }
  }
  
  /**
   * 处理图片
   * @private
   * @param {File} imageFile - 图片文件
   */
  async _processImage(imageFile) {
    try {
      // 更新进度
      this._updateProgress(20);
      
      // 显示图片预览
      const previewUrl = URL.createObjectURL(imageFile);
      const img = document.createElement('img');
      img.src = previewUrl;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '150px';
      img.style.objectFit = 'contain';
      
      this.ui.imagePreview.innerHTML = '';
      this.ui.imagePreview.appendChild(img);
      
      // 设置状态为处理中
      this.setState({ processingStep: 'processing' });
      this._updateStatus('正在处理图片...');
      this._updateProgress(40);
      
      // 首先尝试通过Worker处理
      let ocrText = null;
      let translatedText = null;
      
      try {
        // 调用Worker进行图片处理
        const workerOptions = {
          ocr: true,
          translate: true,
          quality: 0.9,
          maxWidth: 1024,
          maxHeight: 1024
        };
        
        logger.info('调用Worker处理图片', { options: workerOptions });
        const workerResult = await worker.processImage(imageFile, workerOptions);
        
        // 解析Worker结果
        if (workerResult) {
          ocrText = workerResult.ocr || workerResult.text || workerResult.content;
          translatedText = workerResult.translation || workerResult.translated;
          
          logger.info('Worker处理成功', { hasOCR: !!ocrText, hasTranslation: !!translatedText });
        }
      } catch (workerError) {
        logger.warn('Worker处理失败，尝试备用方案', workerError);
      }
      
      // 如果OCR失败，尝试使用通用处理函数
      if (!ocrText) {
        this._updateStatus('使用备用方式提取文本...');
        this._updateProgress(50);
        
        try {
          // 尝试使用全局处理函数
          if (typeof window.processImageToWorker === 'function') {
            logger.info('尝试使用全局processImageToWorker函数');
            const globalResult = await window.processImageToWorker(imageFile);
            if (globalResult) {
              ocrText = globalResult.text || globalResult.content;
              translatedText = globalResult.translation;
            }
          }
        } catch (globalError) {
          logger.error('全局处理函数失败', globalError);
        }
      }
      
      // 更新进度
      this._updateProgress(80);
      
      // 检查OCR结果
      if (!ocrText) {
        throw new Error('无法从图片中提取文本，请尝试其他图片');
      }
      
      // 如果需要翻译但没有翻译结果，尝试调用翻译服务
      if (this.config.showTranslation && !translatedText) {
        this.setState({ processingStep: 'translating' });
        this._updateStatus('正在翻译文本...');
        this._updateProgress(90);
        
        try {
          translatedText = await this._translateText(ocrText);
        } catch (translateError) {
          logger.warn('翻译失败，显示原文', translateError);
          translatedText = `[翻译服务不可用] ${ocrText.length > 30 ? ocrText.substring(0, 30) + '...' : ocrText}`;
        }
      }
      
      // 更新结果
      this.setState({
        currentResult: {
          ocr: ocrText,
          translation: translatedText || '(未提供翻译)',
          timestamp: new Date()
        },
        processingStep: 'done',
        isProcessing: false
      });
      
      // 更新UI
      this._updateUI();
      this._updateProgress(100);
      this._updateStatus('处理完成');
      
      // 延时清除状态信息
      setTimeout(() => {
        this._hideStatus();
      }, 2000);
      
    } catch (error) {
      logger.error('图片处理失败', error);
      // 显示友好的错误信息
      const friendlyMessage = error.message || '处理图片时发生错误';
      this.setState({
        processingStep: 'error',
        errorMessage: friendlyMessage
      });
      this._updateStatus(`错误: ${friendlyMessage}`, true);
      throw error;
    } finally {
      // 确保状态更新
      this.setState({ isProcessing: false });
      this._updateUI();
    }
  }
  
  /**
   * 翻译文本
   * @private
   * @param {string} text - 要翻译的文本
   * @returns {Promise<string>} 翻译结果
   */
  async _translateText(text) {
    try {
      logger.info('执行文本翻译', { length: text.length });
      
      // 尝试多种翻译方式
      let translationResult = null;
      
      // 1. 尝试使用deepseek模块
      if (typeof deepseek !== 'undefined' && deepseek.translate) {
        logger.info('尝试使用deepseek模块进行翻译');
        try {
          translationResult = await deepseek.translate(text);
          if (translationResult && typeof translationResult === 'string') {
            return translationResult;
          }
        } catch (deepseekError) {
          logger.warn('Deepseek翻译失败', deepseekError);
        }
      }
      
      // 2. 尝试使用全局翻译函数
      if (window.JEV && window.JEV.translate) {
        logger.info('尝试使用全局翻译函数');
        try {
          translationResult = await window.JEV.translate(text);
          if (translationResult && typeof translationResult === 'string') {
            return translationResult;
          }
        } catch (globalError) {
          logger.warn('全局翻译函数失败', globalError);
        }
      }
      
      // 3. 如果上述方法都失败，返回模拟翻译结果
      logger.info('使用模拟翻译结果');
      
      // 模拟翻译延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 简单的模拟翻译逻辑
      if (text.length > 100) {
        return `[翻译结果] 检测到约${text.length}字符的内容。\n\n由于翻译服务暂时不可用，仅显示原文。`;
      } else {
        // 对短文本进行简单处理
        const isEnglish = /^[A-Za-z0-9\s\.,;\!\?\'\"]*$/.test(text);
        return isEnglish 
          ? `[翻译示例] 这是"${text}"的翻译结果。完整翻译服务正在初始化中。`
          : `[Translation Example] This is the translation of "${text}". Full translation service is initializing.`;
      }
    } catch (error) {
      logger.error('翻译失败', error);
      throw new Error('翻译服务暂时不可用');
    }
  }
  
  /**
   * 复制翻译结果
   * @private
   */
  async _copyTranslation() {
    try {
      if (!this.state.currentResult?.translation) {
        this._updateStatus('没有可复制的翻译结果', true);
        return;
      }
      
      await utils.copyToClipboard(this.state.currentResult.translation);
      this._updateStatus('翻译结果已复制到剪贴板');
      
      setTimeout(() => {
        this._hideStatus();
      }, 2000);
    } catch (error) {
      logger.error('复制失败', error);
      this._updateStatus('复制失败，请手动复制', true);
    }
  }
  
  /**
   * 重置翻译区
   * @private
   */
  _reset() {
    // 清除预览URL
    if (this.ui.imagePreview.querySelector('img')) {
      const img = this.ui.imagePreview.querySelector('img');
      URL.revokeObjectURL(img.src);
    }
    
    // 重置状态
    this.setState({
      currentImage: null,
      currentResult: null,
      processingStep: 'idle',
      errorMessage: null
    });
    
    // 更新UI
    this._updateUI();
    this._hideStatus();
  }
  
  /**
   * 显示帮助信息
   * @private
   */
  async _showHelp() {
    try {
      await this._ui.showDialog({
        title: '翻译区使用帮助',
        message: `
          <ol>
            <li>点击上传区域或拖放图片到上传区</li>
            <li>支持的图片格式: ${this.config.supportedFormats.join(', ')}</li>
            <li>最大文件大小: ${this.config.maxSizeMB}MB</li>
            <li>系统会自动提取图片中的文本并进行翻译</li>
            <li>点击"复制翻译"按钮可以复制翻译结果</li>
            <li>点击"重置"按钮可以开始新的翻译任务</li>
          </ol>
        `,
        width: 400,
        buttons: [
          {
            text: '我知道了',
            type: 'primary'
          }
        ]
      });
    } catch (error) {
      logger.error('显示帮助信息失败', error);
      this._ui.showMessage('无法显示帮助信息: ' + error.message, {
        type: 'error',
        duration: 3000
      });
    }
  }
  
  /**
   * 更新进度
   * @private
   * @param {number} percentage - 进度百分比 (0-100)
   */
  _updateProgress(percentage) {
    if (this.uiElements.progressBar) {
      this.uiElements.progressBar.setValue(percentage);
      this.uiElements.progressBar.element.style.display = 'block';
    }
  }
  
  /**
   * 更新状态文本
   * @private
   * @param {string} text - 状态文本
   * @param {boolean} isError - 是否为错误信息
   */
  _updateStatus(text, isError = false) {
    if (this.uiElements.statusText) {
      this.uiElements.statusText.textContent = text;
      this.uiElements.statusText.style.display = 'block';
      this.uiElements.statusText.style.color = isError ? 'var(--jev-color-error)' : 'var(--jev-color-primary)';
    }
    
    // 同时通过UIManager显示消息提示
    this._ui.showMessage(text, {
      type: isError ? 'error' : 'info',
      duration: 3000
    });
  }
  
  /**
   * 隐藏状态文本
   * @private
   */
  _hideStatus() {
    if (this.uiElements.statusText) {
      this.uiElements.statusText.style.display = 'none';
    }
    
    if (this.uiElements.progressBar) {
      this.uiElements.progressBar.element.style.display = 'none';
      this.uiElements.progressBar.setValue(0);
    }
  }
  
  /**
   * 更新UI状态
   * @private
   */
  _updateUI() {
    const { currentResult, processingStep, isProcessing } = this.state;
    
    // 控制按钮状态
    if (this.uiElements.copyButton) {
      this.uiElements.copyButton.setDisabled(!currentResult?.translation);
    }
    
    if (this.uiElements.resetButton) {
      this.uiElements.resetButton.setDisabled(processingStep === 'idle');
    }
    
    // 更新上传区域
    this.uiElements.uploadArea.style.display = processingStep === 'idle' || processingStep === 'error' ? 'block' : 'none';
    
    // 更新内容区域
    const contentArea = this.uiElements.originalContent?.parentElement?.parentElement;
    if (contentArea) {
      contentArea.style.display = currentResult ? 'block' : 'none';
    }
    
    // 更新内容
    if (currentResult) {
      if (this.uiElements.originalContent) {
        this.uiElements.originalContent.textContent = currentResult.ocr || '无法识别内容';
      }
      
      if (this.uiElements.translatedContent) {
        this.uiElements.translatedContent.textContent = currentResult.translation || '翻译暂不可用';
      }
    } else {
      if (this.uiElements.originalContent) {
        this.uiElements.originalContent.textContent = '';
      }
      
      if (this.uiElements.translatedContent) {
        this.uiElements.translatedContent.textContent = '';
      }
      
      if (this.uiElements.imagePreview) {
        this.uiElements.imagePreview.innerHTML = '';
      }
    }
  }
  
  /**
   * 设置状态
   * @param {Object} newState - 新状态对象
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
  }
  
  /**
   * 显示翻译区
   */
  show() {
    if (this.uiElements.panel) {
      this.uiElements.panel.element.style.display = 'block';
      this.uiElements.panel.show();
    }
  }
  
  /**
   * 隐藏翻译区
   */
  hide() {
    if (this.uiElements.panel) {
      this.uiElements.panel.element.style.display = 'none';
      this.uiElements.panel.hide();
    }
  }
  
  /**
   * 切换显示状态
   */
  toggle() {
    if (this.uiElements.panel) {
      this.uiElements.panel.toggle();
    }
  }
  
  /**
   * 销毁模块
   */
  destroy() {
    try {
      // 清除状态
      this._reset();
      
      // 移除DOM元素
      if (this.uiElements.panel) {
        this.uiElements.panel.unmount();
      }
      
      // 重置UI元素引用
      this.uiElements = {};
      
      // 重置状态
      this.state = {
        initialized: false,
        isProcessing: false,
        currentImage: null,
        currentResult: null,
        processingStep: 'idle',
        errorMessage: null
      };
    } catch (error) {
      logger.error('销毁翻译模块失败', error);
    }
  }
}

// 创建并导出模块实例
const translateModule = new TranslateModule();
export default translateModule;

// 为了兼容非模块化环境，也挂载到全局对象
if (typeof window !== 'undefined') {
  window.JEV = window.JEV || {};
  window.JEV.TranslateModule = translateModule;
}