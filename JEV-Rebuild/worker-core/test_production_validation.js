import https from 'https';
import fs from 'fs';
import path from 'path';

// 配置
const BASE_URL = 'https://jev-rebuild-worker-production.bensonlove1986.workers.dev';
const TEST_CUSTOMER_ID = 'test-customer-123';
const TEST_CHANNEL = 'whatsapp';

// 简单的HTTP请求函数
function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// 生成测试图片的base64数据
function generateTestImageBase64(sizeKb = 100) {
  // 生成一个简单的PNG图片的base64
  // 实际测试中应该使用真实的图片文件
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const pngData = Buffer.alloc(sizeKb * 1024 - pngHeader.length, 0x00);
  const pngBuffer = Buffer.concat([pngHeader, pngData]);
  return pngBuffer.toString('base64');
}

// V1: 发送单张图片（≤5MB）
async function testV1() {
  console.log('=== V1: 发送单张图片（≤5MB） ===');
  try {
    const imageBase64 = generateTestImageBase64(100); // 100KB test image
    
    const options = {
      hostname: 'jev-rebuild-worker-production.bensonlove1986.workers.dev',
      path: '/api/inbound/daojie',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const data = {
      customerId: TEST_CUSTOMER_ID,
      channel: TEST_CHANNEL,
      message: {
        text: 'Test image',
        attachments: [
          {
            type: 'image',
            data: imageBase64,
            filename: 'test.png',
            size: imageBase64.length * 3 / 4 // 估算大小
          }
        ]
      }
    };
    
    const response = await request(options, data);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
    
    const result = JSON.parse(response.body);
    if (response.statusCode === 201 && result.messageId) {
      console.log('✅ V1 测试通过：返回了201和messageId');
      return true;
    } else {
      console.log('❌ V1 测试失败');
      return false;
    }
  } catch (error) {
    console.error('❌ V1 测试失败:', error.message);
    return false;
  }
}

// V2: 连续发送3-5张图片
async function testV2() {
  console.log('\n=== V2: 连续发送3-5张图片 ===');
  try {
    const imageBase64 = generateTestImageBase64(50); // 50KB test image
    let allSuccess = true;
    
    for (let i = 1; i <= 4; i++) {
      const options = {
        hostname: 'jev-rebuild-worker-production.bensonlove1986.workers.dev',
        path: '/api/inbound/daojie',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      const data = {
        customerId: TEST_CUSTOMER_ID,
        channel: TEST_CHANNEL,
        message: {
          text: `Test image ${i}`,
          attachments: [
            {
              type: 'image',
              data: imageBase64,
              filename: `test${i}.png`,
              size: imageBase64.length * 3 / 4
            }
          ]
        }
      };
      
      const response = await request(options, data);
      console.log(`Image ${i} - Status: ${response.statusCode}`);
      
      if (response.statusCode !== 201) {
        allSuccess = false;
      }
      
      // 等待1秒避免触发速率限制
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (allSuccess) {
      console.log('✅ V2 测试通过：连续发送4张图片全部成功');
      return true;
    } else {
      console.log('❌ V2 测试失败');
      return false;
    }
  } catch (error) {
    console.error('❌ V2 测试失败:', error.message);
    return false;
  }
}

// V3: 文本+图片同发
async function testV3() {
  console.log('\n=== V3: 文本+图片同发 ===');
  try {
    const imageBase64 = generateTestImageBase64(50);
    
    const options = {
      hostname: 'jev-rebuild-worker-production.bensonlove1986.workers.dev',
      path: '/api/inbound/daojie',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const data = {
      customerId: TEST_CUSTOMER_ID,
      channel: TEST_CHANNEL,
      message: {
        text: 'Text message with image',
        attachments: [
          {
            type: 'image',
            data: imageBase64,
            filename: 'test_text_image.png',
            size: imageBase64.length * 3 / 4
          }
        ]
      }
    };
    
    const response = await request(options, data);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
    
    if (response.statusCode === 201) {
      console.log('✅ V3 测试通过：文本+图片同发成功');
      return true;
    } else {
      console.log('❌ V3 测试失败');
      return false;
    }
  } catch (error) {
    console.error('❌ V3 测试失败:', error.message);
    return false;
  }
}

// V4: 非WhatsApp渠道
async function testV4() {
  console.log('\n=== V4: 非WhatsApp渠道 ===');
  try {
    const imageBase64 = generateTestImageBase64(50);
    
    const options = {
      hostname: 'jev-rebuild-worker-production.bensonlove1986.workers.dev',
      path: '/api/inbound/daojie',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const data = {
      customerId: TEST_CUSTOMER_ID,
      channel: 'sms', // 非WhatsApp渠道
      message: {
        text: 'SMS with image',
        attachments: [
          {
            type: 'image',
            data: imageBase64,
            filename: 'test_sms_image.png',
            size: imageBase64.length * 3 / 4
          }
        ]
      }
    };
    
    const response = await request(options, data);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
    
    if (response.statusCode === 201) {
      console.log('✅ V4 测试通过：非WhatsApp渠道成功');
      return true;
    } else {
      console.log('❌ V4 测试失败');
      return false;
    }
  } catch (error) {
    console.error('❌ V4 测试失败:', error.message);
    return false;
  }
}

// V5: 禁止项验证 - image_url
async function testV5ImageUrl() {
  console.log('\n=== V5: 禁止项验证 - image_url ===');
  try {
    const options = {
      hostname: 'jev-rebuild-worker-production.bensonlove1986.workers.dev',
      path: '/api/inbound/daojie',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const data = {
      customerId: TEST_CUSTOMER_ID,
      channel: TEST_CHANNEL,
      message: {
        text: 'Test with image_url',
        image_url: 'https://example.com/test.png'
      }
    };
    
    const response = await request(options, data);
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response: ${response.body}`);
    
    const result = JSON.parse(response.body);
    if (response.statusCode === 400 && result.error === 'WHATSAPP_IMAGE_URL_FORBIDDEN') {
      console.log('✅ V5 image_url 测试通过：返回了400和正确的错误码');
      return true;
    } else {
      console.log('❌ V5 image_url 测试失败');
      return false;
    }
  } catch (error) {
    console.error('❌ V5 image_url 测试失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始生产验证测试...');
  console.log(`测试环境: ${BASE_URL}`);
  console.log('');
  
  const results = {
    v1: await testV1(),
    v2: await testV2(),
    v3: await testV3(),
    v4: await testV4(),
    v5_image_url: await testV5ImageUrl()
  };
  
  console.log('\n=== 测试结果汇总 ===');
  console.log(`V1: ${results.v1 ? '通过' : '失败'}`);
  console.log(`V2: ${results.v2 ? '通过' : '失败'}`);
  console.log(`V3: ${results.v3 ? '通过' : '失败'}`);
  console.log(`V4: ${results.v4 ? '通过' : '失败'}`);
  console.log(`V5 (image_url): ${results.v5_image_url ? '通过' : '失败'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n=== 最终结果: ${allPassed ? '全部通过' : '部分失败'} ===`);
  
  return allPassed;
}

// 执行测试
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
});
