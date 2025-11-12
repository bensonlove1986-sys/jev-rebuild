/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.778Z */
const fs = require("fs");
const path = require("path");

console.log('🔍 开始为关键HTML文件添加UTF-8声明...');

// 只处理关键HTML文件
const keyHtmlFiles = [
  path.join(__dirname, '../ui', 'sentinel_dashboard.html'),
  path.join(__dirname, '../ui', 'login_portal.html'),
  path.join(__dirname, '../ui', 'client_portal.html')
];

keyHtmlFiles.forEach(filePath => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log('❌ 文件不存在:', filePath);
      return;
    }
    
    const stats = fs.statSync(filePath);
    // 跳过过大的文件（超过5MB）
    if (stats.size > 5 * 1024 * 1024) {
      console.log('⏭️ 跳过过大文件:', filePath);
      return;
    }
    
    let html = fs.readFileSync(filePath, "utf8");
    
    // 添加或更新meta标签
    if (!/<meta.*charset=.*utf-8/i.test(html)) {
      if (/<head>/i.test(html)) {
        html = html.replace(/<head>/i, '<head>\n<meta charset="UTF-8">\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">');
        fs.writeFileSync(filePath, html, "utf8");
        console.log('✅ 成功插入meta charset标签:', path.basename(filePath));
      } else {
        // 如果没有head标签，在html标签后添加
        html = html.replace(/<html[^>]*>/i, '$&\n<head>\n<meta charset="UTF-8">\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n</head>');
        fs.writeFileSync(filePath, html, "utf8");
        console.log('✅ 成功添加head和meta标签:', path.basename(filePath));
      }
    } else {
      console.log('✅ 已存在UTF-8声明:', path.basename(filePath));
    }
  } catch (error) {
    console.error('❌ 处理文件失败:', filePath, error.message);
  }
});

console.log('✅ 关键HTML文件UTF-8声明处理完成');