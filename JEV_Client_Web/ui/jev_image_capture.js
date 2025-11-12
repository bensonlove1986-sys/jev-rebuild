// JEV-UI-Origin-v9.3 图像采集模块

/**
 * JEV图像采集核心类
 * 提供图像上传、摄像头拍摄和分析功能
 */
class JevImageCapture {
    constructor() {
        this.uploadElement = null;
        this.previewElement = null;
        this.canvasElement = null;
        this.videoElement = null;
        this.cameraStream = null;
        this.isCameraActive = false;
        this.imageProcessingCallback = null;
        this.activeTab = 'upload';
        this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    }

    /**
     * 初始化图像采集模块
     * @param {Object} config - 配置参数
     * @param {string} config.uploadSelector - 上传区域选择器
     * @param {string} config.previewSelector - 预览区域选择器
     * @param {string} config.resultSelector - 结果显示区域选择器
     * @param {Function} config.onProcess - 图像处理回调函数
     */
    init(config = {}) {
        // 设置配置默认值
        this.config = {
            uploadSelector: config.uploadSelector || '.image-upload-area',
            previewSelector: config.previewSelector || '.image-preview',
            resultSelector: config.resultSelector || '.analysis-result',
            onProcess: config.onProcess || this.defaultProcessCallback.bind(this)
        };

        // 获取DOM元素
        this.uploadElement = document.querySelector(this.config.uploadSelector);
        this.previewElement = document.querySelector(this.config.previewSelector);
        this.resultElement = document.querySelector(this.config.resultSelector);

        // 创建必要的元素
        this.createCanvas();
        
        // 设置事件监听
        this.setupEventListeners();

        // 注册全局API
        window.jevImageCapture = this;
        console.log('JEV图像采集模块初始化完成');
    }

    /**
     * 创建Canvas元素
     */
    createCanvas() {
        this.canvasElement = document.createElement('canvas');
        this.canvasElement.style.display = 'none';
        document.body.appendChild(this.canvasElement);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 上传区域点击事件
        if (this.uploadElement) {
            this.uploadElement.addEventListener('click', () => {
                this.openFileDialog();
            });

            // 拖拽支持
            this.uploadElement.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.uploadElement.classList.add('dragover');
            });

            this.uploadElement.addEventListener('dragleave', () => {
                this.uploadElement.classList.remove('dragover');
            });

            this.uploadElement.addEventListener('drop', (e) => {
                e.preventDefault();
                this.uploadElement.classList.remove('dragover');
                
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileUpload(e.dataTransfer.files[0]);
                }
            });
        }

        // 为标签页切换添加事件监听
        this.setupTabNavigation();

        // 为移动端添加触摸优化
        this.setupTouchOptimization();
    }

    /**
     * 设置标签页导航
     */
    setupTabNavigation() {
        const uploadTab = document.querySelector('[data-tab="upload"]');
        const cameraTab = document.querySelector('[data-tab="camera"]');

        if (uploadTab) {
            uploadTab.addEventListener('click', () => {
                this.switchTab('upload');
            });
        }

        if (cameraTab) {
            cameraTab.addEventListener('click', () => {
                this.switchTab('camera');
            });
        }
    }

    /**
     * 切换标签页
     * @param {string} tab - 要切换的标签页名称 ('upload' 或 'camera')
     */
    switchTab(tab) {
        this.activeTab = tab;
        
        // 更新UI状态
        const uploadTab = document.querySelector('[data-tab="upload"]');
        const cameraTab = document.querySelector('[data-tab="camera"]');
        const uploadContent = document.querySelector('[data-tab-content="upload"]');
        const cameraContent = document.querySelector('[data-tab-content="camera"]');

        if (uploadTab && cameraTab) {
            uploadTab.classList.toggle('active', tab === 'upload');
            cameraTab.classList.toggle('active', tab === 'camera');
        }

        if (uploadContent && cameraContent) {
            uploadContent.classList.toggle('hidden', tab !== 'upload');
            cameraContent.classList.toggle('hidden', tab !== 'camera');
        }

        // 如果切换到摄像头标签，尝试初始化摄像头
        if (tab === 'camera') {
            this.initializeCamera();
        } else if (tab === 'upload' && this.isCameraActive) {
            this.stopCamera();
        }
    }

    /**
     * 设置移动端触摸优化
     */
    setupTouchOptimization() {
        // 添加长按事件处理
        let pressTimer;
        
        const startPress = (e) => {
            pressTimer = setTimeout(() => {
                if (e.target.closest('[data-capture]')) {
                    this.captureImage();
                }
            }, 500);
        };
        
        const cancelPress = () => {
            clearTimeout(pressTimer);
        };
        
        document.addEventListener('touchstart', startPress);
        document.addEventListener('touchend', cancelPress);
        document.addEventListener('touchcancel', cancelPress);
        document.addEventListener('touchmove', cancelPress);
    }

    /**
     * 打开文件选择对话框
     */
    openFileDialog() {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
        
        // 清理
        setTimeout(() => {
            if (fileInput.parentNode) {
                fileInput.parentNode.removeChild(fileInput);
            }
        }, 100);
    }

    /**
     * 处理文件上传
     * @param {File} file - 上传的文件对象
     */
    handleFileUpload(file) {
        // 验证文件类型
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!this.supportedFormats.includes(fileExtension)) {
            this.showNotification('不支持的文件格式，请上传图片文件', 'error');
            return;
        }

        // 验证文件大小 (最大10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('文件大小超过限制，请上传小于10MB的图片', 'error');
            return;
        }

        // 显示加载状态
        this.showLoading();

        // 读取文件并显示预览
        const reader = new FileReader();
        reader.onload = (e) => {
            this.displayImagePreview(e.target.result);
            this.hideLoading();
            
            // 自动触发分析
            this.prepareForAnalysis(e.target.result);
        };
        reader.onerror = () => {
            this.hideLoading();
            this.showNotification('文件读取失败，请重试', 'error');
        };
        reader.readAsDataURL(file);
    }

    /**
     * 显示图像预览
     * @param {string} imageSrc - 图像源（Data URL）
     */
    displayImagePreview(imageSrc) {
        if (this.previewElement) {
            // 清空预览区域
            this.previewElement.innerHTML = '';
            
            // 创建预览图像
            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = '预览图像';
            img.className = 'preview-image';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '400px';
            img.style.borderRadius = '8px';
            
            // 添加到预览区域
            this.previewElement.appendChild(img);
            
            // 显示预览区域
            this.previewElement.classList.remove('hidden');
            
            // 添加动画效果
            this.animateImagePreview(this.previewElement);
        }
    }

    /**
     * 为预览图像添加动画效果
     * @param {HTMLElement} element - 预览元素
     */
    animateImagePreview(element) {
        element.style.opacity = '0';
        element.style.transform = 'scale(0.8)';
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.style.opacity = '1';
                element.style.transform = 'scale(1)';
            });
        });
    }

    /**
     * 准备图像进行分析
     * @param {string} imageSrc - 图像源（Data URL）
     */
    prepareForAnalysis(imageSrc) {
        // 提取图像数据
        const imageData = imageSrc;
        
        // 如果有自定义处理回调，使用它；否则使用默认处理
        if (typeof this.config.onProcess === 'function') {
            this.config.onProcess(imageData);
        }
    }

    /**
     * 默认图像处理回调
     * @param {string} imageData - 图像数据
     */
    async defaultProcessCallback(imageData) {
        try {
            // 显示分析中状态
            this.showLoading('正在分析图像...');
            
            // 调用分析接口
            const result = await this.analyzeImage(imageData);
            
            // 显示分析结果
            this.displayAnalysisResult(result);
        } catch (error) {
            console.error('图像分析失败:', error);
            this.showNotification('图像分析失败: ' + (error.message || '未知错误'), 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * 分析图像（调用API）
     * @param {string} imageData - 图像数据
     * @returns {Promise<Object>} 分析结果
     */
    async analyzeImage(imageData) {
        try {
            // 调用本地API端点进行分析
            const response = await fetch('/analyze-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: imageData
                })
            });

            if (!response.ok) {
                throw new Error(`分析服务响应错误: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API调用失败:', error);
            
            // 如果API调用失败，提供模拟数据
            return this.getMockAnalysisResult();
        }
    }

    /**
     * 获取模拟分析结果（当API不可用时）
     * @returns {Object} 模拟分析结果
     */
    getMockAnalysisResult() {
        const mockResults = [
            {
                type: 'document',
                confidence: 0.95,
                details: {
                    title: '文档识别',
                    text: '识别到文档内容',
                    segments: [
                        { type: 'heading', text: '文档标题示例' },
                        { type: 'paragraph', text: '这是文档中的一段示例文本。' }
                    ]
                }
            },
            {
                type: 'table',
                confidence: 0.89,
                details: {
                    rows: 5,
                    columns: 3,
                    hasHeader: true
                }
            }
        ];
        
        return {
            success: true,
            timestamp: new Date().toISOString(),
            processingTime: `${Math.floor(Math.random() * 500) + 100}ms`,
            results: mockResults,
            rawData: null
        };
    }

    /**
     * 显示分析结果
     * @param {Object} result - 分析结果数据
     */
    displayAnalysisResult(result) {
        if (!this.resultElement || !result.success) {
            return;
        }

        // 清空结果区域
        this.resultElement.innerHTML = '';
        
        // 创建结果容器
        const resultContainer = document.createElement('div');
        resultContainer.className = 'analysis-result-container';
        
        // 添加处理信息
        const processingInfo = document.createElement('div');
        processingInfo.className = 'processing-info';
        processingInfo.innerHTML = `
            <p>处理时间: <span>${result.processingTime}</span></p>
            <p>分析时间: <span>${new Date(result.timestamp).toLocaleString()}</span></p>
        `;
        resultContainer.appendChild(processingInfo);
        
        // 添加分析结果列表
        const resultsList = document.createElement('div');
        resultsList.className = 'results-list';
        
        result.results.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            // 设置结果项内容
            resultItem.innerHTML = `
                <div class="result-header">
                    <h4>${this.getResultTypeLabel(item.type)}</h4>
                    <span class="confidence">${Math.round(item.confidence * 100)}% 置信度</span>
                </div>
                <div class="result-details">
                    ${this.formatResultDetails(item)}
                </div>
            `;
            
            resultsList.appendChild(resultItem);
        });
        
        resultContainer.appendChild(resultsList);
        
        // 添加到结果区域
        this.resultElement.appendChild(resultContainer);
        
        // 显示结果区域
        this.resultElement.classList.remove('hidden');
        
        // 添加动画效果
        this.animateResultDisplay(this.resultElement);
    }

    /**
     * 获取结果类型标签
     * @param {string} type - 结果类型
     * @returns {string} 类型标签
     */
    getResultTypeLabel(type) {
        const labels = {
            document: '文档识别',
            table: '表格检测',
            image: '图像内容',
            text: '文本识别',
            barcode: '条形码',
            qrcode: '二维码',
            signature: '签名检测'
        };
        
        return labels[type] || type;
    }

    /**
     * 格式化结果详情
     * @param {Object} result - 单个结果项
     * @returns {string} 格式化的HTML
     */
    formatResultDetails(result) {
        let detailsHtml = '';
        
        if (result.type === 'document' && result.details) {
            detailsHtml += `<p><strong>标题:</strong> ${result.details.title || '无'}</p>`;
            
            if (result.details.segments && result.details.segments.length > 0) {
                detailsHtml += '<div class="text-segments">';
                result.details.segments.forEach(segment => {
                    detailsHtml += `<p><em>${segment.type}:</em> ${segment.text}</p>`;
                });
                detailsHtml += '</div>';
            }
        } else if (result.type === 'table' && result.details) {
            detailsHtml += `<p><strong>表格尺寸:</strong> ${result.details.rows}行 × ${result.details.columns}列</p>`;
            detailsHtml += `<p><strong>包含表头:</strong> ${result.details.hasHeader ? '是' : '否'}</p>`;
        } else {
            detailsHtml += '<p>分析完成</p>';
        }
        
        return detailsHtml;
    }

    /**
     * 为结果显示添加动画
     * @param {HTMLElement} element - 结果元素
     */
    animateResultDisplay(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            });
        });
    }

    /**
     * 初始化摄像头
     */
    async initializeCamera() {
        try {
            // 如果已经有活动的摄像头流，先停止
            if (this.cameraStream) {
                this.stopCamera();
            }

            // 请求摄像头权限
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            // 创建或获取视频元素
            this.videoElement = document.querySelector('#camera-video') || this.createVideoElement();
            this.videoElement.srcObject = this.cameraStream;
            
            // 添加拍摄按钮事件
            this.setupCameraControls();
            
            this.isCameraActive = true;
        } catch (error) {
            console.error('摄像头初始化失败:', error);
            this.showNotification('无法访问摄像头，请检查权限设置', 'error');
        }
    }

    /**
     * 创建视频元素
     * @returns {HTMLVideoElement} 视频元素
     */
    createVideoElement() {
        const videoElement = document.createElement('video');
        videoElement.id = 'camera-video';
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.className = 'camera-video';
        videoElement.style.width = '100%';
        videoElement.style.borderRadius = '8px';
        
        const cameraContainer = document.querySelector('[data-tab-content="camera"]');
        if (cameraContainer) {
            cameraContainer.appendChild(videoElement);
        }
        
        return videoElement;
    }

    /**
     * 设置摄像头控制
     */
    setupCameraControls() {
        const captureButton = document.querySelector('[data-capture]');
        if (captureButton) {
            captureButton.addEventListener('click', () => this.captureImage());
        }
    }

    /**
     * 从摄像头捕获图像
     */
    captureImage() {
        if (!this.videoElement || !this.cameraStream) {
            this.showNotification('摄像头未初始化', 'error');
            return;
        }

        // 设置canvas尺寸
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        
        // 绘制视频帧到canvas
        const ctx = this.canvasElement.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0);
        
        // 获取图像数据
        const imageData = this.canvasElement.toDataURL('image/jpeg', 0.9);
        
        // 显示预览
        this.displayImagePreview(imageData);
        
        // 分析图像
        this.prepareForAnalysis(imageData);
        
        // 切换回上传标签
        this.switchTab('upload');
    }

    /**
     * 停止摄像头
     */
    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => {
                track.stop();
            });
            this.cameraStream = null;
        }
        
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        
        this.isCameraActive = false;
    }

    /**
     * 显示加载状态
     * @param {string} message - 加载消息
     */
    showLoading(message = '处理中...') {
        // 检查是否已存在加载元素
        let loader = document.querySelector('.loading-overlay');
        
        if (!loader) {
            // 创建加载遮罩
            loader = document.createElement('div');
            loader.className = 'loading-overlay';
            loader.style.position = 'fixed';
            loader.style.top = '0';
            loader.style.left = '0';
            loader.style.width = '100%';
            loader.style.height = '100%';
            loader.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            loader.style.display = 'flex';
            loader.style.justifyContent = 'center';
            loader.style.alignItems = 'center';
            loader.style.zIndex = '9999';
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.3s ease';
            
            // 创建加载内容
            const loadingContent = document.createElement('div');
            loadingContent.className = 'loading-content';
            loadingContent.style.backgroundColor = 'var(--bg-secondary, #1e293b)';
            loadingContent.style.padding = '20px';
            loadingContent.style.borderRadius = '8px';
            loadingContent.style.display = 'flex';
            loadingContent.style.flexDirection = 'column';
            loadingContent.style.alignItems = 'center';
            
            // 创建加载图标
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            spinner.style.border = '3px solid rgba(56, 189, 248, 0.3)';
            spinner.style.borderTop = '3px solid var(--primary-color, #38bdf8)';
            spinner.style.borderRadius = '50%';
            spinner.style.width = '30px';
            spinner.style.height = '30px';
            spinner.style.animation = 'spin 1s linear infinite';
            
            // 创建加载文本
            const loadingText = document.createElement('p');
            loadingText.className = 'loading-text';
            loadingText.textContent = message;
            loadingText.style.margin = '10px 0 0 0';
            loadingText.style.color = 'var(--text-primary, #f8fafc)';
            
            // 组装加载元素
            loadingContent.appendChild(spinner);
            loadingContent.appendChild(loadingText);
            loader.appendChild(loadingContent);
            
            // 添加到页面
            document.body.appendChild(loader);
        } else {
            // 更新消息
            const loadingText = loader.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
        
        // 显示加载遮罩
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                loader.style.opacity = '1';
            });
        });
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
            }, 300);
        }
    }

    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型 ('info', 'success', 'warning', 'error')
     * @param {number} duration - 持续时间（毫秒）
     */
    showNotification(message, type = 'info', duration = 3000) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // 设置通知样式
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '8px';
        notification.style.color = 'white';
        notification.style.fontSize = '14px';
        notification.style.fontWeight = '500';
        notification.style.zIndex = '10000';
        notification.style.maxWidth = '300px';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        // 根据类型设置颜色
        const colors = {
            info: '#38bdf8',
            success: '#4ade80',
            warning: '#facc15',
            error: '#f87171'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示通知
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                notification.style.opacity = '1';
                notification.style.transform = 'translateY(0)';
            });
        });
        
        // 设置自动关闭
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    /**
     * 清理资源
     */
    destroy() {
        // 停止摄像头
        this.stopCamera();
        
        // 移除canvas元素
        if (this.canvasElement && this.canvasElement.parentNode) {
            this.canvasElement.parentNode.removeChild(this.canvasElement);
        }
        
        // 移除事件监听器
        if (this.uploadElement) {
            // 移除所有事件监听器（简化处理）
            const newElement = this.uploadElement.cloneNode(true);
            this.uploadElement.parentNode.replaceChild(newElement, this.uploadElement);
            this.uploadElement = newElement;
        }
        
        // 清除全局引用
        if (window.jevImageCapture === this) {
            delete window.jevImageCapture;
        }
    }
}

/**
 * 初始化JEV图像采集模块
 * @param {Object} config - 配置参数
 */
function initJevImageCapture(config) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const imageCapture = new JevImageCapture();
            imageCapture.init(config);
        });
    } else {
        const imageCapture = new JevImageCapture();
        imageCapture.init(config);
    }
}

// 导出初始化函数
export { initJevImageCapture, JevImageCapture };

// 如果直接在浏览器中运行，自动初始化
if (typeof window !== 'undefined' && typeof module === 'undefined') {
    // 等待DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.querySelector('.image-upload-area')) {
                const imageCapture = new JevImageCapture();
                imageCapture.init();
            }
        });
    } else if (document.querySelector('.image-upload-area')) {
        const imageCapture = new JevImageCapture();
        imageCapture.init();
    }
}