/**
 * FileUpload文件上传组件
 * 提供丰富的文件上传功能，支持拖拽、预览和进度显示
 */
import BaseComponent from './base-component.js';
import logger from '../utils/logger.js';
import { getFileExtension, getFileIcon, formatFileSize } from '../utils/file-utils.js';

class FileUpload extends BaseComponent {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {HTMLElement} container - 容器元素
   */
  constructor(options = {}, container = document.body) {
    super(options, container);
    
    // 组件元素引用
    this.dropZoneElement = null;
    this.inputElement = null;
    this.browseButtonElement = null;
    this.filesListElement = null;
    this.uploadButtonElement = null;
    this.clearButtonElement = null;
    
    // 状态管理
    this.selectedFiles = [];
    this.uploadingFiles = new Map();
    this.isDragging = false;
    this.isUploading = false;
    
    // 上传相关
    this.activeUploads = new Map();
    this.xhrInstances = new Map();
  }

  /**
   * 获取默认配置
   * @private
   */
  _getDefaultOptions() {
    return {
      ...super._getDefaultOptions(),
      name: 'files',
      multiple: true,
      accept: '*', // 例如: 'image/*,application/pdf'
      maxSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      autoUpload: false,
      showUploadButton: true,
      showClearButton: true,
      showBrowseButton: true,
      showFileList: true,
      showFileSize: true,
      showFileIcon: true,
      showPreview: true,
      previewTypes: ['image/*', 'application/pdf'],
      enableDragDrop: true,
      theme: 'default', // default, dark, neon
      buttonTheme: 'primary', // primary, secondary, outline
      browseButtonText: '浏览文件',
      uploadButtonText: '上传文件',
      dropZoneText: '拖拽文件到此处，或',
      invalidFileTypeMessage: '不支持的文件类型',
      invalidFileSizeMessage: '文件大小超出限制',
      maxFilesMessage: '文件数量超出限制',
      uploadUrl: '',
      uploadMethod: 'POST',
      uploadHeaders: {},
      uploadParams: {},
      chunkedUpload: false,
      chunkSize: 5 * 1024 * 1024, // 5MB
      retryLimit: 3,
      onFilesAdded: null,
      onFileRemoved: null,
      onBeforeUpload: null,
      onUploadStart: null,
      onUploadProgress: null,
      onUploadSuccess: null,
      onUploadError: null,
      onUploadComplete: null,
      onDragEnter: null,
      onDragLeave: null,
      onDragOver: null,
      onDrop: null,
      onPreviewGenerate: null,
      generatePreview: null // 自定义预览生成函数
    };
  }

  /**
   * 获取初始状态
   * @private
   */
  _getInitialState() {
    return {
      ...super._getInitialState(),
      selectedFiles: [],
      isUploading: false,
      totalProgress: 0
    };
  }

  /**
   * 创建DOM元素
   * @private
   */
  _createElement() {
    // 创建主容器
    this.element = document.createElement('div');
    this.element.className = `jev-fileupload jev-fileupload-${this.options.theme}`;
    
    // 创建拖拽区域
    if (this.options.enableDragDrop) {
      this.dropZoneElement = document.createElement('div');
      this.dropZoneElement.className = 'jev-fileupload-dropzone';
      
      const dropZoneText = document.createElement('div');
      dropZoneText.className = 'jev-fileupload-dropzone-text';
      dropZoneText.textContent = this.options.dropZoneText;
      
      // 创建隐藏的文件输入
      this.inputElement = document.createElement('input');
      this.inputElement.type = 'file';
      this.inputElement.className = 'jev-fileupload-input';
      this.inputElement.name = this.options.name;
      this.inputElement.multiple = this.options.multiple;
      this.inputElement.accept = this.options.accept;
      
      // 创建浏览按钮
      if (this.options.showBrowseButton) {
        this.browseButtonElement = document.createElement('button');
        this.browseButtonElement.type = 'button';
        this.browseButtonElement.className = `jev-fileupload-button jev-fileupload-browse-button jev-fileupload-button-${this.options.buttonTheme}`;
        this.browseButtonElement.textContent = this.options.browseButtonText;
        
        // 按钮容器，用于点击事件传递
        const buttonContainer = document.createElement('span');
        buttonContainer.className = 'jev-fileupload-button-container';
        buttonContainer.appendChild(this.inputElement);
        buttonContainer.appendChild(this.browseButtonElement);
        
        dropZoneText.appendChild(document.createTextNode(' '));
        dropZoneText.appendChild(buttonContainer);
      } else {
        this.dropZoneElement.appendChild(this.inputElement);
      }
      
      this.dropZoneElement.appendChild(dropZoneText);
      this.element.appendChild(this.dropZoneElement);
    } else {
      // 不支持拖拽时，只显示文件输入和按钮
      this.inputElement = document.createElement('input');
      this.inputElement.type = 'file';
      this.inputElement.className = 'jev-fileupload-input';
      this.inputElement.name = this.options.name;
      this.inputElement.multiple = this.options.multiple;
      this.inputElement.accept = this.options.accept;
      
      this.element.appendChild(this.inputElement);
      
      if (this.options.showBrowseButton) {
        this.browseButtonElement = document.createElement('button');
        this.browseButtonElement.type = 'button';
        this.browseButtonElement.className = `jev-fileupload-button jev-fileupload-browse-button jev-fileupload-button-${this.options.buttonTheme}`;
        this.browseButtonElement.textContent = this.options.browseButtonText;
        
        this.element.appendChild(this.browseButtonElement);
      }
    }
    
    // 创建文件列表容器
    if (this.options.showFileList) {
      this.filesListElement = document.createElement('div');
      this.filesListElement.className = 'jev-fileupload-files';
      
      // 初始空状态
      const emptyState = document.createElement('div');
      emptyState.className = 'jev-fileupload-empty';
      emptyState.textContent = '未选择任何文件';
      this.filesListElement.appendChild(emptyState);
      
      this.element.appendChild(this.filesListElement);
    }
    
    // 创建操作按钮容器
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'jev-fileupload-actions';
    
    // 创建上传按钮
    if (this.options.showUploadButton && !this.options.autoUpload) {
      this.uploadButtonElement = document.createElement('button');
      this.uploadButtonElement.type = 'button';
      this.uploadButtonElement.className = `jev-fileupload-button jev-fileupload-upload-button jev-fileupload-button-${this.options.buttonTheme}`;
      this.uploadButtonElement.textContent = this.options.uploadButtonText;
      this.uploadButtonElement.disabled = true;
      
      actionsContainer.appendChild(this.uploadButtonElement);
    }
    
    // 创建清除按钮
    if (this.options.showClearButton) {
      this.clearButtonElement = document.createElement('button');
      this.clearButtonElement.type = 'button';
      this.clearButtonElement.className = 'jev-fileupload-button jev-fileupload-clear-button';
      this.clearButtonElement.textContent = '清除';
      this.clearButtonElement.disabled = true;
      
      actionsContainer.appendChild(this.clearButtonElement);
    }
    
    if (actionsContainer.children.length > 0) {
      this.element.appendChild(actionsContainer);
    }
  }

  /**
   * 应用样式
   * @private
   */
  _applyStyles() {
    // 添加全局样式
    this._addGlobalStyles();
    
    // 绑定事件
    this._bindEvents();
  }

  /**
   * 添加全局样式
   * @private
   */
  _addGlobalStyles() {
    const styleId = 'jev-fileupload-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 文件上传组件基础样式 */
      .jev-fileupload {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
      }
      
      /* 主题样式 - 默认 */
      .jev-fileupload-default {
        color: #333;
      }
      
      /* 主题样式 - 深色 */
      .jev-fileupload-dark {
        color: #e2e8f0;
      }
      
      /* 主题样式 - 霓虹灯 */
      .jev-fileupload-neon {
        color: #00ff99;
      }
      
      /* 拖拽区域样式 */
      .jev-fileupload-dropzone {
        border: 2px dashed #ddd;
        border-radius: 8px;
        padding: 40px 20px;
        text-align: center;
        transition: all 0.3s ease;
        background-color: #f8f9fa;
        cursor: pointer;
        position: relative;
      }
      
      .jev-fileupload-dark .jev-fileupload-dropzone {
        border-color: #4a5568;
        background-color: #2d3748;
      }
      
      .jev-fileupload-neon .jev-fileupload-dropzone {
        border-color: #00ff99;
        background-color: #1a1a1a;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.1);
      }
      
      .jev-fileupload-dropzone:hover {
        border-color: #17a2b8;
        background-color: #f1f8ff;
      }
      
      .jev-fileupload-dark .jev-fileupload-dropzone:hover {
        border-color: #38b2ac;
        background-color: #4a5568;
      }
      
      .jev-fileupload-neon .jev-fileupload-dropzone:hover {
        border-color: #00ff99;
        background-color: #232323;
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.2);
      }
      
      .jev-fileupload-dropzone.dragging {
        border-color: #17a2b8;
        background-color: #f1f8ff;
        transform: scale(1.02);
      }
      
      .jev-fileupload-dark .jev-fileupload-dropzone.dragging {
        border-color: #38b2ac;
        background-color: #4a5568;
      }
      
      .jev-fileupload-neon .jev-fileupload-dropzone.dragging {
        border-color: #00ff99;
        background-color: #232323;
        box-shadow: 0 0 30px rgba(0, 255, 153, 0.3);
      }
      
      /* 拖拽区域文本 */
      .jev-fileupload-dropzone-text {
        font-size: 16px;
        color: inherit;
        opacity: 0.8;
      }
      
      /* 文件输入样式 */
      .jev-fileupload-input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 1;
      }
      
      /* 按钮容器 */
      .jev-fileupload-button-container {
        position: relative;
        display: inline-block;
      }
      
      .jev-fileupload-button-container .jev-fileupload-input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
      }
      
      /* 按钮样式 */
      .jev-fileupload-button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      /* 按钮主题 - 主要 */
      .jev-fileupload-button-primary {
        background-color: #007bff;
        color: white;
      }
      
      .jev-fileupload-button-primary:hover:not(:disabled) {
        background-color: #0056b3;
      }
      
      /* 按钮主题 - 次要 */
      .jev-fileupload-button-secondary {
        background-color: #6c757d;
        color: white;
      }
      
      .jev-fileupload-button-secondary:hover:not(:disabled) {
        background-color: #545b62;
      }
      
      /* 按钮主题 - 边框 */
      .jev-fileupload-button-outline {
        background-color: transparent;
        border: 1px solid #007bff;
        color: #007bff;
      }
      
      .jev-fileupload-button-outline:hover:not(:disabled) {
        background-color: #007bff;
        color: white;
      }
      
      /* 深色主题下的按钮 */
      .jev-fileupload-dark .jev-fileupload-button-outline {
        border-color: #38b2ac;
        color: #38b2ac;
      }
      
      .jev-fileupload-dark .jev-fileupload-button-outline:hover:not(:disabled) {
        background-color: #38b2ac;
        color: white;
      }
      
      /* 霓虹灯主题下的按钮 */
      .jev-fileupload-neon .jev-fileupload-button-primary {
        background-color: #00ff99;
        color: #1a1a1a;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.3);
      }
      
      .jev-fileupload-neon .jev-fileupload-button-primary:hover:not(:disabled) {
        background-color: #00e68a;
        box-shadow: 0 0 20px rgba(0, 255, 153, 0.5);
      }
      
      /* 按钮禁用状态 */
      .jev-fileupload-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* 清除按钮样式 */
      .jev-fileupload-clear-button {
        background-color: transparent;
        color: inherit;
        border: 1px solid;
      }
      
      .jev-fileupload-clear-button:hover:not(:disabled) {
        background-color: rgba(0, 0, 0, 0.1);
      }
      
      .jev-fileupload-dark .jev-fileupload-clear-button:hover:not(:disabled) {
        background-color: rgba(255, 255, 255, 0.1);
      }
      
      /* 文件列表样式 */
      .jev-fileupload-files {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background-color: #fff;
      }
      
      .jev-fileupload-dark .jev-fileupload-files {
        border-color: #4a5568;
        background-color: #2d3748;
      }
      
      .jev-fileupload-neon .jev-fileupload-files {
        border-color: #00ff99;
        background-color: #1a1a1a;
      }
      
      /* 文件项样式 */
      .jev-fileupload-file-item {
        display: flex;
        align-items: center;
        padding: 12px;
        border-bottom: 1px solid #e2e8f0;
        transition: background-color 0.2s ease;
        position: relative;
      }
      
      .jev-fileupload-file-item:last-child {
        border-bottom: none;
      }
      
      .jev-fileupload-file-item:hover {
        background-color: #f8f9fa;
      }
      
      .jev-fileupload-dark .jev-fileupload-file-item {
        border-bottom-color: #4a5568;
      }
      
      .jev-fileupload-dark .jev-fileupload-file-item:hover {
        background-color: #4a5568;
      }
      
      .jev-fileupload-neon .jev-fileupload-file-item {
        border-bottom-color: #232323;
      }
      
      .jev-fileupload-neon .jev-fileupload-file-item:hover {
        background-color: #232323;
      }
      
      /* 文件图标 */
      .jev-fileupload-file-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        margin-right: 12px;
        background-color: #f1f3f4;
        border-radius: 4px;
      }
      
      .jev-fileupload-dark .jev-fileupload-file-icon {
        background-color: #4a5568;
      }
      
      .jev-fileupload-neon .jev-fileupload-file-icon {
        background-color: #232323;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.2);
      }
      
      /* 文件信息 */
      .jev-fileupload-file-info {
        flex: 1;
        min-width: 0;
      }
      
      .jev-fileupload-file-name {
        font-weight: 500;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .jev-fileupload-file-meta {
        font-size: 12px;
        opacity: 0.7;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      /* 文件预览 */
      .jev-fileupload-file-preview {
        width: 60px;
        height: 60px;
        margin-left: 12px;
        border-radius: 4px;
        overflow: hidden;
        background-color: #f1f3f4;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .jev-fileupload-dark .jev-fileupload-file-preview {
        background-color: #4a5568;
      }
      
      .jev-fileupload-file-preview img,
      .jev-fileupload-file-preview canvas {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      
      /* 移除按钮 */
      .jev-fileupload-file-remove {
        background: none;
        border: none;
        color: #dc3545;
        cursor: pointer;
        font-size: 16px;
        padding: 4px;
        margin-left: 8px;
        opacity: 0.7;
        transition: opacity 0.2s;
        flex-shrink: 0;
      }
      
      .jev-fileupload-file-remove:hover {
        opacity: 1;
      }
      
      /* 进度条 */
      .jev-fileupload-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background-color: #007bff;
        transition: width 0.2s ease;
      }
      
      .jev-fileupload-dark .jev-fileupload-progress {
        background-color: #38b2ac;
      }
      
      .jev-fileupload-neon .jev-fileupload-progress {
        background-color: #00ff99;
        box-shadow: 0 0 10px rgba(0, 255, 153, 0.5);
      }
      
      /* 上传状态 */
      .jev-fileupload-file-status {
        font-size: 12px;
        margin-left: 8px;
        flex-shrink: 0;
      }
      
      .jev-fileupload-file-status.success {
        color: #28a745;
      }
      
      .jev-fileupload-file-status.error {
        color: #dc3545;
      }
      
      .jev-fileupload-file-status.uploading {
        color: #17a2b8;
      }
      
      /* 空状态 */
      .jev-fileupload-empty {
        text-align: center;
        padding: 40px 20px;
        color: inherit;
        opacity: 0.5;
      }
      
      /* 操作按钮容器 */
      .jev-fileupload-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      
      /* 错误消息 */
      .jev-fileupload-error {
        color: #dc3545;
        font-size: 14px;
        margin-top: 8px;
        padding: 8px 12px;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 4px;
      }
      
      .jev-fileupload-dark .jev-fileupload-error {
        color: #f5c6cb;
        background-color: #4a1414;
        border-color: #721c24;
      }
      
      /* 响应式设计 */
      @media (max-width: 768px) {
        .jev-fileupload-dropzone {
          padding: 30px 15px;
        }
        
        .jev-fileupload-dropzone-text {
          font-size: 14px;
        }
        
        .jev-fileupload-button {
          padding: 6px 12px;
          font-size: 13px;
        }
        
        .jev-fileupload-file-item {
          padding: 8px;
        }
        
        .jev-fileupload-file-icon {
          width: 32px;
          height: 32px;
          font-size: 20px;
          margin-right: 8px;
        }
        
        .jev-fileupload-file-preview {
          width: 40px;
          height: 40px;
          margin-left: 8px;
        }
        
        .jev-fileupload-actions {
          flex-direction: column;
          gap: 8px;
        }
      }
      
      /* 动画效果 */
      @keyframes jev-fileupload-pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
      
      .jev-fileupload-file-item.uploading .jev-fileupload-file-icon {
        animation: jev-fileupload-pulse 1.5s infinite;
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 文件选择事件
    this.inputElement.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this._handleFiles(e.target.files);
        // 重置input以允许选择相同文件
        e.target.value = '';
      }
    });
    
    // 浏览按钮点击事件
    if (this.browseButtonElement) {
      this.browseButtonElement.addEventListener('click', () => {
        this.inputElement.click();
      });
    }
    
    // 拖拽事件
    if (this.options.enableDragDrop && this.dropZoneElement) {
      // 拖拽进入
      this.dropZoneElement.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        this.isDragging = true;
        this.dropZoneElement.classList.add('dragging');
        
        if (typeof this.options.onDragEnter === 'function') {
          try {
            this.options.onDragEnter(e);
          } catch (error) {
            logger.error('拖拽进入回调执行失败', error);
          }
        }
      });
      
      // 拖拽经过
      this.dropZoneElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (typeof this.options.onDragOver === 'function') {
          try {
            this.options.onDragOver(e);
          } catch (error) {
            logger.error('拖拽经过回调执行失败', error);
          }
        }
      });
      
      // 拖拽离开
      this.dropZoneElement.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // 检查是否完全离开
        setTimeout(() => {
          if (this.isDragging) {
            const rect = this.dropZoneElement.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
              this.isDragging = false;
              this.dropZoneElement.classList.remove('dragging');
              
              if (typeof this.options.onDragLeave === 'function') {
                try {
                  this.options.onDragLeave(e);
                } catch (error) {
                  logger.error('拖拽离开回调执行失败', error);
                }
              }
            }
          }
        }, 0);
      });
      
      // 放置文件
      this.dropZoneElement.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        this.isDragging = false;
        this.dropZoneElement.classList.remove('dragging');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this._handleFiles(e.dataTransfer.files);
        }
        
        if (typeof this.options.onDrop === 'function') {
          try {
            this.options.onDrop(e);
          } catch (error) {
            logger.error('文件放置回调执行失败', error);
          }
        }
      });
    }
    
    // 上传按钮点击事件
    if (this.uploadButtonElement) {
      this.uploadButtonElement.addEventListener('click', () => {
        this.uploadFiles();
      });
    }
    
    // 清除按钮点击事件
    if (this.clearButtonElement) {
      this.clearButtonElement.addEventListener('click', () => {
        this.clearFiles();
      });
    }
  }

  /**
   * 处理选择的文件
   * @private
   */
  _handleFiles(fileList) {
    const files = Array.from(fileList);
    const newFiles = [];
    const errors = [];
    
    // 检查文件数量限制
    if (this.options.maxFiles > 0 && 
        this.selectedFiles.length + files.length > this.options.maxFiles) {
      errors.push(this.options.maxFilesMessage);
      return this._showError(errors[0]);
    }
    
    // 验证并处理每个文件
    files.forEach(file => {
      // 创建文件包装对象
      const fileObj = {
        id: `jev-file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        extension: getFileExtension(file.name),
        progress: 0,
        status: 'pending', // pending, uploading, success, error
        error: null,
        retries: 0,
        preview: null
      };
      
      // 验证文件类型
      if (!this._isValidFileType(fileObj)) {
        errors.push(`${this.options.invalidFileTypeMessage}: ${fileObj.name}`);
        return;
      }
      
      // 验证文件大小
      if (!this._isValidFileSize(fileObj)) {
        errors.push(`${this.options.invalidFileSizeMessage}: ${fileObj.name}`);
        return;
      }
      
      newFiles.push(fileObj);
    });
    
    // 如果有错误，显示第一个错误
    if (errors.length > 0) {
      this._showError(errors[0]);
      // 仍然添加有效的文件
      if (newFiles.length > 0) {
        this._addFiles(newFiles);
      }
    } else {
      // 没有错误，添加所有文件
      this._addFiles(newFiles);
    }
  }

  /**
   * 验证文件类型
   * @private
   */
  _isValidFileType(fileObj) {
    if (!this.options.accept || this.options.accept === '*') {
      return true;
    }
    
    const acceptTypes = this.options.accept.split(',');
    
    for (const type of acceptTypes) {
      const trimmedType = type.trim();
      
      // 检查精确类型匹配
      if (trimmedType === fileObj.type) {
        return true;
      }
      
      // 检查通配符匹配（如 image/*）
      if (trimmedType.endsWith('*')) {
        const baseType = trimmedType.split('/')[0];
        if (fileObj.type.startsWith(baseType + '/')) {
          return true;
        }
      }
      
      // 检查扩展名匹配（如 .pdf）
      if (trimmedType.startsWith('.')) {
        if (fileObj.extension.toLowerCase() === trimmedType.toLowerCase().substring(1)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 验证文件大小
   * @private
   */
  _isValidFileSize(fileObj) {
    if (!this.options.maxSize || this.options.maxSize <= 0) {
      return true;
    }
    
    return fileObj.size <= this.options.maxSize;
  }

  /**
   * 添加文件到列表
   * @private
   */
  _addFiles(files) {
    // 添加到文件数组
    this.selectedFiles = [...this.selectedFiles, ...files];
    
    // 更新UI
    this._updateFileList();
    
    // 生成预览
    if (this.options.showPreview) {
      files.forEach(fileObj => {
        this._generatePreview(fileObj);
      });
    }
    
    // 触发文件添加回调
    if (typeof this.options.onFilesAdded === 'function') {
      try {
        this.options.onFilesAdded(files);
      } catch (error) {
        logger.error('文件添加回调执行失败', error);
      }
    }
    
    // 更新状态
    this.updateState({ selectedFiles: this.selectedFiles });
    
    // 如果设置了自动上传
    if (this.options.autoUpload) {
      this.uploadFiles();
    }
  }

  /**
   * 更新文件列表UI
   * @private
   */
  _updateFileList() {
    if (!this.options.showFileList || !this.filesListElement) {
      return;
    }
    
    // 清除文件列表
    this.filesListElement.innerHTML = '';
    
    // 检查是否有文件
    if (this.selectedFiles.length === 0) {
      // 显示空状态
      const emptyState = document.createElement('div');
      emptyState.className = 'jev-fileupload-empty';
      emptyState.textContent = '未选择任何文件';
      this.filesListElement.appendChild(emptyState);
      
      // 禁用按钮
      if (this.uploadButtonElement) {
        this.uploadButtonElement.disabled = true;
      }
      if (this.clearButtonElement) {
        this.clearButtonElement.disabled = true;
      }
    } else {
      // 添加文件项
      this.selectedFiles.forEach(fileObj => {
        const fileItem = this._createFileItemElement(fileObj);
        this.filesListElement.appendChild(fileItem);
      });
      
      // 启用按钮
      if (this.uploadButtonElement) {
        const canUpload = this.selectedFiles.some(file => 
          file.status === 'pending' || file.status === 'error'
        );
        this.uploadButtonElement.disabled = !canUpload || this.isUploading;
      }
      if (this.clearButtonElement) {
        this.clearButtonElement.disabled = false;
      }
    }
  }

  /**
   * 创建文件项元素
   * @private
   */
  _createFileItemElement(fileObj) {
    const fileItem = document.createElement('div');
    fileItem.className = `jev-fileupload-file-item ${fileObj.status}`;
    fileItem.setAttribute('data-id', fileObj.id);
    
    // 文件图标
    if (this.options.showFileIcon) {
      const fileIcon = document.createElement('div');
      fileIcon.className = 'jev-fileupload-file-icon';
      fileIcon.innerHTML = getFileIcon(fileObj.extension || fileObj.type);
      fileItem.appendChild(fileIcon);
    }
    
    // 文件信息
    const fileInfo = document.createElement('div');
    fileInfo.className = 'jev-fileupload-file-info';
    
    // 文件名
    const fileName = document.createElement('div');
    fileName.className = 'jev-fileupload-file-name';
    fileName.textContent = fileObj.name;
    fileInfo.appendChild(fileName);
    
    // 文件元信息
    const fileMeta = document.createElement('div');
    fileMeta.className = 'jev-fileupload-file-meta';
    
    // 文件大小
    if (this.options.showFileSize) {
      const fileSize = document.createElement('span');
      fileSize.className = 'jev-fileupload-file-size';
      fileSize.textContent = formatFileSize(fileObj.size);
      fileMeta.appendChild(fileSize);
    }
    
    // 文件状态
    const fileStatus = document.createElement('span');
    fileStatus.className = `jev-fileupload-file-status ${fileObj.status}`;
    
    switch (fileObj.status) {
      case 'success':
        fileStatus.textContent = '上传成功';
        break;
      case 'error':
        fileStatus.textContent = fileObj.error || '上传失败';
        break;
      case 'uploading':
        fileStatus.textContent = `上传中 ${fileObj.progress}%`;
        break;
      default:
        fileStatus.textContent = '等待上传';
    }
    
    fileMeta.appendChild(fileStatus);
    fileInfo.appendChild(fileMeta);
    fileItem.appendChild(fileInfo);
    
    // 文件预览
    if (this.options.showPreview && fileObj.preview) {
      const filePreview = document.createElement('div');
      filePreview.className = 'jev-fileupload-file-preview';
      
      if (typeof fileObj.preview === 'string') {
        if (fileObj.preview.startsWith('data:image')) {
          const img = document.createElement('img');
          img.src = fileObj.preview;
          img.alt = fileObj.name;
          filePreview.appendChild(img);
        } else {
          filePreview.innerHTML = fileObj.preview;
        }
      } else if (fileObj.preview instanceof HTMLElement) {
        filePreview.appendChild(fileObj.preview);
      }
      
      fileItem.appendChild(filePreview);
    }
    
    // 移除按钮
    const removeButton = document.createElement('button');
    removeButton.className = 'jev-fileupload-file-remove';
    removeButton.innerHTML = '&times;';
    removeButton.setAttribute('aria-label', `移除文件 ${fileObj.name}`);
    removeButton.addEventListener('click', () => {
      this.removeFile(fileObj.id);
    });
    
    fileItem.appendChild(removeButton);
    
    // 进度条（上传中显示）
    if (fileObj.status === 'uploading') {
      const progressBar = document.createElement('div');
      progressBar.className = 'jev-fileupload-progress';
      progressBar.style.width = `${fileObj.progress}%`;
      fileItem.appendChild(progressBar);
    }
    
    return fileItem;
  }

  /**
   * 生成文件预览
   * @private
   */
  _generatePreview(fileObj) {
    // 检查是否支持预览类型
    const canPreview = this.options.previewTypes.some(type => {
      if (type.endsWith('*')) {
        const baseType = type.split('/')[0];
        return fileObj.type.startsWith(baseType + '/');
      }
      return fileObj.type === type;
    });
    
    if (!canPreview) {
      return;
    }
    
    // 如果提供了自定义预览生成函数
    if (typeof this.options.generatePreview === 'function') {
      try {
        const customPreview = this.options.generatePreview(fileObj);
        if (customPreview) {
          fileObj.preview = customPreview;
          this._updateFilePreview(fileObj.id, customPreview);
        }
      } catch (error) {
        logger.error('自定义预览生成失败', error);
      }
      return;
    }
    
    // 内置预览生成
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        // 图片预览
        if (fileObj.type.startsWith('image/')) {
          fileObj.preview = e.target.result;
        } 
        // PDF预览（简单显示PDF图标）
        else if (fileObj.type === 'application/pdf') {
          fileObj.preview = '<div style="font-size: 32px;">📄</div>';
        }
        
        if (fileObj.preview) {
          this._updateFilePreview(fileObj.id, fileObj.preview);
          
          // 触发预览生成回调
          if (typeof this.options.onPreviewGenerate === 'function') {
            try {
              this.options.onPreviewGenerate(fileObj);
            } catch (error) {
              logger.error('预览生成回调执行失败', error);
            }
          }
        }
      } catch (error) {
        logger.error('文件预览生成失败', error);
      }
    };
    
    // 根据文件类型选择读取方式
    if (fileObj.type.startsWith('image/')) {
      reader.readAsDataURL(fileObj.file);
    } else {
      // 对于其他类型，我们不生成实际预览，但可以设置一个图标
      fileObj.preview = getFileIcon(fileObj.extension || fileObj.type);
      this._updateFilePreview(fileObj.id, fileObj.preview);
    }
  }

  /**
   * 更新文件预览
   * @private
   */
  _updateFilePreview(fileId, preview) {
    const fileItem = this.filesListElement?.querySelector(`[data-id="${fileId}"]`);
    if (!fileItem || !this.options.showPreview) {
      return;
    }
    
    // 查找或创建预览元素
    let previewElement = fileItem.querySelector('.jev-fileupload-file-preview');
    
    if (!previewElement) {
      previewElement = document.createElement('div');
      previewElement.className = 'jev-fileupload-file-preview';
      
      // 插入到移除按钮之前
      const removeButton = fileItem.querySelector('.jev-fileupload-file-remove');
      fileItem.insertBefore(previewElement, removeButton);
    }
    
    // 更新预览内容
    if (typeof preview === 'string') {
      if (preview.startsWith('data:image')) {
        const img = document.createElement('img');
        img.src = preview;
        img.alt = '文件预览';
        previewElement.innerHTML = '';
        previewElement.appendChild(img);
      } else {
        previewElement.innerHTML = preview;
      }
    } else if (preview instanceof HTMLElement) {
      previewElement.innerHTML = '';
      previewElement.appendChild(preview);
    }
  }

  /**
   * 显示错误消息
   * @private
   */
  _showError(message) {
    // 移除旧的错误消息
    const oldError = this.element.querySelector('.jev-fileupload-error');
    if (oldError) {
      oldError.remove();
    }
    
    // 创建新的错误消息
    const errorElement = document.createElement('div');
    errorElement.className = 'jev-fileupload-error';
    errorElement.textContent = message;
    
    // 添加到组件底部
    this.element.appendChild(errorElement);
    
    // 3秒后自动移除
    setTimeout(() => {
      errorElement.remove();
    }, 3000);
  }

  /**
   * 上传文件
   */
  uploadFiles() {
    if (this.isUploading || this.selectedFiles.length === 0) {
      return;
    }
    
    this.isUploading = true;
    this.updateState({ isUploading: true });
    
    // 禁用上传按钮
    if (this.uploadButtonElement) {
      this.uploadButtonElement.disabled = true;
    }
    
    // 获取待上传文件
    const filesToUpload = this.selectedFiles.filter(file => 
      file.status === 'pending' || file.status === 'error'
    );
    
    if (filesToUpload.length === 0) {
      this.isUploading = false;
      this.updateState({ isUploading: false });
      return;
    }
    
    // 触发上传前回调
    if (typeof this.options.onBeforeUpload === 'function') {
      try {
        const shouldContinue = this.options.onBeforeUpload(filesToUpload);
        if (shouldContinue === false) {
          this.isUploading = false;
          this.updateState({ isUploading: false });
          return;
        }
      } catch (error) {
        logger.error('上传前回调执行失败', error);
        this.isUploading = false;
        this.updateState({ isUploading: false });
        return;
      }
    }
    
    // 逐个上传文件
    let uploadCount = 0;
    const totalFiles = filesToUpload.length;
    
    const uploadNextFile = () => {
      if (uploadCount >= totalFiles) {
        // 所有文件上传完成
        this.isUploading = false;
        this.updateState({ isUploading: false });
        
        // 更新按钮状态
        if (this.uploadButtonElement) {
          const hasPendingFiles = this.selectedFiles.some(file => 
            file.status === 'pending' || file.status === 'error'
          );
          this.uploadButtonElement.disabled = !hasPendingFiles;
        }
        
        // 触发上传完成回调
        if (typeof this.options.onUploadComplete === 'function') {
          try {
            this.options.onUploadComplete(this.selectedFiles);
          } catch (error) {
            logger.error('上传完成回调执行失败', error);
          }
        }
        
        return;
      }
      
      const fileToUpload = filesToUpload[uploadCount];
      uploadCount++;
      
      this._uploadSingleFile(fileToUpload)
        .then(() => uploadNextFile())
        .catch(() => uploadNextFile());
    };
    
    // 开始上传第一个文件
    uploadNextFile();
  }

  /**
   * 上传单个文件
   * @private
   */
  _uploadSingleFile(fileObj) {
    return new Promise((resolve, reject) => {
      // 更新文件状态
      fileObj.status = 'uploading';
      fileObj.progress = 0;
      this._updateFileStatus(fileObj.id, 'uploading', 0);
      
      // 触发上传开始回调
      if (typeof this.options.onUploadStart === 'function') {
        try {
          this.options.onUploadStart(fileObj);
        } catch (error) {
          logger.error('上传开始回调执行失败', error);
        }
      }
      
      // 创建表单数据
      const formData = new FormData();
      formData.append(this.options.name, fileObj.file, fileObj.name);
      
      // 添加额外参数
      Object.entries(this.options.uploadParams).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      // 创建XHR
      const xhr = new XMLHttpRequest();
      
      // 保存XHR实例
      this.xhrInstances.set(fileObj.id, xhr);
      
      // 上传进度
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          fileObj.progress = progress;
          this._updateFileProgress(fileObj.id, progress);
          
          // 触发进度回调
          if (typeof this.options.onUploadProgress === 'function') {
            try {
              this.options.onUploadProgress(fileObj, progress);
            } catch (error) {
              logger.error('上传进度回调执行失败', error);
            }
          }
        }
      });
      
      // 上传完成
      xhr.addEventListener('load', () => {
        this.xhrInstances.delete(fileObj.id);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          // 上传成功
          fileObj.status = 'success';
          this._updateFileStatus(fileObj.id, 'success', 100);
          
          // 触发成功回调
          if (typeof this.options.onUploadSuccess === 'function') {
            try {
              let response = xhr.responseText;
              try {
                response = JSON.parse(response);
              } catch (e) {
                // 非JSON响应
              }
              this.options.onUploadSuccess(fileObj, response);
            } catch (error) {
              logger.error('上传成功回调执行失败', error);
            }
          }
          
          resolve();
        } else {
          // 上传失败
          this._handleUploadError(fileObj, xhr);
          reject();
        }
      });
      
      // 上传错误
      xhr.addEventListener('error', () => {
        this.xhrInstances.delete(fileObj.id);
        this._handleUploadError(fileObj, xhr);
        reject();
      });
      
      // 上传超时
      xhr.addEventListener('timeout', () => {
        this.xhrInstances.delete(fileObj.id);
        fileObj.error = '上传超时';
        this._handleUploadError(fileObj, xhr);
        reject();
      });
      
      // 配置XHR
      xhr.open(this.options.uploadMethod, this.options.uploadUrl, true);
      
      // 设置请求头
      Object.entries(this.options.uploadHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      
      // 发送请求
      try {
        xhr.send(formData);
      } catch (error) {
        this.xhrInstances.delete(fileObj.id);
        fileObj.error = error.message;
        this._updateFileStatus(fileObj.id, 'error', 0);
        reject();
      }
    });
  }

  /**
   * 处理上传错误
   * @private
   */
  _handleUploadError(fileObj, xhr) {
    fileObj.retries++;
    
    // 获取错误消息
    let errorMessage = '上传失败';
    try {
      const response = JSON.parse(xhr.responseText);
      if (response.error || response.message) {
        errorMessage = response.error || response.message;
      }
    } catch (e) {
      // 非JSON响应，使用状态文本
      if (xhr.statusText) {
        errorMessage = xhr.statusText;
      }
    }
    
    fileObj.error = errorMessage;
    
    // 更新文件状态
    this._updateFileStatus(fileObj.id, 'error', 0);
    
    // 触发错误回调
    if (typeof this.options.onUploadError === 'function') {
      try {
        this.options.onUploadError(fileObj, xhr);
      } catch (error) {
        logger.error('上传错误回调执行失败', error);
      }
    }
    
    // 自动重试
    if (this.options.retryLimit > 0 && fileObj.retries < this.options.retryLimit) {
      setTimeout(() => {
        if (this.isUploading) {
          this._uploadSingleFile(fileObj);
        }
      }, 1000 * fileObj.retries);
    }
  }

  /**
   * 更新文件状态
   * @private
   */
  _updateFileStatus(fileId, status, progress) {
    const fileItem = this.filesListElement?.querySelector(`[data-id="${fileId}"]`);
    if (!fileItem) return;
    
    // 更新类名
    fileItem.className = `jev-fileupload-file-item ${status}`;
    
    // 更新状态文本
    const statusElement = fileItem.querySelector('.jev-fileupload-file-status');
    if (statusElement) {
      statusElement.className = `jev-fileupload-file-status ${status}`;
      
      switch (status) {
        case 'success':
          statusElement.textContent = '上传成功';
          break;
        case 'error':
          const fileObj = this.selectedFiles.find(f => f.id === fileId);
          statusElement.textContent = fileObj?.error || '上传失败';
          break;
        case 'uploading':
          statusElement.textContent = `上传中 ${progress}%`;
          break;
        default:
          statusElement.textContent = '等待上传';
      }
    }
    
    // 更新进度条
    let progressBar = fileItem.querySelector('.jev-fileupload-progress');
    
    if (status === 'uploading') {
      if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'jev-fileupload-progress';
        fileItem.appendChild(progressBar);
      }
      progressBar.style.width = `${progress}%`;
    } else if (progressBar) {
      progressBar.remove();
    }
    
    // 如果启用了上传按钮，更新其状态
    if (this.uploadButtonElement) {
      const hasPendingFiles = this.selectedFiles.some(file => 
        file.status === 'pending' || file.status === 'error'
      );
      this.uploadButtonElement.disabled = !hasPendingFiles || this.isUploading;
    }
  }

  /**
   * 更新文件进度
   * @private
   */
  _updateFileProgress(fileId, progress) {
    const fileItem = this.filesListElement?.querySelector(`[data-id="${fileId}"]`);
    if (!fileItem) return;
    
    // 更新进度条
    const progressBar = fileItem.querySelector('.jev-fileupload-progress');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    
    // 更新状态文本
    const statusElement = fileItem.querySelector('.jev-fileupload-file-status');
    if (statusElement) {
      statusElement.textContent = `上传中 ${progress}%`;
    }
  }

  /**
   * 移除文件
   * @param {string} fileId - 文件ID
   */
  removeFile(fileId) {
    // 取消上传（如果正在上传）
    const xhr = this.xhrInstances.get(fileId);
    if (xhr) {
      xhr.abort();
      this.xhrInstances.delete(fileId);
    }
    
    // 从数组中移除
    const fileIndex = this.selectedFiles.findIndex(file => file.id === fileId);
    if (fileIndex !== -1) {
      const removedFile = this.selectedFiles[fileIndex];
      this.selectedFiles.splice(fileIndex, 1);
      
      // 更新UI
      this._updateFileList();
      
      // 更新状态
      this.updateState({ selectedFiles: this.selectedFiles });
      
      // 触发文件移除回调
      if (typeof this.options.onFileRemoved === 'function') {
        try {
          this.options.onFileRemoved(removedFile);
        } catch (error) {
          logger.error('文件移除回调执行失败', error);
        }
      }
    }
  }

  /**
   * 清除所有文件
   */
  clearFiles() {
    // 取消所有上传
    this.xhrInstances.forEach(xhr => xhr.abort());
    this.xhrInstances.clear();
    
    // 清空文件数组
    this.selectedFiles = [];
    
    // 更新UI
    this._updateFileList();
    
    // 更新状态
    this.updateState({ selectedFiles: [] });
  }

  /**
   * 获取选中的文件
   * @returns {Array} 文件对象数组
   */
  getFiles() {
    return [...this.selectedFiles];
  }

  /**
   * 获取原始文件对象
   * @returns {Array} File对象数组
   */
  getNativeFiles() {
    return this.selectedFiles.map(file => file.file);
  }

  /**
   * 暂停上传
   */
  pauseUploads() {
    // 目前不支持暂停，只是取消所有上传
    this.xhrInstances.forEach(xhr => xhr.abort());
    this.xhrInstances.clear();
    
    // 更新状态为错误
    this.selectedFiles.forEach(file => {
      if (file.status === 'uploading') {
        file.status = 'error';
        file.error = '上传已暂停';
        this._updateFileStatus(file.id, 'error', 0);
      }
    });
    
    this.isUploading = false;
    this.updateState({ isUploading: false });
  }

  /**
   * 取消上传
   */
  cancelUploads() {
    this.pauseUploads();
  }

  /**
   * 设置上传URL
   * @param {string} url - 新的上传URL
   */
  setUploadUrl(url) {
    this.options.uploadUrl = url;
  }

  /**
   * 设置可接受的文件类型
   * @param {string} accept - 接受的文件类型
   */
  setAccept(accept) {
    this.options.accept = accept;
    if (this.inputElement) {
      this.inputElement.accept = accept;
    }
  }

  /**
   * 设置最大文件大小
   * @param {number} size - 最大大小（字节）
   */
  setMaxSize(size) {
    this.options.maxSize = size;
  }

  /**
   * 设置最大文件数量
   * @param {number} count - 最大数量
   */
  setMaxFiles(count) {
    this.options.maxFiles = count;
  }

  /**
   * 获取上传状态
   * @returns {boolean} 是否正在上传
   */
  isUploading() {
    return this.isUploading;
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      // 取消所有上传
      this.xhrInstances.forEach(xhr => xhr.abort());
      this.xhrInstances.clear();
      
      // 清空文件
      this.selectedFiles = [];
      
      // 移除DOM元素
      if (this.element && this.element.parentNode) {
        this.element.remove();
      }
      
      this.isUploading = false;
      this.isDragging = false;
      
    } catch (error) {
      logger.error('文件上传组件销毁失败', error);
    }
  }
}

export default FileUpload;