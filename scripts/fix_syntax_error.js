const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  
  const lines = data.split('\n');
  
  // 删除第6013行的 '};' 和第6014行的 '}'
  // 保留第6013行，但修改内容
  lines[6012] = ''; // 原第6013行
  lines[6013] = ''; // 原第6014行
  
  const fixedContent = lines.join('\n');
  
  // 保存修复后的文件
  fs.writeFile(path, fixedContent, 'utf8', (err) => {
    if (err) {
      console.error('写入文件失败:', err);
      return;
    }
    console.log('语法错误已修复！');
  });
});