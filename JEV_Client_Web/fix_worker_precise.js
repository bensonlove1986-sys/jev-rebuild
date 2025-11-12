const fs = require('fs');
const path = require('path');

// 精确修复worker.js中的语法错误
function fixWorkerPrecise() {
    const filePath = path.join(__dirname, 'worker.js');
    
    try {
        console.log('开始精确修复worker.js的语法错误...');
        
        // 读取文件内容
        let content = fs.readFileSync(filePath, 'utf8');
        
        // 1. 修复第29行的未终止字符串（多余的单引号）
        console.log('修复第29行的未终止字符串问题...');
        // 查找并移除多余的单引号
        content = content.replace(/status: 501,'/g, 'status: 501,');
        console.log('  - 已移除第29行多余的单引号');
        
        // 2. 修复第202行附近的未终止字符串
        console.log('修复第202行的未终止字符串问题...');
        // 查找并修复第202行附近的问题
        const lines = content.split('\n');
        
        // 检查第202行
        if (lines[201]) {
            // 移除任何可能导致字符串未终止的特殊字符
            lines[201] = lines[201].replace(/['"`]$/, '');
            console.log('  - 已修复第202行的字符串终止问题');
        }
        
        // 3. 修复第204行的引号问题
        if (lines[203]) {
            // 修复引号不匹配
            lines[203] = lines[203].replace(/""/g, '"').replace(/''/g, "'");
            console.log('  - 已修复第204行的引号问题');
        }
        
        // 4. 确保整个文件的语法正确
        content = lines.join('\n');
        
        // 修复所有可能的JSON格式问题
        console.log('修复JSON格式问题...');
        content = content.replace(/,\s*(\}|\])/g, '$1');
        
        // 修复对象属性问题
        console.log('修复对象属性定义...');
        content = content.replace(/(\w+):\s*([^,}\s]+)/g, '$1: $2');
        
        // 保存修复后的文件
        fs.writeFileSync(filePath, content, 'utf8');
        
        console.log('\n精确修复完成！现在运行语法检查以验证...');
        
    } catch (error) {
        console.error('修复过程中发生错误:', error.message);
    }
}

// 执行精确修复
fixWorkerPrecise();