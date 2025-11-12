// ==UserScript==
// @name         Cloudflare Worker 跨域测试脚本
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  测试Cloudflare Worker的CORS配置，支持fetch和GM_xmlhttpRequest两种方式
// @author       You
// @match        https://app.daojiemarketing.com/*
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @connect      jevshop.bensonlove1986.workers.dev
// @connect      jevshop.bensonlove1986.workers.dev
// ==/UserScript==

(function() {
    'use strict';
    
    // Worker配置
    const WORKER_CONFIG = {
        url: 'https://jevshop.bensonlove1986.workers.dev', // 正式域名
        localUrl: 'https://jevshop.bensonlove1986.workers.dev', // 主域名（本地开发域名已移除）
        apiKey: 'jevindustry2025' // 认证密钥
    };
    
    // 当前使用的Worker URL
    let currentWorkerUrl = WORKER_CONFIG.url;
    
    // 创建测试UI
    function createTestUI() {
        const container = document.createElement('div');
        container.id = 'worker-test-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            max-width: 90vw;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 999999;
            font-family: Arial, sans-serif;
            font-size: 14px;
        `;
        
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; color:#333;">Worker跨域测试工具</h3>
                <button id="worker-test-close" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">关闭</button>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Worker URL:</label>
                <select id="worker-url-select" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px;">
                    <option value="${WORKER_CONFIG.url}">正式域名</option>
                    <option value="${WORKER_CONFIG.localUrl}">开发域名</option>
                </select>
                <input type="text" id="custom-worker-url" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-bottom:10px;" placeholder="自定义Worker URL">
                <button id="use-custom-url" style="background: #4CAF50; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">使用自定义URL</button>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">认证密钥:</label>
                <input type="text" id="api-key-input" value="${WORKER_CONFIG.apiKey}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:10px; font-weight:bold;">测试方法:</label>
                <div style="display:flex; gap:10px;">
                    <button id="test-fetch" style="flex:1; background: #2196F3; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">测试fetch()</button>
                    <button id="test-gm-xhr" style="flex:1; background: #FF9800; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer;">测试GM_xmlhttpRequest()</button>
                </div>
            </div>
            
            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">端点测试:</label>
                <div style="display:flex; flex-wrap:gap; gap:5px;">
                    <button class="endpoint-test" data-endpoint="/ping" style="padding:5px 10px; background:#8BC34A; color:white; border:none; border-radius:4px; cursor:pointer;">/ping</button>
                    <button class="endpoint-test" data-endpoint="/test-vision?mode=ping" style="padding:5px 10px; background:#8BC34A; color:white; border:none; border-radius:4px; cursor:pointer;">/test-vision</button>
                    <button class="endpoint-test" data-endpoint="/analyze-image" style="padding:5px 10px; background:#8BC34A; color:white; border:none; border-radius:4px; cursor:pointer;">/analyze-image</button>
                </div>
            </div>
            
            <div style="margin-bottom:10px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">测试结果:</label>
                <div id="test-results" style="min-height:100px; max-height:200px; overflow-y:auto; padding:10px; border:1px solid #ddd; border-radius:4px; background:#f9f9f9; font-family: monospace; font-size:12px;">
                    点击上方按钮开始测试...
                </div>
            </div>
            
            <div>
                <button id="copy-script" style="width:100%; background: #9C27B0; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer;">复制完整脚本</button>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // 绑定事件
        document.getElementById('worker-test-close').addEventListener('click', () => {
            container.remove();
        });
        
        document.getElementById('use-custom-url').addEventListener('click', () => {
            const customUrl = document.getElementById('custom-worker-url').value.trim();
            if (customUrl) {
                currentWorkerUrl = customUrl;
                logMessage(`已切换到自定义URL: ${customUrl}`);
            }
        });
        
        document.getElementById('worker-url-select').addEventListener('change', (e) => {
            currentWorkerUrl = e.target.value;
            logMessage(`已切换到: ${e.target.options[e.target.selectedIndex].text}`);
        });
        
        document.getElementById('test-fetch').addEventListener('click', () => {
            testFetchPing();
        });
        
        document.getElementById('test-gm-xhr').addEventListener('click', () => {
            testGmXhrPing();
        });
        
        document.querySelectorAll('.endpoint-test').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const endpoint = e.target.dataset.endpoint;
                testEndpoint(endpoint);
            });
        });
        
        document.getElementById('copy-script').addEventListener('click', copyFullScript);
    }
    
    // 获取API密钥
    function getApiKey() {
        return document.getElementById('api-key-input').value.trim();
    }
    
    // 日志输出
    function logMessage(message) {
        const resultsDiv = document.getElementById('test-results');
        const timestamp = new Date().toLocaleTimeString();
        resultsDiv.innerHTML += `\n[${timestamp}] ${message}`;
        resultsDiv.scrollTop = resultsDiv.scrollHeight;
    }
    
    // 清除日志
    function clearLog() {
        document.getElementById('test-results').innerHTML = '';
    }
    
    // 测试fetch方法
    function testFetchPing() {
        clearLog();
        const apiKey = getApiKey();
        const endpoint = '/ping';
        const url = `${currentWorkerUrl}${endpoint}`;
        
        logMessage(`开始测试fetch访问 ${url}`);
        logMessage(`注意：如果遇到CORS错误，请尝试GM_xmlhttpRequest方法`);
        
        // 使用fetch访问Worker
        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': apiKey,
                // 显式指定cors模式
                'mode': 'cors',
                'credentials': 'include'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            logMessage(`✅ fetch访问成功!`);
            logMessage(`响应数据: ${JSON.stringify(data)}`);
        })
        .catch(error => {
            logMessage(`❌ fetch访问失败: ${error.message}`);
            logMessage(`请尝试使用GM_xmlhttpRequest方法，它不受CORS限制`);
        });
    }
    
    // 测试GM_xmlhttpRequest方法
    function testGmXhrPing() {
        clearLog();
        const apiKey = getApiKey();
        const endpoint = '/ping';
        const url = `${currentWorkerUrl}${endpoint}`;
        
        logMessage(`开始测试GM_xmlhttpRequest访问 ${url}`);
        logMessage(`这个方法不受CORS限制，应该能正常工作`);
        
        // 使用GM_xmlhttpRequest访问Worker
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': apiKey
            },
            onload: function(response) {
                logMessage(`✅ GM_xmlhttpRequest访问成功!`);
                logMessage(`状态码: ${response.status}`);
                try {
                    const data = JSON.parse(response.responseText);
                    logMessage(`响应数据: ${JSON.stringify(data)}`);
                } catch (e) {
                    logMessage(`响应文本: ${response.responseText}`);
                }
            },
            onerror: function(error) {
                logMessage(`❌ GM_xmlhttpRequest访问失败: ${error.message || '未知错误'}`);
            },
            ontimeout: function() {
                logMessage(`❌ 请求超时，请检查Worker URL是否正确`);
            }
        });
    }
    
    // 测试特定端点
    function testEndpoint(endpoint) {
        clearLog();
        const apiKey = getApiKey();
        const url = `${currentWorkerUrl}${endpoint}`;
        
        logMessage(`开始测试端点 ${url}`);
        logMessage(`使用GM_xmlhttpRequest方法（推荐用于Tampermonkey）`);
        
        // 准备请求数据（如果需要）
        let requestData = null;
        let method = 'GET';
        
        // 根据端点准备请求
        if (endpoint.includes('/analyze-image')) {
            method = 'POST';
            requestData = JSON.stringify({
                image_id: 'test_image',
                analysis_type: 'basic'
            });
        } else if (endpoint.includes('/test-vision')) {
            method = 'GET';
        } else {
            method = 'GET';
        }
        
        // 发送请求
        GM_xmlhttpRequest({
            method: method,
            url: url,
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': apiKey
            },
            data: requestData,
            onload: function(response) {
                logMessage(`✅ 端点测试成功!`);
                logMessage(`状态码: ${response.status}`);
                try {
                    const data = JSON.parse(response.responseText);
                    logMessage(`响应数据: ${JSON.stringify(data)}`);
                } catch (e) {
                    logMessage(`响应文本: ${response.responseText}`);
                }
            },
            onerror: function(error) {
                logMessage(`❌ 端点测试失败: ${error.message || '未知错误'}`);
            },
            ontimeout: function() {
                logMessage(`❌ 请求超时，请检查Worker URL是否正确`);
            }
        });
    }
    
    // 复制完整脚本
    function copyFullScript() {
        const scriptText = `// ==UserScript==
// @name         Worker跨域访问示例脚本
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  使用GM_xmlhttpRequest访问Cloudflare Worker的示例
// @author       You
// @match        https://app.daojiemarketing.com/*
// @grant        GM_xmlhttpRequest
// @connect      jevshop.bensonlove1986.workers.dev
// ==/UserScript==

(function() {
    'use strict';
    
    // Worker配置
    const WORKER_URL = '${WORKER_CONFIG.url}';
    const API_KEY = '${WORKER_CONFIG.apiKey}';
    
    // 使用GM_xmlhttpRequest访问Worker（推荐方法）
    function callWorkerEndpoint(endpoint, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const requestOptions = {
                method: method,
                url: \`\${WORKER_URL}\${endpoint}\`,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': API_KEY
                },
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                },
                onerror: function(error) {
                    reject(new Error(\`Request failed: \${error.message}\`));
                }
            };
            
            if (data && method !== 'GET') {
                requestOptions.data = JSON.stringify(data);
            }
            
            GM_xmlhttpRequest(requestOptions);
        });
    }
    
    // 示例：调用/ping端点
    async function testWorkerConnection() {
        try {
            console.log('Testing Worker connection...');
            const response = await callWorkerEndpoint('/ping');
            console.log('Worker connection successful:', response);
            return response;
        } catch (error) {
            console.error('Worker connection failed:', error);
        }
    }
    
    // 示例：分析图像
    async function analyzeImage(imageData) {
        try {
            const response = await callWorkerEndpoint('/analyze-image', 'POST', {
                image_id: imageData.id,
                analysis_type: 'basic',
                // 其他参数...
            });
            console.log('Image analysis result:', response);
            return response;
        } catch (error) {
            console.error('Image analysis failed:', error);
        }
    }
    
    // 页面加载后执行测试
    window.addEventListener('load', () => {
        console.log('Worker API Client initialized');
        // 可选：自动测试连接
        // testWorkerConnection();
    });
    
    // 暴露API给全局作用域，方便其他脚本调用
    window.WorkerAPI = {
        callEndpoint: callWorkerEndpoint,
        testConnection: testWorkerConnection,
        analyzeImage: analyzeImage
    };
})();`;
        
        navigator.clipboard.writeText(scriptText).then(() => {
            logMessage('✅ 完整脚本已复制到剪贴板！');
            logMessage('请在Tampermonkey中创建新脚本并粘贴内容');
        }).catch(err => {
            logMessage(`❌ 复制失败: ${err}`);
        });
    }
    
    // 创建简易启动按钮
    function createLaunchButton() {
        const button = document.createElement('button');
        button.id = 'worker-test-launcher';
        button.textContent = 'Worker测试';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2196F3;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            z-index: 999998;
        `;
        
        button.addEventListener('click', () => {
            const container = document.getElementById('worker-test-container');
            if (container) {
                container.remove();
            } else {
                createTestUI();
            }
        });
        
        document.body.appendChild(button);
    }
    
    // 启动脚本
    function initScript() {
        // 检查是否已加载
        if (document.getElementById('worker-test-launcher')) {
            return;
        }
        
        // 创建启动按钮
        createLaunchButton();
        
        console.log('Cloudflare Worker 跨域测试脚本已加载');
        console.log('点击右下角"Worker测试"按钮开始测试');
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScript);
    } else {
        initScript();
    }
})();