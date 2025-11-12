/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.732Z */
const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, '..');

function checkEncoding(filePath) {
  try {
    const stats = fs.statSync(filePath);
    // 跳过过大的文件（超过10MB）
    if (stats.size > 10 * 1024 * 1024) {
      console.log("⏭️ 跳过过大文件:", filePath);
      return;
    }
    
    const buffer = fs.readFileSync(filePath);
    const text = buffer.toString("utf8");
    if (text.includes("") || /锟|鐚|鈧/.test(text)) {
      console.log("⚠️ 发现疑似乱码文件:", filePath);
    }
  } catch (e) {
    console.error("❌ 检查文件失败:", filePath, e.message);
  }
}

function scan(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const full = path.join(dir, file);
      try {
        const stats = fs.statSync(full);
        if (stats.isDirectory()) {
          // 只扫描ui目录和scripts目录
          if (path.basename(dir) === 'JEV_Client' && ['ui', 'scripts'].includes(file)) {
            scan(full);
          } else if (path.basename(dir) === 'ui' || path.basename(dir) === 'scripts') {
            // 允许ui和scripts目录下的所有子目录
            scan(full);
          }
        } else if (/(\.html|\.js|\.css|\.json)$/.test(file)) {
          checkEncoding(full);
        }
      } catch (e) {
        console.error("❌ 访问文件失败:", full, e.message);
      }
    }
  } catch (e) {
    console.error("❌ 访问目录失败:", dir, e.message);
  }
}

// 先只检查关键文件
console.log("🔍 检查关键HTML文件编码...");
const keyFiles = [
  path.join(base, 'ui', 'sentinel_dashboard.html'),
  path.join(base, 'ui', 'login_portal.html'),
  path.join(base, 'ui', 'client_portal.html')
];

keyFiles.forEach(file => {
  if (fs.existsSync(file)) {
    checkEncoding(file);
  }
});

console.log("✅ 关键文件编码检查完成");