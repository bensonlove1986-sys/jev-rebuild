const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  
  const lines = data.split('\n');
  const startLine = 5950;
  const endLine = 6050;
  
  console.log(`第${startLine}到第${endLine}行的内容：`);
  for (let i = startLine - 1; i < endLine; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
});