/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.286Z */
const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join('D:\\PDF转网页\\JEV_Client\\server.js');

function manuallyFixServerFile() {
  try {
    console.log('开始手动修复 server.js 文件第34行...');
    
    // 读取文件内容
    const bakFile = SERVER_FILE + '.bak.advanced';
    const content = fs.readFileSync(bakFile, 'utf8');
    
    // 按行分割
    const lines = content.split('\n');
    
    // 修复第34行（索引33）的问题
    if (lines.length > 33) {
      console.log('原始第34行:', lines[33]);
      // 直接替换为正确的中文消息
      lines[33] = '        res.end("文件加载错误");';
      console.log('修复后第34行:', lines[33]);
    }
    
    // 合并行
    const fixedContent = lines.join('\n');
    
    // 保存修复后的内容
    fs.writeFileSync(SERVER_FILE, fixedContent, 'utf8');
    console.log('✅ server.js 文件手动修复完成！');
    
    return true;
  } catch (error) {
    console.error('❌ 手动修复失败:', error.message);
    return false;
  }
}

manuallyFixServerFile();