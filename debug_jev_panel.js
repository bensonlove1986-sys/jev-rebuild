// JEV 控制面板调试工具
console.log('==================== JEV 调试工具 ====================');
console.log('当前页面:', window.location.href);
console.log('时间戳:', new Date().toISOString());

// 检查全局变量状态
console.log('全局标志状态:', window.__JEV_CONTROL_PANEL__);

// 检查DOM中的面板元素
const panelExists = document.querySelector('#jev-control-panel');
console.log('面板元素存在:', !!panelExists);
if (panelExists) {
    console.log('面板元素信息:', panelExists);
}

// 测试直接连接到服务
async function testDirectConnection(port, label) {
    try {
        const url = `http://localhost:${port}/ping`;
        console.log(`测试连接到 ${label} (${url})...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();
        console.log(`${label} 连接成功! 状态码: ${response.status}`, data);
        return true;
    } catch (error) {
        console.error(`${label} 连接失败:`, error.message || error);
        return false;
    }
}

// 测试所有服务
(async () => {
    console.log('\n开始测试服务连接...');
    
    const agentResult = await testDirectConnection(1820, 'Agent');
    const controlResult = await testDirectConnection(1821, 'Control Center');
    const aiResult = await testDirectConnection(1822, 'AI Service');
    
    console.log('\n连接测试结果:');
    console.log('Agent:', agentResult ? '✅ 成功' : '❌ 失败');
    console.log('Control Center:', controlResult ? '✅ 成功' : '❌ 失败');
    console.log('AI Service:', aiResult ? '✅ 成功' : '❌ 失败');
    
    // 检查是否存在重复的脚本实例
    const scriptElements = document.querySelectorAll('script');
    let jevScripts = 0;
    scriptElements.forEach(script => {
        if (script.textContent && script.textContent.includes('JEV 控制面板')) {
            jevScripts++;
        }
    });
    console.log('\n检测到的JEV相关脚本数量:', jevScripts);
    
    // 检查可能的冲突
    console.log('\n检查可能的冲突:');
    if (window.addEventListener.toString().includes('native code') === false) {
        console.warn('⚠️ window.addEventListener 可能被覆盖!');
    }
    if (document.querySelector.toString().includes('native code') === false) {
        console.warn('⚠️ document.querySelector 可能被覆盖!');
    }
    
    console.log('==================== 调试完成 ====================');
})();
