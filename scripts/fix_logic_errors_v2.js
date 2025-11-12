const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

// 简单的文件备份
function backupFile(sourcePath) {
    const backupPath = sourcePath + '.bak';
    try {
        const content = fs.readFileSync(sourcePath, 'utf8');
        fs.writeFileSync(backupPath, content, 'utf8');
        console.log('✓ 文件已备份到: ' + backupPath);
        return true;
    } catch (err) {
        console.error('✗ 备份文件失败:', err);
        return false;
    }
}

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    // 先备份原文件
    if (!backupFile(path)) {
        console.log('继续修复但没有备份...');
    }
    
    console.log('开始修复代码逻辑错误...');
    
    // 1. 修复translate属性重复定义
    console.log('\n[1] 修复translate属性重复定义');
    const translateRegex = /translate:\s*true[^\n]*/g;
    const matches = data.match(translateRegex);
    if (matches && matches.length > 1) {
        console.log('  找到 ' + matches.length + ' 个translate属性定义');
        // 只保留第一个translate定义，移除后续的
        let count = 0;
        data = data.replace(translateRegex, function(match) {
            count++;
            if (count > 1) {
                return '        // translate属性已在上方定义，避免重复';
            }
            return match;
        });
        console.log('  已移除重复的translate属性定义');
    }
    
    // 2. 添加UI元素存在性检查
    console.log('\n[2] 添加UI元素安全检查');
    const uiElements = [
        'jevChatOnlyBtn', 'jevConfigBtn', 'jevWebhookSecretInput', 
        'jevAutoPushInput', 'jevChatOnlyInput', 'jevChatRootSelInput', 
        'jevInputSelInput'
    ];
    
    // 在文件开头添加辅助函数
    const helperFunctions = `
// UI元素安全访问辅助函数
function safeAccess(element, accessor) {
    try {
        return element ? accessor(element) : null;
    } catch (e) {
        console.error('[JEV] 安全访问失败:', e);
        return null;
    }
}
`;
    
    // 在全局配置后插入辅助函数
    data = data.replace(/window\.JEV\.CFG = window\.JEV\.CFG \|\| \{[^\}]*\};\s*/, 
        '$&' + helperFunctions);
    
    // 为UI元素使用添加安全检查
    uiElements.forEach(element => {
        const regex = new RegExp('(' + element + ')\.([a-zA-Z_$][\w$]*)(?![\w$]*\s*=\s*function|\s*=\s*\()', 'g');
        const replaced = data.replace(regex, 'safeAccess($1, e => e.$2)');
        if (replaced !== data) {
            console.log('  为 ' + element + ' 添加了安全访问检查');
            data = replaced;
        }
    });
    
    // 3. 修复空的catch块
    console.log('\n[3] 修复空的catch块');
    const emptyCatchRegex = /catch\s*\([^)]*\)\s*\{\s*\}/g;
    const catchFixed = data.replace(emptyCatchRegex, function(match) {
        const paramMatch = match.match(/catch\s*\(([^)]*)\)/);
        const param = paramMatch ? paramMatch[1] : 'error';
        return 'catch (' + param + ') {\n    console.error("[JEV] 捕获到错误:", ' + param + ');\n}';
    });
    if (catchFixed !== data) {
        console.log('  已修复空的catch块');
        data = catchFixed;
    }
    
    // 4. 为重要的数组访问添加安全检查
    console.log('\n[4] 添加数组安全访问检查');
    const arrayAccessRegex = /([a-zA-Z_$][\w$]*)\[(\d+)\]/g;
    const arrayFixed = data.replace(arrayAccessRegex, '($1 && $1.length > $2 ? $1[$2] : null)');
    if (arrayFixed !== data) {
        console.log('  已为数组索引访问添加安全检查');
        data = arrayFixed;
    }
    
    // 5. 添加配置同步提醒注释
    console.log('\n[5] 添加配置管理最佳实践注释');
    data = data.replace(/window\.JEV\.CFG\.(\w+)\s*=\s*([^;]+);/g, 
        'window.JEV.CFG.$1 = $2; // 配置变更，请确保同步到存储');
    
    // 6. 添加事件监听器移除提醒
    console.log('\n[6] 添加事件监听器管理提醒');
    data = data.replace(/addEventListener\s*\('([^']+)',\s*([^)]+)\)/g, 
        'addEventListener("$1", $2) // 注意：添加了事件监听器，请确保在适当的时候移除');
    
    // 保存修复后的文件
    fs.writeFile(path, data, 'utf8', (err) => {
        if (err) {
            console.error('写入文件失败:', err);
            return;
        }
        console.log('\n✓ 代码逻辑错误修复完成！');
        console.log('请运行语法检查以验证修复效果');
    });
});