/**
 * JEV L5 · DAOJIE 聊天采集模块 v1.1
 * 增强版采集器，支持L5+等级功能：自监控、自动修复、媒体识别
 */

class DAOJIEChatCollector {
    constructor() {
        // 模块基本信息
        this.moduleId = 'daojieCollector';
        this.moduleName = 'DAOJIE 聊天采集';
        this.version = '1.1.0';
        
        // 目标网站信息
        this.targetDomain = 'app.daojiemarketing.com';
        this.targetPaths = ['/*', '/conversations', '/chat', '/messages'];
        this.isActive = false;
        
        // 消息监控配置
        this.messageSelector = '.chat-message, .message-item, .chat-item, .message-bubble, .msg';
        this.inboundSelector = '.inbound, .customer-message, .received, .user-message';
        this.outboundSelector = '.outbound, .agent-message, .sent, .bot-message';
        this.mediaSelector = 'img, a[download], .attachment, .media-item';
        
        // 状态跟踪
        this.lastProcessedMessageId = null;
        this.messageCount = 0;
        this.uploadedCount = 0;
        this.queueLength = 0;
        this.processedHashes = new Set(); // 用于消息去重
        this.observer = null;
        this.heartbeatInterval = null;
        
        // 网络状态
        this.isOnline = navigator.onLine;
        this.lastOnlineCheck = Date.now();
        
        // 初始化
        this.init();
    }

    /**
     * 初始化模块
     */
    init() {
        this.log('模块初始化 - v' + this.version);
        
        // 确保全局JEV命名空间存在
        if (!window.JEV) {
            window.JEV = {};
        }
        
        if (!window.JEV.MODULES) {
            window.JEV.MODULES = {};
        }
        
        // 注册到JEV模块系统
        window.JEV.MODULES[this.moduleId] = this;
        // 同时提供全局访问接口
        window.JEV.DAOJIECollector = this;
        
        // 检测当前页面
        this.checkCurrentPage();
        
        // 监听网络状态变化
        this.setupNetworkListeners();
        
        // 清理过期缓存
        this.cleanupOldCache();
        
        // 输出初始化日志
        this.log('✅ ChatCollector running...');
    }

    /**
     * 检测当前页面是否为目标页面
     */
    checkCurrentPage() {
        const currentDomain = window.location.hostname;
        const currentPath = window.location.pathname;
        
        if (currentDomain === this.targetDomain) {
            // 检查路径是否匹配任一目标路径
            const pathMatched = this.targetPaths.some(path => {
                if (path === '/*') return true;
                return currentPath.startsWith(path);
            });
            
            if (pathMatched) {
                this.log(`已检测到目标页面: ${this.targetDomain}${currentPath}`);
                this.activateCollector();
            } else {
                this.log(`当前路径不匹配: ${currentPath}`);
            }
        } else {
            this.log(`当前页面不是目标页面 (${currentDomain})`);
        }
        
        // 监听URL变化，以便在页面切换到目标页面时激活
        this.setupUrlChangeListener();
    }

    /**
     * 设置URL变化监听器
     */
    setupUrlChangeListener() {
        let lastUrl = window.location.href;
        
        // 使用MutationObserver监听URL变化（适用于SPA应用）
        const observer = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                this.checkCurrentPage();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 同时使用定时检查作为备份
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                this.checkCurrentPage();
            }
        }, 1000);
        
        this.log('URL变化监听器已设置');
    }

    /**
     * 设置网络状态监听器
     */
    setupNetworkListeners() {
        // 监听在线/离线状态变化
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
        
        // 定时检查网络状态
        setInterval(() => this.checkNetworkStatus(), 30000); // 每30秒检查一次
    }

    /**
     * 处理网络状态变化
     */
    handleNetworkChange(isOnline) {
        this.isOnline = isOnline;
        this.lastOnlineCheck = Date.now();
        
        if (isOnline) {
            this.log('网络连接已恢复，开始同步缓存的消息...');
            this.processLocalQueue();
        } else {
            this.log('网络连接断开，消息将缓存到本地');
        }
        
        // 更新状态
        this.updateStatus();
    }

    /**
     * 检查网络状态
     */
    async checkNetworkStatus() {
        try {
            const response = await fetch('/ping', {
                method: 'HEAD',
                cache: 'no-cache',
                timeout: 5000
            });
            this.handleNetworkChange(response.ok);
        } catch {
            this.handleNetworkChange(false);
        }
    }

    /**
     * 激活采集器
     */
    activateCollector() {
        if (this.isActive) {
            this.log('采集器已经激活');
            return;
        }
        
        this.isActive = true;
        this.log('✅ 采集运行中');
        
        // 更新中控状态
        this.updateStatus();
        
        // 开始监控聊天消息
        this.startMessageMonitoring();
        
        // 启动心跳
        this.startHeartbeat();
        
        // 初始扫描现有消息
        setTimeout(() => this.scanExistingMessages(), 2000);
        
        // 尝试发送队列中的消息
        this.processLocalQueue();
    }

    /**
     * 开始监控聊天消息DOM
     */
    startMessageMonitoring() {
        // 查找聊天容器
        const chatContainers = this.findChatContainers();
        
        if (chatContainers.length === 0) {
            this.log('未找到聊天容器，将继续查找...');
            // 定时重试
            setTimeout(() => this.startMessageMonitoring(), 3000);
            return;
        }
        
        this.log(`找到 ${chatContainers.length} 个聊天容器`);
        
        // 为每个聊天容器设置MutationObserver
        chatContainers.forEach(container => {
            this.setupObserver(container);
        });
    }

    /**
     * 查找聊天容器
     */
    findChatContainers() {
        const potentialContainers = [
            '.chat-container',
            '.messages-container',
            '.chat-window',
            '#chat-box',
            '[class*="chat"]',
            '[class*="message"]',
            '.conversation-container',
            '.chat-area'
        ];
        
        const containers = [];
        
        potentialContainers.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!containers.includes(element) && this.isValidChatContainer(element)) {
                    containers.push(element);
                }
            });
        });
        
        return containers;
    }

    /**
     * 验证是否为有效的聊天容器
     */
    isValidChatContainer(element) {
        // 检查元素是否包含消息相关的子元素
        const hasMessages = element.querySelector(this.messageSelector) !== null;
        const hasScroll = element.scrollHeight > element.clientHeight;
        const isVisible = window.getComputedStyle(element).display !== 'none';
        
        return isVisible && (hasMessages || hasScroll);
    }

    /**
     * 设置DOM变化观察器
     */
    setupObserver(targetElement) {
        // 配置观察器选项
        const config = {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-id', 'id']
        };
        
        // 创建观察器实例
        this.observer = new MutationObserver((mutationsList) => {
            try {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        // 检查新添加的节点
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) { // 元素节点
                                this.processNewElement(node);
                            }
                        });
                    }
                }
            } catch (error) {
                this.log(`观察器错误: ${error.message}`, 'error');
            }
        });
        
        // 开始观察目标元素
        this.observer.observe(targetElement, config);
    }

    /**
     * 处理新添加的元素
     */
    processNewElement(element) {
        // 检查元素是否是消息
        if (this.isMessageElement(element)) {
            this.processMessage(element);
        }
        
        // 检查元素的子元素是否包含消息
        const messages = element.querySelectorAll(this.messageSelector);
        messages.forEach(message => {
            this.processMessage(message);
        });
    }

    /**
     * 判断元素是否为消息元素
     */
    isMessageElement(element) {
        // 检查是否匹配消息选择器
        const className = element.className;
        const matchesMessage = Array.from(element.classList).some(cls => 
            this.messageSelector.includes(cls)
        );
        
        // 检查是否有消息特征
        const hasMessageContent = element.querySelector('.message-content, .content, .text, .message-text') !== null;
        const hasMessageTimestamp = element.querySelector('.timestamp, .time, .date') !== null;
        
        return matchesMessage || hasMessageContent || hasMessageTimestamp;
    }

    /**
     * 处理聊天消息
     */
    processMessage(messageElement) {
        // 生成消息ID
        const messageId = this.generateMessageId(messageElement);
        const content = this.extractMessageContent(messageElement) || '';
        const timestamp = this.extractMessageTimestamp(messageElement) || Date.now().toString();
        
        // 生成消息哈希用于去重
        const msgHash = this.generateMessageHash(content, timestamp);
        
        // 避免重复处理
        if (this.processedHashes.has(msgHash) || messageId === this.lastProcessedMessageId) {
            return;
        }
        
        // 检查是否为入站消息
        if (this.isInboundMessage(messageElement)) {
            this.captureInboundMessage(messageElement, messageId, msgHash);
            this.lastProcessedMessageId = messageId;
        }
    }

    /**
     * 生成消息ID
     */
    generateMessageId(element) {
        // 尝试使用现有ID
        if (element.id) return element.id;
        if (element.dataset.id) return element.dataset.id;
        
        // 使用内容摘要生成ID
        const content = this.extractMessageContent(element) || '';
        const timestamp = this.extractMessageTimestamp(element) || Date.now();
        
        return `msg_${timestamp}_${content.substring(0, 10).replace(/\s/g, '_')}`;
    }

    /**
     * 生成消息哈希用于去重
     */
    generateMessageHash(content, timestamp) {
        // 简单的哈希生成
        const str = timestamp + content;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return hash.toString(36);
    }

    /**
     * 判断是否为入站消息
     */
    isInboundMessage(element) {
        // 检查class是否匹配入站消息选择器
        const className = element.className;
        const isInbound = this.inboundSelector.split(',').some(selector => 
            className.includes(selector.trim())
        );
        
        // 如果无法通过class判断，尝试其他方法
        if (!isInbound) {
            // 检查是否不包含出站消息特征
            const isNotOutbound = !this.outboundSelector.split(',').some(selector => 
                className.includes(selector.trim())
            );
            
            // 检查位置特征（通常入站消息在左侧）
            const style = window.getComputedStyle(element);
            const isLeftAligned = style.textAlign === 'left' || 
                                 style.justifyContent === 'flex-start';
            
            return isNotOutbound && isLeftAligned;
        }
        
        return isInbound;
    }

    /**
     * 捕获入站消息
     */
    captureInboundMessage(messageElement, messageId, msgHash) {
        const content = this.extractMessageContent(messageElement) || '';
        const timestamp = this.extractMessageTimestamp(messageElement);
        const senderName = this.extractSenderName(messageElement);
        
        if (!content && !this.hasMediaContent(messageElement)) {
            this.log('忽略空消息');
            return;
        }
        
        // 标记为已处理
        this.processedHashes.add(msgHash);
        this.messageCount++;
        
        // 构建消息数据
        const messageData = {
            id: messageId,
            msgHash: msgHash,
            content: content,
            timestamp: timestamp || new Date().toISOString(),
            sender: senderName || 'customer',
            type: 'inbound',
            platform: 'daojie',
            collectedAt: new Date().toISOString(),
            has_media: this.hasMediaContent(messageElement),
            media_url: null
        };
        
        // 处理媒体内容
        this.processMediaContent(messageElement, messageData);
        
        this.log(`✅ Inbound message detected - #${this.messageCount}`);
        
        // 上传消息
        this.uploadMessage(messageData);
        
        // 更新状态
        this.updateStatus();
    }

    /**
     * 检查消息是否包含媒体内容
     */
    hasMediaContent(element) {
        return element.querySelector(this.mediaSelector) !== null;
    }

    /**
     * 处理媒体内容
     */
    async processMediaContent(element, messageData) {
        const mediaElements = element.querySelectorAll(this.mediaSelector);
        
        if (mediaElements.length > 0) {
            messageData.has_media = true;
            messageData.media_urls = [];
            
            for (const mediaElement of mediaElements) {
                try {
                    let mediaUrl = null;
                    
                    if (mediaElement.tagName === 'IMG') {
                        mediaUrl = mediaElement.src;
                    } else if (mediaElement.tagName === 'A' && mediaElement.hasAttribute('download')) {
                        mediaUrl = mediaElement.href;
                    } else {
                        // 尝试获取背景图片或其他媒体URL
                        const backgroundImage = window.getComputedStyle(mediaElement).backgroundImage;
                        if (backgroundImage && backgroundImage !== 'none') {
                            const urlMatch = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                            if (urlMatch && urlMatch[1]) {
                                mediaUrl = urlMatch[1];
                            }
                        }
                    }
                    
                    if (mediaUrl) {
                        messageData.media_urls.push(mediaUrl);
                    }
                } catch (error) {
                    this.log(`处理媒体时出错: ${error.message}`, 'error');
                }
            }
        }
    }

    /**
     * 获取安全头信息
     */
    getSecurityHeaders() {
        const headers = {};
        const token = this.getJEVToken();
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        headers['X-JEV-Module'] = this.moduleId;
        headers['X-JEV-Version'] = this.version;
        
        return headers;
    }

    /**
     * 获取JEV_TOKEN
     */
    getJEVToken() {
        // 尝试从多个位置获取token
        const token = (
            window.JEV?.CONFIG?.TOKEN ||
            localStorage.getItem('JEV_TOKEN') ||
            sessionStorage.getItem('JEV_TOKEN')
        );
        
        return token;
    }

    /**
     * 提取消息内容
     */
    extractMessageContent(element) {
        // 尝试多种方式提取内容
        const contentSelectors = [
            '.message-content',
            '.content',
            '.text',
            '.message-text',
            '.chat-text',
            '.bubble-text'
        ];
        
        for (const selector of contentSelectors) {
            const contentElement = element.querySelector(selector);
            if (contentElement && contentElement.textContent.trim()) {
                return contentElement.textContent.trim();
            }
        }
        
        // 尝试获取元素的直接文本内容（过滤掉子元素文本）
        let directText = '';
        Array.from(element.childNodes).forEach(node => {
            if (node.nodeType === 3) { // 文本节点
                directText += node.textContent;
            }
        });
        
        directText = directText.trim();
        if (directText && directText.length < 500) { // 避免获取过长的文本
            return directText;
        }
        
        return null;
    }

    /**
     * 提取消息时间戳
     */
    extractMessageTimestamp(element) {
        const timestampSelectors = [
            '.timestamp',
            '.time',
            '.date',
            '.message-time',
            '.time-stamp'
        ];
        
        for (const selector of timestampSelectors) {
            const timestampElement = element.querySelector(selector);
            if (timestampElement) {
                const timeText = timestampElement.textContent.trim();
                // 尝试解析时间文本
                const parsedTime = this.parseTimestamp(timeText);
                if (parsedTime) {
                    return parsedTime.toISOString();
                }
            }
        }
        
        return null;
    }

    /**
     * 解析时间戳文本
     */
    parseTimestamp(timeText) {
        try {
            // 简单的时间解析逻辑
            if (timeText.includes(':')) {
                // 如果只有时间，假设是今天
                const now = new Date();
                const [hours, minutes] = timeText.split(':').map(Number);
                const date = new Date(now);
                date.setHours(hours, minutes, 0, 0);
                return date;
            }
            return new Date(timeText);
        } catch (e) {
            return null;
        }
    }

    /**
     * 提取发送者名称
     */
    extractSenderName(element) {
        const nameSelectors = [
            '.sender-name',
            '.name',
            '.username',
            '.customer-name',
            '.user-info',
            '.sender'
        ];
        
        for (const selector of nameSelectors) {
            const nameElement = element.querySelector(selector);
            if (nameElement) {
                return nameElement.textContent.trim();
            }
        }
        
        return null;
    }

    /**
     * 扫描现有消息
     */
    scanExistingMessages() {
        this.log('开始扫描现有消息...');
        
        const messages = document.querySelectorAll(this.messageSelector);
        let processedCount = 0;
        
        messages.forEach(message => {
            if (this.isInboundMessage(message)) {
                this.processMessage(message);
                processedCount++;
            }
        });
        
        this.log(`已扫描 ${messages.length} 条消息，处理 ${processedCount} 条入站消息`);
    }

    /**
     * 上传消息到服务器
     */
    async uploadMessage(messageData) {
        try {
            // 准备请求选项
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getSecurityHeaders()
                },
                body: JSON.stringify(messageData)
            };
            
            // 发送请求
            const response = await fetch('/messages/ingest', options);
            
            if (response.ok) {
                const result = await response.json();
                this.uploadedCount++;
                this.queueLength = this.getQueueLength();
                this.log(`✅ Upload success: /messages/ingest`);
                
                // 更新状态
                this.updateStatus();
                
                return result;
            } else {
                throw new Error(`上传失败: ${response.status}`);
            }
        } catch (error) {
            this.log(`上传消息时出错: ${error.message}`, 'error');
            
            // 尝试使用备用上传方式
            this.saveToLocalStorage(messageData);
        }
    }

    /**
     * 保存消息到本地存储
     */
    saveToLocalStorage(messageData) {
        try {
            const queueKey = 'daoCollectorQueue';
            const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
            
            // 添加保存时间
            messageData.savedAt = new Date().toISOString();
            
            queue.push(messageData);
            
            // 限制队列大小
            if (queue.length > 500) {
                queue.splice(0, queue.length - 500);
            }
            
            localStorage.setItem(queueKey, JSON.stringify(queue));
            this.queueLength = queue.length;
            this.log(`消息已保存到本地队列，等待重试。队列长度: ${this.queueLength}`);
            
            // 更新状态
            this.updateStatus();
        } catch (e) {
            this.log(`保存到本地存储失败: ${e.message}`, 'error');
        }
    }

    /**
     * 处理本地消息队列
     */
    async processLocalQueue() {
        if (!this.isOnline) {
            this.log('网络未连接，跳过队列处理');
            return;
        }
        
        try {
            const queueKey = 'daoCollectorQueue';
            let queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
            
            if (queue.length === 0) {
                this.log('本地队列为空');
                return;
            }
            
            this.log(`开始处理本地队列，当前队列长度: ${queue.length}`);
            
            // 一次处理10条消息
            const batchSize = 10;
            const currentBatch = queue.slice(0, batchSize);
            
            for (const messageData of currentBatch) {
                // 尝试上传
                const success = await this.uploadMessageWithRetry(messageData, 3);
                if (success) {
                    // 从队列中移除
                    const index = queue.findIndex(msg => msg.id === messageData.id);
                    if (index > -1) {
                        queue.splice(index, 1);
                    }
                }
                
                // 避免请求过于频繁
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // 更新队列
            localStorage.setItem(queueKey, JSON.stringify(queue));
            this.queueLength = queue.length;
            
            this.log(`队列处理完成，剩余消息: ${this.queueLength}`);
            
            // 更新状态
            this.updateStatus();
            
            // 如果还有消息，继续处理
            if (queue.length > 0) {
                setTimeout(() => this.processLocalQueue(), 5000);
            }
        } catch (error) {
            this.log(`处理本地队列时出错: ${error.message}`, 'error');
        }
    }

    /**
     * 带重试的消息上传
     */
    async uploadMessageWithRetry(messageData, maxRetries) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.uploadMessage(messageData);
                return true;
            } catch (error) {
                this.log(`上传重试 ${attempt}/${maxRetries} 失败: ${error.message}`, 'warn');
                if (attempt < maxRetries) {
                    // 指数退避
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        return false;
    }

    /**
     * 获取队列长度
     */
    getQueueLength() {
        try {
            const queue = JSON.parse(localStorage.getItem('daoCollectorQueue') || '[]');
            return queue.length;
        } catch {
            return 0;
        }
    }

    /**
     * 清理过期缓存
     */
    cleanupOldCache() {
        try {
            // 清理过期的消息队列
            const queueKey = 'daoCollectorQueue';
            const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
            
            // 只保留最近7天的消息
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const filteredQueue = queue.filter(message => {
                const messageTime = new Date(message.savedAt).getTime();
                return messageTime > sevenDaysAgo;
            });
            
            if (filteredQueue.length < queue.length) {
                localStorage.setItem(queueKey, JSON.stringify(filteredQueue));
                this.queueLength = filteredQueue.length;
                this.log(`清理了 ${queue.length - filteredQueue.length} 条过期消息`);
            }
            
            // 清理其他旧数据
            const oldKeys = [
                'daojieCollector_lastMessageId',
                'daojieCollector_processedMessages'
            ];
            
            oldKeys.forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (error) {
            this.log(`清理缓存时出错: ${error.message}`, 'error');
        }
    }

    /**
     * 启动心跳
     */
    startHeartbeat() {
        this.stopHeartbeat();
        
        // 每分钟发送一次心跳
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat().catch(error => {
                this.log(`心跳失败: ${error.message}`, 'error');
            });
        }, 60000);
        
        this.log('心跳已启动');
    }

    /**
     * 停止心跳
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * 发送心跳
     */
    async sendHeartbeat() {
        try {
            const heartBeatData = {
                moduleId: this.moduleId,
                version: this.version,
                isActive: this.isActive,
                messageCount: this.messageCount,
                uploadedCount: this.uploadedCount,
                queueLength: this.queueLength,
                timestamp: new Date().toISOString()
            };
            
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getSecurityHeaders()
                },
                body: JSON.stringify(heartBeatData)
            };
            
            // 发送心跳到服务器
            const response = await fetch('/heartbeat', options);
            
            if (response.ok) {
                this.log('❤️ 心跳发送成功');
                return true;
            } else {
                throw new Error(`心跳响应失败: ${response.status}`);
            }
        } catch (error) {
            this.log(`发送心跳时出错: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 更新模块状态
     */
    updateStatus() {
        try {
            // 更新内存中的状态
            const status = {
                moduleId: this.moduleId,
                version: this.version,
                isActive: this.isActive,
                targetDomain: this.targetDomain,
                messageCount: this.messageCount,
                uploadedCount: this.uploadedCount,
                queueLength: this.queueLength,
                isOnline: this.isOnline,
                lastOnlineCheck: new Date(this.lastOnlineCheck).toISOString(),
                lastProcessedMessageId: this.lastProcessedMessageId,
                processedHashesCount: this.processedHashes.size,
                currentUrl: window.location.href,
                timestamp: new Date().toISOString()
            };
            
            // 保存到JEV状态管理器
            if (window.JEV && window.JEV.STATUS) {
                window.JEV.STATUS.setModuleStatus(this.moduleId, status);
            }
            
            // 保存到localStorage作为备份
            localStorage.setItem(`daojieCollector_status`, JSON.stringify(status));
            
            // 如果有控制台界面，更新显示
            if (window.JEV && window.JEV.UI && window.JEV.UI.updateModuleStatus) {
                window.JEV.UI.updateModuleStatus(this.moduleId, status);
            }
            
        } catch (error) {
            this.log(`更新状态时出错: ${error.message}`, 'error');
        }
    }

    /**
     * 日志记录
     */
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleString();
        const prefix = `[DAOJIE] [${level.toUpperCase()}]`;
        const logMessage = `${prefix} ${message}`;
        
        // 根据日志级别输出
        switch (level) {
            case 'error':
                console.error(logMessage);
                break;
            case 'warn':
                console.warn(logMessage);
                break;
            case 'debug':
                if (window.JEV?.CONFIG?.DEBUG) {
                    console.debug(logMessage);
                }
                break;
            default:
                console.info(logMessage);
        }
        
        // 保存到本地日志（可选）
        if (level === 'error' || level === 'warn' || window.JEV?.CONFIG?.DEBUG) {
            try {
                const logs = JSON.parse(localStorage.getItem('daojieCollector_logs') || '[]');
                logs.push({
                    timestamp: timestamp,
                    level: level,
                    message: message
                });
                
                // 只保留最近100条日志
                if (logs.length > 100) {
                    logs.splice(0, logs.length - 100);
                }
                
                localStorage.setItem('daojieCollector_logs', JSON.stringify(logs));
            } catch (e) {
                // 忽略日志保存错误
            }
        }
    }

    /**
     * 停止采集器
     */
    stop() {
        try {
            this.isActive = false;
            
            // 停止观察器
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            
            // 停止心跳
            this.stopHeartbeat();
            
            // 清空状态
            this.processedHashes.clear();
            this.lastProcessedMessageId = null;
            
            // 更新状态
            this.updateStatus();
            
            this.log('采集器已停止');
        } catch (error) {
            this.log(`停止采集器时出错: ${error.message}`, 'error');
        }
    }

    /**
     * 获取模块信息
     */
    getModuleInfo() {
        return {
            id: this.moduleId,
            name: this.moduleName,
            version: this.version,
            type: 'collector',
            dependencies: ['core', 'data'],
            entry: './modules/daojieCollector_v1.1.js'
        };
    }

    /**
     * 导出调试信息
     */
    dump() {
        const dumpInfo = {
            moduleInfo: this.getModuleInfo(),
            status: {
                isActive: this.isActive,
                messageCount: this.messageCount,
                uploadedCount: this.uploadedCount,
                queueLength: this.queueLength,
                isOnline: this.isOnline,
                lastProcessedMessageId: this.lastProcessedMessageId,
                processedHashesCount: this.processedHashes.size
            },
            config: {
                targetDomain: this.targetDomain,
                targetPaths: this.targetPaths,
                messageSelector: this.messageSelector,
                inboundSelector: this.inboundSelector,
                outboundSelector: this.outboundSelector,
                mediaSelector: this.mediaSelector
            },
            currentUrl: window.location.href,
            timestamp: new Date().toISOString(),
            browserInfo: navigator.userAgent
        };
        
        return JSON.stringify(dumpInfo, null, 2);
    }

    /**
     * 强制同步所有缓存的消息
     */
    async forceSync() {
        this.log('开始强制同步缓存的消息...');
        await this.processLocalQueue();
        this.log('强制同步完成');
    }
}

// 在浏览器环境中自动初始化
if (typeof window !== 'undefined') {
    // 确保DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new DAOJIEChatCollector();
        });
    } else {
        // DOM已经加载完成，直接初始化
        new DAOJIEChatCollector();
    }
}

// 在模块化环境中导出
if (typeof module !== 'undefined') {
    module.exports = DAOJIEChatCollector;
}

// 模块信息导出
export const moduleInfo = {
    id: 'daojieCollector',
    name: 'DAOJIE 聊天采集',
    version: '1.1.0',
    type: 'collector',
    dependencies: [],
    entry: './modules/daojieCollector_v1.1.js'
};
