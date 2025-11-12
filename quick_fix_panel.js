// 快速修复关键文件编码
const fs = require('fs');

console.log('开始修复关键文件编码...');

// 要修复的文件
const files = [
    {path: 'd:\\PDF转网页\\JEV_Client\\ui\\panel.js', backup: 'd:\\PDF转网页\\JEV_Client\\backup\\encoding\\ui\\panel.js'},
    {path: 'd:\\PDF转网页\\JEV_Client\\ui\\panel.html', backup: 'd:\\PDF转网页\\JEV_Client\\backup\\encoding\\ui\\panel.html'}
];

// 快速修复函数
function quickFix(file) {
    try {
        console.log(`处理: ${file.path}`);
        
        // 尝试从备份恢复
        if (fs.existsSync(file.backup)) {
            console.log(`从备份恢复: ${file.backup}`);
            const content = fs.readFileSync(file.backup, 'utf8');
            fs.writeFileSync(file.path, content, {encoding: 'utf8'});
            console.log('恢复成功');
            return true;
        }
        
        // 如果没有备份，尝试直接读取并修复
        if (fs.existsSync(file.path)) {
            console.log('直接修复文件');
            const buffer = fs.readFileSync(file.path);
            let content = buffer.toString('utf8');
            
            // 移除BOM
            if (content.charCodeAt(0) === 0xFEFF) {
                content = content.slice(1);
                console.log('移除了BOM');
            }
            
            // 保存为UTF-8无BOM
            fs.writeFileSync(file.path, content, {encoding: 'utf8'});
            console.log('修复完成');
            return true;
        }
        
        console.log('文件不存在');
        return false;
    } catch (e) {
        console.error(`错误: ${e.message}`);
        return false;
    }
}

// 执行修复
let success = 0;
for (const file of files) {
    if (quickFix(file)) success++;
}

console.log(`\n修复完成: ${success}/${files.length} 个文件`);
console.log('请清除浏览器缓存后重试');