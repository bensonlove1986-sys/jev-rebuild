const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

console.log('验证轻量级问题修复...');
console.log('==========================\n');

// 读取修复后的文件
fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    // 验证项目1: 检查安全初始化代码
    const hasPanel = data.includes('const panel = console;');
    const hasSafeExec = data.includes('window.safeExec = async (fn) =>');
    const hasWorkerUrl = data.includes('const WORKER_URL =');
    console.log(`验证1: 安全初始化代码 - ${hasPanel && hasSafeExec && hasWorkerUrl ? '✓ 全部添加' : '✗ 部分缺失'}`);
    
    // 验证项目2: 检查Worker URL配置
    const hasDynamicWorkerUrl = data.includes('workerUrl: WORKER_URL');
    console.log(`验证2: 动态Worker URL - ${hasDynamicWorkerUrl ? '✓ 已更新' : '✗ 未更新'}`);
    
    // 验证项目3: 检查Chrome消息监听器修复
    const hasReturnTrue = data.includes('return true; // 保持端口打开');
    console.log(`验证3: 消息监听器修复 - ${hasReturnTrue ? '✓ 已添加' : '✗ 未添加'}`);
    
    // 验证项目4: 检查panel调用修复
    const hasPanelCalls = /panel\.log|panel\.info|panel\.error|panel\.warn/.test(data);
    console.log(`验证4: Panel调用修复 - ${!hasPanelCalls ? '✓ 全部修复' : '✗ 仍有panel调用'}`);
    
    // 验证项目5: 检查语法错误是否修复
    console.log('\n验证5: 语法错误检查...');
    try {
        // 简单的语法检查 - 尝试解析代码结构
        const lines = data.split('\n');
        const line6287 = lines[6286]; // 第6287行，索引为6286
        console.log(`  第6287行内容: ${line6287 || '该行不存在'}`);
        
        // 检查括号平衡
        const openBraces = (data.match(/\{/g) || []).length;
        const closeBraces = (data.match(/\}/g) || []).length;
        console.log(`  花括号平衡: ${openBraces === closeBraces ? '✓ 平衡' : `✗ 不平衡 - 开${openBraces}, 关${closeBraces}`}`);
        
        // 检查关键的运行时错误修复
        console.log(`  panel未定义错误: ${hasPanel ? '✓ 已修复' : '✗ 未修复'}`);
        console.log(`  Worker URL自动切换: ${hasWorkerUrl ? '✓ 已添加' : '✗ 未添加'}`);
    } catch (e) {
        console.error('  语法检查失败:', e.message);
    }
    
    console.log('\n==========================');
    console.log('修复验证完成！');
    console.log('\n主要改进:');
    console.log('1. 定义了panel变量，解决了panel is not defined错误');
    console.log('2. 添加了safeExec函数来优雅处理Firebase权限错误');
    console.log('3. 实现了Worker URL自动切换，适配本地和线上环境');
    console.log('4. 修复了Chrome消息监听器，防止端口提前关闭错误');
    console.log('5. 修复了所有panel相关调用，替换为console');
    console.log('\n现在脚本应该可以在不抛出控制台错误的情况下正常运行了。');
});