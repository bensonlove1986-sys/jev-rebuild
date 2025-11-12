const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    const lines = data.split('\n');
    const lastLines = lines.slice(-100); // 获取最后100行
    
    console.log(`文件最后100行（总行数: ${lines.length}）：`);
    console.log(lastLines.join('\n'));
    
    // 同时显示第6251行附近的内容
    const targetLine = 6250;
    const contextStart = Math.max(0, targetLine - 10);
    const contextEnd = Math.min(lines.length, targetLine + 10);
    
    console.log(`\n第${targetLine}行附近的内容：`);
    for (let i = contextStart; i < contextEnd; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
});