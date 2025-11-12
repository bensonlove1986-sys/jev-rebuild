const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

fs.readFile(path, 'utf8', (err, data) => {
  if (err) {
    console.error('读取文件失败:', err);
    return;
  }
  
  // 查找并替换问题区域
  // 问题区域在第6013-6014行的多余闭合花括号
  const fixedContent = data.replace(/                \}\n            \} else \{\n                \/\/ 人工模式下的提示\n                this.addMessage\('ai', '您已切换到人工模式，请等待人工客服回复。'\);\n            \}\n        \};\n    \}/, 
                '}\n            } else {\n                // 人工模式下的提示\n                this.addMessage('ai', '您已切换到人工模式，请等待人工客服回复。');\n            }\n        }');
  
  // 保存修复后的文件
  fs.writeFile(path, fixedContent, 'utf8', (err) => {
    if (err) {
      console.error('写入文件失败:', err);
      return;
    }
    console.log('语法错误已精确修复！');
  });
});