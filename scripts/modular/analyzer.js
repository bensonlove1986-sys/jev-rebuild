/**
 * 分析模块
 * 负责调用AI识别或DeepSeek接口进行文本分析
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';

class AnalyzerModule {
  constructor() {
    this._analyzeBtn = null;
    this._outputTextarea = null;
    this._processing = false;
  }

  /**
   * 模块初始化逻辑
   */
  async init() {
    try {
      logger.info('分析模块初始化开始');
      
      // 确保配置存在
      if (!config.get('analyzer')) {
        config.set('analyzer', {
          aiApiUrl: 'http://localhost:8000/api/analyze',
          deepseekApiUrl: 'http://localhost:8000/api/deepseek',
          timeout: 60000,
          maxRetries: 2
        });
      }
      
      logger.info('分析模块初始化完成');
      return true;
    } catch (error) {
      logger.error('分析模块初始化失败', error);
      return false;
    }
  }

  /**
   * UI初始化方法
   */
  async initUI() {
    try {
      logger.info('分析模块UI初始化开始');
      
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
      
      // 创建分析按钮
      this._analyzeBtn = document.createElement('button');
      this._analyzeBtn.id = 'jevAnalyzeBtn';
      this._analyzeBtn.innerText = 'AI分析';
      this._analyzeBtn.style.cssText = `
        padding: 8px 16px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 8px;
        margin-top: 8px;
      `;
      
      // 创建输出文本框
      this._outputTextarea = document.createElement('textarea');
      this._outputTextarea.id = 'jevAnalyzeOutput';
      this._outputTextarea.placeholder = '分析结果将显示在这里...';
      this._outputTextarea.style.cssText = `
        width: 100%;
        min-height: 120px;
        margin-top: 12px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: vertical;
        font-family: monospace;
        font-size: 12px;
        box-sizing: border-box;
      `;
      
      // 添加事件监听
      this._analyzeBtn.addEventListener('click', () => this._handleAnalyzeClick());
      
      // 添加到面板
      panel.appendChild(this._analyzeBtn);
      panel.appendChild(this._outputTextarea);
      
      logger.info('分析模块UI初始化完成');
      return true;
    } catch (error) {
      logger.error('分析模块UI初始化失败', error);
      return false;
    }
  }

  /**
   * 执行核心功能
   * @param {Object} data - 包含要分析的文本和选项
   */
  async run(data = {}) {
    try {
      logger.info('执行分析功能', { data });
      
      // 验证输入
      if (!data.text && !data.imageUrl && !data.fileUrl) {
        throw new Error('未提供要分析的内容');
      }
      
      this._processing = true;
      this._updateUI(true, '分析中...');
      
      // 选择分析类型
      let result;
      if (data.type === 'deepseek') {
        result = await this._callDeepSeekAPI(data);
      } else {
        result = await this._callAIAnalyzeAPI(data);
      }
      
      // 更新UI
      this._updateUI(false, result.text || JSON.stringify(result, null, 2));
      
      logger.info('分析功能执行完成', { result });
      return result;
    } catch (error) {
      logger.error('分析功能执行失败', error);
      this._updateUI(false, `分析失败: ${error.message}`, true);
      throw error;
    } finally {
      this._processing = false;
    }
  }

  /**
   * 资源释放与清理
   */
  async destroy() {
    try {
      logger.info('分析模块清理开始');
      
      // 移除事件监听
      if (this._analyzeBtn) {
        this._analyzeBtn.removeEventListener('click', this._handleAnalyzeClick);
      }
      
      // 移除UI元素
      const analyzeBtn = document.querySelector('#jevAnalyzeBtn');
      const outputTextarea = document.querySelector('#jevAnalyzeOutput');
      if (analyzeBtn && analyzeBtn.parentNode) analyzeBtn.parentNode.removeChild(analyzeBtn);
      if (outputTextarea && outputTextarea.parentNode) outputTextarea.parentNode.removeChild(outputTextarea);
      
      // 重置状态
      this._processing = false;
      
      logger.info('分析模块清理完成');
      return true;
    } catch (error) {
      logger.error('分析模块清理失败', error);
      return false;
    }
  }

  /**
   * 处理分析按钮点击
   * @private
   */
  async _handleAnalyzeClick() {
    if (this._processing) {
      return;
    }
    
    // 尝试获取页面选中的文本
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText) {
      this.run({ text: selectedText });
    } else {
      // 如果没有选中文本，提示用户输入
      const userInput = prompt('请输入要分析的文本:');
      if (userInput) {
        this.run({ text: userInput });
      }
    }
  }

  /**
   * 调用AI分析API
   * @private
   */
  async _callAIAnalyzeAPI(data) {
    const apiUrl = config.get('analyzer.aiApiUrl');
    const timeout = config.get('analyzer.timeout');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // 模拟分析结果（用于测试）
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
        logger.warn('API调用失败，返回模拟数据');
        return {
          text: `模拟分析结果:\n\n输入: ${data.text || '图像分析'}\n分析类型: ${data.type || '默认'}\n\n这是一个模拟的分析结果。在实际环境中，这里将显示AI的真实分析内容。`,
          isMock: true
        };
      }
      
      throw error;
    }
  }

  /**
   * 调用DeepSeek API
   * @private
   */
  async _callDeepSeekAPI(data) {
    const apiUrl = config.get('analyzer.deepseekApiUrl');
    const timeout = config.get('analyzer.timeout');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: data.text,
          ...data.deepseekOptions
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // 模拟DeepSeek结果（用于测试）
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
        logger.warn('DeepSeek API调用失败，返回模拟数据');
        return {
          text: `DeepSeek模拟回复:\n\n问: ${data.text}\n\n答: 这是DeepSeek API的模拟回复。在实际环境中，这里将显示AI的真实回复内容。`,
          isMock: true
        };
      }
      
      throw error;
    }
  }

  /**
   * 更新UI显示
   * @private
   */
  _updateUI(isProcessing, content, isError = false) {
    if (this._analyzeBtn) {
      this._analyzeBtn.disabled = isProcessing;
      this._analyzeBtn.innerText = isProcessing ? '分析中...' : 'AI分析';
    }
    
    if (this._outputTextarea) {
      this._outputTextarea.value = content;
      this._outputTextarea.style.color = isError ? '#f44336' : '#333';
    }
  }
}

// 创建模块实例
const analyzerModule = new AnalyzerModule();

// 注册模块
if (typeof JEV !== 'undefined' && JEV.Modules) {
  JEV.Modules.register('analyzer', analyzerModule);
}

export default analyzerModule;