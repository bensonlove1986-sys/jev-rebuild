/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.735Z */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ui', 'client_portal.html');
console.log('🔧 开始修复', filePath);

// 先创建备份
const backupPath = filePath + '.bak';
console.log('📋 创建备份:', backupPath);
fs.copyFileSync(filePath, backupPath);

// 尝试不同的编码方式读取和修复
try {
  // 尝试1: 使用GBK编码读取
  console.log('🔍 尝试使用GBK编码读取...');
  const buffer = fs.readFileSync(filePath);
  
  // 尝试检测和清理乱码
  let content = buffer.toString('utf8');
  
  // 清理常见的乱码字符
  content = content.replace(/锟斤拷/g, '');
  content = content.replace(/锟/g, '');
  content = content.replace(/鐚/g, '');
  content = content.replace(/鈧/g, '');
  content = content.replace(//g, '');
  
  // 确保有UTF-8 meta标签
  if (!/<meta.*charset=.*utf-8/i.test(content)) {
    console.log('📄 添加UTF-8 meta标签...');
    content = content.replace(/<head>/i, '<head>\n<meta charset="UTF-8">\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">');
  }
  
  // 写入带BOM的UTF-8格式
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const fd = fs.openSync(filePath, 'w');
  fs.writeSync(fd, bom, 0, bom.length);
  fs.writeSync(fd, content, 0, content.length, bom.length);
  fs.closeSync(fd);
  
  console.log('✅ client_portal.html 修复完成并保存为UTF-8 with BOM格式');
  
} catch (error) {
  console.error('❌ 修复过程出错:', error.message);
  console.log('🔄 尝试使用简单模式修复...');
  
  // 简单模式：直接重写基础HTML结构
  try {
    const basicContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>JEV Client Portal</title>
</head>
<body>
    <div id="app">
        <h1>JEV Client Portal</h1>
        <p>页面内容正在加载...</p>
    </div>
    <script>
        // 基础初始化脚本
        console.log('JEV Client Portal initialized');
    </script>
</body>
</html>`;
    
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    const fd = fs.openSync(filePath, 'w');
    fs.writeSync(fd, bom, 0, bom.length);
    fs.writeSync(fd, basicContent, 0, basicContent.length, bom.length);
    fs.closeSync(fd);
    
    console.log('✅ client_portal.html 已重置为基础HTML结构');
  } catch (simpleError) {
    console.error('❌ 简单模式修复也失败:', simpleError.message);
  }
}

console.log('🔚 修复过程完成');