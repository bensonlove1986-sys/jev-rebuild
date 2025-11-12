// JEV 智能客服插件 - 聊天与翻译模块
const chatModule = {
    init: function(container) {
        console.log('初始化聊天与翻译模块');
        this.container = container;
        this.render();
        this.bindEvents();
        // 模拟加载聊天历史
        this.loadMockChatHistory();
    },
    
    render: function() {
        const chatContent = document.getElementById('chat-content');
        chatContent.innerHTML = `
            <div class="chat-container">
                <div class="message-area">
                    <div class="message-header">
                        <h4>客户消息（自动采集）</h4>
                        <div id="translation-result" class="translation-result">
                            翻译结果将显示在这里
                        </div>
                    </div>
                    <div id="message-list" class="message-list">
                        <!-- 消息列表将动态生成 -->
                    </div>
                </div>
                
                <div class="reply-area">
                    <div class="reply-header">
                        <h4>回复区（AI/人工可切换）</h4>
                    </div>
                    <div class="ai-draft">
                        <label>AI草稿：</label>
                        <div id="ai-draft-content" class="ai-draft-content">
                            AI将自动生成回复建议...
                        </div>
                    </div>
                    <div class="reply-editor">
                        <textarea id="reply-textarea" rows="3" placeholder="请输入回复内容..."></textarea>
                    </div>
                    <div class="reply-actions">
                        <button id="btn-ai-reply" class="action-btn ai-btn">🧠 AI回复</button>
                        <button id="btn-manual" class="action-btn">✍ 人工</button>
                        <button id="btn-translate" class="action-btn">🌐 翻译</button>
                        <button id="btn-send" class="action-btn send-btn">🚀 发送</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addStyles();
    },
    
    addStyles: function() {
        const style = document.createElement('style');
        style.textContent = `
            .chat-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                gap: 20px;
            }
            
            .message-area {
                flex: 1;
                border: 1px solid #0f0;
                border-radius: 6px;
                padding: 10px;
                background: rgba(0, 20, 0, 0.3);
                display: flex;
                flex-direction: column;
            }
            
            .message-header h4,
            .reply-header h4 {
                margin: 0 0 10px 0;
                color: #0f0;
                font-size: 14px;
                border-bottom: 1px solid #0f0;
                padding-bottom: 5px;
            }
            
            .translation-result {
                background: rgba(0, 255, 0, 0.1);
                border: 1px solid #0f0;
                border-radius: 4px;
                padding: 8px;
                margin-bottom: 10px;
                font-size: 13px;
                min-height: 20px;
            }
            
            .message-list {
                flex: 1;
                overflow-y: auto;
                margin-bottom: 10px;
            }
            
            .message {
                margin-bottom: 15px;
                padding: 10px;
                border-radius: 6px;
                max-width: 80%;
            }
            
            .message.customer {
                background: rgba(0, 50, 0, 0.3);
                border-left: 3px solid #0f0;
                align-self: flex-start;
            }
            
            .message.agent {
                background: rgba(0, 255, 0, 0.1);
                border-right: 3px solid #0f0;
                align-self: flex-end;
                margin-left: auto;
            }
            
            .message-time {
                font-size: 11px;
                color: #0a0;
                opacity: 0.7;
                margin-top: 5px;
                text-align: right;
            }
            
            .reply-area {
                border: 1px solid #0f0;
                border-radius: 6px;
                padding: 10px;
                background: rgba(0, 20, 0, 0.3);
            }
            
            .ai-draft {
                margin-bottom: 10px;
            }
            
            .ai-draft label {
                font-weight: bold;
                display: block;
                margin-bottom: 5px;
                font-size: 13px;
            }
            
            .ai-draft-content {
                background: rgba(0, 255, 0, 0.05);
                border: 1px dashed #0f0;
                border-radius: 4px;
                padding: 8px;
                min-height: 40px;
                font-size: 13px;
                margin-bottom: 10px;
            }
            
            .reply-editor textarea {
                width: 100%;
                border: 1px solid #0f0;
                border-radius: 4px;
                background: rgba(0, 10, 0, 0.5);
                color: #0f0;
                padding: 8px;
                font-family: inherit;
                resize: vertical;
                min-height: 60px;
                box-sizing: border-box;
            }
            
            .reply-editor textarea:focus {
                outline: none;
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
            }
            
            .reply-actions {
                display: flex;
                gap: 10px;
                margin-top: 10px;
                justify-content: flex-end;
            }
            
            .action-btn {
                background: transparent;
                border: 1px solid #0f0;
                color: #0f0;
                padding: 6px 15px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 13px;
            }
            
            .action-btn:hover {
                background: rgba(0, 255, 0, 0.2);
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
            }
            
            .ai-btn {
                background: rgba(0, 255, 0, 0.1);
            }
            
            .send-btn {
                background: rgba(0, 255, 0, 0.2);
                font-weight: bold;
            }
            
            /* 滚动条样式 */
            .message-list::-webkit-scrollbar {
                width: 8px;
            }
            
            .message-list::-webkit-scrollbar-track {
                background: rgba(0, 20, 0, 0.5);
                border-radius: 4px;
            }
            
            .message-list::-webkit-scrollbar-thumb {
                background: #0f0;
                border-radius: 4px;
            }
            
            .message-list::-webkit-scrollbar-thumb:hover {
                background: #0a0;
            }
        `;
        document.head.appendChild(style);
    },
    
    bindEvents: function() {
        // 绑定AI回复按钮
        document.getElementById('btn-ai-reply').addEventListener('click', () => {
            this.generateAIReply();
        });
        
        // 绑定人工编辑按钮
        document.getElementById('btn-manual').addEventListener('click', () => {
            document.getElementById('reply-textarea').focus();
        });
        
        // 绑定翻译按钮
        document.getElementById('btn-translate').addEventListener('click', () => {
            this.translateMessage();
        });
        
        // 绑定发送按钮
        document.getElementById('btn-send').addEventListener('click', () => {
            this.sendMessage();
        });
        
        // 回车发送消息
        document.getElementById('reply-textarea').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    },
    
    // 加载模拟聊天历史
    loadMockChatHistory: function() {
        const messageList = document.getElementById('message-list');
        const messages = [
            {
                type: 'customer',
                content: 'Hello, I would like to inquire about your products.',
                time: '14:30:22'
            },
            {
                type: 'agent',
                content: '您好！欢迎咨询我们的产品。请问您具体想了解哪方面的信息呢？',
                time: '14:30:45'
            },
            {
                type: 'customer',
                content: 'I\'m interested in your latest AI solutions for customer service.',
                time: '14:31:10'
            }
        ];
        
        messages.forEach(msg => {
            this.addMessage(msg.type, msg.content, msg.time);
        });
        
        // 自动翻译最新的客户消息
        this.updateTranslation('I\'m interested in your latest AI solutions for customer service.');
    },
    
    // 添加消息到消息列表
    addMessage: function(type, content, time = new Date().toLocaleTimeString()) {
        const messageList = document.getElementById('message-list');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${time}</div>
        `;
        messageList.appendChild(messageDiv);
        
        // 滚动到底部
        messageList.scrollTop = messageList.scrollHeight;
    },
    
    // 生成AI回复
    generateAIReply: function() {
        const aiDraft = document.getElementById('ai-draft-content');
        aiDraft.textContent = '正在生成AI回复...';
        
        // 模拟AI回复生成
        setTimeout(() => {
            const mockReplies = [
                '感谢您对我们AI客服解决方案的关注。我们的最新产品能够实现24/7智能客户服务，支持多语言交流和智能问题分类。您想了解更多技术细节还是价格方案呢？',
                '我们的AI客服解决方案具有很高的定制性，可以根据您的业务需求进行个性化配置。核心功能包括智能问答、客户意图识别和情感分析等。',
                '很高兴为您介绍我们的AI客服产品。它采用了先进的自然语言处理技术，能够准确理解客户需求并提供专业解答，有效提升客服效率和客户满意度。'
            ];
            
            const randomReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
            aiDraft.textContent = randomReply;
            
            // 将AI回复复制到编辑框
            document.getElementById('reply-textarea').value = randomReply;
        }, 1000);
    },
    
    // 翻译消息
    translateMessage: function() {
        const replyText = document.getElementById('reply-textarea').value;
        if (!replyText.trim()) {
            alert('请先输入要翻译的内容');
            return;
        }
        
        const translationResult = document.getElementById('translation-result');
        translationResult.textContent = '正在翻译...';
        
        // 模拟翻译
        setTimeout(() => {
            // 简单模拟中英文翻译
            const isEnglish = /^[a-zA-Z\s]+$/.test(replyText.substring(0, 10));
            let mockTranslation = replyText;
            
            if (isEnglish) {
                mockTranslation = '这是模拟的中文翻译结果：' + replyText;
            } else {
                mockTranslation = 'This is a simulated English translation: ' + replyText;
            }
            
            translationResult.textContent = mockTranslation;
        }, 800);
    },
    
    // 更新翻译结果
    updateTranslation: function(text) {
        const translationResult = document.getElementById('translation-result');
        translationResult.textContent = '正在翻译...';
        
        // 模拟翻译客户消息
        setTimeout(() => {
            let translation = '我对贵公司最新的客户服务AI解决方案很感兴趣。';
            translationResult.textContent = translation;
        }, 500);
    },
    
    // 发送消息
    sendMessage: function() {
        const replyText = document.getElementById('reply-textarea').value;
        if (!replyText.trim()) {
            alert('请输入回复内容');
            return;
        }
        
        // 添加消息到列表
        this.addMessage('agent', replyText);
        
        // 清空输入框
        document.getElementById('reply-textarea').value = '';
        
        // 模拟发送到服务器
        console.log('发送消息:', replyText);
        
        // 模拟客户回复
        setTimeout(() => {
            const mockCustomerReplies = [
                'That sounds great! Can you provide more details about pricing?',
                'What are the integration options with our existing systems?',
                'Do you offer a free trial period?',
                'How is the customer support for this product?'
            ];
            
            const randomReply = mockCustomerReplies[Math.floor(Math.random() * mockCustomerReplies.length)];
            this.addMessage('customer', randomReply);
            this.updateTranslation(randomReply);
        }, 2000);
    }
};

// 导出模块
export default chatModule;