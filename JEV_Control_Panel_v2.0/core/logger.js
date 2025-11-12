/**
 * 模块名称：Logger（日志模块）
 * 功能：记录系统日志、分类输出、UI更新和CSV导出
 * 依赖模块：config.js
 * 作者：JEV 系统
 */

import { CONFIG } from './config.js';

class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = CONFIG.MAX_LOGS_DISPLAY;
    }

    /**
     * 记录日志消息
     * @param {string} message - 日志消息内容
     * @param {string} type - 日志类型：info, error, success, warning
     * @param {string} module - 日志来源模块
     */
    log(message, type = 'info', module = 'system') {
        const timestamp = new Date().toLocaleString('zh-CN');
        const logEntry = {
            timestamp,
            message,
            type,
            module
        };

        // 添加到日志数组前端
        this.logs.unshift(logEntry);
        
        // 保持最大日志数量
        if (this.logs.length > this.maxLogs) {
            this.logs.pop();
        }

        // 控制台输出
        this.consoleLog(logEntry);
        
        // 更新UI显示
        this.updateLogDisplay();
    }

    /**
     * 记录普通信息
     */
    info(message, module = 'system') {
        this.log(message, 'info', module);
    }

    /**
     * 记录错误信息
     */
    error(message, module = 'system') {
        this.log(message, 'error', module);
    }

    /**
     * 记录成功信息
     */
    success(message, module = 'system') {
        this.log(message, 'success', module);
    }

    /**
     * 记录警告信息
     */
    warning(message, module = 'system') {
        this.log(message, 'warning', module);
    }

    /**
     * 控制台彩色输出
     */
    consoleLog(logEntry) {
        const { timestamp, message, type, module } = logEntry;
        const prefix = `[JEV][${timestamp}][${module}]`;
        
        switch (type) {
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            case 'success':
                console.log(`${prefix} ✅ ${message}`);
                break;
            case 'warning':
                console.warn(`${prefix} ⚠️ ${message}`);
                break;
            default:
                console.log(`${prefix} ℹ️ ${message}`);
        }
    }

    /**
     * 更新UI日志显示
     */
    updateLogDisplay() {
        const logContainer = document.getElementById('jev-logs');
        if (!logContainer) return;

        logContainer.innerHTML = '';
        
        this.logs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = `jev-log-item jev-log-${log.type}`;
            
            // 添加图标
            let icon = '';
            switch (log.type) {
                case 'error': icon = '❌'; break;
                case 'success': icon = '✅'; break;
                case 'warning': icon = '⚠️'; break;
                default: icon = 'ℹ️';
            }
            
            logItem.innerHTML = `
                <span class="jev-log-icon">${icon}</span>
                <span class="jev-log-time">${log.timestamp}</span>
                <span class="jev-log-module">[${log.module}]</span>
                <span class="jev-log-message">${log.message}</span>
            `;
            
            logContainer.appendChild(logItem);
        });
    }

    /**
     * 导出日志为CSV格式
     */
    exportToCSV() {
        const headers = ['时间戳', '模块', '类型', '消息'];
        const csvContent = [
            headers.join(','),
            ...this.logs.map(log => [
                `"${log.timestamp}"`,
                `"${log.module}"`,
                `"${log.type}"`,
                `"${log.message}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `jev-logs-${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.success('日志已导出为CSV文件', 'logger');
    }

    /**
     * 清空所有日志
     */
    clear() {
        this.logs = [];
        this.updateLogDisplay();
        this.info('日志已清空', 'logger');
    }

    /**
     * 获取所有日志
     */
    getAllLogs() {
        return [...this.logs];
    }
}

// 导出单例实例
const logger = new Logger();
export default logger;
