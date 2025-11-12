/**
 * Worker模块
 * 负责处理后台任务和异步操作，符合JEV模块规范
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';
import workerManager from './worker.js';

class WorkerModule {
  constructor() {
    this.name = 'worker';
    this.status = 'idle'; // idle, ready, busy, error
    this.uiInitialized = false;
    this.statusElement = null;
  }

  /**
   * 初始化模块
   */
  async init() {
    try {
      logger.info(`正在初始化${this.name}模块`);
      
      // 检查Worker状态
      const isAvailable = await workerManager.checkStatus();
      this.status = isAvailable ? 'ready' : 'error';
      
      if (isAvailable) {
        logger.info(`${this.name}模块初始化成功`);
      } else {
        logger.error(`${this.name}模块初始化失败: Worker服务不可用`);
      }
      
      return { success: isAvailable, status: this.status };
    } catch (error) {
      logger.error(`${this.name}模块初始化失败`, error);
      this.status = 'error';
      return { success: false, error: error.message, status: this.status };
    }
  }

  /**
   * 初始化UI
   */
  async initUI() {
    try {
      logger.info(`正在初始化${this.name}模块UI`);
      
      // 确保jevPanel存在
      let jevPanel = document.querySelector('#jevPanel');
      if (!jevPanel) {
        jevPanel = document.createElement('div');
        jevPanel.id = 'jevPanel';
        document.body.appendChild(jevPanel);
      }
      
      // 创建Worker容器
      this.statusElement = document.createElement('div');
      this.statusElement.id = 'jevWorkerStatus';
      this.statusElement.className = 'jev-worker-status';
      
      // 创建Worker操作区域
      const workerContainer = document.createElement('div');
      workerContainer.innerHTML = `
        <div class="jev-worker-status-header">
          <span class="jev-worker-status-title">Worker服务</span>
          <span id="jevWorkerStatusIndicator" class="jev-status-indicator ${this.status}">${this.status}</span>
        </div>
        <div id="jevWorkerStatusInfo" class="jev-worker-status-info">
          正在连接到Worker服务...
        </div>
        
        <div class="jev-worker-actions">
          <button id="jevProcessImageBtn" class="jev-worker-btn">处理图片</button>
          <button id="jevCheckStatusBtn" class="jev-worker-btn">检查状态</button>
          <input type="file" id="jevImageInput" accept="image/*" style="display: none;">
        </div>
      `;
      
      this.statusElement.appendChild(workerContainer);
      jevPanel.appendChild(this.statusElement);
      
      // 添加样式
      this._addStyles();
      
      // 绑定事件
      this._bindEvents();
      
      // 更新状态显示
      this._updateStatusUI();
      
      this.uiInitialized = true;
      logger.info(`${this.name}模块UI初始化成功`);
      return { success: true };
    } catch (error) {
      logger.error(`${this.name}模块UI初始化失败`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 绑定事件
   * @private
   */
  _bindEvents() {
    // 处理图片按钮
    const processImageBtn = document.querySelector('#jevProcessImageBtn');
    if (processImageBtn) {
      processImageBtn.addEventListener('click', async () => {
        const imageInput = document.querySelector('#jevImageInput');
        if (imageInput) {
          imageInput.click();
          imageInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
              processImageBtn.disabled = true;
              processImageBtn.innerText = '处理中...';
              
              try {
                // 显示处理中状态
                const statusInfo = document.querySelector('#jevWorkerStatusInfo');
                if (statusInfo) {
                  statusInfo.textContent = `正在处理图片: ${file.name}`;
                }
                
                // 调用处理图片方法
                const result = await this.processImage(file, {
                  resize: true,
                  maxWidth: 1024,
                  format: 'jpeg'
                });
                
                if (result.success) {
                  // 显示成功信息
                  if (statusInfo) {
                    statusInfo.textContent = '图片处理成功！';
                  }
                  
                  // 显示结果
                  alert('图片处理成功！\n\n结果:\n' + JSON.stringify(result.result, null, 2));
                } else {
                  throw new Error(result.error || '处理失败');
                }
              } catch (error) {
                const statusInfo = document.querySelector('#jevWorkerStatusInfo');
                if (statusInfo) {
                  statusInfo.textContent = `处理失败: ${error.message}`;
                }
                alert('图片处理失败: ' + error.message);
              } finally {
                // 重置按钮状态
                processImageBtn.disabled = false;
                processImageBtn.innerText = '处理图片';
                // 重置文件输入
                imageInput.value = '';
                // 延迟更新状态
                setTimeout(() => this._updateStatusUI(), 2000);
              }
            }
          };
        }
      });
    }
    
    // 检查状态按钮
    const checkStatusBtn = document.querySelector('#jevCheckStatusBtn');
    if (checkStatusBtn) {
      checkStatusBtn.addEventListener('click', async () => {
        checkStatusBtn.disabled = true;
        checkStatusBtn.innerText = '检查中...';
        
        try {
          const result = await this.checkStatus();
          const statusInfo = document.querySelector('#jevWorkerStatusInfo');
          
          if (result.success) {
            if (statusInfo) {
              statusInfo.textContent = 'Worker服务状态检查成功';
            }
            alert('Worker服务状态: ' + result.status);
          } else {
            if (statusInfo) {
              statusInfo.textContent = 'Worker服务不可用';
            }
            alert('Worker服务状态: 不可用');
          }
        } catch (error) {
          const statusInfo = document.querySelector('#jevWorkerStatusInfo');
          if (statusInfo) {
            statusInfo.textContent = `状态检查失败: ${error.message}`;
          }
          alert('状态检查失败: ' + error.message);
        } finally {
          // 重置按钮状态
          checkStatusBtn.disabled = false;
          checkStatusBtn.innerText = '检查状态';
          // 延迟更新状态
          setTimeout(() => this._updateStatusUI(), 2000);
        }
      });
    }
  }

  /**
   * 执行核心功能
   * @param {Object} data - 执行数据
   */
  async run(data) {
    try {
      if (!data || !data.method) {
        throw new Error('缺少必要的method参数');
      }
      
      logger.info(`执行${this.name}模块功能`, { method: data.method });
      
      // 更新状态
      this.status = 'busy';
      this._updateStatusUI();
      
      // 执行Worker调用
      const result = await workerManager.callWorker(data.method, data.params || {}, data.options || {});
      
      // 更新状态
      this.status = 'ready';
      this._updateStatusUI();
      
      logger.info(`${this.name}模块功能执行成功`, { method: data.method });
      return { success: true, result };
    } catch (error) {
      logger.error(`${this.name}模块功能执行失败`, error);
      
      // 更新状态
      this.status = 'error';
      this._updateStatusUI();
      
      return { success: false, error: error.message };
    }
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      logger.info(`正在销毁${this.name}模块`);
      
      // 断开Worker连接
      workerManager.disconnect();
      
      // 清理UI
      if (this.statusElement && this.statusElement.parentNode) {
        this.statusElement.parentNode.removeChild(this.statusElement);
      }
      
      this.status = 'idle';
      this.uiInitialized = false;
      
      logger.info(`${this.name}模块销毁成功`);
      return { success: true };
    } catch (error) {
      logger.error(`${this.name}模块销毁失败`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 处理图片
   * @param {File|Blob|string} imageData - 图片数据
   * @param {Object} options - 处理选项
   */
  async processImage(imageData, options = {}) {
    return this.run({
      method: 'processImage',
      params: { imageData, options }
    });
  }

  /**
   * 检查Worker状态
   */
  async checkStatus() {
    const isAvailable = await workerManager.checkStatus();
    this.status = isAvailable ? 'ready' : 'error';
    this._updateStatusUI();
    return { success: isAvailable, status: this.status };
  }

  /**
   * 更新配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    workerManager.updateConfig(newConfig);
    return { success: true };
  }

  /**
   * 更新状态UI
   * @private
   */
  _updateStatusUI() {
    if (!this.uiInitialized || !this.statusElement) return;
    
    const indicator = document.querySelector('#jevWorkerStatusIndicator');
    const info = document.querySelector('#jevWorkerStatusInfo');
    
    if (indicator) {
      indicator.className = `jev-status-indicator ${this.status}`;
      indicator.textContent = this.status;
    }
    
    if (info) {
      const statusTexts = {
        idle: '等待初始化...',
        ready: 'Worker服务可用',
        busy: '正在处理任务...',
        error: 'Worker服务不可用'
      };
      
      info.textContent = statusTexts[this.status] || '未知状态';
    }
  }

  /**
   * 添加样式
   * @private
   */
  _addStyles() {
    if (document.querySelector('#jevWorkerStyles')) return;
    
    const style = document.createElement('style');
    style.id = 'jevWorkerStyles';
    style.textContent = `
      .jev-worker-status {
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
        font-size: 12px;
      }
      .jev-worker-status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .jev-worker-status-title {
        font-weight: bold;
        font-size: 14px;
      }
      .jev-status-indicator {
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
      }
      .jev-status-indicator.idle {
        background-color: #ccc;
        color: #666;
      }
      .jev-status-indicator.ready {
        background-color: #4caf50;
        color: white;
      }
      .jev-status-indicator.busy {
        background-color: #2196f3;
        color: white;
      }
      .jev-status-indicator.error {
        background-color: #f44336;
        color: white;
      }
      .jev-worker-status-info {
        color: #666;
        font-size: 11px;
        margin-bottom: 8px;
        min-height: 16px;
      }
      .jev-worker-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .jev-worker-btn {
        padding: 6px 12px;
        background-color: #2196f3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s;
      }
      .jev-worker-btn:hover {
        background-color: #1976d2;
      }
      .jev-worker-btn:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// 创建模块实例
const workerModule = new WorkerModule();

// 注册到JEV.Modules
if (window.JEV && window.JEV.Modules) {
  window.JEV.Modules.register('worker', workerModule);
}

// 导出模块
export default workerModule;