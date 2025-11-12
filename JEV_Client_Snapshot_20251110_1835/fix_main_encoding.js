/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.260Z */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const MAIN_FILE = path.join('D:\\PDF转网页\\JEV_Client\\main.js');
const INVITE_FILE = path.join('D:\\PDF转网页\\JEV_Client\\modules\\inviteCodeManager.js');

function fixFile(filePath) {
  try {
    console.log(`开始修复文件: ${filePath}`);
    
    const buf = fs.readFileSync(filePath);
    
    // 创建备份
    const bak = filePath + '.encoding.bak';
    if (!fs.existsSync(bak)) {
      fs.writeFileSync(bak, buf, 'binary');
      console.log(`已创建备份: ${path.basename(bak)}`);
    }
    
    // 尝试用GBK解码
    const gbkText = iconv.decode(buf, 'gbk');
    
    // 保存为UTF-8
    fs.writeFileSync(filePath, gbkText, 'utf8');
    console.log(`✅ 文件修复完成: ${path.basename(filePath)}`);
    
    return true;
  } catch (error) {
    console.error(`❌ 修复失败: ${error.message}`);
    return false;
  }
}

function verifySyntax(filePath) {
  try {
    console.log(`验证文件语法: ${path.basename(filePath)}`);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 简单语法检查
    new Function(`"use strict"; ${content}`);
    console.log(`✅ 语法检查通过: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ 语法检查失败: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('开始修复JEV Client关键文件编码...');
  
  // 修复main.js
  const mainFixed = fixFile(MAIN_FILE);
  if (mainFixed) {
    verifySyntax(MAIN_FILE);
  }
  
  // 修复inviteCodeManager.js
  const inviteFixed = fixFile(INVITE_FILE);
  if (inviteFixed) {
    verifySyntax(INVITE_FILE);
  }
  
  console.log('\n修复完成！请重新运行脚本路径检测工具验证结果。');
}

main();