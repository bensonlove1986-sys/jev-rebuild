const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  
  const lines = data.split('\n');
  const startLine = Math.max(1, lines.length - 50);
  
  console.log(`文件末尾${startLine}到${lines.length}行的内容：`);
  for (let i = startLine - 1; i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
});