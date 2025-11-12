/**
 * JEV上传管理器
 * 负责统一上传接口和版本控制
 */
class JEVUploadManager {
    constructor() {
        // 初始化上传历史记录
        this.uploadHistory = this.loadUploadHistory();
        
        // 上传配置
        this.config = {
            uploadEndpoint: '/api/jev/upload',
            maxFileSize: 10 * 1024 * 1024, // 10MB
            supportedExtensions: ['.js', '.css', '.html', '.json', '.txt']
        };
        
        // 版本控制系统激活
        console.log('[JEV Upload] Versioning system active');
    }
    
    /**
     * 验证文件路径
     */
    validatePath(filePath) {
        return typeof filePath === 'string' && filePath.trim() !== '';
    }
    
    /**
     * 验证文件扩展名
     */
    validateExtension(filePath) {
        const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
        return this.config.supportedExtensions.includes(extension);
    }
    
    /**
     * 模拟文件是否存在
     */
    simulateFileExists(filePath) {
        // 在实际环境中会检查真实文件系统
        return true; // 假设文件已存在以便测试备份功能
    }
    
    /**
     * 创建备份文件路径
     */
    createBackupPath(filePath, versionTag) {
        return `/backup/${filePath}_${versionTag}_${Date.now()}`;
    }
    
    /**
     * 模拟备份文件操作
     */
    simulateBackupFile(filePath, backupPath) {
        console.log(`[JEV Upload] Backed up ${filePath} to ${backupPath}`);
        return true;
    }
    
    /**
     * 创建版本化文件路径
     */
    createVersionedPath(filePath, versionTag) {
        const extension = filePath.lastIndexOf('.');
        const baseName = filePath.substring(0, extension);
        const fileExt = filePath.substring(extension);
        return `/modules/${baseName}_${versionTag}${fileExt}`;
    }
    
    /**
     * 创建上传结果JSON
     */
    createUploadResult(versionedPath, versionTag) {
        const fileName = versionedPath.substring(versionedPath.lastIndexOf('/') + 1);
        return {
            file: fileName,
            version: versionTag,
            path: versionedPath,
            timestamp: Date.now()
        };
    }
    
    /**
     * 更新上传历史
     */
    updateUploadHistory(result) {
        this.uploadHistory.push(result);
        localStorage.setItem('JEV_UPLOAD_HISTORY', JSON.stringify(this.uploadHistory));
    }
    
    /**
     * 加载上传历史
     */
    loadUploadHistory() {
        try {
            const saved = localStorage.getItem('JEV_UPLOAD_HISTORY');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('[JEV Upload] Failed to load history:', error);
            return [];
        }
    }
    
    /**
     * 上传文件方法
     * @param {string} filePath - 文件路径
     * @param {string} versionTag - 版本标签
     * @returns {Object} 上传结果JSON
     */
    async uploadFile(filePath, versionTag = 'v1.0') {
        try {
            // 1. 验证路径
            if (!this.validatePath(filePath)) {
                console.error('[JEV Upload] Invalid path:', filePath);
                return { success: false, error: 'Invalid path' };
            }
            
            // 2. 验证文件扩展名
            if (!this.validateExtension(filePath)) {
                console.error('[JEV Upload] Invalid file type:', filePath.substring(filePath.lastIndexOf('.')));
                return { success: false, error: 'Invalid file type' };
            }
            
            // 3. 检查文件是否存在并备份
            const exists = this.simulateFileExists(filePath);
            if (exists) {
                // 自动备份文件
                const backupPath = this.createBackupPath(filePath, versionTag);
                this.simulateBackupFile(filePath, backupPath);
            }
            
            // 4. 创建版本化路径
            const versionedPath = this.createVersionedPath(filePath, versionTag);
            
            // 5. 生成上传结果JSON
            const statusReport = this.createUploadResult(versionedPath, versionTag);
            
            // 6. 打印JSON payload就绪消息
            console.log('[UPLOAD] JSON payload ready');
            
            // 7. 模拟向/api/jev/uploadTracker返回JSON
            console.log('[JEV Upload] Sending status to /api/jev/uploadTracker');
            
            // 8. 更新上传历史
            this.updateUploadHistory(statusReport);
            
            return statusReport;
        } catch (error) {
            console.error('[JEV Upload] Error:', error);
            return { success: false, error: error.message };
        }
    }
}

// 创建单例实例
const uploadManagerInstance = new JEVUploadManager();

// 导出到全局
window.jevUploadManager = uploadManagerInstance;

// 模块化导出
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = uploadManagerInstance;
}