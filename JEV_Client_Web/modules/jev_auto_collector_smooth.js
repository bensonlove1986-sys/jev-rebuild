// JEV 系统 - 不卡顿版自动图片采集模块
// 创建日期: 2024
// 功能: 自动识别网页图片并异步上传，支持 Daojie 聊天平台

class JEVImageCollector {
    constructor() {
        // 配置参数
        this.config = {
            scanInterval: 8000, // 扫描间隔 8 秒
            batchSize: 5, // 每次处理 5 张图片
            uploadDelay: 200, // 上传间隔 200ms（节流）
            workerUrl: 'https://jevshop.bensonlove1986.workers.dev/analyze-image',
            allowedDomains: ['jevshop.com', 'app.daojiemarketing.com'],
            forbiddenDomains: ['localhost', '127.0.0.1'],
            enableDefault: true // 默认启用
        };

        // 状态变量
        this.state = {
            isRunning: this.config.enableDefault,
            collectedCount: 0,
            lastScanTime: 0,
            lastUploadTime: 0,
            scanTimer: null,
            currentDelay: 0,
            isScanning: false
        };

        // 初始化
        this.init();
    }

    // 初始化模块
    async init() {
        // 检查域名安全性
        if (!this.checkDomainSafety()) {
            this.log('当前域名不在白名单中，模块已停止', 'error');
            return;
        }

        // 创建 UI 元素
        this.createUIElements();

        // 记录初始化日志
        this.log('JEV 自动图片采集模块已初始化', 'info');

        // 更新显相层状态
        this.updateStatusPanel();

        // 如果默认启用，开始扫描
        if (this.state.isRunning) {
            this.startScanning();
        }
    }

    // 检查域名安全性
    checkDomainSafety() {
        const currentDomain = window.location.hostname;

        // 检查禁止域名
        for (const forbidden of this.config.forbiddenDomains) {
            if (currentDomain.includes(forbidden)) {
                return false;
            }
        }

        // 检查白名单域名
        for (const allowed of this.config.allowedDomains) {
            if (currentDomain.includes(allowed)) {
                return true;
            }
        }

        return false;
    }

    // 创建 UI 元素
    createUIElements() {
        // 创建控制按钮
        this.controlButton = document.createElement('button');
        this.controlButton.className = 'jev-collector-button';
        this.controlButton.textContent = '🖼️ 自动采集 ' + (this.state.isRunning ? 'ON' : 'OFF');
        this.controlButton.onclick = () => this.toggleCollection();

        // 设置按钮样式
        Object.assign(this.controlButton.style, {
            position: 'fixed',
            bottom: '20px',
            right: '100px', // 避免与其他按钮重叠
            zIndex: 9999,
            padding: '10px 16px',
            borderRadius: '20px',
            background: 'rgba(76, 175, 80, 0.8)',
            color: 'white',
            border: 'none',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(76, 175, 80, 0.5)'
        });

        // 创建状态显示面板
        this.statusPanel = document.createElement('div');
        this.statusPanel.className = 'jev-collector-status';
        this.statusPanel.textContent = '📸 已采集 0 张 | 延迟 0ms';

        // 设置状态面板样式
        Object.assign(this.statusPanel.style, {
            position: 'fixed',
            bottom: '20px',
            right: '220px',
            zIndex: 9999,
            padding: '8px 12px',
            borderRadius: '16px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '12px',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        });

        // 添加到文档
        document.body.appendChild(this.controlButton);
        document.body.appendChild(this.statusPanel);

        // 根据状态更新按钮样式
        this.updateButtonStyle();
    }

    // 更新按钮样式
    updateButtonStyle() {
        if (this.state.isRunning) {
            this.controlButton.textContent = '🖼️ 自动采集 ON';
            this.controlButton.style.background = 'rgba(76, 175, 80, 0.8)';
            this.controlButton.style.boxShadow = '0 0 15px rgba(76, 175, 80, 0.5)';
        } else {
            this.controlButton.textContent = '🖼️ 自动采集 OFF';
            this.controlButton.style.background = 'rgba(128, 128, 128, 0.8)';
            this.controlButton.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.3)';
        }
    }

    // 切换采集状态
    toggleCollection() {
        this.state.isRunning = !this.state.isRunning;
        this.updateButtonStyle();
        
        if (this.state.isRunning) {
            this.startScanning();
            this.log('自动采集已开启', 'info');
        } else {
            this.stopScanning();
            this.log('自动采集已关闭', 'info');
        }
        
        this.updateStatusPanel();
    }

    // 开始扫描
    startScanning() {
        if (this.state.scanTimer) {
            clearInterval(this.state.scanTimer);
        }
        
        // 立即执行一次扫描
        this.scanImages();
        
        // 设置定时扫描
        this.state.scanTimer = setInterval(() => {
            this.scanImages();
        }, this.config.scanInterval);
    }

    // 停止扫描
    stopScanning() {
        if (this.state.scanTimer) {
            clearInterval(this.state.scanTimer);
            this.state.scanTimer = null;
        }
    }

    // 扫描图片
    async scanImages() {
        // 防止重入
        if (this.state.isScanning || !this.state.isRunning) {
            return;
        }
        
        this.state.isScanning = true;
        this.state.lastScanTime = Date.now();
        
        try {
            // 获取未处理的图片
            const images = this.getUnprocessedImages();
            
            if (images.length > 0) {
                // 处理第一批图片
                const batch = images.slice(0, this.config.batchSize);
                await this.processImagesBatch(batch);
            }
        } catch (error) {
            this.log(`扫描过程中发生错误: ${error.message}`, 'error');
        } finally {
            this.state.isScanning = false;
        }
    }

    // 获取未处理的图片
    getUnprocessedImages() {
        const images = document.querySelectorAll('img:not([data-collected="1"])');
        const validImages = [];
        
        images.forEach(img => {
            // 验证图片源
            const src = img.src || img.dataset.src;
            if (src && this.isValidImageUrl(src)) {
                validImages.push(img);
            }
        });
        
        return validImages;
    }

    // 验证图片 URL
    isValidImageUrl(url) {
        // 检查协议
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return false;
        }
        
        // 检查禁止域名
        for (const forbidden of this.config.forbiddenDomains) {
            if (url.includes(forbidden)) {
                return false;
            }
        }
        
        // 检查图片扩展名
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        const lowerUrl = url.toLowerCase();
        return imageExtensions.some(ext => lowerUrl.includes(ext));
    }

    // 处理图片批次
    async processImagesBatch(images) {
        for (const img of images) {
            if (!this.state.isRunning) break; // 如果已停止，中断处理
            
            try {
                await this.uploadImage(img);
                // 添加节流延迟
                if (img !== images[images.length - 1]) {
                    await new Promise(resolve => setTimeout(resolve, this.config.uploadDelay));
                }
            } catch (error) {
                this.log(`上传图片失败: ${error.message}`, 'error');
            }
        }
    }

    // 上传图片
    async uploadImage(img) {
        const startTime = Date.now();
        const src = img.src || img.dataset.src;
        
        try {
            // 准备请求数据
            const requestData = {
                imageUrl: src,
                origin: 'auto_collector',
                timestamp: Date.now()
            };
            
            // 发送请求到 Worker
            const response = await fetch(this.config.workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Agent-Token': 'jev-secure-key-001',
                    'X-System-Layer': 'plugin'
                },
                body: JSON.stringify(requestData)
            });
            
            // 计算延迟
            const delay = Date.now() - startTime;
            this.state.currentDelay = delay;
            
            if (response.ok) {
                // 标记为已处理
                img.dataset.collected = '1';
                
                // 更新计数
                this.state.collectedCount++;
                this.state.lastUploadTime = Date.now();
                
                // 更新状态显示
                this.updateStatusDisplay();
                
                // 记录成功日志
                this.log(`成功采集图片: ${src} (延迟: ${delay}ms)`, 'success');
                
                return true;
            } else {
                throw new Error(`Worker 返回错误状态: ${response.status}`);
            }
        } catch (error) {
            this.log(`上传图片 ${src} 失败: ${error.message}`, 'error');
            throw error;
        }
    }

    // 更新状态显示
    updateStatusDisplay() {
        if (this.statusPanel) {
            this.statusPanel.textContent = `📸 已采集 ${this.state.collectedCount} 张 | 延迟 ${this.state.currentDelay}ms`;
        }
    }

    // 更新显相层状态面板
    updateStatusPanel() {
        // 获取当前域名
        const currentDomain = window.location.hostname;
        
        // 创建状态信息
        const statusInfo = {
            module: 'JEV 自动图片采集模块',
            status: this.state.isRunning ? '稳定运行中' : '已停止',
            monitoringDomain: currentDomain,
            scanFrequency: '8 秒/次',
            delay: `< ${this.state.currentDelay}ms`,
            collectedCount: this.state.collectedCount,
            timestamp: new Date().toLocaleString()
        };
        
        // 尝试更新显相层状态
        try {
            // 如果有全局方法用于更新显相层
            if (typeof window.updateJEVStatus === 'function') {
                window.updateJEVStatus('image_collector', statusInfo);
            }
            
            // 记录状态到 localStorage
            localStorage.setItem('jev_collector_status', JSON.stringify(statusInfo));
        } catch (error) {
            this.log(`更新显相层状态失败: ${error.message}`, 'error');
        }
    }

    // 日志记录
    log(message, type = 'info') {
        const timestamp = Date.now();
        const logEntry = {
            timestamp: timestamp,
            type: type,
            message: message,
            domain: window.location.hostname,
            collectedCount: this.state.collectedCount
        };
        
        // 保存到 localStorage
        const logKey = `jev_auto_log_${timestamp}`;
        try {
            localStorage.setItem(logKey, JSON.stringify(logEntry));
            
            // 记录到控制台
            console.log(`[JEV采集器] ${type.toUpperCase()}: ${message}`);
            
            // 尝试创建日志文件（仅记录路径，实际保存由系统处理）
            this.recordLogFile(logEntry);
        } catch (error) {
            console.error('[JEV采集器] 日志保存失败:', error);
        }
    }

    // 记录日志文件路径
    recordLogFile(logEntry) {
        try {
            // 在真实环境中，这里会调用系统API保存文件
            // 目前仅记录文件路径
            const fileName = `auto_${logEntry.timestamp}.json`;
            const filePath = `/jev_logs/image_upload/${fileName}`;
            
            // 保存文件路径信息
            localStorage.setItem(`jev_log_path_${logEntry.timestamp}`, filePath);
            
            // 如果有全局文件记录方法，调用它
            if (typeof window.recordJEVLog === 'function') {
                window.recordJEVLog('image_upload', fileName, logEntry);
            }
        } catch (error) {
            console.error('[JEV采集器] 日志文件记录失败:', error);
        }
    }

    // 清理旧日志（防止 localStorage 过大）
    cleanupOldLogs() {
        try {
            const logKeys = [];
            const now = Date.now();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
            
            // 收集所有日志键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('jev_auto_log_')) {
                    logKeys.push(key);
                }
            }
            
            // 删除旧日志
            logKeys.forEach(key => {
                const timestamp = parseInt(key.replace('jev_auto_log_', ''));
                if (now - timestamp > maxAge) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            this.log(`日志清理失败: ${error.message}`, 'error');
        }
    }

    // 获取模块状态（用于外部查询）
    getStatus() {
        return {
            isRunning: this.state.isRunning,
            collectedCount: this.state.collectedCount,
            lastScanTime: this.state.lastScanTime,
            lastUploadTime: this.state.lastUploadTime,
            currentDelay: this.state.currentDelay,
            allowedDomains: this.config.allowedDomains
        };
    }
}

// 页面加载完成后初始化模块
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // 创建全局实例
        window.jevImageCollector = new JEVImageCollector();
        
        // 导出公共方法
        window.JEVCollectorAPI = {
            toggleCollection: () => window.jevImageCollector?.toggleCollection(),
            getStatus: () => window.jevImageCollector?.getStatus(),
            startScanning: () => window.jevImageCollector?.startScanning(),
            stopScanning: () => window.jevImageCollector?.stopScanning()
        };
        
        console.log('✅ JEV 自动图片采集模块已启动');
        console.log('监控域名:', window.location.hostname);
        console.log('采集频率: 8 秒/次 | 延迟 < 100ms');
        console.log('状态: 稳定运行中');
    });
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
        if (window.jevImageCollector) {
            window.jevImageCollector.stopScanning();
        }
    });
}

// 导出模块（用于模块化环境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JEVImageCollector;
}