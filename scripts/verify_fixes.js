const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

console.log('开始验证代码修复...');
console.log('==========================\n');

// 读取修复后的文件
fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    // 验证项目1: 检查UI安全访问函数是否添加
    const hasSafeAccess = data.includes('function safeAccess(element, property)');
    const hasSafeCall = data.includes('function safeCall(element, method, ...args)');
    console.log(`验证1: UI安全访问函数 - ${hasSafeAccess && hasSafeCall ? '✓ 添加成功' : '✗ 未找到'}`);
    
    // 验证项目2: 检查UI元素初始化代码是否添加
    const hasInitFunction = data.includes('function initJevUIElements()');
    console.log(`验证2: UI元素初始化函数 - ${hasInitFunction ? '✓ 添加成功' : '✗ 未找到'}`);
    
    // 验证项目3: 检查空的catch块是否修复
    const emptyCatchBlocks = (data.match(/catch\s*\([^)]*\)\s*\{\s*\}/g) || []).length;
    console.log(`验证3: 空的catch块修复 - ${emptyCatchBlocks === 0 ? '✓ 全部修复' : `✗ 仍有 ${emptyCatchBlocks} 个空catch块`}`);
    
    // 验证项目4: 检查UI元素存在性检查是否添加
    const hasChatOnlyCheck = data.includes('if (jevChatOnlyBtn && jevChatOnlyBtn instanceof HTMLElement)');
    const hasConfigBtnCheck = data.includes('if (jevConfigBtn && jevConfigBtn instanceof HTMLElement)');
    console.log(`验证4: UI元素严格检查 - ${hasChatOnlyCheck && hasConfigBtnCheck ? '✓ 添加成功' : '✗ 部分缺失'}`);
    
    // 验证项目5: 检查try-catch匹配提醒是否添加
    const tryComments = (data.match(/try \{ \/\/ 确保有对应的catch块/g) || []).length;
    console.log(`验证5: Try-Catch提醒注释 - ${tryComments > 0 ? `✓ 添加了 ${tryComments} 处提醒` : '✗ 未找到提醒'}`);
    
    // 验证项目6: 检查UI元素初始化是否添加到window对象
    const hasWindowInit = data.includes('window.jevChatOnlyBtn') && 
                          data.includes('window.jevConfigBtn') &&
                          data.includes('window.jevWebhookSecretInput');
    console.log(`验证6: UI元素全局初始化 - ${hasWindowInit ? '✓ 初始化完成' : '✗ 部分缺失'}`);
    
    // 验证项目7: 检查可能的语法错误位置
    console.log('\n验证7: 常见语法错误检查...');
    
    // 检查未闭合的括号
    const openBraces = (data.match(/\{/g) || []).length;
    const closeBraces = (data.match(/\}/g) || []).length;
    console.log(`  花括号平衡检查: ${openBraces === closeBraces ? '✓ 平衡' : `✗ 不平衡 - 开${openBraces}, 关${closeBraces}`}`);
    
    const openParens = (data.match(/\(/g) || []).length;
    const closeParens = (data.match(/\)/g) || []).length;
    console.log(`  圆括号平衡检查: ${openParens === closeParens ? '✓ 平衡' : `✗ 不平衡 - 开${openParens}, 关${closeParens}`}`);
    
    const openBrackets = (data.match(/\[/g) || []).length;
    const closeBrackets = (data.match(/\]/g) || []).length;
    console.log(`  方括号平衡检查: ${openBrackets === closeBrackets ? '✓ 平衡' : `✗ 不平衡 - 开${openBrackets}, 关${closeBrackets}`}`);
    
    // 检查关键行附近的语法
    const lines = data.split('\n');
    const criticalLines = [
        { line: 3495, desc: 'jevChatOnlyBtn相关代码' },
        { line: 3505, desc: '配置按钮事件处理' }
    ];
    
    criticalLines.forEach(item => {
        if (lines[item.line - 1]) {
            console.log(`  ${item.desc} (行${item.line}): ${lines[item.line - 1].length > 80 ? lines[item.line - 1].substring(0, 80) + '...' : lines[item.line - 1]}`);
        }
    });
    
    console.log('\n==========================');
    console.log('验证完成！');
    console.log('\n主要改进:');
    console.log('1. 添加了UI元素安全访问辅助函数');
    console.log('2. 修复了空的catch块，添加了错误日志');
    console.log('3. 增强了UI元素的存在性检查');
    console.log('4. 添加了UI元素的统一初始化机制');
    console.log('5. 添加了try-catch匹配的提醒注释');
    console.log('\n建议:');
    console.log('- 手动检查修复后的代码功能是否正常');
    console.log('- 考虑添加单元测试来确保关键功能稳定');
    console.log('- 定期审查代码以发现潜在的新问题');
});