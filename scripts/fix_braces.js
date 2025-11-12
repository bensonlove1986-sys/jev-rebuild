const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

// 读取文件并修复花括号平衡问题
fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    console.log('开始修复花括号不平衡问题...');
    
    // 统计花括号数量
    const openBraces = (data.match(/\{/g) || []).length;
    const closeBraces = (data.match(/\}/g) || []).length;
    
    console.log(`当前花括号数量: 开${openBraces}, 关${closeBraces}`);
    
    // 如果开括号多于闭括号，添加一个闭括号
    let fixedData = data;
    if (openBraces > closeBraces) {
        console.log(`添加 ${openBraces - closeBraces} 个闭括号`);
        fixedData += '}';
    } else if (closeBraces > openBraces) {
        console.log(`闭括号多于开括号，这是更严重的问题，请手动检查`);
        return;
    } else {
        console.log('花括号已经平衡');
        return;
    }
    
    // 保存修复后的文件
    fs.writeFile(path, fixedData, 'utf8', (err) => {
        if (err) {
            console.error('写入文件失败:', err);
            return;
        }
        console.log('✓ 花括号平衡修复完成！');
        console.log('\n建议再次运行验证脚本确认修复效果');
    });
});