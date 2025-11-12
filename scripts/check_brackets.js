const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    // 检查括号匹配
    const brackets = {
        '(': [],
        '{': [],
        '[': []
    };
    
    const closingBrackets = {
        ')': '(',
        '}': '{',
        ']': '['
    };
    
    let lineNum = 1;
    let errorFound = false;
    
    for (let i = 0; i < data.length; i++) {
        const char = data[i];
        
        if (char === '\n') {
            lineNum++;
        }
        
        if (brackets[char]) {
            brackets[char].push(lineNum);
        } else if (closingBrackets[char]) {
            const openingBracket = closingBrackets[char];
            if (brackets[openingBracket].length === 0) {
                console.error(`第${lineNum}行: 发现多余的闭合括号 '${char}'`);
                errorFound = true;
            } else {
                brackets[openingBracket].pop();
            }
        }
    }
    
    // 检查未闭合的括号
    for (const [bracket, lines] of Object.entries(brackets)) {
        if (lines.length > 0) {
            console.error(`未闭合的括号 '${bracket}' 在以下行:`, lines);
            errorFound = true;
        }
    }
    
    if (!errorFound) {
        console.log('括号匹配检查通过');
    }
    
    // 尝试分段解析文件，找出具体的错误位置
    console.log('\n开始分段语法检查...');
    const chunkSize = 1000;
    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(0, i + chunkSize);
        try {
            new Function(chunk);
        } catch (e) {
            console.log(`在位置 ${i} 附近发现语法错误:`, e.message);
            // 显示错误附近的代码
            const errorLines = chunk.split('\n');
            const errorLineNum = errorLines.length;
            const contextStart = Math.max(0, errorLineNum - 10);
            console.log(`\n错误行附近内容:`);
            for (let j = contextStart; j < errorLineNum; j++) {
                console.log(`${j + 1}: ${errorLines[j]}`);
            }
            break;
        }
    }
});