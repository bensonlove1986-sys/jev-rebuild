/**
 * UI管理模块
 * 处理用户界面相关操作，提供统一的UI交互接口
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';

class UIManager {
  constructor() {
    // UI配置
    this.uiConfig = config.get('ui', {});
    
    // 存储已创建的UI元素引用
    this.elements = new Map();
    
    // 绑定事件处理函数
    this._bindEvents();
  }
  
  /**
   * 绑定全局事件
   * @private
   */
  _bindEvents() {
    // 监听ESC键关闭对话框
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' || event.keyCode === 27) {
        this.closeAllDialogs();
      }
    });
    
    // 监听点击外部关闭对话框
    document.addEventListener('click', (event) => {
      // 检查是否点击了对话框外部
      this._checkOutsideClick(event);
    });
  }
  
  /**
   * 检查是否点击了对话框外部
   * @private
   * @param {MouseEvent} event - 鼠标事件
   */
  _checkOutsideClick(event) {
    // 遍历所有对话框
    this.elements.forEach((element, id) => {
      if (id.startsWith('dialog_') && element && element.classList.contains('modal-dialog')) {
        const dialog = element;
        const content = dialog.querySelector('.dialog-content');
        
        // 如果点击了对话框外部且未点击内容区域
        if (dialog === event.target && !content.contains(event.target)) {
          // 检查对话框配置是否允许点击外部关闭
          const dialogConfig = this._getElementConfig(id);
          if (dialogConfig && dialogConfig.closeOnClickOutside) {
            this.closeDialog(id);
          }
        }
      }
    });
  }
  
  /**
   * 获取元素配置
   * @private
   * @param {string} elementId - 元素ID
   * @returns {Object|null} 配置对象
   */
  _getElementConfig(elementId) {
    // 这里可以从配置中获取特定元素的配置
    return this.uiConfig.elements?.[elementId] || null;
  }
  
  /**
   * 创建增强版输入对话框
   * @param {Object} options - 对话框选项
   * @returns {Promise<Object>} 用户输入结果
   */
  createInputDialog(options = {}) {
    const dialogId = 'dialog_' + utils.generateUniqueId();
    
    // 合并默认选项
    const dialogOptions = {
      title: '请输入',
      placeholder: '',
      defaultValue: '',
      buttonText: '确定',
      cancelButtonText: '取消',
      width: '400px',
      zIndex: 9999,
      closeOnClickOutside: true,
      closeOnEscape: true,
      validate: null, // 验证函数
      ...options
    };
    
    // 保存对话框配置
    this.uiConfig.elements = this.uiConfig.elements || {};
    this.uiConfig.elements[dialogId] = dialogOptions;
    
    return new Promise((resolve, reject) => {
      try {
        // 创建对话框DOM
        const dialog = this._createDialogElement(dialogId, dialogOptions);
        
        // 创建输入区域
        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = dialogId + '_input';
        input.placeholder = dialogOptions.placeholder;
        input.value = dialogOptions.defaultValue;
        input.className = 'jev-input';
        input.style.width = '100%';
        input.style.padding = '10px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '4px';
        input.style.fontSize = '14px';
        
        inputContainer.appendChild(input);
        dialog.querySelector('.dialog-body').appendChild(inputContainer);
        
        // 添加错误提示区域
        const errorContainer = document.createElement('div');
        errorContainer.id = dialogId + '_error';
        errorContainer.className = 'error-message';
        errorContainer.style.color = 'red';
        errorContainer.style.fontSize = '12px';
        errorContainer.style.marginTop = '5px';
        errorContainer.style.minHeight = '16px';
        
        inputContainer.appendChild(errorContainer);
        
        // 创建按钮区域
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'flex-end';
        buttonsContainer.style.marginTop = '15px';
        
        // 取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = dialogOptions.cancelButtonText;
        cancelButton.className = 'jev-button cancel';
        cancelButton.style.marginRight = '10px';
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.border = '1px solid #ccc';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.backgroundColor = '#f5f5f5';
        cancelButton.style.cursor = 'pointer';
        
        cancelButton.addEventListener('click', () => {
          this.closeDialog(dialogId);
          resolve({ canceled: true });
        });
        
        // 确认按钮
        const confirmButton = document.createElement('button');
        confirmButton.textContent = dialogOptions.buttonText;
        confirmButton.className = 'jev-button confirm';
        confirmButton.style.padding = '8px 16px';
        confirmButton.style.border = '1px solid #0066cc';
        confirmButton.style.borderRadius = '4px';
        confirmButton.style.backgroundColor = '#0066cc';
        confirmButton.style.color = 'white';
        confirmButton.style.cursor = 'pointer';
        
        // 验证输入并关闭对话框
        const validateAndConfirm = () => {
          const value = input.value;
          
          // 执行验证
          if (dialogOptions.validate && typeof dialogOptions.validate === 'function') {
            try {
              const validationResult = dialogOptions.validate(value);
              
              if (validationResult === true) {
                // 验证通过
                errorContainer.textContent = '';
                this.closeDialog(dialogId);
                resolve({ canceled: false, value });
              } else {
                // 验证失败，显示错误信息
                errorContainer.textContent = validationResult || '输入无效';
              }
            } catch (error) {
              errorContainer.textContent = error.message || '验证过程中发生错误';
            }
          } else {
            // 没有验证函数，直接确认
            this.closeDialog(dialogId);
            resolve({ canceled: false, value });
          }
        };
        
        confirmButton.addEventListener('click', validateAndConfirm);
        
        // 回车键确认
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.keyCode === 13) {
            validateAndConfirm();
          }
        });
        
        // 添加按钮到容器
        buttonsContainer.appendChild(cancelButton);
        buttonsContainer.appendChild(confirmButton);
        
        dialog.querySelector('.dialog-body').appendChild(buttonsContainer);
        
        // 添加对话框到页面
        document.body.appendChild(dialog);
        
        // 存储对话框引用
        this.elements.set(dialogId, dialog);
        
        // 聚焦输入框
        setTimeout(() => {
          input.focus();
          input.select();
        }, 100);
        
      } catch (error) {
        logger.error('创建输入对话框失败', error);
        reject(error);
      }
    });
  }
  
  /**
   * 创建命令执行对话框（用于显示PowerShell命令）
   * @param {Object} options - 对话框选项
   * @returns {Promise<Object>} 用户操作结果
   */
  createCommandDialog(options = {}) {
    const dialogId = 'dialog_' + utils.generateUniqueId();
    
    // 合并默认选项
    const dialogOptions = {
      title: '命令执行',
      command: '',
      width: '600px',
      height: '400px',
      zIndex: 9999,
      closeOnClickOutside: false,
      ...options
    };
    
    // 保存对话框配置
    this.uiConfig.elements = this.uiConfig.elements || {};
    this.uiConfig.elements[dialogId] = dialogOptions;
    
    return new Promise((resolve, reject) => {
      try {
        // 创建对话框DOM
        const dialog = this._createDialogElement(dialogId, dialogOptions);
        
        // 创建命令显示区域
        const commandContainer = document.createElement('div');
        commandContainer.className = 'command-container';
        commandContainer.style.marginBottom = '15px';
        
        const commandLabel = document.createElement('div');
        commandLabel.textContent = '请执行以下命令：';
        commandLabel.style.fontWeight = 'bold';
        commandLabel.style.marginBottom = '5px';
        
        const commandPre = document.createElement('pre');
        commandPre.className = 'command-code';
        commandPre.style.backgroundColor = '#f5f5f5';
        commandPre.style.padding = '10px';
        commandPre.style.borderRadius = '4px';
        commandPre.style.overflowX = 'auto';
        commandPre.style.fontFamily = 'monospace';
        commandPre.textContent = dialogOptions.command;
        
        const copyButton = document.createElement('button');
        copyButton.textContent = '复制命令';
        copyButton.className = 'copy-button';
        copyButton.style.padding = '5px 10px';
        copyButton.style.border = '1px solid #ccc';
        copyButton.style.borderRadius = '4px';
        copyButton.style.backgroundColor = '#f5f5f5';
        copyButton.style.cursor = 'pointer';
        copyButton.style.marginTop = '5px';
        
        // 复制命令到剪贴板
        copyButton.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(dialogOptions.command);
            copyButton.textContent = '已复制！';
            setTimeout(() => {
              copyButton.textContent = '复制命令';
            }, 2000);
          } catch (error) {
            logger.error('复制命令失败', error);
            alert('复制失败，请手动复制命令');
          }
        });
        
        commandContainer.appendChild(commandLabel);
        commandContainer.appendChild(commandPre);
        commandContainer.appendChild(copyButton);
        
        // 创建结果输入区域
        const resultContainer = document.createElement('div');
        resultContainer.className = 'result-container';
        
        const resultLabel = document.createElement('div');
        resultLabel.textContent = '执行结果：';
        resultLabel.style.fontWeight = 'bold';
        resultLabel.style.marginBottom = '5px';
        
        const resultTextarea = document.createElement('textarea');
        resultTextarea.id = dialogId + '_result';
        resultTextarea.placeholder = '请粘贴命令执行结果...';
        resultTextarea.className = 'jev-textarea';
        resultTextarea.style.width = '100%';
        resultTextarea.style.height = '100px';
        resultTextarea.style.padding = '10px';
        resultTextarea.style.border = '1px solid #ccc';
        resultTextarea.style.borderRadius = '4px';
        resultTextarea.style.fontFamily = 'monospace';
        resultTextarea.style.fontSize = '14px';
        
        resultContainer.appendChild(resultLabel);
        resultContainer.appendChild(resultTextarea);
        
        // 创建按钮区域
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.justifyContent = 'flex-end';
        buttonsContainer.style.marginTop = '15px';
        
        // 取消按钮
        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';
        cancelButton.className = 'jev-button cancel';
        cancelButton.style.marginRight = '10px';
        cancelButton.style.padding = '8px 16px';
        cancelButton.style.border = '1px solid #ccc';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.backgroundColor = '#f5f5f5';
        cancelButton.style.cursor = 'pointer';
        
        cancelButton.addEventListener('click', () => {
          this.closeDialog(dialogId);
          resolve({ canceled: true });
        });
        
        // 提交按钮
        const submitButton = document.createElement('button');
        submitButton.textContent = '提交结果';
        submitButton.className = 'jev-button submit';
        submitButton.style.padding = '8px 16px';
        submitButton.style.border = '1px solid #0066cc';
        submitButton.style.borderRadius = '4px';
        submitButton.style.backgroundColor = '#0066cc';
        submitButton.style.color = 'white';
        submitButton.style.cursor = 'pointer';
        
        submitButton.addEventListener('click', () => {
          const resultText = resultTextarea.value.trim();
          
          try {
            // 尝试解析JSON结果
            let result;
            try {
              result = JSON.parse(resultText);
            } catch (e) {
              // 如果不是JSON，返回原始文本
              result = { text: resultText };
            }
            
            this.closeDialog(dialogId);
            resolve({ canceled: false, result });
          } catch (error) {
            alert('解析结果失败，请检查输入格式');
          }
        });
        
        // 添加按钮到容器
        buttonsContainer.appendChild(cancelButton);
        buttonsContainer.appendChild(submitButton);
        
        // 将所有元素添加到对话框
        const dialogBody = dialog.querySelector('.dialog-body');
        dialogBody.appendChild(commandContainer);
        dialogBody.appendChild(resultContainer);
        dialogBody.appendChild(buttonsContainer);
        
        // 添加对话框到页面
        document.body.appendChild(dialog);
        
        // 存储对话框引用
        this.elements.set(dialogId, dialog);
        
      } catch (error) {
        logger.error('创建命令对话框失败', error);
        reject(error);
      }
    });
  }
  
  /**
   * 创建通用对话框元素
   * @private
   * @param {string} dialogId - 对话框ID
   * @param {Object} options - 对话框选项
   * @returns {HTMLElement} 对话框元素
   */
  _createDialogElement(dialogId, options) {
    // 创建模态背景
    const modal = document.createElement('div');
    modal.id = dialogId;
    modal.className = 'modal-dialog';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = options.zIndex;
    modal.style.animation = 'fadeIn 0.2s ease-out';
    
    // 创建对话框容器
    const dialogContainer = document.createElement('div');
    dialogContainer.className = 'dialog-container';
    dialogContainer.style.width = options.width || '400px';
    dialogContainer.style.maxWidth = '90%';
    dialogContainer.style.backgroundColor = 'white';
    dialogContainer.style.borderRadius = '8px';
    dialogContainer.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
    dialogContainer.style.animation = 'slideIn 0.2s ease-out';
    
    // 如果指定了高度
    if (options.height) {
      dialogContainer.style.height = options.height;
      dialogContainer.style.overflow = 'hidden';
    }
    
    // 创建对话框头部
    const dialogHeader = document.createElement('div');
    dialogHeader.className = 'dialog-header';
    dialogHeader.style.padding = '15px';
    dialogHeader.style.borderBottom = '1px solid #eee';
    dialogHeader.style.display = 'flex';
    dialogHeader.style.justifyContent = 'space-between';
    dialogHeader.style.alignItems = 'center';
    
    const dialogTitle = document.createElement('h3');
    dialogTitle.className = 'dialog-title';
    dialogTitle.textContent = options.title || '对话框';
    dialogTitle.style.margin = '0';
    dialogTitle.style.fontSize = '16px';
    dialogTitle.style.fontWeight = '600';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '&times;';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = '#666';
    closeButton.style.padding = '0';
    closeButton.style.width = '24px';
    closeButton.style.height = '24px';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    
    closeButton.addEventListener('click', () => {
      this.closeDialog(dialogId);
    });
    
    dialogHeader.appendChild(dialogTitle);
    dialogHeader.appendChild(closeButton);
    
    // 创建对话框内容
    const dialogBody = document.createElement('div');
    dialogBody.className = 'dialog-body';
    dialogBody.style.padding = '15px';
    
    // 如果指定了高度，设置内容区域为可滚动
    if (options.height) {
      dialogBody.style.height = `calc(100% - ${dialogHeader.offsetHeight + 30}px)`;
      dialogBody.style.overflowY = 'auto';
    }
    
    // 将头部和内容添加到对话框容器
    dialogContainer.appendChild(dialogHeader);
    dialogContainer.appendChild(dialogBody);
    
    // 将对话框容器添加到模态背景
    modal.appendChild(dialogContainer);
    
    // 添加CSS动画样式
    this._addDialogStyles();
    
    return modal;
  }
  
  /**
   * 添加对话框CSS样式
   * @private
   */
  _addDialogStyles() {
    // 检查是否已经添加了样式
    if (document.getElementById('jev-dialog-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'jev-dialog-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideIn {
        from { 
          opacity: 0;
          transform: translateY(-20px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .jev-input:focus,
      .jev-textarea:focus {
        outline: none;
        border-color: #0066cc;
        box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
      }
      
      .jev-button:hover {
        opacity: 0.9;
      }
      
      .jev-button:active {
        transform: translateY(1px);
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * 关闭指定对话框
   * @param {string} dialogId - 对话框ID
   */
  closeDialog(dialogId) {
    const dialog = this.elements.get(dialogId);
    if (dialog && dialog.parentNode) {
      // 添加淡出动画
      dialog.style.animation = 'fadeIn 0.2s ease-out reverse';
      
      // 动画结束后移除
      setTimeout(() => {
        if (dialog.parentNode) {
          dialog.parentNode.removeChild(dialog);
        }
        // 清理引用
        this.elements.delete(dialogId);
      }, 200);
    }
  }
  
  /**
   * 关闭所有对话框
   */
  closeAllDialogs() {
    this.elements.forEach((element, id) => {
      if (id.startsWith('dialog_')) {
        this.closeDialog(id);
      }
    });
  }
  
  /**
   * 更新翻译UI
   * @param {HTMLElement} element - 要更新的元素
   * @param {Object} translation - 翻译结果
   */
  updateTranslationUI(element, translation) {
    if (!element || !translation) {
      return;
    }
    
    try {
      // 检查是否已存在翻译容器
      let translationContainer = element.querySelector('.translation-container');
      
      if (!translationContainer) {
        // 创建翻译容器
        translationContainer = document.createElement('div');
        translationContainer.className = 'translation-container';
        translationContainer.style.marginTop = '10px';
        translationContainer.style.padding = '10px';
        translationContainer.style.backgroundColor = '#f9f9f9';
        translationContainer.style.borderRadius = '4px';
        translationContainer.style.borderLeft = '4px solid #0066cc';
        
        // 添加到元素后面
        element.appendChild(translationContainer);
      }
      
      // 清空现有内容
      translationContainer.innerHTML = '';
      
      // 添加翻译结果
      if (translation.text || translation.translated) {
        const translatedText = document.createElement('div');
        translatedText.className = 'translated-text';
        translatedText.textContent = translation.text || translation.translated;
        translatedText.style.fontSize = '14px';
        
        translationContainer.appendChild(translatedText);
      }
      
      // 如果有OCR结果，也显示出来
      if (translation.ocr) {
        const ocrResult = document.createElement('div');
        ocrResult.className = 'ocr-result';
        ocrResult.style.marginTop = '5px';
        ocrResult.style.paddingTop = '5px';
        ocrResult.style.borderTop = '1px solid #eee';
        
        const ocrLabel = document.createElement('div');
        ocrLabel.textContent = 'OCR识别：';
        ocrLabel.style.fontWeight = 'bold';
        ocrLabel.style.fontSize = '12px';
        ocrLabel.style.color = '#666';
        
        const ocrText = document.createElement('div');
        ocrText.textContent = translation.ocr;
        ocrText.style.fontSize = '13px';
        
        ocrResult.appendChild(ocrLabel);
        ocrResult.appendChild(ocrText);
        
        translationContainer.appendChild(ocrResult);
      }
      
      // 添加时间戳
      const timestamp = document.createElement('div');
      timestamp.className = 'translation-timestamp';
      timestamp.textContent = `翻译时间：${new Date().toLocaleString()}`;
      timestamp.style.marginTop = '5px';
      timestamp.style.fontSize = '11px';
      timestamp.style.color = '#999';
      
      translationContainer.appendChild(timestamp);
      
    } catch (error) {
      logger.error('更新翻译UI失败', error);
    }
  }
  
  /**
   * HTML转义函数
   * @param {string} text - 需要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
  
  /**
   * 修复页面UI（应用全局样式和修复）
   */
  fixUI() {
    try {
      // 添加全局样式
      this._addGlobalStyles();
      
      // 修复可能存在的样式冲突
      this._fixStyleConflicts();
      
      // 修复元素位置和大小
      this._normalizeElementPositions();
      
      logger.info('UI修复完成');
    } catch (error) {
      logger.error('UI修复失败', error);
    }
  }
  
  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    // 检查是否已经添加了全局样式
    if (document.getElementById('jev-global-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'jev-global-styles';
    style.textContent = `
      /* JEV全局样式 */
      .jev-enhanced {
        position: relative;
      }
      
      .jev-button {
        font-family: inherit;
        font-size: 14px;
        transition: all 0.2s ease;
      }
      
      .jev-hidden {
        display: none !important;
      }
      
      .jev-loading {
        opacity: 0.6;
        pointer-events: none;
      }
      
      /* 确保对话框不被其他元素遮挡 */
      .modal-dialog {
        z-index: 9999 !important;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * 修复样式冲突
   * @private
   */
  _fixStyleConflicts() {
    // 这里可以添加特定的样式冲突修复逻辑
    // 例如，修复某些网站的样式覆盖问题
  }
  
  /**
   * 归一化元素位置
   * @private
   */
  _normalizeElementPositions() {
    // 这里可以添加元素位置和大小的归一化逻辑
  }
  
  /**
   * 初始化JEV UI元素
   */
  initJevUIElements() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._initElements());
    } else {
      this._initElements();
    }
  }
  
  /**
   * 初始化UI元素
   * @private
   */
  _initElements() {
    logger.info('初始化JEV UI元素');
    
    // 这里可以添加特定的UI元素初始化逻辑
    // 例如，为图片添加处理按钮，为文本区域添加翻译按钮等
  }
}

// 导出单例
export default new UIManager();