// 测试脚本：模拟修复 media_path 格式错误

// 统一修复函数
function fixMediaPath(media_path) {
  if (!media_path) return undefined;
  
  // 情况 1：已经是正确的纯路径
  if (media_path.startsWith('/api/media/')) {
    // 检查路径中是否仍然包含 http
    if (media_path.includes('http')) {
      // 如果包含 http，说明路径仍然被污染，需要进一步处理
      // 移除路径中的所有 http 前缀，包括后面的斜杠
      const cleanPath = media_path.replace(/https?:\/\/[^\/]+\//g, '');
      // 移除可能出现的连续斜杠
      return cleanPath.replace(/\/+/g, '/');
    }
    return media_path;
  }
  
  // 情况 2：错误地包含完整 URL
  if (media_path.includes('http')) {
    const idx = media_path.indexOf('/api/media/');
    if (idx !== -1) {
      let cleaned = media_path.slice(idx);
      // 移除路径中的所有 http 前缀，包括后面的斜杠
      cleaned = cleaned.replace(/https?:\/\/[^\/]+\//g, '');
      // 移除可能出现的连续斜杠
      return cleaned.replace(/\/+/g, '/');
    }
    // 完全非法，直接丢弃
    return undefined;
  }
  
  // 情况 3：其他未知格式，一律丢弃
  return undefined;
}

// 测试用例
const testCases = [
  // 测试错误格式的 URL
  'https://jev-rebuild-worker.bensonlove1986.workers.dev/api/media/r2/whatsapp/MMhttps://jev-rebuild-worker.bensonlove1986.workers.dev/api/media/r2/whats…f82d791…/ME168caff…',
  // 测试正确格式的路径
  '/api/media/r2/whatsapp/MM123/ME456',
  // 测试其他错误格式
  'http://example.com/api/media/r2/whatsapp/MM123/ME456',
  'invalid-media-path'
];

// 执行测试
console.log('Testing fixMediaPath function...');
console.log('====================================');

testCases.forEach((testCase, index) => {
  console.log(`Test case ${index + 1}:`);
  console.log(`Input: ${testCase}`);
  const result = fixMediaPath(testCase);
  console.log(`Output: ${result}`);
  console.log('------------------------------------');
});

console.log('Test completed!');
