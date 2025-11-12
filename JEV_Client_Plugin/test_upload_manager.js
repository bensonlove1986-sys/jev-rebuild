/**
 * JEV Upload Manager 测试脚本
 * 用于演示上传管理器功能并生成模拟上传记录
 */

// 等待页面加载完成
window.addEventListener('DOMContentLoaded', function() {
    // 等待 JEVUploadManager 初始化
    setTimeout(function() {
        if (window.JEVUploadManager) {
            console.log('[TEST] Starting JEV Upload Manager tests...');
            
            // 执行测试上传
            runUploadTests();
        } else {
            console.error('[TEST] JEVUploadManager not found');
        }
    }, 1000);
});

/**
 * 运行上传测试
 */
function runUploadTests() {
    // 测试上传不同类型的文件
    const testFiles = [
        {
            path: '/ui/test_page.html',
            version: 'v1.0'
        },
        {
            path: '/modules/test_module.js',
            version: 'v1.0'
        },
        {
            path: '/assets/test_style.css',
            version: 'v1.0'
        },
        {
            path: '/ui/integrated_ui.html',
            version: 'v2.0'
        },
        {
            path: '/modules/integrated_controller.js',
            version: 'v2.0'
        }
    ];
    
    // 模拟上传过程
    testFiles.forEach((file, index) => {
        setTimeout(() => {
            console.log(`[TEST] Uploading: ${file.path}`);
            const result = JEVUploadManager.uploadFile(file.path, file.version);
            
            if (result) {
                console.log('[TEST] Upload result:', result);
                
                // 更新UI显示
                if (window.updateUploadHistoryDisplay) {
                    window.updateUploadHistoryDisplay();
                }
            }
        }, index * 500); // 错开上传时间，模拟真实场景
    });
    
    // 测试完成后显示统计信息
    setTimeout(() => {
        const history = JEVUploadManager.getUploadHistory();
        console.log(`[TEST] Upload test completed. Total uploads: ${history.length}`);
        
        // 显示测试通知
        showTestNotification();
    }, testFiles.length * 500 + 1000);
}

/**
 * 显示测试通知
 */
function showTestNotification() {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'jev-test-notification';
    notification.innerHTML = `
        <div class="jev-notification-content">
            <strong>测试完成！</strong>
            <p>已生成模拟上传记录，请查看上传记录面板</p>
        </div>
    `;
    
    // 添加样式
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(76, 175, 80, 0.9)',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: '10000',
        animation: 'slideIn 0.3s ease-out'
    });
    
    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 导出测试函数供其他脚本调用
window.runUploadTests = runUploadTests;