const fs = require('fs');
const path = require('path');

// 读取文件内容
const workerPath = path.join(__dirname, 'worker.js');
let content = fs.readFileSync(workerPath, 'utf8');

console.log('开始修复和重构JEV Client Web Worker文件...');

// 1. 修复语法错误：引号、括号、反引号、分号
console.log('修复1: 修复所有语法错误...');

// 修复第201行未终止的字符串
content = content.replace(/\.join\('\);'/g, ".join('')");

// 修复引号不匹配的问题
content = content.replace(/""/g, '"');
content = content.replace(/''/g, "'");
content = content.replace(/'content': `<!DOCTYPE html>`/g, "'content': `<!DOCTYPE html>`");

// 修复括号匹配问题
content = content.replace(/\),\s*\)/g, ')');
content = content.replace(/\{,\s*\}/g, '{}');

// 修复分号和逗号问题
content = content.replace(/;}/g, '}');
content = content.replace(/,}/g, '}');
content = content.replace(/;\)/g, ')');

// 2. 修复CSS与HTML标签结构
console.log('修复2: 修复CSS与HTML标签结构...');

// 修复伪元素语法 :before → ::before
content = content.replace(/body:\s*:before/g, 'body::before');
content = content.replace(/body:\s*:after/g, 'body::after');
content = content.replace(/card-title:\s*:before/g, 'card-title::before');
content = content.replace(/card:\s*hover/g, 'card:hover');
content = content.replace(/btn-primary:\s*hover/g, 'btn-primary:hover');
content = content.replace(/btn-primary:\s*disabled/g, 'btn-primary:disabled');
content = content.replace(/task-table\s+tr:\s*hover/g, 'task-table tr:hover');
content = content.replace(/::-webkit-scrollbar-thumb:\s*hover/g, '::-webkit-scrollbar-thumb:hover');
content = content.replace(/chat-message:\s*focus/g, 'chat-message:focus');
content = content.replace(/upload-area:\s*hover/g, 'upload-area:hover');

// 修复CSS中的错误分号和内容定义
content = content.replace(/content:\s*';'/g, "content: ';'");
content = content.replace(/content:\s*"\;"/g, 'content: ";"');
content = content.replace(/content:\s*;\s*'/g, "content: '");
content = content.replace(/content:\s*;\s*"/g, 'content: "');

// 修复HTML结构问题
content = content.replace(/<\/head>\s*<meta/g, '<meta');
content = content.replace(/<\/head>\s*<style/g, '<style');

// 3. 修复模板字符串中的转义错误
console.log('修复3: 修复模板字符串中的转义错误...');

// 修复 ${...} 转义问题
content = content.replace(/\$\{([^}]*)\\\}/g, (match, p1) => {
  return `$\{${p1}\}`;
});

// 全局处理模板字符串中的大括号
const templateVarRegex = /\$\{([^}]*)\\\}/g;
let remainingVars = content.match(templateVarRegex);
while (remainingVars && remainingVars.length > 0) {
  content = content.replace(templateVarRegex, (match, p1) => `$\{${p1}\}`);
  remainingVars = content.match(templateVarRegex);
}

// 4. 删除Node.js不支持的函数
console.log('修复4: 移除Node.js不支持的函数...');

// 移除process.uptime()
content = content.replace(/process\.uptime\(\)/g, 'Date.now()');

// 5. 修复HTML属性中的引号问题
console.log('修复5: 修复HTML属性中的引号问题...');

// 修复meta标签中的引号
content = content.replace(/width=\"\"device\"\"-width/g, 'width=\"device-width\"');
content = content.replace(/initial-scale=\"1\".0/g, 'initial-scale=\"1.0\"');
content = content.replace(/width=\"\"device\"\"-width/g, 'width=\"device-width\"');
content = content.replace(/initial-scale=\"1\".0/g, 'initial-scale=\"1.0\"');

// 6. 修复getResponseHeaders函数中的格式问题
console.log('修复6: 修复函数定义格式...');

// 确保generateAuthSignature函数的正确性
const authSigPattern = /function generateAuthSignature\(\) \{[\s\S]*?return `/;
const authSigMatch = content.match(authSigPattern);
if (authSigMatch) {
  const fixedAuthSig = "function generateAuthSignature() {\n  const timestamp = Date.now().toString();\n  const nonce = crypto.randomUUID();\n  const dataToSign = `\${timestamp}:\${nonce}`;\n  \n  // 在生产环境中，应该使用密钥进行HMAC签名\n  // 这里使用简化实现\n  const signature = Array.from(new TextEncoder().encode(dataToSign))\n    .map(char => char.toString(16).padStart(2, '0'))\n    .join('');\n    \n  return `sig_\${timestamp}_\${nonce}_\${signature.substring(0, 16)}`;\n}";
  
  content = content.replace(authSigPattern[0], fixedAuthSig);
}

// 7. 修复handleModulesManifest中的插件状态获取
console.log('修复7: 修复模块清单函数...');

content = content.replace(/const pluginManifestResult = await kvOperation\(env\.JEV_PLUGIN_STATE, 'manifest', 'get'\)/g, 
  'const pluginManifestResult = await kvOperation(env.JEV_PLUGIN_STATE, \'manifest\', \'get\')');

// 8. 确保HTML模板字符串的正确闭合
console.log('修复8: 确保HTML模板字符串正确闭合...');

// 查找HTML模板字符串
const htmlContentPattern = /'content': `<!DOCTYPE html>[\s\S]*?`<\s*\},/;
const htmlContentMatch = content.match(htmlContentPattern);

if (htmlContentMatch && !htmlContentMatch[0].includes('`}')) {
  console.log('警告: HTML模板字符串可能没有正确闭合，尝试修复...');
  const htmlStart = content.indexOf('<!DOCTYPE html>');
  if (htmlStart > 0) {
    // 确保有正确的结束标记
    const nextObjectStart = content.indexOf(',\n\s*\'', htmlStart);
    if (nextObjectStart > 0) {
      const beforeNextObject = content.substring(0, nextObjectStart);
      const afterNextObject = content.substring(nextObjectStart);
      if (!beforeNextObject.includes('`')) {
        content = beforeNextObject + '`' + afterNextObject;
      }
    }
  }
}

// 9. 创建/login_portal.html端点
console.log('修复9: 创建login_portal.html端点...');

if (!content.includes('/ui/login_portal.html')) {
  const staticFilesPattern = /const STATIC_FILES = \{[\s\S]*?\};/;
  const staticFilesMatch = content.match(staticFilesPattern);
  
  if (staticFilesMatch) {
    const loginPortalHtml = "  '/ui/login_portal.html': {\n    type: 'text/html',\n    content: `<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>JEV 登录门户</title>\n  <style>\n    body {\n      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;\n      background: linear-gradient(135deg, #f5f7fa 0%, #e8f5e9 100%);\n      margin: 0;\n      padding: 20px;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      min-height: 100vh;\n    }\n    .login-container {\n      background: white;\n      border-radius: 12px;\n      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);\n      padding: 40px;\n      width: 100%;\n      max-width: 400px;\n    }\n    .login-title {\n      text-align: center;\n      color: #333;\n      margin-bottom: 30px;\n      font-size: 24px;\n    }\n    .form-group {\n      margin-bottom: 20px;\n    }\n    .form-group label {\n      display: block;\n      margin-bottom: 8px;\n      color: #666;\n      font-weight: 500;\n    }\n    .form-group input {\n      width: 100%;\n      padding: 12px;\n      border: 1px solid #e0e0e0;\n      border-radius: 8px;\n      font-size: 16px;\n      transition: border-color 0.3s;\n    }\n    .form-group input:focus {\n      outline: none;\n      border-color: #4CAF50;\n    }\n    .btn-login {\n      width: 100%;\n      padding: 12px;\n      background: #4CAF50;\n      color: white;\n      border: none;\n      border-radius: 8px;\n      font-size: 16px;\n      font-weight: 600;\n      cursor: pointer;\n      transition: background 0.3s;\n    }\n    .btn-login:hover {\n      background: #388E3C;\n    }\n    .status-message {\n      text-align: center;\n      margin-top: 20px;\n      padding: 10px;\n      border-radius: 4px;\n    }\n    .status-message.success {\n      background: #e8f5e9;\n      color: #388E3C;\n    }\n    .status-message.error {\n      background: #ffebee;\n      color: #d32f2f;\n    }\n  </style>\n</head>\n<body>\n  <div class=\"login-container\">\n    <h1 class=\"login-title\">JEV 登录门户</h1>\n    <form id=\"login-form\">\n      <div class=\"form-group\">\n        <label for=\"username\">用户名</label>\n        <input type=\"text\" id=\"username\" required>\n      </div>\n      <div class=\"form-group\">\n        <label for=\"password\">密码</label>\n        <input type=\"password\" id=\"password\" required>\n      </div>\n      <button type=\"submit\" class=\"btn-login\">登录</button>\n    </form>\n    <div id=\"status-message\" class=\"status-message\"></div>\n  </div>\n  <script>\n    document.getElementById('login-form').addEventListener('submit', async (e) => {\n      e.preventDefault();\n      const username = document.getElementById('username').value;\n      const password = document.getElementById('password').value;\n      const statusMsg = document.getElementById('status-message');\n      \n      statusMsg.textContent = '登录中...';\n      statusMsg.className = 'status-message info';\n      \n      try {\n        // 这里应该是实际的登录API调用\n        // 模拟登录成功\n        statusMsg.textContent = '登录成功！正在跳转...';\n        statusMsg.className = 'status-message success';\n        \n        // 模拟跳转延迟\n        setTimeout(() => {\n          window.location.href = '/ui/client_portal.html';\n        }, 1500);\n      } catch (error) {\n        statusMsg.textContent = '登录失败：' + error.message;\n        statusMsg.className = 'status-message error';\n      }\n    });\n  </script>\n</body>\n</html>`\n  },";
    
    const staticFilesContent = staticFilesMatch[0];
    const updatedStaticFiles = staticFilesContent.replace('};', `  ${loginPortalHtml}\n};`);
    content = content.replace(staticFilesContent, updatedStaticFiles);
  }
}

// 10. 全局清理和格式修复
console.log('修复10: 全局清理和格式修复...');

// 修复CSS中的大括号和分号
content = content.replace(/\}\}/g, '}');
content = content.replace(/\{\{/g, '{');
content = content.replace(/:\s*;/g, ': ;');
content = content.replace(/content:\s*;\s*'/g, "content: '");
content = content.replace(/content:\s*;\s*"/g, 'content: "');

// 清理双重转义字符
content = content.replace(/\\n/g, '\n');
content = content.replace(/\\t/g, '\t');
content = content.replace(/\\'/g, "'");
content = content.replace(/\\"/g, '"');

// 修复函数调用和对象括号
content = content.replace(/\)\s*{/g, ') {');
content = content.replace(/\{\s*{/g, '{{');
content = content.replace(/}\s*}/g, '}}');

// 保存修复后的文件
fs.writeFileSync(workerPath, content, 'utf8');
console.log('修复和重构完成！开始语法检查验证...');

// 运行语法检查
const { execSync } = require('child_process');
try {
  execSync('node -c worker.js', { cwd: __dirname, stdio: 'inherit' });
  console.log('✅ 语法检查通过！');
  console.log('文件已成功修复并重构，可以在Cloudflare Worker控制台部署。');
} catch (error) {
  console.error('❌ 语法检查失败，请检查修复结果。');
  console.error('错误信息:', error.message);
}