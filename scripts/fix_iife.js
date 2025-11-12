const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  
  // 移除第6247行的多余IIFE结束部分
  const fixedContent = data.replace('})();', '');
  
  fs.writeFile(path, fixedContent, 'utf8', (err) => {
    if (err) {
      console.error('写入文件失败:', err);
      return;
    }
    console.log('IIFE错误已修复！');
  });
});