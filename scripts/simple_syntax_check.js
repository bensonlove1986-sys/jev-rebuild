const fs = require('fs');
const path = process.argv[2] || 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

console.log(`正在检查文件: ${path}`);

try {
    const content = fs.readFileSync(path, 'utf8');
    
    // 尝试编译代码（只检查语法，不执行）
    new Function(content);
    
    // 同时使用Node.js的检查机制
    const { execSync } = require('child_process');
    execSync(`node -c "${path}"`, { stdio: 'inherit' });
    
    console.log('✅ 语法检查通过！文件没有语法错误。');
} catch (error) {
    console.error('❌ 语法检查失败:', error.message);
    process.exit(1);
}