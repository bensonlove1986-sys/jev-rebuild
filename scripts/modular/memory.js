/**
 * 记忆模块
 * 负责存储对话上下文和历史识别结果
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';
import uiManager from '../components/UIManager.js'; // 导入新的UI管理器

class MemoryModule {
  constructor() {
    this._dialogHistory = [];
    this._ocrHistory = [];
    this._maxHistorySize = 50; // 最大历史记录数量
    this._storageKeyPrefix = 'jev_memory_';
    this._ui = uiManager; // 使用新的UI管理器
    this._uiElements = {}; // 存储UI元素引用
  }

  /**
   * 模块初始化逻辑
   */
  async init() {
    try {
      logger.info('记忆模块初始化开始');
      
      // 确保配置存在
      if (!config.get('memory')) {
        config.set('memory', {
          enabled: true,
          maxHistorySize: 50,
          persistInterval: 30000, // 30秒自动保存一次
          autoLoad: true
        });
      }
      
      this._maxHistorySize = config.get('memory.maxHistorySize');
      
      // 加载历史数据
      if (config.get('memory.autoLoad')) {
        await this._loadHistory();
      }
      
      // 设置自动保存定时器
      this._startAutoPersist();
      
      logger.info('记忆模块初始化完成');
      return true;
    } catch (error) {
      logger.error('记忆模块初始化失败', error);
      return false;
    }
  }

  /**
   * UI初始化方法
   */
  async initUI() {
    try {
      logger.info('记忆模块UI初始化开始');
      
      // 创建记忆面板
      const memoryPanel = this._ui.createPanel({
        id: 'jev-memory-panel',
        title: '记忆管理',
        width: 220,
        position: 'top-right',
        draggable: true,
        closeable: true
      });
      
      await memoryPanel.initialize();
      const contentElement = memoryPanel.element.querySelector('.jev-panel-content');
      
      // 创建记忆模块状态区
      const memoryStatus = document.createElement('div');
      memoryStatus.id = 'jevMemoryStatus';
      memoryStatus.className = 'jev-memory-status';
      memoryStatus.style.marginBottom = 'var(--jev-spacing-md)';
      memoryStatus.style.padding = 'var(--jev-spacing-sm)';
      memoryStatus.innerHTML = `
        <div class="jev-mb-xs">对话历史: <span id="jevDialogCount">0</span> 条</div>
        <div>识别历史: <span id="jevOcrCount">0</span> 条</div>
      `;
      
      // 创建记忆管理按钮
      const memoryBtn = this._ui.createButton({
        text: '管理',
        type: 'default',
        onClick: () => this._handleMemoryManagement()
      });
      
      await memoryBtn.initialize();
      memoryBtn.element.style.width = '100%';
      
      // 添加到面板
      contentElement.appendChild(memoryStatus);
      contentElement.appendChild(memoryBtn.element);
      
      // 保存UI引用
      this._uiElements.panel = memoryPanel;
      this._uiElements.status = memoryStatus;
      this._uiElements.button = memoryBtn;
      
      // 更新状态显示
      this._updateStatusDisplay();
      
      // 挂载面板
      memoryPanel.mount();
      
      logger.info('记忆模块UI初始化完成');
      return true;
    } catch (error) {
      logger.error('记忆模块UI初始化失败', error);
      return false;
    }
  }

  /**
   * 执行核心功能
   * @param {Object} data - 包含要存储或检索的数据
   */
  async run(data = {}) {
    try {
      logger.info('执行记忆功能', { data });
      
      const { action, content, type } = data;
      
      switch (action) {
        case 'store':
          return this._storeData(content, type);
        case 'retrieve':
          return this._retrieveData(type, data.limit, data.filter);
        case 'clear':
          return this._clearData(type);
        case 'search':
          return this._searchData(data.query, type);
        default:
          throw new Error(`未知的动作类型: ${action}`);
      }
    } catch (error) {
      logger.error('记忆功能执行失败', error);
      throw error;
    }
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      logger.info('记忆模块清理开始');
      
      // 停止自动保存
      this._stopAutoPersist();
      
      // 移除UI元素
      if (this._uiElements.panel) {
        this._uiElements.panel.unmount();
        delete this._uiElements.panel;
      }
      
      // 移除DOM元素引用
      const memoryStatus = document.querySelector('#jevMemoryStatus');
      const memoryBtn = document.querySelector('#jevMemoryBtn');
      if (memoryStatus && memoryStatus.parentNode) memoryStatus.parentNode.removeChild(memoryStatus);
      if (memoryBtn && memoryBtn.parentNode) memoryBtn.parentNode.removeChild(memoryBtn);
      
      // 关闭所有相关对话框
      this._ui.closeAllDialogs();
      
      // 清理数据
      this._dialogHistory = [];
      this._ocrHistory = [];
      
      logger.info('记忆模块清理完成');
      return true;
    } catch (error) {
      logger.error('记忆模块清理失败', error);
      return false;
    }
  }

  /**
   * 存储数据
   * @private
   */
  _storeData(content, type) {
    if (!content) {
      throw new Error('内容不能为空');
    }
    
    const timestamp = new Date().toISOString();
    const item = {
      id: utils.generateUniqueId(),
      content,
      timestamp,
      metadata: {
        pageUrl: window.location.href,
        pageTitle: document.title
      }
    };
    
    if (type === 'dialog') {
      this._dialogHistory.push(item);
      this._trimHistory(this._dialogHistory);
    } else if (type === 'ocr') {
      this._ocrHistory.push(item);
      this._trimHistory(this._ocrHistory);
    } else {
      throw new Error(`未知的数据类型: ${type}`);
    }
    
    // 自动保存
    this._persistHistory();
    this._updateStatusDisplay();
    
    logger.info(`已存储${type}数据`, { id: item.id });
    return item;
  }

  /**
   * 检索数据
   * @private
   */
  _retrieveData(type, limit = 10, filter = null) {
    let history;
    
    if (type === 'dialog') {
      history = this._dialogHistory;
    } else if (type === 'ocr') {
      history = this._ocrHistory;
    } else if (type === 'all') {
      history = [...this._dialogHistory, ...this._ocrHistory].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
    } else {
      throw new Error(`未知的数据类型: ${type}`);
    }
    
    // 应用过滤器
    let filtered = history;
    if (filter) {
      filtered = history.filter(item => {
        if (typeof filter === 'function') {
          return filter(item);
        }
        return true;
      });
    }
    
    // 返回最新的N条
    return filtered.slice(-limit).reverse();
  }

  /**
   * 清理数据
   * @private
   */
  _clearData(type) {
    if (type === 'dialog') {
      this._dialogHistory = [];
      localStorage.removeItem(`${this._storageKeyPrefix}dialog`);
    } else if (type === 'ocr') {
      this._ocrHistory = [];
      localStorage.removeItem(`${this._storageKeyPrefix}ocr`);
    } else if (type === 'all') {
      this._dialogHistory = [];
      this._ocrHistory = [];
      localStorage.removeItem(`${this._storageKeyPrefix}dialog`);
      localStorage.removeItem(`${this._storageKeyPrefix}ocr`);
    } else {
      throw new Error(`未知的数据类型: ${type}`);
    }
    
    this._updateStatusDisplay();
    logger.info(`已清理${type}数据`);
    return { success: true };
  }

  /**
   * 搜索数据
   * @private
   */
  _searchData(query, type) {
    if (!query) {
      throw new Error('搜索查询不能为空');
    }
    
    const searchTerm = query.toLowerCase();
    const results = [];
    
    if (type === 'dialog' || type === 'all') {
      const dialogResults = this._dialogHistory.filter(item => 
        JSON.stringify(item.content).toLowerCase().includes(searchTerm)
      );
      results.push(...dialogResults);
    }
    
    if (type === 'ocr' || type === 'all') {
      const ocrResults = this._ocrHistory.filter(item => 
        JSON.stringify(item.content).toLowerCase().includes(searchTerm)
      );
      results.push(...ocrResults);
    }
    
    // 按时间排序
    return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * 加载历史数据
   * @private
   */
  async _loadHistory() {
    try {
      const dialogData = localStorage.getItem(`${this._storageKeyPrefix}dialog`);
      const ocrData = localStorage.getItem(`${this._storageKeyPrefix}ocr`);
      
      if (dialogData) {
        this._dialogHistory = JSON.parse(dialogData);
        logger.info(`加载了${this._dialogHistory.length}条对话历史`);
      }
      
      if (ocrData) {
        this._ocrHistory = JSON.parse(ocrData);
        logger.info(`加载了${this._ocrHistory.length}条识别历史`);
      }
      
      // 裁剪历史数据
      this._trimHistory(this._dialogHistory);
      this._trimHistory(this._ocrHistory);
      
    } catch (error) {
      logger.error('加载历史数据失败', error);
    }
  }

  /**
   * 持久化历史数据
   * @private
   */
  _persistHistory() {
    try {
      localStorage.setItem(`${this._storageKeyPrefix}dialog`, JSON.stringify(this._dialogHistory));
      localStorage.setItem(`${this._storageKeyPrefix}ocr`, JSON.stringify(this._ocrHistory));
      logger.debug('历史数据已持久化');
    } catch (error) {
      logger.error('持久化历史数据失败', error);
    }
  }

  /**
   * 裁剪历史数据
   * @private
   */
  _trimHistory(historyArray) {
    if (historyArray.length > this._maxHistorySize) {
      const removed = historyArray.splice(0, historyArray.length - this._maxHistorySize);
      logger.debug(`裁剪了${removed.length}条历史记录`);
    }
  }

  /**
   * 启动自动保存
   * @private
   */
  _startAutoPersist() {
    this._autoPersistTimer = setInterval(() => {
      this._persistHistory();
    }, config.get('memory.persistInterval'));
  }

  /**
   * 停止自动保存
   * @private
   */
  _stopAutoPersist() {
    if (this._autoPersistTimer) {
      clearInterval(this._autoPersistTimer);
      this._autoPersistTimer = null;
    }
  }

  /**
   * 更新状态显示
   * @private
   */
  _updateStatusDisplay() {
    const dialogCountEl = document.querySelector('#jevDialogCount');
    const ocrCountEl = document.querySelector('#jevOcrCount');
    
    if (dialogCountEl) {
      dialogCountEl.textContent = this._dialogHistory.length;
    }
    
    if (ocrCountEl) {
      ocrCountEl.textContent = this._ocrHistory.length;
    }
  }

  /**
   * 处理记忆管理
   * @private
   */
  async _handleMemoryManagement() {
    try {
      // 创建统计信息内容
      const statsContent = document.createElement('div');
      const totalStorage = JSON.stringify(this._dialogHistory).length + JSON.stringify(this._ocrHistory).length;
      
      statsContent.innerHTML = `
        <div class="jev-mb-md">
          <h4 class="jev-mb-sm">记忆模块统计信息</h4>
          <ul class="jev-list">
            <li>对话历史: <span id="memoryDialogCount">${this._dialogHistory.length}</span> 条</li>
            <li>识别历史: <span id="memoryOcrCount">${this._ocrHistory.length}</span> 条</li>
            <li>总存储: ${totalStorage} 字节</li>
            <li>最大容量: ${this._maxHistorySize} 条/类型</li>
          </ul>
        </div>
      `;
      
      // 创建管理对话框
      const dialog = this._ui.createDialog({
        title: '记忆管理',
        content: statsContent,
        width: 400,
        height: 300,
        buttons: [
          {
            text: '查看对话历史',
            type: 'primary',
            onClick: () => this._showHistoryDialog('dialog')
          },
          {
            text: '查看识别历史',
            type: 'success',
            onClick: () => this._showHistoryDialog('ocr')
          },
          {
            text: '清空所有记忆',
            type: 'danger',
            onClick: async () => {
              await this._handleClearAllMemory(dialog);
            }
          },
          {
            text: '关闭',
            onClick: () => {
              dialog.close();
            }
          }
        ]
      });
      
      await dialog.initialize();
      dialog.mount();
      dialog.open();
      
    } catch (error) {
      logger.error('打开记忆管理对话框失败', error);
      this._ui.showMessage('打开记忆管理对话框失败: ' + error.message, {
        type: 'error',
        duration: 5000
      });
    }
  }
  
  /**
   * 显示历史记录对话框
   * @private
   */
  async _showHistoryDialog(type) {
    try {
      const historyData = this._retrieveData(type, 20);
      
      // 创建搜索区域
      const searchContainer = document.createElement('div');
      searchContainer.className = 'jev-search-container';
      searchContainer.style.marginBottom = 'var(--jev-spacing-md)';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = `搜索${type === 'dialog' ? '对话' : 'OCR'}内容...`;
      searchInput.className = 'jev-search-input';
      searchInput.style.width = '100%';
      searchInput.style.padding = 'var(--jev-spacing-sm)';
      searchInput.style.border = '1px solid var(--jev-color-primary)';
      searchInput.style.borderRadius = 'var(--jev-border-radius)';
      searchInput.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
      searchInput.style.color = 'white';
      
      searchContainer.appendChild(searchInput);
      
      // 创建内容区域
      const contentContainer = document.createElement('div');
      
      // 显示历史记录列表
      const historyList = document.createElement('div');
      historyList.className = 'jev-history-list';
      historyList.style.maxHeight = '300px';
      historyList.style.overflowY = 'auto';
      
      if (historyData.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'jev-empty-message';
        emptyMessage.textContent = `暂无${type === 'dialog' ? '对话' : 'OCR'}历史`;
        emptyMessage.style.textAlign = 'center';
        emptyMessage.style.color = 'rgba(255, 255, 255, 0.6)';
        emptyMessage.style.padding = 'var(--jev-spacing-lg)';
        historyList.appendChild(emptyMessage);
      } else {
        historyData.forEach((item, index) => {
          const historyItem = document.createElement('div');
          historyItem.className = 'jev-history-item';
          historyItem.style.marginBottom = 'var(--jev-spacing-md)';
          historyItem.style.padding = 'var(--jev-spacing-sm)';
          historyItem.style.borderLeft = '3px solid var(--jev-color-primary)';
          historyItem.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          
          const itemHeader = document.createElement('div');
          itemHeader.className = 'jev-history-item-header';
          itemHeader.style.display = 'flex';
          itemHeader.style.justifyContent = 'space-between';
          itemHeader.style.marginBottom = 'var(--jev-spacing-xs)';
          
          const itemTime = document.createElement('span');
          itemTime.textContent = new Date(item.timestamp).toLocaleString();
          itemTime.style.fontSize = '12px';
          itemTime.style.color = 'rgba(255, 255, 255, 0.6)';
          
          const deleteButton = this._ui.createButton({
            text: '删除',
            type: 'danger',
            size: 'small',
            onClick: async (e) => {
              e.stopPropagation();
              
              this._ui.showConfirmDialog({
                title: '确认删除',
                message: '确定要删除这条记录吗？',
                onConfirm: async () => {
                  // 从历史记录中删除对应的条目
                  if (type === 'dialog') {
                    this._dialogHistory = this._dialogHistory.filter(h => h.id !== item.id);
                  } else {
                    this._ocrHistory = this._ocrHistory.filter(h => h.id !== item.id);
                  }
                  
                  await this._persistHistory();
                  historyList.removeChild(historyItem);
                  this._updateStatusDisplay();
                  
                  // 检查是否为空
                  if (historyList.children.length === 0) {
                    const emptyMessage = document.createElement('p');
                    emptyMessage.className = 'jev-empty-message';
                    emptyMessage.textContent = `暂无${type === 'dialog' ? '对话' : 'OCR'}历史`;
                    emptyMessage.style.textAlign = 'center';
                    emptyMessage.style.color = 'rgba(255, 255, 255, 0.6)';
                    emptyMessage.style.padding = 'var(--jev-spacing-lg)';
                    historyList.appendChild(emptyMessage);
                  }
                }
              });
            }
          });
          
          deleteButton.initialize().then(() => {
            itemHeader.appendChild(itemTime);
            itemHeader.appendChild(deleteButton.element);
          });
          
          const itemContent = document.createElement('div');
          itemContent.className = 'jev-history-item-content';
          itemContent.style.fontSize = '14px';
          itemContent.style.whiteSpace = 'pre-wrap';
          
          // 尝试格式化内容显示
          try {
            if (typeof item.content === 'object') {
              itemContent.textContent = JSON.stringify(item.content, null, 2).substring(0, 300);
            } else {
              itemContent.textContent = String(item.content).substring(0, 300);
            }
          } catch (e) {
            itemContent.textContent = String(item.content).substring(0, 300);
          }
          
          if (String(item.content).length > 300) {
            itemContent.textContent += '...';
          }
          
          historyItem.appendChild(itemHeader);
          historyItem.appendChild(itemContent);
          historyList.appendChild(historyItem);
        });
      }
      
      contentContainer.appendChild(searchContainer);
      contentContainer.appendChild(historyList);
      
      // 创建对话框
      const dialog = this._ui.createDialog({
        title: `${type === 'dialog' ? '对话' : 'OCR'}历史`,
        content: contentContainer,
        width: 600,
        height: 450,
        buttons: [
          {
            text: `清空${type === 'dialog' ? '对话' : 'OCR'}历史`,
            type: 'danger',
            onClick: async () => {
              await this._handleClearHistory(type, dialog);
            }
          },
          {
            text: '关闭',
            onClick: () => {
              dialog.close();
            }
          }
        ]
      });
      
      await dialog.initialize();
      dialog.mount();
      dialog.open();
      
      // 添加搜索功能
      searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const historyItems = historyList.querySelectorAll('.jev-history-item');
        
        historyItems.forEach(item => {
          const content = item.querySelector('.jev-history-item-content').textContent.toLowerCase();
          item.style.display = content.includes(searchTerm) ? 'block' : 'none';
        });
      });
      
    } catch (error) {
      logger.error('显示历史记录对话框失败', error);
      this._ui.showMessage('显示历史记录失败: ' + error.message, {
        type: 'error',
        duration: 5000
      });
    }
  }
  
  /**
   * 处理清空所有记忆
   * @private
   */
  async _handleClearAllMemory(dialog) {
    try {
      await this._ui.showConfirmDialog({
        title: '确认清空',
        message: '确定要清空所有记忆数据吗？此操作不可恢复。',
        onConfirm: async () => {
          await this._clearData('all');
          
          // 更新统计信息显示
          const dialogCountEl = document.querySelector('#memoryDialogCount');
          const ocrCountEl = document.querySelector('#memoryOcrCount');
          if (dialogCountEl) dialogCountEl.textContent = '0';
          if (ocrCountEl) ocrCountEl.textContent = '0';
          
          this._updateStatusDisplay();
          
          this._ui.showMessage('所有记忆数据已清空', {
            type: 'success',
            duration: 3000
          });
        }
      });
    } catch (error) {
      logger.error('清空记忆数据失败', error);
      this._ui.showMessage('清空记忆数据失败: ' + error.message, {
        type: 'error',
        duration: 5000
      });
    }
  }
  
  /**
   * 处理清空特定类型的历史
   * @private
   */
  async _handleClearHistory(type, dialog) {
    try {
      await this._ui.showConfirmDialog({
        title: '确认清空',
        message: `确定要清空所有${type === 'dialog' ? '对话' : 'OCR'}历史吗？此操作不可恢复。`,
        onConfirm: async () => {
          await this._clearData(type);
          dialog.close();
          this._updateStatusDisplay();
          
          this._ui.showMessage(`${type === 'dialog' ? '对话' : 'OCR'}历史已清空`, {
            type: 'success',
            duration: 3000
          });
        }
      });
    } catch (error) {
      logger.error(`清空${type}历史失败`, error);
      this._ui.showMessage(`清空${type}历史失败: ` + error.message, {
        type: 'error',
        duration: 5000
      });
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      dialogCount: this._dialogHistory.length,
      ocrCount: this._ocrHistory.length,
      maxSize: this._maxHistorySize,
      storageUsage: JSON.stringify(this._dialogHistory).length + JSON.stringify(this._ocrHistory).length
    };
  }
}

// 创建模块实例
const memoryModule = new MemoryModule();

// 注册模块
if (typeof JEV !== 'undefined' && JEV.Modules) {
  JEV.Modules.register('memory', memoryModule);
}

export default memoryModule;