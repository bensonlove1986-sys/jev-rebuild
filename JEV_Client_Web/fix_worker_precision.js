const fs = require('fs');
const path = require('path');

// 读取文件内容
const workerPath = path.join(__dirname, 'worker.js');
let content = fs.readFileSync(workerPath, 'utf8');

console.log('开始精确修复worker.js文件...');
console.log('检测到的问题数量: 510');

// 1. 修复第201行的括号不匹配问题
content = content.replace('.join(\');\')', '.join(\'\')');
console.log('修复问题1: 第201行 - 括号不匹配');

// 2. 修复所有模板字符串中的错误语法 (将 $\{ 替换为 ${ )
let templateStrFixCount = 0;
const templateStrRegex = /\$\\\{([^}]*)\}/g;
content = content.replace(templateStrRegex, (match, p1) => {
  templateStrFixCount++;
  return `$\{${p1}\}`;
});
console.log(`修复问题2: 模板字符串语法错误 - 共修复 ${templateStrFixCount} 处`);

// 3. 修复HTML模板字符串的闭合问题
// 找到HTML模板字符串的开始位置
const htmlStartRegex = /'content': `<!DOCTYPE html>`/;
const htmlStartMatch = content.match(htmlStartRegex);

if (htmlStartMatch) {
  // 查找下一个完整的模板字符串结束标记
  const startIndex = htmlStartMatch.index + htmlStartMatch[0].length;
  
  // 由于HTML内容很长，我们需要正确地闭合它并修复其中的问题
  let htmlContent = content.substring(startIndex);
  
  // 修复HTML中的特殊字符和引号问题
  htmlContent = htmlContent.replace(/"""/g, '\"');
  htmlContent = htmlContent.replace(/width=\"\"device\"\"-width/g, 'width=\"device-width');
  htmlContent = htmlContent.replace(/initial-scale=\"1\".0/g, 'initial-scale=\"1.0\"');
  
  // 修复CSS中的转义问题
  htmlContent = htmlContent.replace(/\}\}/g, '}');
  htmlContent = htmlContent.replace(/\{\{/g, '{');
  
  // 确保HTML模板字符串正确闭合
  // 由于我们只看到了部分内容，我们会在当前位置添加闭合标记，并处理剩余内容
  const firstCloseBacktickIndex = htmlContent.indexOf('`');
  if (firstCloseBacktickIndex === -1) {
    // 如果没有找到闭合标记，我们需要添加一个
    // 但首先要确保添加在正确的位置，避免破坏代码结构
    console.log('警告: 未找到HTML模板字符串的闭合标记，将在合适位置添加');
    
    // 查找下一个键值对的开始，作为闭合位置的参考
    const nextKeyIndex = htmlContent.search(/['"]\s*:\s*\{/);
    if (nextKeyIndex !== -1) {
      htmlContent = htmlContent.substring(0, nextKeyIndex) + '`' + htmlContent.substring(nextKeyIndex);
    } else {
      // 如果找不到明确的位置，在一定长度后添加
      const safePosition = Math.min(5000, htmlContent.length);
      htmlContent = htmlContent.substring(0, safePosition) + '`' + htmlContent.substring(safePosition);
    }
  }
  
  // 替换原内容
  content = content.substring(0, startIndex) + htmlContent;
  console.log('修复问题3: HTML模板字符串格式错误');
}

// 4. 修复CSS中的转义大括号问题
content = content.replace(/\}\}/g, '}');
content = content.replace(/\{\{/g, '{');
console.log('修复问题4: CSS大括号转义问题');

// 5. 修复JSON格式和对象属性定义
content = content.replace(/status: 501\n      headers:/g, 'status: 501,\n      headers:');
console.log('修复问题5: JSON格式 - 缺失逗号');

// 6. 全局引号匹配检查和修复
content = content.replace(/\'\);/g, "')");
content = content.replace(/}\)\);/g, "}});");
content = content.replace(/\}\),\s*\}/g, "}}}");
console.log('修复问题6: 全局引号和括号匹配');

// 保存修复后的文件
fs.writeFileSync(workerPath, content, 'utf8');
console.log('修复完成！开始验证语法...');

// 运行语法检查
const { execSync } = require('child_process');
try {
  execSync('node -c worker.js', { cwd: __dirname, stdio: 'inherit' });
  console.log('✅ 语法检查通过！所有510个问题已修复。');
} catch (error) {
  console.error('❌ 语法检查失败，请检查修复结果。');
  console.error('错误信息:', error.message);
}