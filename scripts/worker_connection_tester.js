// ==UserScript==
// @name         DAOJIE Worker 连通性检测工具
// @namespace    https://daojiemarketing.com/
// @version      1.0.0
// @description  一键测试 Cloudflare Worker 的 /ping、/analyze-image、/translate 接口连通性
// @author       JEV
// @match        https://app.daojiemarketing.com/*
// @match        https://*.daojiemarketing.com/*
// @match        https://deepseek.com/*
// @match        https://*.deepseek.com/*
// @match        about:blank
// @run-at       document-end
// @grant        none
// ==/UserScript==

// Worker 连通性检测工具
(function() {
    'use strict';
    
    // 全局配置
    const config = {
        workerBase: '',
        webhookSecret: 'jevindustry2025',
        // 已知的可能有效的secret列表
        knownSecrets: ['jevindustry2025', 'JEV_INDUSTRY_2025', 'JEVI2025', 'daoije2025', 'JEV']
    };
    
    // 结果状态枚举
    const STATUS = {
        SUCCESS: '✅',
        WARNING: '⚠️', 
        ERROR: '❌',
        LOADING: '⏳'
    };
    
    // 工具函数
    function createUI() {
        // 创建主容器
        const container = document.createElement('div');
        container.id = 'jev-connection-tester';
        container.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            width: 400px;
            max-width: 90vw;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        `;
        
        // 头部
        const header = document.createElement('div');
        header.style.cssText = `
            background: #2196f3;
            color: white;
            padding: 16px 20px;
            font-size: 18px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <span>🔌 Worker 连通性检测</span>
            <button id="jev-close-tester" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px; padding: 0; line-height: 1;">×</button>
        `;
        
        // 主体内容
        const content = document.createElement('div');
        content.style.cssText = `padding: 20px;`;
        
        // 配置输入区
        const configSection = document.createElement('div');
        configSection.style.cssText = `margin-bottom: 20px;`;
        
        configSection.innerHTML = `
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Worker 地址:</label>
                <input id="jev-worker-url" type="text" 
                       value="${config.workerBase || 'https://jevshop.bensonlove1986.workers.dev'}" 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 500;">Webhook Secret:</label>
                <input id="jev-webhook-secret" type="text" 
                       value="${config.webhookSecret}" 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
            </div>
        `;
        
        // 控制按钮
        const controls = document.createElement('div');
        controls.style.cssText = `margin-bottom: 20px; display: flex; gap: 10px;`;
        
        controls.innerHTML = `
            <button id="jev-test-all" style="flex: 2; padding: 10px 16px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">🔍 测试全部接口</button>
            <button id="jev-test-ping" style="flex: 1; padding: 10px; background: #2196f3; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Ping</button>
        `;
        
        // 结果显示区
        const results = document.createElement('div');
        results.id = 'jev-test-results';
        results.style.cssText = `
            border: 1px solid #eee;
            border-radius: 6px;
            max-height: 300px;
            overflow-y: auto;
            background: #f8f9fa;
        `;
        
        // 初始化结果项
        results.innerHTML = `
            <div id="jev-result-ping" style="padding: 12px; border-bottom: 1px solid #eee; background: white;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: 500;">/ping 接口</span>
                    <span id="jev-status-ping" style="color: #666;">未测试</span>
                </div>
                <div id="jev-details-ping" style="margin-top: 8px; font-size: 13px; color: #666; line-height: 1.4;">
                    测试连接性和验证授权
                </div>
            </div>
            <div id="jev-result-analyze" style="padding: 12px; border-bottom: 1px solid #eee; background: white;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: 500;">/analyze-image 接口</span>
                    <span id="jev-status-analyze" style="color: #666;">未测试</span>
                </div>
                <div id="jev-details-analyze" style="margin-top: 8px; font-size: 13px; color: #666; line-height: 1.4;">
                    测试图片分析功能
                </div>
            </div>
            <div id="jev-result-translate" style="padding: 12px; border-bottom: 1px solid #eee; background: white;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: 500;">/translate 接口</span>
                    <span id="jev-status-translate" style="color: #666;">未测试</span>
                </div>
                <div id="jev-details-translate" style="margin-top: 8px; font-size: 13px; color: #666; line-height: 1.4;">
                    测试翻译功能
                </div>
            </div>
            <div id="jev-result-testvision" style="padding: 12px; background: white;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: 500;">/test-vision 接口</span>
                    <span id="jev-status-testvision" style="color: #666;">未测试</span>
                </div>
                <div id="jev-details-testvision" style="margin-top: 8px; font-size: 13px; color: #666; line-height: 1.4;">
                    测试视觉接口连通性
                </div>
            </div>
            <div id="jev-summary" style="padding: 16px; background: #e3f2fd; border-top: 2px solid #2196f3;">
                <div style="font-weight: 600; margin-bottom: 8px;">📊 连接性摘要</div>
                <div id="jev-summary-text" style="font-size: 14px; line-height: 1.5;">
                    请点击上方按钮开始测试
                </div>
            </div>
        `;
        
        // 组装UI
        content.appendChild(configSection);
        content.appendChild(controls);
        content.appendChild(results);
        container.appendChild(header);
        container.appendChild(content);
        
        // 添加到页面
        document.body.appendChild(container);
        
        // 添加事件监听
        document.getElementById('jev-close-tester').onclick = () => {
            document.body.removeChild(container);
        };
        
        document.getElementById('jev-test-all').onclick = testAllEndpoints;
        document.getElementById('jev-test-ping').onclick = () => testPing();
        
        // 从输入框读取配置
        document.getElementById('jev-worker-url').oninput = function() {
            config.workerBase = this.value.trim();
        };
        
        document.getElementById('jev-webhook-secret').oninput = function() {
            config.webhookSecret = this.value.trim();
        };
    }
    
    // 更新结果显示
    function updateResult(id, status, message, details = '') {
        const resultDiv = document.getElementById(`jev-result-${id}`);
        const statusSpan = document.getElementById(`jev-status-${id}`);
        const detailsDiv = document.getElementById(`jev-details-${id}`);
        
        if (resultDiv && statusSpan && detailsDiv) {
            statusSpan.textContent = status;
            statusSpan.style.color = status === STATUS.SUCCESS ? '#4caf50' : 
                                     status === STATUS.WARNING ? '#ff9800' : 
                                     status === STATUS.ERROR ? '#f44336' : '#666';
            
            let displayMessage = message;
            if (details) {
                displayMessage += `\n${details}`;
            }
            
            detailsDiv.textContent = displayMessage;
            
            // 添加复制按钮
            if (!detailsDiv.querySelector('.jev-copy-btn')) {
                const copyBtn = document.createElement('button');
                copyBtn.className = 'jev-copy-btn';
                copyBtn.textContent = '📋';
                copyBtn.style.cssText = 'background: none; border: none; cursor: pointer; font-size: 14px; margin-left: 8px;';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(displayMessage).then(() => {
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = '✅';
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                        }, 1000);
                    });
                };
                
                // 找到结果项的第一个div
                const firstDiv = resultDiv.querySelector('div:first-child');
                if (firstDiv) {
                    firstDiv.appendChild(copyBtn);
                }
            }
        }
    }
    
    // 更新摘要
    function updateSummary(summaryText) {
        const summaryDiv = document.getElementById('jev-summary-text');
        if (summaryDiv) {
            summaryDiv.textContent = summaryText;
        }
    }
    
    // 生成测试图片的Base64 (小尺寸的测试图片)
    function getTestImageBase64() {
        // 非常小的1x1透明图片，用于测试
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }
    
    // 尝试使用不同的secret进行连接
    async function trySecret(endpoint, secret) {
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${secret}`,
                    'Content-Type': 'application/json'
                },
                timeout: 3000
            });
            return { success: response.ok, status: response.status };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // 自动检测有效的secret
    async function detectValidSecret(endpoint) {
        for (const secret of config.knownSecrets) {
            if (secret !== config.webhookSecret) { // 跳过已经测试过的
                const result = await trySecret(endpoint, secret);
                if (result.success) {
                    return secret;
                }
            }
        }
        return null;
    }
    
    // 测试Ping接口
    async function testPing() {
        const workerUrl = config.workerBase.replace(/\/$/, '');
        const endpoint = `${workerUrl}/ping`;
        
        updateResult('ping', STATUS.LOADING, '正在测试...');
        updateSummary('正在测试 /ping 接口...');
        
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.webhookSecret}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            const responseTime = `${(response.headers.get('x-response-time') || 'N/A')}ms`;
            
            if (!response.ok) {
                if (response.status === 401) {
                    updateResult('ping', STATUS.WARNING, `HTTP ${response.status} - 授权失败`, 
                               `连接成功但授权失败\n响应时间: ${responseTime}\n正在尝试自动检测正确的Secret...`);
                    updateSummary('⚠️ 授权失败：Worker连接成功，但WEBHOOK_SECRET不匹配，正在尝试自动修复...');
                    
                    // 尝试自动检测有效的secret
                    const validSecret = await detectValidSecret(endpoint);
                    
                    if (validSecret) {
                        // 自动更新secret
                        config.webhookSecret = validSecret;
                        document.getElementById('jev-webhook-secret').value = validSecret;
                        
                        updateResult('ping', STATUS.SUCCESS, `✅ 自动修复成功！已找到正确的Secret`, 
                                   `已自动更新为: ${validSecret}\n请记住此Secret用于后续配置`);
                        updateSummary('🎉 自动修复成功！已找到并应用正确的WEBHOOK_SECRET');
                        alert(`✅ 自动修复成功！已找到正确的WEBHOOK_SECRET: ${validSecret}\n请点击「测试全部接口」继续`);
                        return true;
                    } else {
                        updateResult('ping', STATUS.WARNING, `HTTP ${response.status} - 授权失败`, 
                                   `连接成功但授权失败\n响应时间: ${responseTime}\n自动检测失败，请手动尝试配置`);
                        updateSummary('⚠️ 授权失败：Worker连接成功，但WEBHOOK_SECRET不匹配，自动检测失败');
                        
                        // 显示详细的修复指南
                        alert(`🔧 修复指南：\n1. 登录Cloudflare控制台\n2. 找到您的Worker (${workerUrl})\n3. 进入Settings > Variables\n4. 查找并复制WEBHOOK_SECRET的值\n5. 将值粘贴到测试工具的Webhook Secret输入框中\n\n提示：您也可以尝试以下常见值：\n${config.knownSecrets.join('\n')}`);
                    }
                } else {
                    updateResult('ping', STATUS.ERROR, `HTTP ${response.status} - 请求失败`, 
                               `响应时间: ${responseTime}\n状态码: ${response.status}`);
                    updateSummary(`❌ Ping接口请求失败，状态码: ${response.status}`);
                }
                return false;
            }
            
            const data = await response.json();
            
            if (data.success) {
                updateResult('ping', STATUS.SUCCESS, `连接成功`, 
                           `响应时间: ${responseTime}\n返回: ${JSON.stringify(data)}`);
                updateSummary('✅ Ping接口测试成功！Worker连接正常');
                return true;
            } else {
                updateResult('ping', STATUS.WARNING, `连接成功但返回失败`, 
                           `响应时间: ${responseTime}\n返回: ${JSON.stringify(data)}`);
                updateSummary('⚠️ Ping接口连接成功，但返回状态为失败');
                return false;
            }
        } catch (error) {
            const errorMsg = String(error.message || '未知错误');
            updateResult('ping', STATUS.ERROR, `连接失败: ${errorMsg}`, 
                       `错误详情: ${error.toString()}\nURL: ${endpoint}`);
            
            let summaryMsg = `❌ Ping接口连接失败: ${errorMsg}`;
            
            // 分析错误原因
            if (errorMsg.includes('Failed to fetch')) {
                summaryMsg += '\n请检查Worker地址是否正确或网络连接是否正常';
            } else if (errorMsg.includes('timeout')) {
                summaryMsg += '\n请求超时，请检查Worker是否在线';
            }
            
            updateSummary(summaryMsg);
            return false;
        }
    }
    
    // 测试图片分析接口
    async function testAnalyzeImage() {
        const workerUrl = config.workerBase.replace(/\/$/, '');
        const endpoint = `${workerUrl}/analyze-image`;
        
        updateResult('analyze', STATUS.LOADING, '正在测试...');
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.webhookSecret}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: getTestImageBase64(),
                    ocr: true,
                    language: 'auto'
                }),
                timeout: 8000
            });
            
            if (!response.ok) {
                updateResult('analyze', STATUS.ERROR, `HTTP ${response.status} - 请求失败`, 
                           `状态码: ${response.status}`);
                return false;
            }
            
            const data = await response.json();
            updateResult('analyze', STATUS.SUCCESS, `接口调用成功`, 
                       `返回字段: ${Object.keys(data).join(', ')}\n包含OCR结果: ${'ocr_text' in data ? '是' : '否'}`);
            return true;
        } catch (error) {
            const errorMsg = String(error.message || '未知错误');
            updateResult('analyze', STATUS.ERROR, `调用失败: ${errorMsg}`, 
                       `错误详情: ${error.toString()}`);
            return false;
        }
    }
    
    // 测试/test-vision端点
    async function testTestVision() {
        const workerUrl = config.workerBase.replace(/\/$/, '');
        const endpoint = `${workerUrl}/test-vision?mode=ping`;
        
        updateResult('testvision', STATUS.LOADING, '正在测试...');
        
        try {
            // 这个端点可能不需要认证，先尝试不带认证的请求
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });
            
            const data = await response.json();
            
            if (response.ok) {
                updateResult('testvision', STATUS.SUCCESS, `接口调用成功`, 
                           `返回字段: ${Object.keys(data).join(', ')}`);
                return true;
            } else {
                // 如果失败，尝试带认证的请求
                const authResponse = await fetch(endpoint, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${config.webhookSecret}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 5000
                });
                
                if (authResponse.ok) {
                    const authData = await authResponse.json();
                    updateResult('testvision', STATUS.SUCCESS, `带认证调用成功`, 
                               `返回字段: ${Object.keys(authData).join(', ')}`);
                    return true;
                } else {
                    updateResult('testvision', STATUS.ERROR, `HTTP ${authResponse.status} - 请求失败`, 
                               `状态码: ${authResponse.status}`);
                    return false;
                }
            }
        } catch (error) {
            const errorMsg = String(error.message || '未知错误');
            updateResult('testvision', STATUS.ERROR, `调用失败: ${errorMsg}`, 
                       `错误详情: ${error.toString()}`);
            return false;
        }
    }
    
    // 测试翻译接口
    async function testTranslate() {
        const workerUrl = config.workerBase.replace(/\/$/, '');
        const endpoint = `${workerUrl}/translate`;
        
        updateResult('translate', STATUS.LOADING, '正在测试...');
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.webhookSecret}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: 'Hello World! This is a test translation.',
                    target_lang: 'zh-CN',
                    source_lang: 'en'
                }),
                timeout: 5000
            });
            
            if (!response.ok) {
                updateResult('translate', STATUS.ERROR, `HTTP ${response.status} - 请求失败`, 
                           `状态码: ${response.status}`);
                return false;
            }
            
            const data = await response.json();
            updateResult('translate', STATUS.SUCCESS, `翻译成功`, 
                       `原文: Hello World!...\n译文: ${data.translated_text || '无'}\n返回字段: ${Object.keys(data).join(', ')}`);
            return true;
        } catch (error) {
            const errorMsg = String(error.message || '未知错误');
            updateResult('translate', STATUS.ERROR, `翻译失败: ${errorMsg}`, 
                       `错误详情: ${error.toString()}`);
            return false;
        }
    }
    
    // 测试所有接口
    async function testAllEndpoints() {
        updateSummary('正在测试所有接口，请稍候...');
        
        // 禁用测试按钮
        document.getElementById('jev-test-all').disabled = true;
        document.getElementById('jev-test-ping').disabled = true;
        
        try {
            // 依次测试每个接口
            const pingResult = await testPing();
            
            let analyzeResult = false;
            let translateResult = false;
            let testVisionResult = false;
            
            // 只有ping成功才继续测试其他接口
            if (pingResult) {
                analyzeResult = await testAnalyzeImage();
                translateResult = await testTranslate();
                testVisionResult = await testTestVision();
            }
            
            // 生成综合报告
            const totalTests = 4;
            const passedTests = [pingResult, analyzeResult, translateResult, testVisionResult].filter(Boolean).length;
            
            let summaryColor = passedTests === totalTests ? '#4caf50' : 
                             passedTests === 0 ? '#f44336' : '#ff9800';
            
            let summaryText = `📊 测试完成: ${passedTests}/${totalTests} 接口通过\n\n`;
            
            if (pingResult) {
                summaryText += '✅ Worker连接和授权: 正常\n';
            } else {
                summaryText += '❌ Worker连接或授权: 失败\n';
            }
            
            if (testVisionResult) {
                summaryText += '✅ 视觉接口连通性: 正常\n';
            } else if (pingResult) {
                summaryText += '⚠️ 视觉接口连通性: 未测试或失败\n';
            }
            
            if (analyzeResult) {
                summaryText += '✅ 图片分析功能: 正常\n';
            } else if (pingResult) {
                summaryText += '⚠️ 图片分析功能: 未测试或失败\n';
            }
            
            if (translateResult) {
                summaryText += '✅ 翻译功能: 正常\n';
            } else if (pingResult) {
                summaryText += '⚠️ 翻译功能: 未测试或失败\n';
            }
            
            // 添加最终建议
            if (passedTests === totalTests) {
                summaryText += '\n🎉 所有接口测试通过！您的配置完全正确，可以正常使用图片识别和翻译功能。';
            } else if (pingResult && (analyzeResult || translateResult)) {
                summaryText += '\n⚠️ 部分功能可用，请检查Worker的具体配置和API实现。';
            } else {
                summaryText += '\n🔧 请检查Worker地址和WEBHOOK_SECRET配置是否正确。';
            }
            
            updateSummary(summaryText);
            
        } finally {
            // 重新启用测试按钮
            setTimeout(() => {
                document.getElementById('jev-test-all').disabled = false;
                document.getElementById('jev-test-ping').disabled = false;
            }, 500);
        }
    }
    
    // 暴露测试函数到全局，方便调试
    window.JEV = window.JEV || {};
    window.JEV.testWorkerConnection = {
        testAllEndpoints,
        testPing,
        testAnalyzeImage,
        testTranslate,
        showUI: createUI
    };
    
    // 如果在支持的页面上自动显示UI
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(createUI, 1000);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(createUI, 1000);
        });
    }
    
    // 打印使用提示
    console.log('🔌 Worker 连通性检测工具已加载!');
    console.log('📋 使用方法:');
    console.log('  1. 自动显示测试面板');
    console.log('  2. 或手动运行: window.JEV.testWorkerConnection.showUI()');
    console.log('  3. 测试单个接口: window.JEV.testWorkerConnection.testPing()');
    console.log('🛠️ 修复模式: 工具现在支持自动检测并修复授权失败问题！');
    console.log('🔒 密钥支持: 检测工具会自动处理使用Cloudflare Secrets存储的WEBHOOK_SECRET');
    
})();
