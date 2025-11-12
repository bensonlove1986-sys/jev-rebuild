// ==UserScript==
// @name         JEV AI 聊天 + 翻译一体化系统
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  智能客服系统，支持图片OCR、翻译和AI聊天
// @author       You
// @match        *://*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 全局配置
    const JEV_CONFIG = {
        WORKER_URL: 'http://localhost:3000', // 本地测试服务器地址
        MODE: 'AI', // 默认AI模式
        MESSAGE_LIST: [] // 消息列表
    };

    // 创建JEV聊天窗口
    function createJEVChatWindow() {
        // 移除所有已存在的JEV窗口
        const existingWindows = document.querySelectorAll('.jev-chat-window');
        existingWindows.forEach(window => window.remove());

        // 创建主窗口
        const chatWindow = document.createElement('div');
        chatWindow.className = 'jev-chat-window';
        chatWindow.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            height: 600px;
            background-color: #1a1a1a;
            border: 2px solid #00ff00;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            font-family: 'Courier New', monospace;
        `;

        // 创建标题栏
        const header = document.createElement('div');
        header.className = 'jev-header';
        header.style.cssText = `
            padding: 10px;
            background-color: #0a0a0a;
            border-bottom: 2px solid #00ff00;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #00ff00;
            font-weight: bold;
        `;
        header.textContent = 'JEV AI 智能客服系统';

        // 创建关闭按钮
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.cssText = `
            background: none;
            border: none;
            color: #00ff00;
            font-size: 20px;
            cursor: pointer;
        `;
        closeButton.onclick = () => chatWindow.remove();
        header.appendChild(closeButton);

        // 创建翻译区域
        const translationArea = document.createElement('div');
        translationArea.className = 'jev-translation-area';
        translationArea.style.cssText = `
            padding: 10px;
            height: 200px;
            overflow-y: auto;
            border-bottom: 2px solid #00ff00;
            color: #00ff00;
            font-size: 14px;
        `;
        translationArea.innerHTML = '<div class="jev-ocr-placeholder">上传图片以进行OCR识别和翻译</div>';

        // 创建图片上传区域
        const uploadArea = document.createElement('div');
        uploadArea.className = 'jev-upload-area';
        uploadArea.style.cssText = `
            padding: 10px;
            text-align: center;
            border-bottom: 2px solid #00ff00;
            color: #00ff00;
            cursor: pointer;
        `;
        uploadArea.innerHTML = '<input type="file" id="jev-image-upload" accept="image/*" style="display: none;"><div>📷 点击上传图片进行识别</div>';
        
        const fileInput = uploadArea.querySelector('#jev-image-upload');
        fileInput.onchange = async (e) => {
            if (e.target.files && e.target.files[0]) {
                const blob = e.target.files[0];
                await processImage(blob);
            }
        };
        
        uploadArea.onclick = () => fileInput.click();

        // 创建聊天区域
        const chatArea = document.createElement('div');
        chatArea.className = 'jev-chat-area';
        chatArea.style.cssText = `
            flex: 1;
            padding: 10px;
            overflow-y: auto;
            color: #00ff00;
        `;

        // 创建输入区域
        const inputArea = document.createElement('div');
        inputArea.className = 'jev-input-area';
        inputArea.style.cssText = `
            padding: 10px;
            background-color: #0a0a0a;
            border-top: 2px solid #00ff00;
            display: flex;
            gap: 5px;
        `;

        // 创建输入框
        const messageInput = document.createElement('input');
        messageInput.type = 'text';
        messageInput.placeholder = '输入消息...';
        messageInput.style.cssText = `
            flex: 1;
            padding: 8px;
            background-color: #1a1a1a;
            border: 1px solid #00ff00;
            border-radius: 5px;
            color: #00ff00;
            outline: none;
        `;

        // 创建发送按钮
        const sendButton = document.createElement('button');
        sendButton.textContent = '发送';
        sendButton.style.cssText = `
            padding: 8px 16px;
            background-color: #00ff00;
            color: #000;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        `;
        sendButton.onclick = () => sendMessage(messageInput.value);
        
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                sendMessage(messageInput.value);
            }
        };

        // 创建模式切换按钮
        const modeButton = document.createElement('button');
        modeButton.className = 'jev-mode-button';
        modeButton.textContent = '🤖 AI';
        modeButton.style.cssText = `
            margin-right: 5px;
            padding: 8px;
            background-color: #1a1a1a;
            border: 1px solid #00ff00;
            border-radius: 5px;
            color: #00ff00;
            cursor: pointer;
        `;
        modeButton.onclick = () => {
            JEV_CONFIG.MODE = JEV_CONFIG.MODE === 'AI' ? 'MANUAL' : 'AI';
            modeButton.textContent = JEV_CONFIG.MODE === 'AI' ? '🤖 AI' : '👤 人工';
        };

        inputArea.appendChild(modeButton);
        inputArea.appendChild(messageInput);
        inputArea.appendChild(sendButton);

        // 组装窗口
        chatWindow.appendChild(header);
        chatWindow.appendChild(translationArea);
        chatWindow.appendChild(uploadArea);
        chatWindow.appendChild(chatArea);
        chatWindow.appendChild(inputArea);

        // 添加到文档
        document.body.appendChild(chatWindow);

        // 添加滚动条样式
        const style = document.createElement('style');
        style.textContent = `
            .jev-chat-window ::-webkit-scrollbar {
                width: 8px;
            }
            .jev-chat-window ::-webkit-scrollbar-track {
                background: #0a0a0a;
            }
            .jev-chat-window ::-webkit-scrollbar-thumb {
                background: #00ff00;
                border-radius: 4px;
            }
            .jev-chat-window ::-webkit-scrollbar-thumb:hover {
                background: #00cc00;
            }
            .jev-ocr-placeholder {
                color: #666;
                text-align: center;
                padding: 20px;
            }
            .jev-message {
                margin-bottom: 10px;
                padding: 5px 10px;
                border-radius: 5px;
                word-wrap: break-word;
            }
            .jev-message.user {
                background-color: #2a2a2a;
                text-align: right;
            }
            .jev-message.ai {
                background-color: #0a2a0a;
                text-align: left;
            }
            .jev-loading {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #00ff00;
                border-radius: 50%;
                border-top-color: transparent;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        // 存储引用
        JEV_CONFIG.chatWindow = chatWindow;
        JEV_CONFIG.chatArea = chatArea;
        JEV_CONFIG.translationArea = translationArea;
        JEV_CONFIG.messageInput = messageInput;
    }

    // 处理图片上传和识别
    async function processImage(blob) {
        try {
            // 显示加载状态
            JEV_CONFIG.translationArea.innerHTML = '<div class="jev-loading" style="margin: 20px auto;"></div><div style="text-align: center;">正在上传和分析图片...</div>';

            // 第一阶段：上传图片到Worker的/upload-image端点
            const formData = new FormData();
            formData.append('image', blob, 'upload.jpg');

            const uploadResponse = await fetch(`${JEV_CONFIG.WORKER_URL}/upload-image`, {
                method: 'POST',
                body: formData
            });

            const uploadData = await uploadResponse.json();
            if (!uploadData.success) {
                throw new Error(uploadData.error || '上传失败');
            }

            // 第二阶段：分析图片（OCR + 翻译）
            const analyzeResponse = await fetch(`${JEV_CONFIG.WORKER_URL}/analyze-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ imageUrl: uploadData.data.imageUrl })
            });

            const analyzeData = await analyzeResponse.json();
            if (!analyzeData.success) {
                throw new Error(analyzeData.error || '分析失败');
            }

            // 显示结果
            const { ocrText, translation } = analyzeData.data;
            JEV_CONFIG.translationArea.innerHTML = `
                <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">📄 OCR原文：</div>
                    <div style="white-space: pre-wrap;">${escapeHtml(ocrText)}</div>
                </div>
                <div>
                    <div style="font-weight: bold; margin-bottom: 5px;">🌐 翻译结果：</div>
                    <div style="white-space: pre-wrap;">${escapeHtml(translation)}</div>
                </div>
            `;

        } catch (error) {
            JEV_CONFIG.translationArea.innerHTML = `<div style="color: red;">错误：${error.message}</div>`;
            console.error('图片处理失败:', error);
        }
    }

    // 发送消息
    async function sendMessage(text) {
        if (!text.trim()) return;

        // 清空输入框
        JEV_CONFIG.messageInput.value = '';

        // 添加用户消息
        addMessage(text, 'user');

        // 如果是AI模式，获取自动回复
        if (JEV_CONFIG.MODE === 'AI') {
            try {
                // 添加AI正在输入状态
                const loadingId = 'loading-' + Date.now();
                addMessage('<div class="jev-loading"></div> 正在思考...', 'ai', loadingId);

                // 调用Worker的/chat-reply端点
                const response = await fetch(`${JEV_CONFIG.WORKER_URL}/chat-reply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ message: text })
                });

                const data = await response.json();
                
                // 移除loading消息
                removeMessage(loadingId);
                
                if (data.success) {
                    // 添加AI回复
                    addMessage(data.data.reply, 'ai');
                } else {
                    throw new Error(data.error || '获取回复失败');
                }
            } catch (error) {
                removeMessage(loadingId);
                addMessage(`错误：${error.message}`, 'ai');
                console.error('发送消息失败:', error);
            }
        }
    }

    // 添加消息
    function addMessage(text, type, id = null) {
        const message = document.createElement('div');
        message.className = `jev-message ${type}`;
        message.innerHTML = text;
        if (id) message.id = id;
        
        JEV_CONFIG.chatArea.appendChild(message);
        
        // 滚动到底部
        JEV_CONFIG.chatArea.scrollTop = JEV_CONFIG.chatArea.scrollHeight;
        
        // 保存到消息列表
        JEV_CONFIG.MESSAGE_LIST.push({
            id: id || Date.now(),
            text: text.replace(/<[^>]*>/g, ''),
            type,
            timestamp: new Date()
        });
    }

    // 移除消息
    function removeMessage(id) {
        const message = document.getElementById(id);
        if (message) {
            message.remove();
        }
    }

    // HTML转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 禁用PowerShell协助窗口
    function disablePowerShellWindows() {
        // 监听新元素添加
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // 元素节点
                        // 检查是否包含PowerShell相关内容
                        if (node.textContent && 
                            (node.textContent.includes('PowerShell') || 
                             node.textContent.includes('需要您的协助') ||
                             node.textContent.includes('Win + R'))) {
                            node.style.display = 'none';
                            node.remove();
                        }
                    }
                });
            });
        });

        // 开始监听
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 初始化
    function init() {
        // 禁用PowerShell窗口
        disablePowerShellWindows();
        
        // 创建聊天窗口
        createJEVChatWindow();
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();