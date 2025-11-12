/**
 * 模块名称：JEVControlPanel（主入口）
 * 功能：系统初始化、模块协调、样式加载、事件注册
 * 依赖模块：config.js, logger.js, dashboard.js, alert.js, analytics.js
 * 作者：JEV 系统
 */

// 导入核心模块
import { CONFIG } from './core/config.js';
import logger from './core/logger.js';
import agentManager from './core/agents.js';
import api from './core/api.js';
import strategyManager from './core/strategy.js';
import kvTest from './core/kv_test.js';

// 导入功能模块
import dashboard from './modules/dashboard.js';
import alertManager from './modules/alert.js';
import analyticsManager from './modules/analytics.js';
// 按需导入的扩展模块
let mailerManager;

class JEVControlPanel {
    constructor() {
        this.isInitialized = false;
        this.modules = {
            logger,
            agentManager,
            api,
            strategyManager,
            dashboard,
            alertManager,
            analyticsManager
        };
    }

    /**
     * 初始化JEV控制面板
     */
    async init() {
        try {
            // 确保页面已加载完成
            await this.waitForDocumentReady();
            
            // 初始化日志模块（第一个初始化）
            logger.init();
            logger.info('JEV控制面板v2.0 Pro 正在启动...', 'main');
            
            // 检查API连接
            await this.checkInitialConnection();
            
            // 初始化核心模块
            await this.initializeCoreModules();
            
            // 初始化KV测试模块
            await kvTest.init();
            logger.info('KV测试模块初始化完成', 'main');
            
            // 初始化功能模块
        this.initializeFeatureModules();
        
        // 条件初始化邮件模块（按需加载）
        await this.initOptionalModules();
        
        // 加载样式
        this.loadStyles();
            
            // 注册全局事件处理
            this.registerGlobalEvents();
            
            this.isInitialized = true;
            logger.success('JEV控制面板v2.0 Pro 启动成功！', 'main');
            
            // 显示启动成功通知
            alertManager.showNotification(
                '✅ 控制面板已启动', 
                'success',
                `已连接到 ${CONFIG.API_BASE}`
            );
            
        } catch (error) {
            logger.error(`启动失败: ${error.message}`, 'main');
            
            // 显示启动失败通知
            alertManager.showNotification(
                '❌ 控制面板启动失败', 
                'error',
                `错误: ${error.message}\n请检查AI服务端是否运行在端口1822`,
                true
            );
        }
    }

    /**
     * 等待文档加载完成
     */
    async waitForDocumentReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve);
            }
        });
    }

    /**
     * 检查初始连接
     */
    async checkInitialConnection() {
        logger.info(`正在连接到AI服务端: ${CONFIG.API_BASE}`, 'main');
        
        try {
            const connected = await agentManager.checkConnection();
            if (!connected) {
                throw new Error('无法连接到AI服务端，请检查服务是否运行');
            }
            
            logger.success('成功连接到AI服务端', 'main');
        } catch (error) {
            logger.error(`连接检查失败: ${error.message}`, 'main');
            throw error;
        }
    }

    /**
     * 初始化核心模块
     */
    async initializeCoreModules() {
        try {
            // 初始化API模块
            await api.init();
            logger.info('API模块初始化完成', 'main');
            
            // 初始化客服管理器
            await agentManager.init();
            logger.info('客服管理器初始化完成', 'main');
            
            // 初始化策略管理器
            strategyManager.init();
            logger.info('策略管理器初始化完成', 'main');
            
        } catch (error) {
            logger.error(`核心模块初始化失败: ${error.message}`, 'main');
            throw error;
        }
    }

    /**
     * 初始化功能模块
     */
    initializeFeatureModules() {
        // 初始化告警系统
        alertManager.init();
        logger.info('告警系统初始化完成', 'main');
        
        // 初始化分析模块
        analyticsManager.init();
        logger.info('分析模块初始化完成', 'main');
        
        // 初始化仪表盘
        dashboard.init();
        logger.info('仪表盘初始化完成', 'main');
    }
    
    /**
     * 初始化可选模块（按需加载）
     */
    async initOptionalModules() {
        try {
            // 条件初始化邮件模块
            if (CONFIG.USE_MAILER === true) {
                logger.info('正在初始化邮件模块...', 'main');
                mailerManager = await import('./modules/mailer.js');
                await mailerManager.init();
                this.modules.mailerManager = mailerManager;
                logger.info('邮件模块初始化完成', 'main');
            }
        } catch (error) {
            logger.warning(`邮件模块初始化失败: ${error.message}`, 'main');
        }
    }

    /**
     * 加载样式文件
     */
    loadStyles() {
        try {
            // 创建样式链接
            const styleLink = document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = './assets/style.css';
            styleLink.id = 'jev-control-panel-style';
            
            // 添加到文档头部
            document.head.appendChild(styleLink);
            
            logger.info('样式文件已加载', 'main');
        } catch (error) {
            logger.warning(`样式加载失败，使用备用样式: ${error.message}`, 'main');
            this.loadFallbackStyles();
        }
    }

    /**
     * 加载备用内联样式
     */
    loadFallbackStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #jev-control-panel { 
                font-family: Arial, sans-serif; 
                background: #1e1e1e; 
                color: white; 
                border: 1px solid #333; 
                border-radius: 4px; 
                padding: 10px; 
            }
            #jev-control-panel .jev-btn { 
                background: #0e639c; 
                color: white; 
                border: none; 
                padding: 5px 10px; 
                margin: 5px; 
                cursor: pointer;
            }
            #jev-control-panel .jev-agents-table { 
                width: 100%; 
                border-collapse: collapse;
            }
            #jev-control-panel .jev-agents-table th, 
            #jev-control-panel .jev-agents-table td { 
                border: 1px solid #333; 
                padding: 5px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 注册全局事件
     */
    registerGlobalEvents() {
        // 页面关闭时的清理
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // 监听键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Alt+J 切换面板显示
            if (e.altKey && e.key.toLowerCase() === 'j') {
                e.preventDefault();
                this.togglePanel();
            }
            
            // Alt+R 手动刷新
            if (e.altKey && e.key.toLowerCase() === 'r') {
                e.preventDefault();
                dashboard.refreshData();
            }
        });
        
        // 监听网络状态变化
        window.addEventListener('online', () => {
            logger.info('网络连接已恢复', 'main');
            this.reconnectAfterNetworkChange();
        });
        
        window.addEventListener('offline', () => {
            logger.warning('网络连接已断开', 'main');
        });
    }

    /**
     * 网络恢复后重新连接
     */
    async reconnectAfterNetworkChange() {
        try {
            await agentManager.reconnect();
            dashboard.refreshData();
            alertManager.showNotification('✅ 网络恢复，已重新连接', 'success');
        } catch (error) {
            logger.error(`重连失败: ${error.message}`, 'main');
        }
    }

    /**
     * 切换面板显示状态
     */
    togglePanel() {
        const panel = document.getElementById('jev-control-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            logger.info(`面板已${panel.style.display === 'none' ? '隐藏' : '显示'}`, 'main');
        }
    }

    /**
     * 获取系统状态
     */
    getSystemStatus() {
        return {
            initialized: this.isInitialized,
            connected: agentManager.getStats().isConnected,
            currentAgent: agentManager.getCurrentAgent(),
            agentCount: agentManager.getAllAgents().length,
            uptime: Date.now() - analyticsManager.startTime
        };
    }

    /**
     * 手动刷新所有数据
     */
    async refreshAll() {
        try {
            await dashboard.refreshData();
            logger.info('手动刷新完成', 'main');
        } catch (error) {
            logger.error(`刷新失败: ${error.message}`, 'main');
        }
    }

    /**
     * 获取诊断信息
     */
    getDiagnostics() {
        return {
            config: { ...CONFIG },
            status: this.getSystemStatus(),
            agentStats: agentManager.getStats(),
            analytics: analyticsManager.getCurrentStats(),
            performance: analyticsManager.getPerformanceReport()
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        try {
            // 停止心跳
            agentManager.stopHeartbeat();
            
            // 销毁所有模块
            Object.values(this.modules).forEach(module => {
                if (module && typeof module.destroy === 'function') {
                    module.destroy();
                }
            });
            
            // 移除样式
            const style = document.getElementById('jev-control-panel-style');
            if (style) style.remove();
            
            // 移除面板
            const panel = document.getElementById('jev-control-panel');
            if (panel) panel.remove();
            
            logger.info('JEV控制面板已清理', 'main');
        } catch (error) {
            console.error('清理失败:', error);
        }
    }

    /**
     * 重新启动应用
     */
    async restart() {
        logger.info('正在重启JEV控制面板...', 'main');
        
        try {
            // 清理现有实例
            this.cleanup();
            
            // 重置状态
            this.isInitialized = false;
            
            // 重新初始化
            await this.init();
            
            logger.success('JEV控制面板重启成功', 'main');
            return true;
        } catch (error) {
            logger.error(`重启失败: ${error.message}`, 'main');
            return false;
        }
    }

    /**
     * 获取模块实例（用于调试）
     */
    getModule(moduleName) {
        return this.modules[moduleName];
    }
}

// 创建全局实例
const jevApp = new JEVControlPanel();

// 当文档加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => jevApp.init());
} else {
    // 如果文档已经加载完成，直接初始化
    jevApp.init();
}

// 导出应用实例（用于调试和扩展）
window.jevControlPanel = jevApp;

// 导出到模块系统
export default jevApp;
