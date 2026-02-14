// Test script to verify the fixMediaPath function

// Simulate the fixMediaPath function from index.js
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

// Test cases based on the user's screenshot
const testCases = [
  // Malformed URLs from the screenshot
  {
    input: "https://f33ec1e2.jev-ui.pages.dev/api/media/r2/whatsapp/ME5558d652dd4361f08231347b26c7a576/SM61f4f7e4c2a4929d0b8572331110a90b",
    expected: "/api/media/r2/whatsapp/ME5558d652dd4361f08231347b26c7a576/SM61f4f7e4c2a4929d0b8572331110a90b"
  },
  {
    input: "https://f33ec1e2.jev-ui.pages.dev/api/media/r2/whatsapp/ME5558d652dd4361f08231347b26c7a576/SMf1e3b8b7b0a34f9e9c8a7b6c5d4e3f2e1",
    expected: "/api/media/r2/whatsapp/ME5558d652dd4361f08231347b26c7a576/SMf1e3b8b7b0a34f9e9c8a7b6c5d4e3f2e1"
  },
  // Test case with nested HTTP prefixes
  {
    input: "/api/media/r2/whatsapp/https://api.twilio.com/ME123/SM456",
    expected: "/api/media/r2/whatsapp/ME123/SM456"
  },
  // Test case with multiple HTTP prefixes
  {
    input: "/api/media/r2/https://twilio.com/whatsapp/https://api.twilio.com/ME789/SM012",
    expected: "/api/media/r2/whatsapp/ME789/SM012"
  },
  // Test case with correct path
  {
    input: "/api/media/r2/whatsapp/ME123/SM456",
    expected: "/api/media/r2/whatsapp/ME123/SM456"
  },
  // Test case with no /api/media/ prefix
  {
    input: "https://twilio.com/media/ME123",
    expected: undefined
  },
  // Test case with empty input
  {
    input: "",
    expected: undefined
  },
  // Test case with null input
  {
    input: null,
    expected: undefined
  }
];

// Run tests
console.log('Running fixMediaPath tests...');
console.log('================================');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = fixMediaPath(testCase.input);
  const success = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${success ? 'PASS' : 'FAIL'}`);
  console.log(`Input:    ${testCase.input}`);
  console.log(`Expected: ${testCase.expected}`);
  console.log(`Got:      ${result}`);
  console.log('');
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log('================================');
console.log(`Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ All tests passed! The fixMediaPath function is working correctly.');
} else {
  console.log('❌ Some tests failed. Please check the function implementation.');
}
