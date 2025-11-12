const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  
  const lines = data.split('\n');
  const endLine = 50;
  
  console.log(`文件开头1到${endLine}行的内容：`);
  for (let i = 0; i < endLine && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
});