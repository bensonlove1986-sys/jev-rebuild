// JEV 智能客服插件 - 图片识别模块
const imageModule = {
    init: function(container) {
        console.log('初始化图片识别模块');
        this.container = container;
        this.render();
        this.bindEvents();
    },
    
    render: function() {
        const imageUploadArea = document.getElementById('image-upload-area');
        imageUploadArea.innerHTML = `
            <div class="image-recognition-container">
                <div class="upload-section">
                    <h4>图片上传</h4>
                    <div class="upload-dropzone" id="dropzone">
                        <div class="dropzone-content">
                            <div class="dropzone-icon">📷</div>
                            <div class="dropzone-text">
                                <p>拖拽图片到此处或点击选择图片</p>
                                <p class="supported-formats">支持 JPG、PNG、GIF 格式，最大 10MB</p>
                            </div>
                            <input type="file" id="file-input" accept="image/*" style="display: none;">
                            <button class="select-btn" id="btn-select-file">选择图片</button>
                        </div>
                    </div>
                </div>
                
                <div class="preview-section">
                    <h4>图片预览</h4>
                    <div class="image-preview-container" id="image-preview">
                        <div class="preview-placeholder">
                            <p>预览区域</p>
                            <p class="placeholder-text">上传图片后将在此显示</p>
                        </div>
                    </div>
                    <div class="preview-actions">
                        <button class="action-btn" id="btn-rotate-left">↺ 左旋</button>
                        <button class="action-btn" id="btn-rotate-right">↻ 右旋</button>
                        <button class="action-btn" id="btn-reset-preview">🔄 重置</button>
                        <button class="action-btn" id="btn-remove-image">🗑️ 移除</button>
                    </div>
                </div>
                
                <div class="recognition-section">
                    <h4>识别结果</h4>
                    <div class="recognition-controls">
                        <div class="recognition-options">
                            <label>
                                <input type="checkbox" id="option-ocr" checked>
                                <span>文字识别 (OCR)</span>
                            </label>
                            <label>
                                <input type="checkbox" id="option-objects">
                                <span>物体检测</span>
                            </label>
                            <label>
                                <input type="checkbox" id="option-text-translate">
                                <span>文本翻译</span>
                            </label>
                        </div>
                        <button class="action-btn primary-btn" id="btn-analyze-image">🤖 开始识别</button>
                    </div>
                    
                    <div class="recognition-results">
                        <div class="result-tabs">
                            <button class="tab-btn active" data-tab="ocr">OCR 结果</button>
                            <button class="tab-btn" data-tab="objects">物体检测</button>
                            <button class="tab-btn" data-tab="translation">翻译结果</button>
                        </div>
                        
                        <div class="result-content">
                            <div class="tab-content active" id="tab-ocr">
                                <div class="ocr-result" id="ocr-result">
                                    <div class="result-placeholder">
                                        <p>识别结果将显示在这里</p>
                                    </div>
                                </div>
                                <div class="result-actions">
                                    <button class="action-btn" id="btn-copy-ocr">📋 复制文本</button>
                                    <button class="action-btn" id="btn-export-ocr">💾 导出</button>
                                </div>
                            </div>
                            
                            <div class="tab-content" id="tab-objects">
                                <div class="objects-result" id="objects-result">
                                    <div class="result-placeholder">
                                        <p>物体检测结果将显示在这里</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="tab-content" id="tab-translation">
                                <div class="translation-result" id="translation-result">
                                    <div class="result-placeholder">
                                        <p>翻译结果将显示在这里</p>
                                    </div>
                                </div>
                                <div class="result-actions">
                                    <button class="action-btn" id="btn-copy-translation">📋 复制翻译</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addStyles();
    },
    
    addStyles: function() {
        const style = document.createElement('style');
        style.textContent = `
            .image-recognition-container {
                height: 100%;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .upload-section, .preview-section, .recognition-section {
                border: 1px solid #0f0;
                border-radius: 6px;
                padding: 15px;
                background: rgba(0, 20, 0, 0.3);
            }
            
            .upload-section h4,
            .preview-section h4,
            .recognition-section h4 {
                margin: 0 0 15px 0;
                color: #0f0;
                font-size: 16px;
                border-bottom: 1px solid #0f0;
                padding-bottom: 8px;
            }
            
            .upload-dropzone {
                border: 2px dashed #0f0;
                border-radius: 8px;
                padding: 30px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                background: rgba(0, 10, 0, 0.2);
            }
            
            .upload-dropzone:hover,
            .upload-dropzone.active {
                border-color: rgba(0, 255, 0, 0.8);
                background: rgba(0, 255, 0, 0.05);
                box-shadow: 0 0 15px rgba(0, 255, 0, 0.1);
            }
            
            .dropzone-icon {
                font-size: 48px;
                margin-bottom: 15px;
            }
            
            .dropzone-text p {
                margin: 5px 0;
                color: #0f0;
            }
            
            .supported-formats {
                font-size: 12px;
                color: #0a0;
            }
            
            .select-btn {
                margin-top: 15px;
                background: transparent;
                border: 1px solid #0f0;
                color: #0f0;
                padding: 8px 20px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .select-btn:hover {
                background: rgba(0, 255, 0, 0.2);
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
            }
            
            .image-preview-container {
                border: 1px solid #0f0;
                border-radius: 6px;
                padding: 20px;
                background: rgba(0, 10, 0, 0.2);
                min-height: 200px;
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
                margin-bottom: 15px;
            }
            
            .preview-placeholder,
            .result-placeholder {
                text-align: center;
                color: #0a0;
            }
            
            .placeholder-text {
                font-size: 12px;
                color: #060;
            }
            
            .preview-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            
            .action-btn {
                background: transparent;
                border: 1px solid #0f0;
                color: #0f0;
                padding: 6px 15px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 13px;
            }
            
            .action-btn:hover {
                background: rgba(0, 255, 0, 0.2);
                box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
            }
            
            .primary-btn {
                background: rgba(0, 255, 0, 0.1);
                font-weight: bold;
                padding: 8px 20px;
            }
            
            .recognition-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .recognition-options {
                display: flex;
                gap: 20px;
                flex-wrap: wrap;
            }
            
            .recognition-options label {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                font-size: 14px;
            }
            
            .recognition-options input[type="checkbox"] {
                accent-color: #0f0;
            }
            
            .result-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                border-bottom: 1px solid #0f0;
                padding-bottom: 10px;
            }
            
            .tab-btn {
                background: transparent;
                border: none;
                color: #0a0;
                padding: 6px 15px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
            }
            
            .tab-btn:hover {
                background: rgba(0, 255, 0, 0.1);
            }
            
            .tab-btn.active {
                background: rgba(0, 255, 0, 0.2);
                color: #0f0;
                font-weight: bold;
                border-bottom: 2px solid #0f0;
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            .ocr-result,
            .objects-result,
            .translation-result {
                border: 1px solid #0f0;
                border-radius: 6px;
                padding: 15px;
                background: rgba(0, 10, 0, 0.2);
                min-height: 150px;
                max-height: 200px;
                overflow-y: auto;
                font-size: 14px;
                line-height: 1.6;
                margin-bottom: 15px;
            }
            
            .result-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .preview-image {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                transition: transform 0.3s;
            }
            
            /* 滚动条样式 */
            .ocr-result::-webkit-scrollbar,
            .objects-result::-webkit-scrollbar,
            .translation-result::-webkit-scrollbar {
                width: 8px;
            }
            
            .ocr-result::-webkit-scrollbar-track,
            .objects-result::-webkit-scrollbar-track,
            .translation-result::-webkit-scrollbar-track {
                background: rgba(0, 20, 0, 0.5);
                border-radius: 4px;
            }
            
            .ocr-result::-webkit-scrollbar-thumb,
            .objects-result::-webkit-scrollbar-thumb,
            .translation-result::-webkit-scrollbar-thumb {
                background: #0f0;
                border-radius: 4px;
            }
            
            .ocr-result::-webkit-scrollbar-thumb:hover,
            .objects-result::-webkit-scrollbar-thumb:hover,
            .translation-result::-webkit-scrollbar-thumb:hover {
                background: #0a0;
            }
            
            /* 响应式调整 */
            @media (max-width: 768px) {
                .recognition-controls {
                    flex-direction: column;
                    gap: 15px;
                }
                
                .recognition-options {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    },
    
    bindEvents: function() {
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('file-input');
        const btnSelectFile = document.getElementById('btn-select-file');
        const btnAnalyzeImage = document.getElementById('btn-analyze-image');
        const btnRotateLeft = document.getElementById('btn-rotate-left');
        const btnRotateRight = document.getElementById('btn-rotate-right');
        const btnResetPreview = document.getElementById('btn-reset-preview');
        const btnRemoveImage = document.getElementById('btn-remove-image');
        const btnCopyOCR = document.getElementById('btn-copy-ocr');
        const btnExportOCR = document.getElementById('btn-export-ocr');
        const btnCopyTranslation = document.getElementById('btn-copy-translation');
        
        // 拖拽上传相关事件
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('active');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('active');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('active');
            
            if (e.dataTransfer.files.length > 0) {
                this.handleImageUpload(e.dataTransfer.files[0]);
            }
        });
        
        // 点击上传
        btnSelectFile.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                this.handleImageUpload(fileInput.files[0]);
            }
        });
        
        // 分析图片
        btnAnalyzeImage.addEventListener('click', () => {
            this.analyzeImage();
        });
        
        // 图片操作按钮
        btnRotateLeft.addEventListener('click', () => {
            this.rotateImage(-90);
        });
        
        btnRotateRight.addEventListener('click', () => {
            this.rotateImage(90);
        });
        
        btnResetPreview.addEventListener('click', () => {
            this.resetImage();
        });
        
        btnRemoveImage.addEventListener('click', () => {
            this.removeImage();
        });
        
        // 结果操作按钮
        btnCopyOCR.addEventListener('click', () => {
            this.copyToClipboard('ocr-result');
        });
        
        btnExportOCR.addEventListener('click', () => {
            this.exportOCR();
        });
        
        btnCopyTranslation.addEventListener('click', () => {
            this.copyToClipboard('translation-result');
        });
        
        // 选项卡切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },
    
    // 处理图片上传
    handleImageUpload: function(file) {
        // 验证文件类型
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('请上传支持的图片格式（JPG、PNG、GIF）');
            return;
        }
        
        // 验证文件大小
        if (file.size > 10 * 1024 * 1024) { // 10MB
            alert('图片大小不能超过10MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewContainer = document.getElementById('image-preview');
            previewContainer.innerHTML = `
                <img src="${e.target.result}" class="preview-image" id="preview-image">
            `;
            
            // 存储原始状态
            const image = document.getElementById('preview-image');
            image.dataset.originalSrc = e.target.result;
            image.dataset.rotation = 0;
        };
        reader.readAsDataURL(file);
    },
    
    // 旋转图片
    rotateImage: function(degrees) {
        const image = document.getElementById('preview-image');
        if (!image) return;
        
        let currentRotation = parseInt(image.dataset.rotation || 0);
        currentRotation += degrees;
        image.dataset.rotation = currentRotation;
        image.style.transform = `rotate(${currentRotation}deg)`;
    },
    
    // 重置图片
    resetImage: function() {
        const image = document.getElementById('preview-image');
        if (!image) return;
        
        image.src = image.dataset.originalSrc;
        image.dataset.rotation = 0;
        image.style.transform = 'none';
    },
    
    // 移除图片
    removeImage: function() {
        const previewContainer = document.getElementById('image-preview');
        previewContainer.innerHTML = `
            <div class="preview-placeholder">
                <p>预览区域</p>
                <p class="placeholder-text">上传图片后将在此显示</p>
            </div>
        `;
        
        // 清空识别结果
        document.getElementById('ocr-result').innerHTML = `
            <div class="result-placeholder">
                <p>识别结果将显示在这里</p>
            </div>
        `;
        document.getElementById('objects-result').innerHTML = `
            <div class="result-placeholder">
                <p>物体检测结果将显示在这里</p>
            </div>
        `;
        document.getElementById('translation-result').innerHTML = `
            <div class="result-placeholder">
                <p>翻译结果将显示在这里</p>
            </div>
        `;
    },
    
    // 分析图片
    analyzeImage: function() {
        const image = document.getElementById('preview-image');
        if (!image) {
            alert('请先上传图片');
            return;
        }
        
        const ocrEnabled = document.getElementById('option-ocr').checked;
        const objectsEnabled = document.getElementById('option-objects').checked;
        const translateEnabled = document.getElementById('option-text-translate').checked;
        
        // 显示加载状态
        if (ocrEnabled) {
            document.getElementById('ocr-result').textContent = '正在识别文字...';
        }
        if (objectsEnabled) {
            document.getElementById('objects-result').textContent = '正在检测物体...';
        }
        if (translateEnabled) {
            document.getElementById('translation-result').textContent = '正在翻译文本...';
        }
        
        // 模拟识别延迟
        setTimeout(() => {
            // 模拟OCR结果
            if (ocrEnabled) {
                const mockOCRResult = `识别到的文字内容：

JEV 智能客服系统

欢迎使用 JEV 智能客服系统，这是一个专为企业打造的智能客服解决方案。

主要功能：
- 智能对话管理
- 多语言翻译
- 图片识别分析
- 客户意图理解

联系我们：support@jevshop.com
官方网站：www.jevshop.com`;
                document.getElementById('ocr-result').textContent = mockOCRResult;
            }
            
            // 模拟物体检测结果
            if (objectsEnabled) {
                const mockObjectsResult = `检测到的物体：

1. 文本 - 置信度：99%
2. 表格 - 置信度：95%
3. 标志 - 置信度：88%
4. 图片边界 - 置信度：99%`;
                document.getElementById('objects-result').textContent = mockObjectsResult;
            }
            
            // 模拟翻译结果
            if (translateEnabled) {
                const mockTranslationResult = `Translated content:\n\nJEV Intelligent Customer Service System\n\nWelcome to JEV Intelligent Customer Service System, a smart customer service solution designed for enterprises.\n\nMain features:\n- Intelligent conversation management\n- Multi-language translation\n- Image recognition and analysis\n- Customer intent understanding\n\nContact us: support@jevshop.com\nOfficial website: www.jevshop.com`;
                document.getElementById('translation-result').textContent = mockTranslationResult;
            }
            
            // 自动切换到OCR标签
            if (ocrEnabled) {
                this.switchTab('ocr');
            }
        }, 2000);
    },
    
    // 切换选项卡
    switchTab: function(tabName) {
        // 隐藏所有选项卡内容
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 移除所有按钮的活跃状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 激活选中的选项卡
        const tabContent = document.getElementById(`tab-${tabName}`);
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        
        if (tabContent && tabBtn) {
            tabContent.classList.add('active');
            tabBtn.classList.add('active');
        }
    },
    
    // 复制到剪贴板
    copyToClipboard: function(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const text = element.textContent;
        if (text.includes('将显示在这里')) {
            alert('没有可复制的内容');
            return;
        }
        
        navigator.clipboard.writeText(text).then(() => {
            alert('已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        });
    },
    
    // 导出OCR结果
    exportOCR: function() {
        const ocrResult = document.getElementById('ocr-result').textContent;
        if (ocrResult.includes('将显示在这里')) {
            alert('没有可导出的内容');
            return;
        }
        
        // 创建Blob并下载
        const blob = new Blob([ocrResult], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocr_result_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// 导出模块
export default imageModule;