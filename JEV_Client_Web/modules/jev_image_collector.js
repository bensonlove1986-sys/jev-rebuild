/**
 * JEV 图片采集器模块
 * 功能：采集Daojie平台图片并上传至JEV系统进行分析
 * 版本：1.0.0
 * 日期：2024-01-15
 */

class JEVImageCollector {
    constructor(config = {}) {
        // 配置参数
        this.workerUrl = config.workerUrl || 'https://jevshop.bensonlove1986.workers.dev';
        this.securityHeaders = {
            'X-Agent-Token': 'jev-secure-key-001',
            'X-System-Layer': 'plugin',
            'Content-Type': 'application/json'
        };
        this.targetDomains = [
            'daojiemarketing.com',
            'leadsale.io'
        ];
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.selectedImages = [];
        this.localStorageKey = 'jev_support_task_history';
        
        // 初始化状态
        this.isScanning = false;
        this.isUploading = false;
        this.uploadCount = 0;
        this.successCount = 0;
        this.errorCount = 0;
    }
    
    /**
     * 扫描当前页面的Daojie图片
     * @returns {Promise<Array>} 扫描到的图片数组
     */
    async scanImages() {
        if (this.isScanning) {
            console.warn('扫描已在进行中，请等待完成');
            return [];
        }
        
        this.isScanning = true;
        this.selectedImages = [];
        const images = [];
        
        try {
            // 扫描所有图片标签
            const imgElements = document.querySelectorAll('img');
            console.log(`找到 ${imgElements.length} 个图片元素`);
            
            for (const img of imgElements) {
                try {
                    // 获取图片源
                    const src = img.src || '';
                    
                    // 过滤空链接
                    if (!src) continue;
                    
                    // 检查是否属于目标域名或为data/blob URL
                    if (this.isTargetDomain(src) || this.isDataUrl(src) || this.isBlobUrl(src)) {
                        // 获取图片元数据
                        const meta = await this.getImageMetadata(img, src);
                        
                        images.push({
                            src: src,
                            alt: img.alt || '',
                            width: meta.width,
                            height: meta.height,
                            filename: this.generateFilename(src, meta.width, meta.height),
                            element: img
                        });
                    }
                } catch (error) {
                    console.error('处理图片时出错:', error);
                }
            }
            
            // 扫描可能的背景图片和其他媒体元素
            const bgImages = this.scanBackgroundImages();
            images.push(...bgImages);
            
            console.log(`筛选出 ${images.length} 个符合条件的媒体文件`);
            return images;
        } catch (error) {
            console.error('扫描图片失败:', error);
            throw error;
        } finally {
            this.isScanning = false;
        }
    }
    
    /**
     * 判断URL是否属于目标域名
     * @param {string} url - 要检查的URL
     * @returns {boolean} 是否属于目标域名
     */
    isTargetDomain(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            return this.targetDomains.some(domain => hostname.includes(domain));
        } catch (e) {
            return false;
        }
    }
    
    /**
     * 判断是否为Data URL
     * @param {string} url - 要检查的URL
     * @returns {boolean} 是否为Data URL
     */
    isDataUrl(url) {
        return url.startsWith('data:image/');
    }
    
    /**
     * 判断是否为Blob URL
     * @param {string} url - 要检查的URL
     * @returns {boolean} 是否为Blob URL
     */
    isBlobUrl(url) {
        return url.startsWith('blob:');
    }
    
    /**
     * 获取图片元数据
     * @param {HTMLImageElement} img - 图片元素
     * @param {string} src - 图片源
     * @returns {Promise<Object>} 图片元数据
     */
    async getImageMetadata(img, src) {
        // 如果已经有尺寸信息，直接返回
        if (img.naturalWidth && img.naturalHeight) {
            return {
                width: img.naturalWidth,
                height: img.naturalHeight
            };
        }
        
        // 否则创建新图片元素加载尺寸
        return new Promise((resolve) => {
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            tempImg.onload = () => {
                resolve({
                    width: tempImg.width,
                    height: tempImg.height
                });
            };
            tempImg.onerror = () => {
                // 加载失败时返回默认尺寸
                resolve({
                    width: 0,
                    height: 0
                });
            };
            tempImg.src = src;
        });
    }
    
    /**
     * 扫描背景图片
     * @returns {Array} 背景图片数组
     */
    scanBackgroundImages() {
        const bgImages = [];
        const elements = document.querySelectorAll('[style*="background-image"]');
        
        elements.forEach((element, index) => {
            try {
                const style = element.style.backgroundImage;
                const match = style.match(/url\(['"]?(.*?)['"]?\)/);
                
                if (match && match[1]) {
                    const src = match[1];
                    if (this.isTargetDomain(src) || this.isDataUrl(src)) {
                        bgImages.push({
                            src: src,
                            alt: '背景图片',
                            width: 0,
                            height: 0,
                            filename: `bg_image_${index}_${Date.now()}.jpg`,
                            element: element
                        });
                    }
                }
            } catch (error) {
                console.error('处理背景图片时出错:', error);
            }
        });
        
        return bgImages;
    }
    
    /**
     * 生成文件名
     * @param {string} src - 图片源
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @returns {string} 生成的文件名
     */
    generateFilename(src, width, height) {
        let extension = 'jpg';
        
        // 从URL中提取扩展名
        if (src.includes('.')) {
            const parts = src.split('.');
            const lastPart = parts[parts.length - 1].split('?')[0].split('#')[0].toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(lastPart)) {
                extension = lastPart;
                if (extension === 'jpeg') extension = 'jpg';
            }
        }
        
        // 生成时间戳和随机数
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        
        return `daojie_image_${timestamp}_${random}_${width}x${height}.${extension}`;
    }
    
    /**
     * 上传单个图片到Worker
     * @param {Object} imageData - 图片数据
     * @returns {Promise<Object>} 上传结果
     */
    async uploadImage(imageData) {
        try {
            const startTime = Date.now();
            
            const requestBody = {
                image_url: imageData.src,
                origin_page: window.location.href,
                source: 'daojie',
                meta: {
                    width: imageData.width,
                    height: imageData.height,
                    filename: imageData.filename
                }
            };
            
            console.log('上传图片请求:', requestBody);
            
            const response = await fetch(`${this.workerUrl}/analyze-image`, {
                method: 'POST',
                headers: this.securityHeaders,
                body: JSON.stringify(requestBody)
            });
            
            const latency = Date.now() - startTime;
            
            if (!response.ok) {
                throw new Error(`上传失败: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            result.latency_ms = latency;
            
            // 记录到localStorage
            this.logUploadResult(imageData, result, latency);
            
            return result;
        } catch (error) {
            console.error('上传图片失败:', error);
            throw error;
        }
    }
    
    /**
     * 批量上传选中的图片
     * @param {Array} images - 要上传的图片数组
     * @returns {Promise<Object>} 批量上传结果
     */
    async batchUploadImages(images) {
        if (this.isUploading) {
            throw new Error('上传任务已在进行中');
        }
        
        if (!images || images.length === 0) {
            throw new Error('没有选中的图片');
        }
        
        this.isUploading = true;
        this.uploadCount = images.length;
        this.successCount = 0;
        this.errorCount = 0;
        
        const results = {
            total: images.length,
            success: 0,
            failed: 0,
            details: []
        };
        
        try {
            // 并发上传但限制并发数
            const concurrencyLimit = 3;
            const chunks = [];
            
            for (let i = 0; i < images.length; i += concurrencyLimit) {
                chunks.push(images.slice(i, i + concurrencyLimit));
            }
            
            for (const chunk of chunks) {
                const chunkPromises = chunk.map(image => 
                    this.uploadImage(image)
                        .then(result => {
                            this.successCount++;
                            return { image, result, success: true };
                        })
                        .catch(error => {
                            this.errorCount++;
                            return { image, error: error.message, success: false };
                        })
                );
                
                const chunkResults = await Promise.all(chunkPromises);
                results.details.push(...chunkResults);
            }
            
            results.success = this.successCount;
            results.failed = this.errorCount;
            
            return results;
        } finally {
            this.isUploading = false;
        }
    }
    
    /**
     * 记录上传结果到localStorage
     * @param {Object} imageData - 图片数据
     * @param {Object} result - 上传结果
     * @param {number} latency - 延迟时间
     */
    logUploadResult(imageData, result, latency) {
        try {
            const history = JSON.parse(localStorage.getItem(this.localStorageKey) || '[]');
            
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: 'image_upload',
                status: result.success ? 'success' : 'error',
                storage_url: result.url || '',
                preview_text: result.ocr ? (typeof result.ocr === 'string' ? result.ocr.substring(0, 100) + '...' : JSON.stringify(result.ocr).substring(0, 100) + '...') : '',
                latency_ms: latency,
                source: 'daojie',
                filename: imageData.filename
            };
            
            history.push(logEntry);
            
            // 保留最近100条记录
            if (history.length > 100) {
                history.splice(0, history.length - 100);
            }
            
            localStorage.setItem(this.localStorageKey, JSON.stringify(history));
        } catch (error) {
            console.error('记录上传结果失败:', error);
        }
    }
    
    /**
     * 获取上传历史
     * @returns {Array} 上传历史记录
     */
    getUploadHistory() {
        try {
            return JSON.parse(localStorage.getItem(this.localStorageKey) || '[]');
        } catch (error) {
            console.error('获取上传历史失败:', error);
            return [];
        }
    }
    
    /**
     * 显示上传确认对话框
     * @param {number} count - 待上传数量
     * @returns {Promise<boolean>} 用户是否确认上传
     */
    showConfirmDialog(count) {
        return new Promise((resolve) => {
            const confirmed = confirm(
                `确认上传 ${count} 张图片至 JEV 系统并用于识别/存储/审计？\n` +
                `文件大小将被限制在 ${this.maxFileSize / (1024 * 1024)}MB 以内。`
            );
            resolve(confirmed);
        });
    }
}

// 导出模块
window.JEVImageCollector = JEVImageCollector;
console.log('✅ JEV 图片采集器模块已加载');