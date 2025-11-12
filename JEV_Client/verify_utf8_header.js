/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:18.117Z */
const http = require('http');

console.log('[JEV UTF-8] 开始验证HTTP响应头...');

http.get('http://localhost:8080', (res) => {
  const contentType = res.headers['content-type'];
  
  console.log('[JEV UTF-8] 响应头检测:');
  console.log(`  Content-Type: ${contentType}`);
  
  if (contentType && contentType.includes('charset=utf-8')) {
    console.log('[JEV UTF-8] Header: OK ✅');
  } else {
    console.log('[JEV UTF-8] Header: WARNING ⚠️  未找到charset=utf-8');
  }
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    // 检查页面是否包含UTF-8声明
    if (data.includes('charset="UTF-8"')) {
      console.log('[JEV UTF-8] Content: OK ✅');
    } else {
      console.log('[JEV UTF-8] Content: WARNING ⚠️  页面未包含UTF-8声明');
    }
    
    // 检查是否包含中文字符
    if (/[\u4e00-\u9fa5]/.test(data)) {
      console.log('[JEV UTF-8] Rendering: OK ✅');
    } else {
      console.log('[JEV UTF-8] Rendering: WARNING ⚠️  页面可能不包含中文字符');
    }
    
    console.log('\n[JEV UTF-8] 验证完成！');
  });
}).on('error', (err) => {
  console.error('[JEV UTF-8] 验证失败:', err.message);
});