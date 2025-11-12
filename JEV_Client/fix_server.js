/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.282Z */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const SERVER_FILE = path.join('D:\\PDF转网页\\JEV_Client\\server.js');

function fixServerFile() {
  try {
    console.log('开始修复 server.js 文件...');
    
    const buf = fs.readFileSync(SERVER_FILE);
    
    // 尝试用GBK解码
    const gbkText = iconv.decode(buf, 'gbk');
    
    // 创建备份
    const bak = SERVER_FILE + '.bak';
    if (!fs.existsSync(bak)) {
      fs.writeFileSync(bak, buf.toString('utf8'), 'utf8');
      console.log('已创建备份: server.js.bak');
    }
    
    // 保存为UTF-8
    fs.writeFileSync(SERVER_FILE, gbkText, 'utf8');
    console.log('✅ server.js 文件修复完成！');
    
    return true;
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    return false;
  }
}

fixServerFile();