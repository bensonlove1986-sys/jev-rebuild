const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    const lines = data.split('\n');
    
    // 显示文件开头100行
    console.log('文件开头100行：');
    for (let i = 0; i < Math.min(100, lines.length); i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
    
    // 显示未闭合括号所在行的上下文
    const problematicLines = [686, 5294, 5936];
    
    console.log('\n未闭合括号所在行的上下文：');
    for (const lineNum of problematicLines) {
        if (lineNum <= lines.length) {
            const start = Math.max(0, lineNum - 5);
            const end = Math.min(lines.length, lineNum + 5);
            console.log(`\n第${lineNum}行附近：`);
            for (let i = start; i < end; i++) {
                console.log(`${i + 1}: ${lines[i]}`);
            }
        }
    }
});