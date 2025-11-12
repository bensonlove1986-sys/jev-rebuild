/**
 * JEV Plugin 模块集成验证脚本
 * 用于验证register.js和toggle_manager.js模块的正确集成
 */

console.log('开始JEV Plugin模块集成验证...');

// 验证函数 - 检查环境和模块
function verifyEnvironment() {
    const results = [];
    
    // 检查JEV核心对象
    if (window.JEV) {
        results.push({ success: true, message: 'JEV核心对象已正确加载' });
        results.push({ success: true, message: `JEV版本: ${JEV.config.version}` });
        results.push({ success: true, message: `设备ID: ${JEV.config.deviceId}` });
    } else {
        results.push({ success: false, message: '错误: JEV核心对象未加载' });
    }
    
    // 检查模块加载状态
    if (JEV.modules) {
        results.push({ success: true, message: 'JEV模块容器已初始化' });
        
        // 检查register模块
        if (JEV.modules.register) {
            results.push({ success: true, message: 'register.js模块已成功加载' });
            
            // 检查关键方法
            const registerMethods = ['isActivated', 'getPermissions', 'login'];
            registerMethods.forEach(method => {
                if (typeof JEV.modules.register[method] === 'function') {
                    results.push({ success: true, message: `register.js包含必要方法: ${method}` });
                } else {
                    results.push({ success: false, message: `警告: register.js缺少方法: ${method}` });
                }
            });
        } else {
            results.push({ success: false, message: '错误: register.js模块未加载' });
        }
        
        // 检查toggle_manager模块
        if (JEV.modules.toggleManager) {
            results.push({ success: true, message: 'toggle_manager.js模块已成功加载' });
            
            // 检查关键方法
            const toggleMethods = ['toggleFeature', 'isFeatureEnabled', 'setFeatures', 'clearFeatures'];
            toggleMethods.forEach(method => {
                if (typeof JEV.modules.toggleManager[method] === 'function') {
                    results.push({ success: true, message: `toggle_manager.js包含必要方法: ${method}` });
                } else {
                    results.push({ success: false, message: `警告: toggle_manager.js缺少方法: ${method}` });
                }
            });
            
            // 检查权限映射
            if (JEV.modules.toggleManager.featureToPermissionMap) {
                results.push({ success: true, message: '权限映射表已正确配置' });
            } else {
                results.push({ success: false, message: '警告: 缺少权限映射表' });
            }
        } else {
            results.push({ success: false, message: '错误: toggle_manager.js模块未加载' });
        }
    } else {
        results.push({ success: false, message: '错误: JEV模块容器未初始化' });
    }
    
    return results;
}

// 执行集成测试
function runIntegrationTest() {
    console.log('执行集成测试...');
    const testResults = [];
    
    try {
        // 测试1: 事件监听机制
        let eventReceived = false;
        const testEventListener = (event) => {
            eventReceived = true;
            console.log('事件测试成功接收到事件:', event.type);
        };
        
        document.addEventListener('jev_test_event', testEventListener);
        
        // 触发测试事件
        const testEvent = new CustomEvent('jev_test_event', {
            detail: { test: true, timestamp: Date.now() },
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(testEvent);
        
        // 清理事件监听
        document.removeEventListener('jev_test_event', testEventListener);
        
        testResults.push({ 
            name: '事件监听机制', 
            success: eventReceived, 
            message: eventReceived ? '事件机制正常工作' : '事件机制未正常工作'
        });
        
        // 测试2: 权限同步模拟
        if (JEV.modules.toggleManager && JEV.modules.toggleManager.setFeatures) {
            const mockFeatures = [
                { name: 'translation_engine', enabled: true },
                { name: 'ai_responder', enabled: false }
            ];
            
            const result = JEV.modules.toggleManager.setFeatures(mockFeatures);
            testResults.push({ 
                name: '权限同步功能', 
                success: result === true, 
                message: result === true ? '权限同步功能正常' : '权限同步功能测试失败'
            });
        } else {
            testResults.push({ 
                name: '权限同步功能', 
                success: false, 
                message: '无法测试: toggle_manager模块或setFeatures方法未就绪'
            });
        }
        
        // 测试3: 功能状态检查
        if (JEV.modules.toggleManager && JEV.modules.toggleManager.isFeatureEnabled) {
            try {
                // 即使功能不存在，也应该能安全返回
                const result = JEV.modules.toggleManager.isFeatureEnabled('nonExistentFeature');
                testResults.push({ 
                    name: '功能状态检查', 
                    success: typeof result === 'boolean', 
                    message: '功能状态检查方法能够安全处理不存在的功能'
                });
            } catch (error) {
                testResults.push({ 
                    name: '功能状态检查', 
                    success: false, 
                    message: `错误: ${error.message}`
                });
            }
        }
        
    } catch (error) {
        testResults.push({ 
            name: '集成测试', 
            success: false, 
            message: `测试执行错误: ${error.message}`
        });
    }
    
    return testResults;
}

// 生成验证报告
function generateVerificationReport() {
    console.log('========================================');
    console.log('JEV Plugin 模块集成验证报告');
    console.log('========================================');
    
    // 环境验证
    console.log('\n[环境验证结果]');
    const envResults = verifyEnvironment();
    envResults.forEach(result => {
        console.log(`${result.success ? '✅' : '❌'} ${result.message}`);
    });
    
    // 集成测试
    console.log('\n[集成测试结果]');
    const integrationResults = runIntegrationTest();
    integrationResults.forEach(test => {
        console.log(`${test.success ? '✅' : '❌'} ${test.name}: ${test.message}`);
    });
    
    // 总体状态
    const allSuccess = envResults.every(r => r.success) && integrationResults.every(r => r.success);
    console.log('\n========================================');
    console.log(`验证总体结果: ${allSuccess ? '✅ 全部通过' : '❌ 部分失败'}`);
    console.log('========================================');
    
    return { envResults, integrationResults, allSuccess };
}

// 当页面加载完成后执行验证
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // 立即执行
    setTimeout(generateVerificationReport, 1000);
} else {
    // 等待DOM加载完成
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(generateVerificationReport, 1000);
    });
}

// 导出验证函数供外部调用
window.JEV_Verify = {
    verifyEnvironment,
    runIntegrationTest,
    generateVerificationReport
};