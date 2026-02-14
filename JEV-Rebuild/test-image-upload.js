const http = require('http');
const { Readable } = require('stream');

// 测试图片上传端点
const testImageUpload = () => {
  return new Promise((resolve) => {
    // 创建模拟图片文件
    const imageBuffer = Buffer.from('Mock image data', 'utf8');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2, 16);
    
    // 构建multipart/form-data请求体
    const formData = `
${boundary}
Content-Disposition: form-data; name="file"; filename="test-image.jpg"
Content-Type: image/jpeg

${imageBuffer.toString('binary')}
${boundary}--
`;

    const options = {
      hostname: 'localhost',
      port: 8787,
      path: '/api/upload/media',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(formData, 'binary')
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('✅ 图片上传测试:');
        console.log('状态码:', res.statusCode);
        console.log('响应:', data);
        
        // 解析响应
        try {
          const response = JSON.parse(data);
          if (response.ok && response.media_path) {
            console.log('✅ 上传成功，返回了 media_path:', response.media_path);
          } else {
            console.log('❌ 上传失败，未返回 media_path');
            console.log('响应详情:', response);
          }
        } catch (error) {
          console.log('❌ 响应解析失败:', error.message);
        }
        
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log('❌ 图片上传测试失败:', err.message);
      resolve();
    });

    // 发送请求体
    req.write(formData, 'binary');
    req.end();
  });
};

// 运行测试
async function runTests() {
  console.log('开始测试图片上传功能...\n');
  await testImageUpload();
  console.log('\n✅ 测试完成！');
}

runTests();
