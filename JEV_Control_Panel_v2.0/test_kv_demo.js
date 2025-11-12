/**
 * KV存储功能测试演示脚本
 * 功能：演示JEV系统中KV存储的使用方法，包括初始化、读写操作和错误处理
 */

// 导入必要的模块
import { CONFIG } from './core/config.js';
import api from './core/api.js';
import logger from './core/logger.js';
import kvTest from './core/kv_test.js';

class KVDemo {
    constructor() {
        this.demoKeys = [
            'ui:last_open_panel',
            'system:config',
            'agents:last_status',
            'demo:test_data'
        ];
        
        // 测试UI元素ID
        this.ui = {
            status: 'kv-status',
            output: 'kv-output',
            controls: 'kv-controls'
        };
    }

    /**
     * 初始化演示环境
     */
    async init() {
        try {
            logger.info('初始化KV存储演示...', 'kv-demo');
            
            // 创建UI元素（如果它们不存在）
            this.createUI();
            
            // 显示初始状态
            this.updateStatus('正在初始化KV测试模块...');
            
            // 初始化KV测试模块
            const kvStatus = await kvTest.init();
            
            if (kvStatus) {
                this.updateStatus('✅ KV存储可用');
            } else {
                this.updateStatus('⚠️ KV存储不可用，已启用降级方案');
            }
            
            // 显示KV状态报告
            const statusReport = kvTest.getStatusReport();
            this.logOutput('KV状态报告:', statusReport);
            
            // 绑定测试按钮事件
            this.bindEvents();
            
            return true;
        } catch (error) {
            logger.error(`KV演示初始化失败: ${error.message}`, 'kv-demo');
            this.updateStatus(`❌ 初始化失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 创建演示UI
     */
    createUI() {
        // 检查是否已经存在UI元素
        if (document.getElementById(this.ui.status)) {
            return;
        }
        
        // 创建容器
        const container = document.createElement('div');
        container.id = 'kv-demo-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            max-height: 600px;
            background: #16213e;
            border: 1px solid #6c5ce7;
            border-radius: 10px;
            padding: 15px;
            color: #fff;
            font-family: Arial, sans-serif;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1000;
            overflow-y: auto;
        `;
        
        // 创建标题
        const title = document.createElement('h3');
        title.textContent = 'KV存储演示面板';
        title.style.marginTop = '0';
        title.style.color = '#6c5ce7';
        
        // 创建状态显示
        const statusDiv = document.createElement('div');
        statusDiv.id = this.ui.status;
        statusDiv.style.padding = '10px';
        statusDiv.style.background = 'rgba(0,0,0,0.2)';
        statusDiv.style.borderRadius = '5px';
        statusDiv.style.marginBottom = '15px';
        statusDiv.textContent = '初始化中...';
        
        // 创建输出区域
        const outputDiv = document.createElement('div');
        outputDiv.id = this.ui.output;
        outputDiv.style.height = '200px';
        outputDiv.style.overflowY = 'auto';
        outputDiv.style.background = '#0f3460';
        outputDiv.style.padding = '10px';
        outputDiv.style.borderRadius = '5px';
        outputDiv.style.marginBottom = '15px';
        outputDiv.style.fontFamily = 'monospace';
        outputDiv.style.fontSize = '12px';
        
        // 创建控制按钮
        const controlsDiv = document.createElement('div');
        controlsDiv.id = this.ui.controls;
        controlsDiv.style.display = 'flex';
        controlsDiv.style.flexWrap = 'wrap';
        controlsDiv.style.gap = '10px';
        
        // 添加测试按钮
        const buttons = [
            { id: 'kv-test-read', text: '读取测试', onClick: () => this.testRead() },
            { id: 'kv-test-write', text: '写入测试', onClick: () => this.testWrite() },
            { id: 'kv-test-delete', text: '删除测试', onClick: () => this.testDelete() },
            { id: 'kv-test-batch', text: '批量测试', onClick: () => this.testBatch() },
            { id: 'kv-reconnect', text: '重新连接', onClick: () => this.reconnect() },
            { id: 'kv-close', text: '关闭', onClick: () => this.close() }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.id = btn.id;
            button.textContent = btn.text;
            button.style.padding = '8px 12px';
            button.style.background = '#6c5ce7';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.borderRadius = '5px';
            button.style.cursor = 'pointer';
            button.style.fontSize = '12px';
            
            button.addEventListener('click', btn.onClick);
            controlsDiv.appendChild(button);
        });
        
        // 组装UI
        container.appendChild(title);
        container.appendChild(statusDiv);
        container.appendChild(outputDiv);
        container.appendChild(controlsDiv);
        
        document.body.appendChild(container);
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 可以在这里添加更多事件监听器
        window.addEventListener('jev:kv:status_changed', (event) => {
            this.updateStatus(event.detail.status ? '✅ KV存储可用' : '⚠️ KV存储不可用');
        });
    }

    /**
     * 更新状态显示
     */
    updateStatus(message) {
        const statusEl = document.getElementById(this.ui.status);
        if (statusEl) {
            statusEl.textContent = message;
        }
        logger.info(`KV状态: ${message}`, 'kv-demo');
    }

    /**
     * 记录输出信息
     */
    logOutput(title, data = null) {
        const outputEl = document.getElementById(this.ui.output);
        if (!outputEl) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logItem = document.createElement('div');
        logItem.style.marginBottom = '10px';
        logItem.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
        logItem.style.paddingBottom = '5px';
        
        const titleSpan = document.createElement('div');
        titleSpan.style.color = '#6c5ce7';
        titleSpan.style.fontWeight = 'bold';
        titleSpan.textContent = `[${timestamp}] ${title}`;
        
        logItem.appendChild(titleSpan);
        
        if (data !== null) {
            const dataSpan = document.createElement('div');
            dataSpan.style.color = '#e0e0e0';
            dataSpan.style.whiteSpace = 'pre-wrap';
            dataSpan.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            logItem.appendChild(dataSpan);
        }
        
        outputEl.appendChild(logItem);
        outputEl.scrollTop = outputEl.scrollHeight;
    }

    /**
     * 读取测试
     */
    async testRead() {
        try {
            this.updateStatus('正在执行读取测试...');
            this.logOutput('开始读取测试');
            
            // 读取测试键
            const testKey = this.demoKeys[0];
            const value = await api.kvGet(testKey);
            
            if (value !== null) {
                this.logOutput(`成功读取 ${testKey}:`, value);
                this.updateStatus('✅ 读取测试成功');
            } else {
                this.logOutput(`键 ${testKey} 不存在或读取失败`);
                this.updateStatus('⚠️ 读取返回null');
            }
        } catch (error) {
            this.logOutput(`读取测试错误: ${error.message}`);
            this.updateStatus(`❌ 读取测试失败`);
        }
    }

    /**
     * 写入测试
     */
    async testWrite() {
        try {
            this.updateStatus('正在执行写入测试...');
            this.logOutput('开始写入测试');
            
            // 写入测试数据
            const testKey = this.demoKeys[3];
            const testData = {
                timestamp: new Date().toISOString(),
                version: CONFIG.VERSION,
                test: 'KV存储测试',
                random: Math.random()
            };
            
            const result = await api.kvSet(testKey, testData);
            
            if (result.ok) {
                this.logOutput(`成功写入 ${testKey}:`, testData);
                this.updateStatus('✅ 写入测试成功');
            } else {
                this.logOutput(`写入失败: ${result.error}`);
                this.updateStatus(`❌ 写入测试失败`);
            }
        } catch (error) {
            this.logOutput(`写入测试错误: ${error.message}`);
            this.updateStatus(`❌ 写入测试失败`);
        }
    }

    /**
     * 删除测试
     */
    async testDelete() {
        try {
            this.updateStatus('正在执行删除测试...');
            this.logOutput('开始删除测试');
            
            // 删除测试键
            const testKey = this.demoKeys[3];
            const result = await api.kvDel(testKey);
            
            if (result.ok) {
                this.logOutput(`成功删除 ${testKey}`);
                this.updateStatus('✅ 删除测试成功');
            } else {
                this.logOutput(`删除失败: ${result.error}`);
                this.updateStatus(`❌ 删除测试失败`);
            }
        } catch (error) {
            this.logOutput(`删除测试错误: ${error.message}`);
            this.updateStatus(`❌ 删除测试失败`);
        }
    }

    /**
     * 批量操作测试
     */
    async testBatch() {
        try {
            this.updateStatus('正在执行批量测试...');
            this.logOutput('开始批量操作测试');
            
            // 准备批量写入数据
            const batchData = {};
            this.demoKeys.forEach((key, index) => {
                batchData[key] = {
                    index,
                    timestamp: new Date().toISOString(),
                    batchTest: true
                };
            });
            
            // 批量写入
            this.logOutput('批量写入测试数据...');
            const writeResult = await api.kvSetBatch(batchData);
            this.logOutput('批量写入结果:', {
                success: writeResult.success,
                failed: writeResult.failed
            });
            
            // 批量读取
            this.logOutput('批量读取测试数据...');
            const readResult = await api.kvGetBatch(this.demoKeys);
            this.logOutput('批量读取结果:', readResult);
            
            this.updateStatus('✅ 批量测试完成');
        } catch (error) {
            this.logOutput(`批量测试错误: ${error.message}`);
            this.updateStatus(`❌ 批量测试失败`);
        }
    }

    /**
     * 重新连接测试
     */
    async reconnect() {
        try {
            this.updateStatus('正在尝试重新连接KV服务...');
            const result = await kvTest.reconnect();
            
            if (result) {
                this.logOutput('KV服务重新连接成功');
                this.updateStatus('✅ KV服务已重新连接');
            } else {
                this.logOutput('KV服务重新连接失败');
                this.updateStatus('❌ 重新连接失败');
            }
            
            // 显示最新状态报告
            const statusReport = kvTest.getStatusReport();
            this.logOutput('更新后的KV状态报告:', statusReport);
        } catch (error) {
            this.logOutput(`重新连接错误: ${error.message}`);
            this.updateStatus(`❌ 重新连接失败`);
        }
    }

    /**
     * 关闭演示面板
     */
    close() {
        const container = document.getElementById('kv-demo-container');
        if (container) {
            container.remove();
        }
        logger.info('KV演示面板已关闭', 'kv-demo');
    }

    /**
     * 导出UI状态示例
     */
    async saveUIState() {
        try {
            // 模拟保存UI状态
            const uiState = {
                activeTab: document.querySelector('.active-tab')?.id || 'dashboard',
                sidebarCollapsed: document.body.classList.contains('sidebar-collapsed'),
                theme: document.documentElement.getAttribute('data-theme') || 'dark',
                lastUpdated: new Date().toISOString()
            };
            
            await api.kvSet('ui:state', uiState);
            this.logOutput('UI状态已保存:', uiState);
            return true;
        } catch (error) {
            this.logOutput(`保存UI状态失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 加载UI状态示例
     */
    async loadUIState() {
        try {
            const uiState = await api.kvGet('ui:state');
            if (uiState) {
                this.logOutput('加载UI状态:', uiState);
                // 这里可以应用UI状态到界面
                return uiState;
            }
            return null;
        } catch (error) {
            this.logOutput(`加载UI状态失败: ${error.message}`);
            return null;
        }
    }
}

// 创建演示实例并自动初始化
if (typeof window !== 'undefined') {
    // 等待DOM加载完成
    document.addEventListener('DOMContentLoaded', async () => {
        const kvDemo = new KVDemo();
        await kvDemo.init();
        
        // 暴露到全局，方便调试
        window.kvDemo = kvDemo;
        console.log('KV演示已初始化，可通过 window.kvDemo 访问');
    });
}

// 导出演示类
export default KVDemo;