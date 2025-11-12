const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  
  // 查找问题区域：JEV.sendMessage函数的结束和后面的代码
  const fixedContent = data.replace(
    /        }\n\n\n    \/\/ 兼容性函数 - 保留原有调用方式/g,
    '        }\n    }\n\n    // 兼容性函数 - 保留原有调用方式'
  );
  
  fs.writeFile(path, fixedContent, 'utf8', (err) => {
    if (err) {
      console.error('写入文件失败:', err);
      return;
    }
    console.log('模块结构已修复！');
  });
});