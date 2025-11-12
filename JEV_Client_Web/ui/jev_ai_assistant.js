// JEV-UI-Origin-v9.3 AI助手模块

/**
 * JEV AI助手核心类
 * 提供智能问答和系统集成功能
 */
class JevAIAssistant {
    constructor() {
        this.chatWindow = null;
        this.chatContainer = null;
        this.inputField = null;
        this.sendButton = null;
        this.toggleButton = null;
        this.isOpen = false;
        this.isProcessing = false;
        this.conversationHistory = [];
        this.sessionId = this.generateSessionId();
        this.autoResponses = this.initializeAutoResponses();
    }

    /**
     * 初始化AI助手
     * @param {Object} config - 配置参数
     */
    init(config = {}) {
        this.config = {
            buttonSelector: config.buttonSelector || '#ai-assistant-button',
            windowId: config.windowId || 'ai-assistant-window',
            maxMessages: config.maxMessages || 50,
            enableAutoSuggestions: config.enableAutoSuggestions !== false,
            enableSystemMonitoring: config.enableSystemMonitoring !== false,
            ...config
        };

        // 检查是否已初始化
        if (this.isInitialized) {
            console.warn('AI助手已初始化');
            return;
        }

        // 创建UI组件
        this.createUI();
        
        // 设置事件监听
        this.setupEventListeners();
        
        // 初始化系统监控
        if (this.config.enableSystemMonitoring) {
            this.setupSystemMonitoring();
        }

        // 设置自动问候语
        this.setAutoGreeting();
        
        // 标记为已初始化
        this.isInitialized = true;
        console.log('JEV AI助手初始化完成');
    }

    /**
     * 生成会话ID
     * @returns {string} 唯一会话ID
     */
    generateSessionId() {
        return 'jev-session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 初始化自动回复
     * @returns {Object} 自动回复配置
     */
    initializeAutoResponses() {
        return {
            greetings: [
                '你好！我是JEV AI助手。有什么我可以帮您的吗？',
                '您好！我是JEV系统的智能助手。请问需要什么帮助？',
                '嗨！欢迎使用JEV系统。我是您的AI助手，随时为您服务。'
            ],
            farewells: [
                '再见！有需要随时联系我。',
                '祝您工作顺利！',
                '期待下次为您服务！'
            ],
            thanks: [
                '不客气！',
                '很高兴能帮到您！',
                '随时为您服务！'
            ],
            system: {
                status: '系统运行正常，所有服务可用。',
                version: '当前版本: JEV-UI-Origin-v9.3',
                help: '您可以询问关于系统功能、使用方法或常见问题的信息。\n\n例如：\n• 如何上传图像进行分析？\n• 系统支持哪些文件格式？\n• 如何查看分析历史？'
            }
        };
    }

    /**
     * 创建UI组件
     */
    createUI() {
        // 创建助手按钮
        this.createAssistantButton();
        
        // 创建聊天窗口
        this.createChatWindow();
    }

    /**
     * 创建助手按钮
     */
    createAssistantButton() {
        let button = document.querySelector(this.config.buttonSelector);
        
        if (!button) {
            button = document.createElement('div');
            button.id = this.config.buttonSelector.replace('#', '');
            button.className = 'ai-assistant-button';
            button.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
            button.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                background: linear-gradient(135deg, var(--primary-color, #38bdf8), var(--primary-dark, #0ea5e9));
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(56, 189, 248, 0.4);
                z-index: 9998;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
                user-select: none;
            `;
            
            // 添加波纹效果
            button.innerHTML += '<span class="button-ripple"></span>';
            
            document.body.appendChild(button);
        }
        
        this.toggleButton = button;
    }

    /**
     * 创建聊天窗口
     */
    createChatWindow() {
        let windowEl = document.getElementById(this.config.windowId);
        
        if (!windowEl) {
            // 创建窗口容器
            windowEl = document.createElement('div');
            windowEl.id = this.config.windowId;
            windowEl.className = 'ai-assistant-window';
            windowEl.style.cssText = `
                position: fixed;
                bottom: 90px;
                right: 20px;
                width: 380px;
                max-height: 500px;
                background: var(--bg-secondary, #1e293b);
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
                z-index: 9997;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            `;
            
            // 创建窗口头部
            const header = document.createElement('div');
            header.className = 'window-header';
            header.innerHTML = `
                <div class="header-content">
                    <span class="header-icon">🤖</span>
                    <h3 class="header-title">AI助手</h3>
                </div>
                <button class="close-button">×</button>
            `;
            header.style.cssText = `
                padding: 15px 20px;
                background: var(--bg-primary, #0f172a);
                border-bottom: 1px solid var(--border-color, #334155);
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            // 创建聊天容器
            const chatContainer = document.createElement('div');
            chatContainer.className = 'chat-container';
            chatContainer.style.cssText = `
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 15px;
            `;
            
            // 创建输入区域
            const inputArea = document.createElement('div');
            inputArea.className = 'input-area';
            inputArea.innerHTML = `
                <div class="input-wrapper">
                    <input type="text" class="message-input" placeholder="输入您的问题..." />
                    <button class="send-button">发送</button>
                </div>
            `;
            inputArea.style.cssText = `
                padding: 15px 20px;
                background: var(--bg-primary, #0f172a);
                border-top: 1px solid var(--border-color, #334155);
            `;
            
            // 组装窗口
            windowEl.appendChild(header);
            windowEl.appendChild(chatContainer);
            windowEl.appendChild(inputArea);
            
            document.body.appendChild(windowEl);
        }
        
        this.chatWindow = windowEl;
        this.chatContainer = windowEl.querySelector('.chat-container');
        this.inputField = windowEl.querySelector('.message-input');
        this.sendButton = windowEl.querySelector('.send-button');
        
        // 设置内部元素样式
        this.setWindowStyles();
    }

    /**
     * 设置窗口内部元素样式
     */
    setWindowStyles() {
        // 头部样式
        const headerTitle = this.chatWindow.querySelector('.header-title');
        if (headerTitle) {
            headerTitle.style.cssText = `
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary, #f8fafc);
            `;
        }
        
        const headerIcon = this.chatWindow.querySelector('.header-icon');
        if (headerIcon) {
            headerIcon.style.cssText = `
                margin-right: 10px;
                font-size: 20px;
            `;
        }
        
        const headerContent = this.chatWindow.querySelector('.header-content');
        if (headerContent) {
            headerContent.style.cssText = `
                display: flex;
                align-items: center;
            `;
        }
        
        const closeButton = this.chatWindow.querySelector('.close-button');
        if (closeButton) {
            closeButton.style.cssText = `
                background: none;
                border: none;
                font-size: 24px;
                color: var(--text-secondary, #cbd5e1);
                cursor: pointer;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s ease;
            `;
            
            closeButton.addEventListener('mouseenter', () => {
                closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });
            
            closeButton.addEventListener('mouseleave', () => {
                closeButton.style.backgroundColor = 'transparent';
            });
        }
        
        // 输入区域样式
        const inputWrapper = this.chatWindow.querySelector('.input-wrapper');
        if (inputWrapper) {
            inputWrapper.style.cssText = `
                display: flex;
                gap: 10px;
                align-items: center;
            `;
        }
        
        if (this.inputField) {
            this.inputField.style.cssText = `
                flex: 1;
                padding: 10px 15px;
                background: var(--bg-secondary, #1e293b);
                border: 1px solid var(--border-color, #334155);
                border-radius: 20px;
                color: var(--text-primary, #f8fafc);
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s ease;
            `;
            
            this.inputField.addEventListener('focus', () => {
                this.inputField.style.borderColor = 'var(--primary-color, #38bdf8)';
            });
            
            this.inputField.addEventListener('blur', () => {
                this.inputField.style.borderColor = 'var(--border-color, #334155)';
            });
        }
        
        if (this.sendButton) {
            this.sendButton.style.cssText = `
                padding: 10px 20px;
                background: var(--primary-color, #38bdf8);
                color: white;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s ease;
            `;
            
            this.sendButton.addEventListener('mouseenter', () => {
                this.sendButton.style.backgroundColor = 'var(--primary-dark, #0ea5e9)';
            });
            
            this.sendButton.addEventListener('mouseleave', () => {
                this.sendButton.style.backgroundColor = 'var(--primary-color, #38bdf8)';
            });
        }
        
        // 聊天容器滚动条样式
        if (this.chatContainer) {
            this.chatContainer.style.scrollbarWidth = 'thin';
            this.chatContainer.style.scrollbarColor = 'rgba(255, 255, 255, 0.2) transparent';
            
            // 添加WebKit滚动条样式
            const style = document.createElement('style');
            style.textContent = `
                .chat-container::-webkit-scrollbar {
                    width: 6px;
                }
                .chat-container::-webkit-scrollbar-track {
                    background: transparent;
                }
                .chat-container::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                }
                .chat-container::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 切换按钮点击事件
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => {
                this.toggleChat();
                this.addRippleEffect(event);
            });
        }
        
        // 关闭按钮点击事件
        const closeButton = this.chatWindow?.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.closeChat();
            });
        }
        
        // 发送按钮点击事件
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        // 输入框回车事件
        if (this.inputField) {
            this.inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
        
        // 点击外部关闭聊天窗口
        document.addEventListener('click', (e) => {
            if (this.isOpen && 
                !this.chatWindow?.contains(e.target) && 
                !this.toggleButton?.contains(e.target)) {
                // 不自动关闭，保留原行为
            }
        });
        
        // 添加窗口调整事件监听
        window.addEventListener('resize', () => {
            this.adjustWindowPosition();
        });
    }

    /**
     * 添加波纹效果
     * @param {Event} event - 事件对象
     */
    addRippleEffect(event) {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.classList.add('button-ripple');
        
        // 清空现有波纹
        const existingRipples = button.querySelectorAll('.button-ripple');
        existingRipples.forEach(r => r.remove());
        
        button.appendChild(ripple);
        
        // 添加波纹样式
        const style = document.createElement('style');
        style.textContent = `
            .button-ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
            }
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 切换聊天窗口显示状态
     */
    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    /**
     * 打开聊天窗口
     */
    openChat() {
        if (this.chatWindow) {
            this.chatWindow.style.display = 'flex';
            
            // 触发重绘
            void this.chatWindow.offsetWidth;
            
            // 添加动画
            this.chatWindow.style.opacity = '1';
            this.chatWindow.style.transform = 'translateY(0)';
            
            // 调整位置
            this.adjustWindowPosition();
            
            // 聚焦输入框
            if (this.inputField) {
                this.inputField.focus();
            }
            
            this.isOpen = true;
            
            // 记录打开事件
            this.logUserAction('chat_opened');
        }
    }

    /**
     * 关闭聊天窗口
     */
    closeChat() {
        if (this.chatWindow) {
            this.chatWindow.style.opacity = '0';
            this.chatWindow.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                this.chatWindow.style.display = 'none';
            }, 300);
            
            this.isOpen = false;
            
            // 记录关闭事件
            this.logUserAction('chat_closed');
        }
    }

    /**
     * 调整窗口位置
     */
    adjustWindowPosition() {
        if (!this.chatWindow) return;
        
        const windowRect = this.chatWindow.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 检查是否超出视口右侧
        if (windowRect.right > viewportWidth) {
            this.chatWindow.style.right = '10px';
        }
        
        // 检查是否超出视口顶部
        if (windowRect.top < 0) {
            this.chatWindow.style.bottom = 'auto';
            this.chatWindow.style.top = '70px';
        } else {
            this.chatWindow.style.bottom = '90px';
            this.chatWindow.style.top = 'auto';
        }
    }

    /**
     * 设置自动问候语
     */
    setAutoGreeting() {
        // 延迟显示问候语，避免页面加载时太突兀
        setTimeout(() => {
            if (!this.hasUserInteracted()) {
                const greetings = this.autoResponses.greetings;
                const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
                this.addSystemMessage(randomGreeting);
                this.addSystemMessage(this.autoResponses.system.help);
            }
        }, 5000);
    }

    /**
     * 检查用户是否已交互
     * @returns {boolean} 是否已交互
     */
    hasUserInteracted() {
        return this.conversationHistory.some(msg => msg.sender === 'user');
    }

    /**
     * 发送消息
     */
    sendMessage() {
        if (!this.inputField || !this.sendButton) return;
        
        const message = this.inputField.value.trim();
        
        if (!message || this.isProcessing) return;
        
        // 添加用户消息
        this.addUserMessage(message);
        
        // 清空输入框
        this.inputField.value = '';
        
        // 开始处理
        this.isProcessing = true;
        this.sendButton.disabled = true;
        this.sendButton.textContent = '思考中...';
        
        // 处理消息
        this.processMessage(message);
    }

    /**
     * 添加用户消息
     * @param {string} message - 消息内容
     */
    addUserMessage(message) {
        this.addMessage('user', message);
    }

    /**
     * 添加系统消息
     * @param {string} message - 消息内容
     */
    addSystemMessage(message) {
        this.addMessage('system', message);
    }

    /**
     * 添加消息到聊天窗口
     * @param {string} sender - 发送者 ('user' 或 'system')
     * @param {string} message - 消息内容
     */
    addMessage(sender, message) {
        if (!this.chatContainer) return;
        
        // 创建消息元素
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${sender}`;
        messageElement.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            ${sender === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
        `;
        
        // 创建头像
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '👤' : '🤖';
        avatar.style.cssText = `
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: ${sender === 'user' ? 'var(--bg-primary, #0f172a)' : 'var(--primary-color, #38bdf8)' };
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
        `;
        
        // 创建消息内容
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = message;
        content.style.cssText = `
            max-width: 70%;
            padding: 12px 16px;
            background: ${sender === 'user' ? 'var(--primary-color, #38bdf8)' : 'var(--bg-primary, #0f172a)' };
            color: ${sender === 'user' ? 'white' : 'var(--text-primary, #f8fafc)' };
            border-radius: 18px;
            font-size: 14px;
            line-height: 1.5;
            word-wrap: break-word;
        `;
        
        // 组装消息元素
        if (sender === 'user') {
            messageElement.appendChild(content);
            messageElement.appendChild(avatar);
        } else {
            messageElement.appendChild(avatar);
            messageElement.appendChild(content);
        }
        
        // 添加到聊天容器
        this.chatContainer.appendChild(messageElement);
        
        // 滚动到底部
        this.scrollToBottom();
        
        // 保存到历史记录
        this.conversationHistory.push({
            sender,
            message,
            timestamp: new Date().toISOString()
        });
        
        // 限制历史记录长度
        this.limitHistory();
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        if (this.chatContainer) {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }
    }

    /**
     * 限制历史记录长度
     */
    limitHistory() {
        if (this.conversationHistory.length > this.config.maxMessages) {
            this.conversationHistory = this.conversationHistory.slice(-this.config.maxMessages);
        }
    }

    /**
     * 处理用户消息
     * @param {string} message - 用户消息
     */
    processMessage(message) {
        // 首先检查是否是简单问题，可以直接回答
        const quickResponse = this.getQuickResponse(message);
        
        if (quickResponse) {
            // 延迟一下，模拟思考过程
            setTimeout(() => {
                this.addSystemMessage(quickResponse);
                this.completeProcessing();
            }, 500 + Math.random() * 500);
        } else {
            // 调用API处理复杂问题
            this.callApi(message);
        }
    }

    /**
     * 获取快速回复
     * @param {string} message - 用户消息
     * @returns {string|null} 快速回复内容或null
     */
    getQuickResponse(message) {
        const normalizedMessage = message.toLowerCase();
        
        // 检查感谢
        if (normalizedMessage.includes('谢谢') || normalizedMessage.includes('感谢')) {
            const thanks = this.autoResponses.thanks;
            return thanks[Math.floor(Math.random() * thanks.length)];
        }
        
        // 检查问候
        if (normalizedMessage.includes('你好') || 
            normalizedMessage.includes('嗨') || 
            normalizedMessage.includes('哈喽') ||
            normalizedMessage.includes('hi') ||
            normalizedMessage.includes('hello')) {
            const greetings = this.autoResponses.greetings;
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        // 检查再见
        if (normalizedMessage.includes('再见') || 
            normalizedMessage.includes('拜拜') ||
            normalizedMessage.includes('bye')) {
            const farewells = this.autoResponses.farewells;
            return farewells[Math.floor(Math.random() * farewells.length)];
        }
        
        // 检查系统状态
        if (normalizedMessage.includes('状态') || 
            normalizedMessage.includes('运行') ||
            normalizedMessage.includes('status')) {
            return this.autoResponses.system.status;
        }
        
        // 检查版本
        if (normalizedMessage.includes('版本') || 
            normalizedMessage.includes('version')) {
            return this.autoResponses.system.version;
        }
        
        // 检查帮助
        if (normalizedMessage.includes('帮助') || 
            normalizedMessage.includes('怎么') ||
            normalizedMessage.includes('how') ||
            normalizedMessage.includes('help')) {
            return this.autoResponses.system.help;
        }
        
        // 检查图像分析
        if (normalizedMessage.includes('图像') || 
            normalizedMessage.includes('图片') ||
            normalizedMessage.includes('photo') ||
            normalizedMessage.includes('image') ||
            normalizedMessage.includes('分析') ||
            normalizedMessage.includes('analyze')) {
            return '您可以在图像分析页面上传图片或使用摄像头拍摄，系统会自动进行分析。点击"开始图像分析"按钮即可进入。';
        }
        
        // 检查控制台
        if (normalizedMessage.includes('控制台') || 
            normalizedMessage.includes('console') ||
            normalizedMessage.includes('dashboard')) {
            return '您可以点击"进入控制台"按钮访问系统控制台，查看统计数据和系统状态。';
        }
        
        return null;
    }

    /**
     * 调用API处理消息
     * @param {string} message - 用户消息
     */
    async callApi(message) {
        try {
            // 这里模拟API调用，实际项目中应该调用真实的AI服务
            // const response = await fetch('/api/ai-assistant', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({
            //         message,
            //         sessionId: this.sessionId,
            //         history: this.conversationHistory
            //     })
            // });
            // 
            // const data = await response.json();
            // this.addSystemMessage(data.response);
            
            // 模拟API延迟
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
            
            // 提供模拟回答
            const mockResponse = this.getMockResponse(message);
            this.addSystemMessage(mockResponse);
        } catch (error) {
            console.error('API调用失败:', error);
            this.addSystemMessage('抱歉，我暂时无法处理您的请求。请稍后再试或尝试其他问题。');
        } finally {
            this.completeProcessing();
        }
    }

    /**
     * 获取模拟回答
     * @param {string} message - 用户消息
     * @returns {string} 模拟回答
     */
    getMockResponse(message) {
        const responses = [
            '感谢您的提问。根据您的需求，我建议您查看系统控制台获取更多信息。',
            '这个问题很有深度。让我为您提供一些相关建议...',
            '我理解您的需求。系统已经为您准备好了相应的功能，您可以通过界面轻松访问。',
            '您提出了一个很好的问题。这涉及到系统的核心功能，让我为您详细解释。',
            '根据您的描述，我推荐您使用系统的图像分析功能，它可以帮助您快速获取所需信息。',
            '这个问题很常见。让我为您提供一个简单易懂的解决方案。',
            '感谢您的反馈！我们的系统正在不断优化，您的建议对我们很有帮助。',
            '这是一个技术问题。让我尝试用通俗易懂的方式为您解答。'
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    /**
     * 完成消息处理
     */
    completeProcessing() {
        this.isProcessing = false;
        if (this.sendButton) {
            this.sendButton.disabled = false;
            this.sendButton.textContent = '发送';
        }
        if (this.inputField) {
            this.inputField.focus();
        }
    }

    /**
     * 设置系统监控
     */
    setupSystemMonitoring() {
        // 定期检查系统状态
        this.systemStatusInterval = setInterval(() => {
            this.checkSystemStatus();
        }, 30000); // 每30秒检查一次
        
        // 初始检查
        this.checkSystemStatus();
    }

    /**
     * 检查系统状态
     */
    async checkSystemStatus() {
        try {
            // 模拟状态检查
            const isOnline = Math.random() > 0.1; // 90%概率在线
            
            if (isOnline) {
                // 系统正常，不显示消息
            } else {
                // 系统异常，显示提示
                if (this.isOpen) {
                    this.addSystemMessage('系统检测到网络连接不稳定，部分功能可能受到影响。');
                }
            }
        } catch (error) {
            console.error('系统状态检查失败:', error);
        }
    }

    /**
     * 记录用户操作
     * @param {string} action - 操作类型
     */
    logUserAction(action) {
        try {
            // 这里可以将日志发送到服务器
            console.log(`用户操作: ${action}`, {
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // 静默失败
        }
    }

    /**
     * 获取会话历史
     * @returns {Array} 会话历史数组
     */
    getConversationHistory() {
        return [...this.conversationHistory];
    }

    /**
     * 清空会话历史
     */
    clearHistory() {
        this.conversationHistory = [];
        if (this.chatContainer) {
            this.chatContainer.innerHTML = '';
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        // 清除定时器
        if (this.systemStatusInterval) {
            clearInterval(this.systemStatusInterval);
        }
        
        // 移除DOM元素
        if (this.toggleButton && this.toggleButton.parentNode) {
            this.toggleButton.parentNode.removeChild(this.toggleButton);
        }
        
        if (this.chatWindow && this.chatWindow.parentNode) {
            this.chatWindow.parentNode.removeChild(this.chatWindow);
        }
        
        // 清除事件监听
        document.removeEventListener('click', this.handleDocumentClick);
        window.removeEventListener('resize', this.adjustWindowPosition);
        
        // 重置状态
        this.isInitialized = false;
        this.isOpen = false;
        this.isProcessing = false;
        
        console.log('JEV AI助手已销毁');
    }
}

/**
 * 初始化JEV AI助手
 * @param {Object} config - 配置参数
 */
function initJevAIAssistant(config) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const aiAssistant = new JevAIAssistant();
            aiAssistant.init(config);
        });
    } else {
        const aiAssistant = new JevAIAssistant();
        aiAssistant.init(config);
    }
}

// 导出初始化函数
export { initJevAIAssistant, JevAIAssistant };

// 如果直接在浏览器中运行，自动初始化
if (typeof window !== 'undefined' && typeof module === 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initJevAIAssistant();
    });
}