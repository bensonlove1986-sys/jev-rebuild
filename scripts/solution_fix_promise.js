// 修复脚本 - 用于修复daojiem_capture_optimized.user.js中的Promise.race拼写错误

/**
 * 此脚本提供了修复daojiem_capture_optimized.user.js中第808行的解决方案
 * 问题：Promise.race调用中的变量名拼写错误（timeoutPromised应改为timeoutPromise）
 */

// 修复方法1：使用PowerShell命令直接修复（推荐）
console.log('=== 修复方法1：PowerShell命令 ===');
console.log(`
# 打开PowerShell并运行以下命令来修复文件：
$filePath = "d:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js"
$content = Get-Content -Path $filePath -Raw
$fixedContent = $content -replace 'timeoutPromised', 'timeoutPromise'
Set-Content -Path $filePath -Value $fixedContent -Encoding UTF8
Write-Host "修复完成！已将所有'timeoutPromised'替换为'timeoutPromise'"
`);

// 修复方法2：手动编辑文件
console.log('\n=== 修复方法2：手动编辑 ===');
console.log('1. 打开文件 d:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js');
console.log('2. 找到第808行：const response = await Promise.race([fetchPromise, timeoutPromised]);');
console.log('3. 将 timeoutPromised 改为 timeoutPromise');
console.log('4. 保存文件');

// 修复方法3：直接使用正确的代码替换
console.log('\n=== 修复方法3：直接替换代码段 ===');
console.log('以下是包含正确变量名的代码段：');
console.log(`
// 使用Promise.race添加超时控制
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('请求超时')), 10000);
});

const fetchPromise = fetch(fixedUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // 添加webhook密钥
    'X-Webhook-Secret': window.JEV.STATE.webhookSecret || window.JEV.CFG.webhookSecret
  },
  body: JSON.stringify(data)
});

const response = await Promise.race([fetchPromise, timeoutPromise]);
`);

console.log('\n重要提示：');
console.log('1. 修复后请重新加载Tampermonkey脚本');
console.log('2. 清除浏览器缓存后再测试');
console.log('3. 如果问题仍然存在，请检查是否有多个脚本版本或浏览器扩展冲突');