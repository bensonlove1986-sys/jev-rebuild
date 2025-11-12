const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    const lines = data.split('\n');
    
    console.log(`当前文件行数: ${lines.length}`);
    
    // 显示第6254行附近的内容
    const targetLine = 6254;
    const contextStart = Math.max(0, targetLine - 5);
    const contextEnd = Math.min(lines.length, targetLine + 5);
    
    console.log(`\n第${targetLine}行附近的内容：`);
    for (let i = contextStart; i < contextEnd; i++) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
    
    // 删除第6254行的多余大括号
    if (targetLine <= lines.length && lines[targetLine - 1].trim() === '}') {
        lines.splice(targetLine - 1, 1);
        console.log(`已删除第${targetLine}行的多余大括号`);
    } else {
        console.log(`第${targetLine}行不是多余的大括号，检查其他可能的位置`);
        
        // 查找末尾可能的多余括号
        let lastNonEmptyLine = lines.length - 1;
        while (lastNonEmptyLine >= 0 && lines[lastNonEmptyLine].trim() === '') {
            lastNonEmptyLine--;
        }
        
        if (lastNonEmptyLine >= 0 && lines[lastNonEmptyLine].trim() === '}') {
            lines.pop();
            console.log(`已删除文件末尾的多余大括号`);
        }
    }
    
    // 保存修复后的文件
    const fixedData = lines.join('\n');
    fs.writeFile(path, fixedData, 'utf8', (err) => {
        if (err) {
            console.error('写入文件失败:', err);
            return;
        }
        console.log(`文件修复完成！新的文件行数: ${lines.length}`);
    });
});