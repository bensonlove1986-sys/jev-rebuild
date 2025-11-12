const fs = require('fs');
const path = require('path');

// 读取文件内容
const filePath = path.join(__dirname, 'daojiem_capture_optimized.user.js');
const content = fs.readFileSync(filePath, 'utf8');

// 尝试使用Function构造函数来检查语法
function checkSyntax(code) {
  try {
    new Function(code);
    console.log('语法检查通过！');
    return true;
  } catch (e) {
    console.error('语法错误:', e.message);
    return false;
  }
}

// 分段检查，以定位具体的错误位置
function checkSyntaxInParts(code) {
  const lines = code.split('\n');
  const chunkSize = 1000;
  
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize).join('\n');
    console.log(`检查行 ${i + 1} 到 ${Math.min(i + chunkSize, lines.length)}...`);
    try {
      new Function(chunk);
    } catch (e) {
      console.error(`在第 ${i + 1} 行附近发现错误:`, e.message);
      // 尝试更精确地定位错误
      for (let j = 0; j < Math.min(chunkSize, lines.length - i); j += 100) {
        const smallChunk = lines.slice(i + j, i + j + 100).join('\n');
        try {
          new Function(smallChunk);
        } catch (e2) {
          console.error(`  在第 ${i + j + 1} 行附近发现错误:`, e2.message);
          break;
        }
      }
    }
  }
}

// 检查整个文件的语法
checkSyntax(content);

// 分段检查以定位具体错误
console.log('\n开始分段检查...');
checkSyntaxInParts(content);
