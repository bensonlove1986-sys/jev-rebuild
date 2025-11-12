// jev_panel.js - JEV 控制面板核心逻辑
// 负责按钮交互、日志显示、模块切换等功能

// 全局应用对象
const JEV_PANEL = {
    // 初始化函数
    init: function() {
        // 等待 JEV_SYNC 初始化完成
        this.waitForSyncInit(() => {
            this.log('控制面板初始化中...');
            this.setupEventListeners();
            this.initializeModules();
            this.log('控制面板初始化完成');
        });
    },
    
    // 等待 JEV_SYNC 初始化
    waitForSyncInit: function(callback) {
        if (window.JEV_SYNC) {
            // 注册日志监听器
            JEV_SYNC.onLog(logEntry => {
                this.updateLogUI(logEntry);
            });
            callback();
        } else {
            setTimeout(() => this.waitForSyncInit(callback), 100);
        }
    },
    
    // 设置事件监听器
    setupEventListeners: function() {
        // 刷新按钮
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshAll();
        });
        
        // 清空日志按钮
        document.getElementById('clear-log-btn').addEventListener('click', () => {
            this.clearLog();
        });
        
        // 模块选项卡切换
        this.setupModuleTabs();
        
        // 翻译模块事件
        this.setupTranslationModule();
        
        // OCR 模块事件
        this.setupOCRModule();
        
        // 报价模块事件
        this.setupQuoteModule();
        
        // 模板模块事件
        this.setupTemplateModule();
    },
    
    // 初始化模块
    initializeModules: function() {
        // 默认显示翻译模块
        this.showModule('translation');
    },
    
    // 设置模块选项卡
    setupModuleTabs: function() {
        const tabs = ['translation', 'ocr', 'quote', 'template'];
        
        tabs.forEach(tab => {
            const tabElement = document.getElementById(`${tab}-tab`);
            if (tabElement) {
                tabElement.addEventListener('click', () => {
                    this.showModule(tab);
                });
            }
        });
    },
    
    // 显示指定模块
    showModule: function(moduleName) {
        // 隐藏所有模块
        const modules = ['translation', 'ocr', 'quote', 'template'];
        modules.forEach(module => {
            const moduleElement = document.getElementById(`${module}-module`);
            const tabElement = document.getElementById(`${module}-tab`);
            
            if (moduleElement) {
                moduleElement.classList.add('hidden');
            }
            
            if (tabElement) {
                tabElement.classList.remove('border-primary', 'text-primary');
                tabElement.classList.add('border-transparent', 'hover:text-gray-300', 'hover:border-gray-300');
            }
        });
        
        // 显示选中的模块
        const selectedModule = document.getElementById(`${moduleName}-module`);
        const selectedTab = document.getElementById(`${moduleName}-tab`);
        
        if (selectedModule) {
            selectedModule.classList.remove('hidden');
        }
        
        if (selectedTab) {
            selectedTab.classList.remove('border-transparent', 'hover:text-gray-300', 'hover:border-gray-300');
            selectedTab.classList.add('border-primary', 'text-primary');
        }
        
        this.log(`切换到 ${this.getModuleDisplayName(moduleName)} 模块`);
    },
    
    // 获取模块显示名称
    getModuleDisplayName: function(moduleName) {
        const names = {
            translation: '翻译助手',
            ocr: '图片识别',
            quote: '报价生成',
            template: '模板回复'
        };
        return names[moduleName] || moduleName;
    },
    
    // 设置翻译模块
    setupTranslationModule: function() {
        // 中译英按钮
        document.getElementById('zh-to-en-btn').addEventListener('click', () => {
            this.translate('zh', 'en');
        });
        
        // 英译中按钮
        document.getElementById('en-to-zh-btn').addEventListener('click', () => {
            this.translate('en', 'zh');
        });
    },
    
    // 设置 OCR 模块
    setupOCRModule: function() {
        const imageUpload = document.getElementById('image-upload');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const imagePreview = document.getElementById('image-preview');
        const analyzeImageBtn = document.getElementById('analyze-image-btn');
        
        // 图片上传处理
        if (imageUpload) {
            imageUpload.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.handleImageUpload(file, imagePreviewContainer, imagePreview);
                }
            });
        }
        
        // 拖拽上传支持
        const dropZone = imageUpload ? imageUpload.closest('.border-dashed') : null;
        if (dropZone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.add('border-primary');
                });
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, () => {
                    dropZone.classList.remove('border-primary');
                });
            });
            
            dropZone.addEventListener('drop', (e) => {
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.handleImageUpload(file, imagePreviewContainer, imagePreview);
                }
            });
        }
        
        // 分析图片按钮
        if (analyzeImageBtn) {
            analyzeImageBtn.addEventListener('click', () => {
                this.analyzeImage(imagePreview.src);
            });
        }
    },
    
    // 设置报价模块
    setupQuoteModule: function() {
        const generateQuoteBtn = document.getElementById('generate-quote-btn');
        if (generateQuoteBtn) {
            generateQuoteBtn.addEventListener('click', () => {
                this.generateQuote();
            });
        }
    },
    
    // 设置模板模块
    setupTemplateModule: function() {
        const templateBtns = document.querySelectorAll('.template-btn');
        templateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const template = btn.getAttribute('data-template');
                this.copyToClipboard(template);
                
                // 显示复制成功提示
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fa fa-check mr-1"></i>已复制';
                btn.classList.add('bg-success');
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('bg-success');
                }, 2000);
            });
        });
    },
    
    // 处理图片上传
    handleImageUpload: function(file, container, preview) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            preview.src = e.target.result;
            container.classList.remove('hidden');
            this.log(`已加载图片: ${file.name}`);
        };
        
        reader.readAsDataURL(file);
    },
    
    // 翻译功能
    translate: async function(from, to) {
        const fromText = document.getElementById(`${from}-input`).value.trim();
        const resultElement = document.getElementById('translation-result');
        
        if (!fromText) {
            this.showError('请输入要翻译的文本');
            return;
        }
        
        try {
            this.log(`正在翻译 ${from.toUpperCase()} 到 ${to.toUpperCase()}...`);
            
            // 清空结果区域
            resultElement.innerHTML = '<p class="text-gray-400 italic">翻译中...</p>';
            
            // 模拟翻译请求
            // 实际项目中应该调用 JEV_SYNC.sendToWorker 或 JEV_SYNC.sendToAI
            const translation = await this.mockTranslation(fromText, from, to);
            
            // 显示翻译结果
            resultElement.textContent = translation;
            
            // 如果是中译英，填充到英文输入框
            if (from === 'zh' && to === 'en') {
                document.getElementById('en-input').value = translation;
            }
            // 如果是英译中，填充到中文输入框
            else if (from === 'en' && to === 'zh') {
                document.getElementById('zh-input').value = translation;
            }
            
            this.log('翻译完成');
        } catch (error) {
            this.handleError('翻译失败', error);
        }
    },
    
    // 分析图片
    analyzeImage: async function(imageUrl) {
        const resultElement = document.getElementById('ocr-result');
        
        if (!imageUrl) {
            this.showError('请先上传图片');
            return;
        }
        
        try {
            this.log('正在分析图片内容...');
            
            // 清空结果区域
            resultElement.innerHTML = '<p class="text-gray-400 italic">分析中...</p>';
            
            // 模拟 OCR 请求
            // 实际项目中应该调用 JEV_SYNC.sendToAI
            const ocrResult = await this.mockOCR(imageUrl);
            
            // 显示 OCR 结果
            resultElement.textContent = ocrResult;
            this.log('图片分析完成');
        } catch (error) {
            this.handleError('图片分析失败', error);
        }
    },
    
    // 生成报价
    generateQuote: async function() {
        const productInfo = document.getElementById('product-info').value.trim();
        const customerName = document.getElementById('customer-name').value.trim();
        const quoteDate = document.getElementById('quote-date').value;
        const validityPeriod = document.getElementById('validity-period').value;
        const resultElement = document.getElementById('quote-result');
        
        if (!productInfo) {
            this.showError('请输入产品信息');
            return;
        }
        
        try {
            this.log('正在生成报价草稿...');
            
            // 清空结果区域
            resultElement.innerHTML = '<p class="text-gray-400 italic">生成中...</p>';
            
            // 模拟报价生成请求
            // 实际项目中应该调用 JEV_SYNC.sendToWorker 或 JEV_SYNC.sendToAI
            const quoteData = {
                productInfo,
                customerName,
                quoteDate,
                validityPeriod
            };
            
            const quoteResult = await this.mockQuoteGeneration(quoteData);
            
            // 显示报价结果
            resultElement.textContent = quoteResult;
            this.log('报价草稿生成完成');
        } catch (error) {
            this.handleError('报价生成失败', error);
        }
    },
    
    // 复制到剪贴板
    copyToClipboard: function(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.log('模板已复制到剪贴板');
        }).catch(err => {
            this.log(`复制失败: ${err.message}`);
        });
    },
    
    // 模拟翻译（用于演示）
    mockTranslation: function(text, from, to) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (from === 'zh' && to === 'en') {
                    // 简单的中译英模拟
                    resolve(`[Translated to English] ${text}`);
                } else if (from === 'en' && to === 'zh') {
                    // 简单的英译中模拟
                    resolve(`[翻译为中文] ${text}`);
                } else {
                    resolve(`[Translated] ${text}`);
                }
            }, 1000);
        });
    },
    
    // 模拟 OCR（用于演示）
    mockOCR: function(imageUrl) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockResults = [
                    '这是一张图片的模拟识别结果。\n识别到的文本内容示例。\nOCR 功能演示。',
                    'Sample text recognized from image.\nThis is a demonstration of OCR capability.\nMultiple lines of text here.'
                ];
                const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
                resolve(randomResult);
            }, 1500);
        });
    },
    
    // 模拟报价生成（用于演示）
    mockQuoteGeneration: function(data) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let quote = `报价草稿\n`;
                quote += `=======================\n`;
                quote += `客户名称: ${data.customerName || '未提供'}\n`;
                quote += `报价日期: ${data.quoteDate || new Date().toLocaleDateString()}\n`;
                quote += `有效期: ${data.validityPeriod} 天\n`;
                quote += `\n产品信息:\n${data.productInfo}\n`;
                quote += `\n价格明细:\n- 产品基础价格: ¥1,000.00\n- 税费: ¥100.00\n- 服务费: ¥50.00\n`;
                quote += `\n总计: ¥1,150.00\n`;
                quote += `=======================\n`;
                quote += `注: 此为报价草稿，最终价格以正式合同为准。`;
                
                resolve(quote);
            }, 1200);
        });
    },
    
    // 刷新所有服务
    refreshAll: function() {
        this.log('刷新所有服务状态...');
        if (window.JEV_SYNC) {
            JEV_SYNC.refreshAll();
        }
    },
    
    // 清空日志
    clearLog: function() {
        if (window.JEV_SYNC) {
            JEV_SYNC.clearLog();
        }
    },
    
    // 更新日志 UI
    updateLogUI: function(logEntry) {
        // 这里可以添加额外的日志处理逻辑
        // JEV_SYNC 已经处理了基本的日志显示
    },
    
    // 显示错误信息
    showError: function(message) {
        alert(`错误: ${message}`);
        this.log(`❌ ${message}`);
    },
    
    // 处理错误
    handleError: function(message, error) {
        const errorMessage = error ? `${message}: ${error.message}` : message;
        this.showError(errorMessage);
    },
    
    // 记录日志
    log: function(message) {
        if (window.JEV_SYNC) {
            JEV_SYNC.log(message);
        } else {
            console.log(`[JEV] ${message}`);
        }
    }
};

// 当 DOM 加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => JEV_PANEL.init());
} else {
    JEV_PANEL.init();
}