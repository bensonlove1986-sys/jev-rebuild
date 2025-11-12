const fs = require('fs');
const path = require('path');

// 读取文件内容
const workerPath = path.join(__dirname, 'worker.js');
let content = fs.readFileSync(workerPath, 'utf8');

console.log('开始最终修复worker.js文件中的175个问题...');

// 1. 修复所有模板字符串中的错误格式 (处理 ${ 格式问题)
console.log('修复1: 处理模板字符串中的特殊字符...');
let templateFixCount = 0;

// 修复 ${variable} 格式问题（特别是带有额外反斜杠的情况）
content = content.replace(/\$\{([^}]*)\\\}/g, (match, p1) => {
  templateFixCount++;
  return `$\{${p1}\}`;
});

// 2. 修复HTML模板字符串问题
console.log('修复2: 修复HTML模板字符串结构...');

// 查找HTML模板字符串的开始位置
const htmlStartPattern = /'content': `<!DOCTYPE html>`/;
const htmlStartMatch = content.match(htmlStartPattern);

if (htmlStartMatch) {
  const startPos = htmlStartMatch.index;
  let inHtmlTemplate = false;
  let backtickCount = 0;
  let htmlEndPos = -1;
  
  // 查找HTML模板字符串的结束位置
  for (let i = startPos; i < content.length; i++) {
    if (content[i] === '`') {
      backtickCount++;
      if (backtickCount === 2) {
        htmlEndPos = i;
        break;
      }
    }
  }
  
  // 如果没有找到结束的反引号，创建一个修复方案
  if (htmlEndPos === -1) {
    console.log('警告: 未找到HTML模板字符串的结束标记，将进行修复...');
    
    // 查找下一个合适的位置来结束HTML模板字符串
    const nextPropertyPattern = /['"][^'"]*['"]\s*:\s*\{/g;
    nextPropertyPattern.lastIndex = startPos + 30; // 跳过开始部分
    const nextPropertyMatch = nextPropertyPattern.exec(content);
    
    if (nextPropertyMatch) {
      // 在属性前添加结束的反引号
      const beforeProperty = content.substring(0, nextPropertyMatch.index);
      const afterProperty = content.substring(nextPropertyMatch.index);
      content = beforeProperty + '`' + afterProperty;
    } else {
      // 如果找不到合适的位置，在文件适当位置添加
      console.log('警告: 无法确定HTML模板字符串的结束位置，将在文件末尾处理');
    }
  }
}

// 3. 修复CSS中的转义问题
console.log('修复3: 修复CSS中的转义大括号和分号...');
content = content.replace(/\}\}/g, '}');
content = content.replace(/\{\{/g, '{');
content = content.replace(/:\s*;/g, ': ;');
content = content.replace(/content:\s*';'/g, 'content: \';\';');

// 4. 修复HTML属性中的引号问题
console.log('修复4: 修复HTML属性中的引号问题...');
content = content.replace(/width=\"\"device\"\"-width/g, 'width=\"device-width\"');
content = content.replace(/initial-scale=\"1\".0/g, 'initial-scale=\"1.0\"');

// 5. 修复JavaScript对象中的逗号和括号问题
console.log('修复5: 修复对象定义和JSON格式问题...');
content = content.replace(/\},\s*\}/g, '}}');
content = content.replace(/\}\)\);/g, '}});');

// 6. 修复双重转义的问题
console.log('修复6: 清理双重转义字符...');
content = content.replace(/\\n/g, '\n');
content = content.replace(/\\t/g, '\t');

// 7. 特别处理第201行的问题
console.log('修复7: 处理第201行的特定问题...');
content = content.replace(/\.join\('\);'/g, ".join('')");

// 8. 修复HTML中的伪元素问题
console.log('修复8: 修复CSS伪元素语法...');
content = content.replace(/body: :before/g, 'body::before');
content = content.replace(/body: :after/g, 'body::after');
content = content.replace(/card-title: :before/g, 'card-title::before');
content = content.replace(/card: hover/g, 'card:hover');
content = content.replace(/btn-primary: hover/g, 'btn-primary:hover');
content = content.replace(/btn-primary: disabled/g, 'btn-primary:disabled');
content = content.replace(/task-table tr: hover/g, 'task-table tr:hover');
content = content.replace(/::-webkit-scrollbar-thumb: hover/g, '::-webkit-scrollbar-thumb:hover');
content = content.replace(/chat-message: focus/g, 'chat-message:focus');

// 9. 全局修复模板字符串中的变量引用
console.log('修复9: 全局修复模板字符串变量引用...');
const templateVarRegex = /\$\{([^}]*)\\\}/g;
let remainingVars = content.match(templateVarRegex);
while (remainingVars && remainingVars.length > 0) {
  content = content.replace(templateVarRegex, (match, p1) => `$\{${p1}\}`);
  remainingVars = content.match(templateVarRegex);
}

// 10. 确保所有函数调用和对象定义都有正确的括号
console.log('修复10: 修复函数调用和对象括号...');
content = content.replace(/\)\s*{/g, ') {');
content = content.replace(/\{\s*{/g, '{{');
content = content.replace(/}\s*}/g, '}}');

// 11. 修复特定的JSON格式问题
console.log('修复11: 修复特定JSON格式问题...');
content = content.replace(/get\(manifest\)/g, "get('manifest')");
content = content.replace(/\}\s*if/g, '}\n  if');

// 保存修复后的文件
fs.writeFileSync(workerPath, content, 'utf8');
console.log('修复完成！开始语法检查验证...');

// 运行语法检查
const { execSync } = require('child_process');
try {
  execSync('node -c worker.js', { cwd: __dirname, stdio: 'inherit' });
  console.log('✅ 语法检查通过！');
  console.log('建议: 重启您的IDE或编辑器以清除缓存，这样175个问题应该会消失。');
} catch (error) {
  console.error('❌ 语法检查失败，请检查修复结果。');
  console.error('错误信息:', error.message);
}