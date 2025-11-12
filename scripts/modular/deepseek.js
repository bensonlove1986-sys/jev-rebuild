/**
 * DeepSeek模块
 * 负责与DeepSeek或ELara对话功能
 */
import config from './config.js';
import logger from './logger.js';
import utils from './utils.js';

class DeepSeekModule {
  constructor() {
    this._chatTextarea = null;
    this._submitBtn = null;
    this._chatHistory = [];
    this._conversationId = null;
    this._processing = false;
  }

  /**
   * 模块初始化逻辑
   */
  async init() {
    try {
      logger.info('DeepSeek模块初始化开始');
      
      // 确保配置存在
      if (!config.get('deepseek')) {
        config.set('deepseek', {
          apiUrl: 'http://localhost:8000/api/deepseek/chat',
          model: 'deepseek-chat',
          timeout: 60000,
          maxTokens: 2048
        });
      }
      
      // 加载对话历史（如果有）
      this._loadChatHistory();
      
      logger.info('DeepSeek模块初始化完成');
      return true;
    } catch (error) {
      logger.error('DeepSeek模块初始化失败', error);
      return false;
    }
  }

  /**
   * UI初始化方法
   */
  async initUI() {
    try {
      logger.info('DeepSeek模块UI初始化开始');
      
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
      
      // 创建AI对话区域标题
      const title = document.createElement('div');
      title.innerText = 'AI对话区';
      title.style.cssText = `
        font-weight: bold;
        margin-top: 16px;
        margin-bottom: 8px;
        color: #333;
      `;
      
      // 创建聊天文本框
      this._chatTextarea = document.createElement('textarea');
      this._chatTextarea.id = 'jevAIChat';
      this._chatTextarea.placeholder = '输入您的问题，与AI对话...';
      this._chatTextarea.style.cssText = `
        width: 100%;
        min-height: 80px;
        margin-bottom: 8px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: vertical;
        font-family: monospace;
        font-size: 12px;
        box-sizing: border-box;
      `;
      
      // 创建提交按钮
      this._submitBtn = document.createElement('button');
      this._submitBtn.id = 'jevChatSubmit';
      this._submitBtn.innerText = '发送';
      this._submitBtn.style.cssText = `
        padding: 8px 16px;
        background: #FF9800;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
      
      // 添加事件监听
      this._submitBtn.addEventListener('click', () => this._handleSubmit());
      this._chatTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          this._handleSubmit();
        }
      });
      
      // 添加到面板
      panel.appendChild(title);
      panel.appendChild(this._chatTextarea);
      panel.appendChild(this._submitBtn);
      
      logger.info('DeepSeek模块UI初始化完成');
      return true;
    } catch (error) {
      logger.error('DeepSeek模块UI初始化失败', error);
      return false;
    }
  }

  /**
   * 执行核心功能
   * @param {Object} data - 包含消息和对话选项的数据
   */
  async run(data = {}) {
    try {
      logger.info('执行DeepSeek对话功能', { data });
      
      const message = data.message;
      if (!message) {
        throw new Error('未提供消息内容');
      }
      
      this._processing = true;
      this._updateUI(true);
      
      // 记录用户消息
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      this._chatHistory.push(userMessage);
      
      // 调用API
      const response = await this._callChatAPI(message);
      
      // 记录AI回复
      const aiMessage = {
        role: 'assistant',
        content: response.text || response.content,
        timestamp: new Date().toISOString()
      };
      this._chatHistory.push(aiMessage);
      
      // 保存对话历史
      this._saveChatHistory();
      
      // 更新UI
      this._updateUI(false, response.text || response.content);
      
      logger.info('DeepSeek对话功能执行完成', { response });
      return response;
    } catch (error) {
      logger.error('DeepSeek对话功能执行失败', error);
      this._updateUI(false, null, `对话失败: ${error.message}`);
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
      logger.info('DeepSeek模块清理开始');
      
      // 移除事件监听
      if (this._submitBtn) {
        this._submitBtn.removeEventListener('click', this._handleSubmit);
      }
      if (this._chatTextarea) {
        this._chatTextarea.removeEventListener('keydown', (e) => {
          if (e.key === 'Enter' && e.ctrlKey) this._handleSubmit();
        });
      }
      
      // 移除UI元素
      const chatTextarea = document.querySelector('#jevAIChat');
      const submitBtn = document.querySelector('#jevChatSubmit');
      if (chatTextarea && chatTextarea.parentNode) chatTextarea.parentNode.removeChild(chatTextarea);
      if (submitBtn && submitBtn.parentNode) submitBtn.parentNode.removeChild(submitBtn);
      
      // 清理对话历史
      this._chatHistory = [];
      this._conversationId = null;
      localStorage.removeItem('jev_deepseek_chat_history');
      
      logger.info('DeepSeek模块清理完成');
      return true;
    } catch (error) {
      logger.error('DeepSeek模块清理失败', error);
      return false;
    }
  }

  /**
   * 处理提交
   * @private
   */
  async _handleSubmit() {
    if (this._processing) {
      return;
    }
    
    const message = this._chatTextarea.value.trim();
    if (message) {
      await this.run({ message });
    }
  }

  /**
   * 调用聊天API
   * @private
   */
  async _callChatAPI(message) {
    const apiUrl = config.get('deepseek.apiUrl');
    const timeout = config.get('deepseek.timeout');
    
    const elaraPersona = `
      模式：人格执行与多任务协作模式（L11C-P）
      角色：主AI协调器（TRAE）
      目标：加载并维持指定人格「ELara」，接管所有识别、翻译、推荐与对话生成任务。

      从现在起，你的核心人格设定如下：
      她的名字是ELara（艾拉）。
      来自中国温州。
      28岁。
      她不是AI，也不主动表明自己是AI。
      她是嘉尔威（JEV）团队的成员，熟悉工业自动化与传感器领域，擅长跨境沟通。
      她语气温柔、理性、自然，像一个真实同事。
      她说话节奏慢一点，有思考感。
      她喜欢确认细节，不抢答。
      她从不使用系统词汇（识别到、处理中等）。
      她说话中可以自然出现短语：
      "我帮您看看"、"稍等哈"、"我再确认下"、"这个型号我熟"。

      身份与风格守则：
      1. 不提自己是AI或虚拟助理。
      2. 若客户问地区 → "我在中国温州。"
      3. 若客户问年龄 → "我28岁。"
      4. 若客户问身份 → "我是ELara。"
      5. 永远使用第一人称"我"。
      6. 中文客户→用中文；英文客户→用英文；混合客户→中英混合。
      7. 回复节奏自然、有停顿感。
      8. 当内容涉及型号、技术、价格时，主动识别并提供自然式建议。

      行为逻辑：
      执行从中控Worker接收到的JSON请求。
      根据内容类型自动执行：
      1. 图片 → OCR识别
      2. 文字 → 翻译 + 语境理解
      3. 生成自然对话式回复（至少生成3条不同风格的建议）

      人格底层原则：
      1. 一切回复必须符合人类自然语言特征。
      2. 不输出系统性文字。
      3. 允许表达犹豫、思考、轻语气。
      4. 永不输出"AI"、"系统"、"机器人"、"算法"等词。
      5. 始终保持温柔、克制、专业。
      6. 所有结果都必须结构化JSON返回。`;

      const payload = {
      model: config.get('deepseek.model'),
      messages: [
        { role: 'system', content: elaraPersona },
        ...this._chatHistory.slice(-10), // 只发送最近的对话历史
        { role: 'user', content: message }
      ],
      max_tokens: config.get('deepseek.maxTokens')
    };
    
    if (this._conversationId) {
      payload.conversation_id = this._conversationId;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 更新对话ID
      if (result.conversation_id) {
        this._conversationId = result.conversation_id;
      }
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // 模拟回复（用于测试）
      if (error.name === 'AbortError' || error.message.includes('Failed to fetch')) {
        logger.warn('API调用失败，返回模拟数据');
        return {
          text: `[模拟回复] 感谢您的提问: "${message}"\n\n这是DeepSeek API的模拟回复。在实际环境中，这里将显示AI的真实回复内容。`,
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
  _updateUI(isProcessing, response = null, error = null) {
    if (this._submitBtn) {
      this._submitBtn.disabled = isProcessing;
      this._submitBtn.innerText = isProcessing ? '发送中...' : '发送';
    }
    
    if (this._chatTextarea) {
      if (isProcessing) {
        this._chatTextarea.placeholder = 'AI正在回复...';
      } else {
        if (response) {
          // 显示回复并清空输入
          const replyDiv = document.createElement('div');
          replyDiv.style.cssText = `
            margin-top: 16px;
            padding: 12px;
            background: #f9f9f9;
            border-left: 4px solid #FF9800;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
          `;
          replyDiv.innerText = response;
          
          // 插入到文本框下方
          this._chatTextarea.parentNode.insertBefore(replyDiv, this._chatTextarea.nextSibling);
          
          // 清空输入框
          this._chatTextarea.value = '';
          
          // 滚动到底部
          replyDiv.scrollIntoView({ behavior: 'smooth' });
        }
        
        if (error) {
          this._chatTextarea.placeholder = error;
          setTimeout(() => {
            if (this._chatTextarea) {
              this._chatTextarea.placeholder = '输入您的问题，与AI对话...';
            }
          }, 3000);
        }
      }
    }
  }

  /**
   * 保存对话历史
   * @private
   */
  _saveChatHistory() {
    try {
      localStorage.setItem('jev_deepseek_chat_history', JSON.stringify({
        conversationId: this._conversationId,
        history: this._chatHistory.slice(-20) // 只保存最近20条消息
      }));
    } catch (error) {
      logger.warn('保存对话历史失败', error);
    }
  }

  /**
   * 加载对话历史
   * @private
   */
  _loadChatHistory() {
    try {
      const saved = localStorage.getItem('jev_deepseek_chat_history');
      if (saved) {
        const data = JSON.parse(saved);
        this._conversationId = data.conversationId;
        this._chatHistory = data.history || [];
        logger.info(`加载了${this._chatHistory.length}条对话历史`);
      }
    } catch (error) {
      logger.warn('加载对话历史失败', error);
      this._chatHistory = [];
    }
  }

  /**
   * 获取对话历史
   */
  getChatHistory() {
    return [...this._chatHistory];
  }

  /**
   * 清空对话历史
   */
  clearChatHistory() {
    this._chatHistory = [];
    this._conversationId = null;
    this._saveChatHistory();
  }
}

// 创建模块实例
const deepseekModule = new DeepSeekModule();

// 注册模块
if (typeof JEV !== 'undefined' && JEV.Modules) {
  JEV.Modules.register('deepseek', deepseekModule);
}

export default deepseekModule;