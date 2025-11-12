// DAOJIE图片采集浏览器测试脚本
// 可以直接在浏览器控制台运行此脚本

console.log('DAOJIE图片采集测试脚本已加载');
console.log('按住Alt键并点击页面上的任何图片进行测试');

// 简单的日志工具
const logger = {
    debug: function() {
        console.log('[DAOJIE-TEST]', ...arguments);
    },
    error: function() {
        console.error('[DAOJIE-ERROR]', ...arguments);
    }
};

// 配置
const config = {
    upload: {
        baseUrl: 'http://localhost:8000/upload',
        timeout: 30000
    }
};

// 创建对话框函数
function createDialog(options) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 9999;
            width: ${options.width || '400px'};
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const commandsHtml = options.commands.map(cmd => 
            `<button style="display:block;width:100%;padding:10px;margin:8px 0;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;cursor:pointer;text-align:left;" data-command="${cmd.id}">
              ${cmd.label}
            </button>`
        ).join('');
        
        dialog.innerHTML = `
            <h3 style="margin-top:0;color:#333;">${options.title || '操作'}</h3>
            <p style="color:#666;">${options.message || ''}</p>
            <div>${commandsHtml}</div>
            <button style="padding:8px 16px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;cursor:pointer;margin-top:15px;" class="close-btn">关闭</button>
        `;
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9998;
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(dialog);
        
        // 命令按钮事件
        dialog.querySelectorAll('[data-command]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cmd = btn.getAttribute('data-command');
                document.body.removeChild(dialog);
                document.body.removeChild(overlay);
                resolve({ confirmed: true, command: cmd });
            });
        });
        
        // 关闭按钮
        dialog.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(dialog);
            document.body.removeChild(overlay);
            resolve({ confirmed: false });
        });
        
        // ESC键关闭
        function handleEsc(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(dialog);
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEsc);
                resolve({ confirmed: false });
            }
        }
        document.addEventListener('keydown', handleEsc);
    });
}

// 图片处理函数
async function processImage(blob, options = {}) {
    logger.debug('开始处理图片...');
    const result = {};
    
    // 模拟上传（在浏览器环境中直接返回模拟结果）
    result.upload = {
        success: true,
        message: '上传成功（浏览器模拟）',
        url: 'http://localhost:8000/simulated_' + Date.now() + '.png'
    };
    
    // 模拟OCR和翻译
    result.ocr = '这是模拟的OCR文本识别结果。图片中包含测试文本，可以进行翻译。';
    result.translation = 'This is a simulated OCR text recognition result. The image contains test text that can be translated.';
    
    logger.debug('图片处理完成');
    return result;
}

// 复制文本到剪贴板
function copyToClipboard(text) {
    try {
        // 使用现代API
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            const result = document.execCommand('copy');
            document.body.removeChild(textarea);
            return Promise.resolve(result);
        }
    } catch (error) {
        logger.error('复制失败:', error);
        return Promise.reject(error);
    }
}

// 图片点击处理函数
async function handleImageClick(event) {
    try {
        // 检查是否按住Alt键
        if (!event.altKey) return;
        
        const img = event.target;
        if (!img || img.tagName !== 'IMG') return;

        // 阻止默认行为
        event.preventDefault();
        event.stopPropagation();

        logger.debug('检测到Alt+点击图片:', img.src);

        // 显示处理中
        const originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'wait';

        try {
            // 创建canvas并绘制图片
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 确保图片已加载完成
            if (!img.complete) {
                logger.debug('等待图片加载...');
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
            }
            
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 转换为Blob
            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });

            // 处理图片
            const result = await processImage(blob, {
                upload: true,
                ocr: true,
                translate: true
            });

            // 显示结果
            if (result.translation) {
                logger.debug('显示翻译结果对话框');
                const dialogResult = await createDialog({
                    title: '图片翻译结果（测试）',
                    message: result.translation,
                    commands: [
                        { id: 'copy', label: '复制文本' },
                        { id: 'view', label: '查看详情' }
                    ]
                });

                if (dialogResult.command === 'copy') {
                    try {
                        await copyToClipboard(result.translation);
                        alert('文本已复制到剪贴板');
                    } catch (e) {
                        alert('复制失败，请手动选择文本');
                    }
                } else if (dialogResult.command === 'view') {
                    let details = `测试环境 - OCR结果:\n${result.ocr}\n\n`;
                    details += `翻译结果:\n${result.translation}\n\n`;
                    details += `模拟上传链接:\n${result.upload.url}`;
                    alert(details);
                }
            }
        } finally {
            // 恢复光标
            document.body.style.cursor = originalCursor;
        }
    } catch (error) {
        logger.error('图片处理失败:', error);
        alert('测试失败: ' + (error.message || '未知错误'));
    }
}

// 添加测试提示元素
function addTestIndicator() {
    // 检查是否已存在提示
    if (document.getElementById('daojie-test-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'daojie-test-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #2196F3;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 9999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    indicator.textContent = 'DAOJIE测试模式: Alt+点击图片';
    
    document.body.appendChild(indicator);
}

// 初始化函数
function initializeTestMode() {
    // 添加事件监听
    document.addEventListener('click', handleImageClick, true);
    
    // 添加测试提示
    addTestIndicator();
    
    logger.debug('DAOJIE测试模式已初始化');
    logger.debug('请按住Alt键并点击页面上的任意图片进行测试');
}

// 启动测试模式
initializeTestMode();

// 返回测试对象供调试使用
window.DAOJIETest = {
    processImage: processImage,
    createDialog: createDialog,
    copyToClipboard: copyToClipboard,
    logger: logger
};

console.log('测试对象已挂载到 window.DAOJIETest');
console.log('测试命令:');
console.log(' - DAOJIETest.logger.debug("测试日志")');
console.log(' - DAOJIETest.createDialog({title: "测试", message: "测试消息", commands: [{id: "ok", label: "确定"}]})');

// 结束提示
console.log('--------------------------------------');
console.log('测试准备就绪！按住Alt键并点击任意图片。');
console.log('--------------------------------------');
