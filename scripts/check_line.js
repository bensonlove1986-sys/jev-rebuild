const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  
  const lines = data.split('\n');
  const targetLine = 6001;
  const startLine = Math.max(1, targetLine - 20);
  const endLine = Math.min(lines.length, targetLine + 20);
  
  console.log(`第${startLine}到第${endLine}行的内容：`);
  for (let i = startLine - 1; i < endLine; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
  
  // 检查括号匹配
  console.log('\n检查括号匹配：');
  const codeSegment = lines.slice(startLine - 1, endLine).join('\n');
  let braces = 0;
  let parens = 0;
  let brackets = 0;
  
  for (let char of codeSegment) {
    switch(char) {
      case '{': braces++;

break;      case '}': braces--;
        break;
      case '(': parens++;
        break;
      case ')': parens--;
        break;
      case '[': brackets++;
        break;
      case ']': brackets--;
        break;
    }
  }
  
  console.log(`花括号: ${braces}, 括号: ${parens}, 方括号: ${brackets}`);
});