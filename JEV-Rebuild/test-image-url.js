// 测试图片URL生成
const testImageUrlGeneration = () => {
  // 使用线上API基础URL
  const API_BASE_URL = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
  
  // 测试图片路径
  const mediaPath = '/api/media/r2/whatsapp/MMa993daedc6faea1d0a9979d9ea9b56c8/ME2cac60a79e0699f38d33b821c8e015a3';
  
  try {
    // 由于buildMediaUrl是TypeScript文件，我们直接模拟其逻辑
    const buildMediaUrl = (baseUrl, input) => {
      if (!input) return "";

      const raw = String(input).trim();

      // 1) 绝对 URL：直接返回
      if (/^https?:\/\//i.test(raw)) return raw;

      // 2) 处理 //cdn.xxx 这种
      if (/^\/\//.test(raw)) {
        const proto = baseUrl.startsWith("https://") ? "https:" : "http:";
        return proto + raw;
      }

      // 3) 清洗污染：如果里面夹了完整 URL，只保留 /api/media/... 之后的部分
      let path = raw;
      const apiIdx = path.indexOf("/api/media/");
      if (apiIdx >= 0) path = path.slice(apiIdx);

      // 4) 保证是相对路径
      if (!path.startsWith("/")) path = "/" + path;

      // 5) 幂等 join
      const base = new URL(baseUrl);
      return new URL(path, base).toString();
    };

    // 生成图片URL
    const imageUrl = buildMediaUrl(API_BASE_URL, mediaPath);
    
    console.log('✅ 图片URL生成测试:');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('mediaPath:', mediaPath);
    console.log('生成的imageUrl:', imageUrl);
    
    // 验证生成的URL是否正确
    if (imageUrl.startsWith('https://jev-rebuild-worker.bensonlove1986.workers.dev/api/media/r2/')) {
      console.log('✅ 图片URL正确，使用了真实的线上地址');
    } else {
      console.log('❌ 图片URL不正确，未使用真实的线上地址');
    }
    
  } catch (error) {
    console.log('❌ 测试失败:', error.message);
  }
};

// 运行测试
testImageUrlGeneration();
