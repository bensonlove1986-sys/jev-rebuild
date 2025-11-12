const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    // 修复策略：
    // 1. 在文件末尾添加必要的闭合括号
    // 2. 确保所有的括号都正确匹配
    
    let fixedData = data;
    
    // 检查并计算需要添加的闭合括号数量
    const openParens = (fixedData.match(/\(/g) || []).length;
    const closeParens = (fixedData.match(/\)/g) || []).length;
    const openBraces = (fixedData.match(/\{/g) || []).length;
    const closeBraces = (fixedData.match(/\}/g) || []).length;
    const openBrackets = (fixedData.match(/\[/g) || []).length;
    const closeBrackets = (fixedData.match(/\]/g) || []).length;
    
    console.log(`括号统计：`);
    console.log(`  小括号: (${openParens}) - )(${closeParens}) = ${openParens - closeParens}`);
    console.log(`  大括号: {${openBraces}} - }(${closeBraces}) = ${openBraces - closeBraces}`);
    console.log(`  中括号: [${openBrackets}] - ](${closeBrackets}) = ${openBrackets - closeBrackets}`);
    
    // 添加缺失的闭合括号
    // 首先闭合IIFE和内部的对象
    let missingBraces = openBraces - closeBraces;
    let missingParens = openParens - closeParens;
    
    if (missingBraces > 0 || missingParens > 0) {
        console.log(`添加 ${missingBraces} 个大括号和 ${missingParens} 个小括号`);
        
        // 先添加大括号，再添加小括号，模拟正确的嵌套结构
        let closingSequence = '';
        for (let i = 0; i < missingBraces; i++) {
            closingSequence += '}\n';
        }
        for (let i = 0; i < missingParens; i++) {
            closingSequence += ')\n';
        }
        
        // 添加到文件末尾
        fixedData += '\n' + closingSequence;
        console.log('已添加闭合括号');
    }
    
    // 尝试修复文件开头的语法错误
    // 检查是否以正确的IIFE开始
    if (!fixedData.trim().startsWith('(function()') && !fixedData.trim().startsWith('// ==UserScript==')) {
        console.log('检查并修复文件开头结构');
        // 确保文件开头有正确的结构
        if (fixedData.trim().startsWith('window.JEV')) {
            // 如果直接以window.JEV开头，可能需要包裹在IIFE中
            const iifeStart = '(function() {\n';
            const iifeEnd = '\n})();\n';
            fixedData = iifeStart + fixedData + iifeEnd;
        }
    }
    
    // 保存修复后的文件
    fs.writeFile(path, fixedData, 'utf8', (err) => {
        if (err) {
            console.error('写入文件失败:', err);
            return;
        }
        console.log('文件修复完成！已添加缺失的闭合括号');
    });
});