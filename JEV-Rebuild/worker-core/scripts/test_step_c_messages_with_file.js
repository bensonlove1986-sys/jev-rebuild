/**
 * Step C: 测试附件随消息一起发送
 * 假设：附件只能通过 /conversations/messages 端点上传（不支持独立上传）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 wrangler.toml 获取配置
const wranglerTomlPath = path.resolve(__dirname, '..', 'wrangler.toml');
const wranglerContent = fs.readFileSync(wranglerTomlPath, 'utf-8');

const pitJwtMatch = wranglerContent.match(/PIT_JWT\s*=\s*"([^"]+)"/);
const locationIdMatch = wranglerContent.match(/DAOJIE_LOCATION_ID\s*=\s*"([^"]+)"/);

const PIT_JWT = pitJwtMatch ? pitJwtMatch[1] : null;
const LOCATION_ID = locationIdMatch ? locationIdMatch[1] : null;

console.log('='.repeat(80));
console.log('STEP C: 测试附件随消息一起发送 (/conversations/messages)');
console.log('='.repeat(80));
console.log(`PIT_JWT: ${PIT_JWT ? PIT_JWT.substring(0, 20) + '...' : 'MISSING'}`);
console.log(`LOCATION_ID: ${LOCATION_ID || 'MISSING'}`);
console.log('');

if (!PIT_JWT || !LOCATION_ID) {
  console.error('❌ 配置缺失，无法继续测试');
  process.exit(1);
}

// 创建测试图片 (1x1 PNG, red)
function createTestImage() {
  // Minimal valid PNG (1x1 red pixel)
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, // bit depth, color type, etc
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F, 0x00, // compressed data
    0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
    0xAE, 0x42, 0x60, 0x82 // CRC
  ]);
  return pngBytes;
}

// 创建测试临时文件
const testImagePath = path.join(__dirname, 'test_step_c_image.png');
fs.writeFileSync(testImagePath, createTestImage());
console.log(`📁 创建测试图片: ${testImagePath}`);
console.log('');

// PIT API 配置
const PIT_BASE_URL = 'https://services.leadconnectorhq.com';
const API_ENDPOINT = `${PIT_BASE_URL}/conversations/messages`;

// 测试场景
const TEST_SCENARIOS = [
  {
    name: "Scenario 1: multipart/form-data + file field",
    contentType: 'multipart/form-data',
    fields: {
      locationId: LOCATION_ID,
      contactId: 'test-contact-step-c',  // 测试联系人ID
      message: ' ',  // 必须是空格，不能为空
      type: 'WhatsApp',
      messageType: 19,
      file: {
        value: fs.readFileSync(testImagePath),
        filename: 'test-image.png',
        contentType: 'image/png'
      }
    }
  },
  {
    name: "Scenario 2: multipart/form-data + attachments field",
    contentType: 'multipart/form-data',
    fields: {
      locationId: LOCATION_ID,
      contactId: 'test-contact-step-c',
      message: ' ',
      type: 'WhatsApp',
      messageType: 19,
      attachments: {
        value: fs.readFileSync(testImagePath),
        filename: 'test-image.png',
        contentType: 'image/png'
      }
    }
  },
  {
    name: "Scenario 3: JSON with base64 image",
    contentType: 'application/json',
    body: {
      locationId: LOCATION_ID,
      contactId: 'test-contact-step-c',
      message: ' ',
      type: 'WhatsApp',
      messageType: 19,
      attachments: [
        {
          type: 'image',
          file: fs.readFileSync(testImagePath).toString('base64')
        }
      ]
    }
  },
  {
    name: "Scenario 4: JSON with file_url (mock)",
    contentType: 'application/json',
    body: {
      locationId: LOCATION_ID,
      contactId: 'test-contact-step-c',
      message: ' ',
      type: 'WhatsApp',
      messageType: 19,
      attachments: [
        {
          type: 'image',
          url: 'https://example.com/test-image.png'
        }
      ]
    }
  }
];

// 构建 multipart/form-data (Node.js 兼容)
function buildMultipartFormData(fields, boundary) {
  const parts = [];
  
  for (const [name, value] of Object.entries(fields)) {
    if (value && typeof value === 'object' && value.value) {
      // File field
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${value.filename}"\r\nContent-Type: ${value.contentType}\r\n\r\n`;
      parts.push({
        header: Buffer.from(header),
        body: value.value
      });
    } else {
      // Regular field
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n`;
      const footer = '\r\n';
      parts.push({
        header: Buffer.from(header),
        body: Buffer.from(String(value)),
        footer: Buffer.from(footer)
      });
    }
  }
  
  // Final boundary
  const finalBoundary = `--${boundary}--\r\n`;
  
  // Combine all parts
  const buffers = [];
  let totalLength = 0;
  
  for (const part of parts) {
    buffers.push(part.header);
    buffers.push(part.body);
    if (part.footer) buffers.push(part.footer);
    totalLength += part.header.length + part.body.length + (part.footer?.length || 0);
  }
  
  buffers.push(Buffer.from(finalBoundary));
  totalLength += finalBoundary.length;
  
  return Buffer.concat(buffers);
}

// 执行测试
async function runTests() {
  const results = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log('='.repeat(60));
    console.log(`🧪 ${scenario.name}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    let status = 'PENDING';
    let responseBody = '';
    let fileIdFound = null;
    
    try {
      const headers = {
        'Authorization': `Bearer ${PIT_JWT}`,
        'Accept': 'application/json',
        'Version': '2021-07-28'
      };
      
      let body;
      
      if (scenario.contentType === 'multipart/form-data') {
        const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
        headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
        body = buildMultipartFormData(scenario.fields, boundary);
      } else {
        headers['Content-Type'] = scenario.contentType;
        body = JSON.stringify(scenario.body);
      }
      
      console.log(`📤 Request: ${API_ENDPOINT}`);
      console.log(`📋 Content-Type: ${scenario.contentType}`);
      console.log(`📋 Body fields: ${JSON.stringify(Object.keys(scenario.contentType === 'multipart/form-data' ? scenario.fields : scenario.body))}`);
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: body
      });
      
      const duration = Date.now() - startTime;
      responseBody = await response.text();
      
      console.log(`📥 Response: ${response.status} (${duration}ms)`);
      console.log(`📥 Body: ${responseBody.substring(0, 500)}`);
      
      status = response.status;
      
      // 检查是否返回了 file_id
      const fileIdMatch = responseBody.match(/["']file_id["']:\s*["']?([^"'\s,}]+)["']?/i);
      const mediaIdMatch = responseBody.match(/["']mediaId["']:\s*["']?([^"'\s,}]+)["']?/i);
      const idMatch = responseBody.match(/["']id["']:\s*["']?([^"'\s,}]+)["']?/i);
      
      fileIdFound = fileIdMatch?.[1] || mediaIdMatch?.[1] || idMatch?.[1];
      
      if (fileIdFound) {
        console.log(`✅ 找到 ID: ${fileIdFound}`);
      }
      
      // 判断成功
      const isSuccess = response.status >= 200 && response.status <= 201 && fileIdFound;
      status = isSuccess ? 'SUCCESS' : 'FAILED';
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      status = 'ERROR';
    }
    
    const duration = Date.now() - startTime;
    
    results.push({
      scenario: scenario.name,
      status: status,
      httpStatus: status === 'PENDING' ? 'N/A' : status,
      duration: duration,
      fileId: fileIdFound,
      response: responseBody.substring(0, 300)
    });
    
    console.log(`📊 Result: ${status}\n`);
  }
  
  // 清理测试文件
  fs.unlinkSync(testImagePath);
  console.log(`🗑️ 清理测试图片: ${testImagePath}`);
  
  return results;
}

// 输出结果表格
function printResultsTable(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 STEP C 测试结果汇总表');
  console.log('='.repeat(80));
  console.log(
    '| # | 场景 | 状态 | HTTP | 耗时 | 返回 ID |'
  );
  console.log('|---|------|------|------|------|---------|');
  
  results.forEach((r, idx) => {
    const id = r.fileId ? (r.fileId.length > 15 ? r.fileId.substring(0, 12) + '...' : r.fileId) : '-';
    console.log(
      `| ${idx + 1} | ${r.scenario.substring(0, 25).padEnd(25)} | ${r.status.padEnd(6)} | ${String(r.httpStatus).padEnd(4)} | ${String(r.duration + 'ms').padEnd(6)} | ${id} |`
    );
  });
  
  console.log('='.repeat(80));
  
  const successResults = results.filter(r => r.status === 'SUCCESS');
  
  if (successResults.length > 0) {
    console.log('\n✅ 成功的场景:');
    successResults.forEach(r => {
      console.log(`   - ${r.scenario}`);
      console.log(`     返回的 ID: ${r.fileId || r.response.substring(0, 100)}`);
    });
    
    // 找到最佳方案
    const bestResult = successResults[0];
    console.log('\n🎯 推荐的端点方案:');
    console.log(`   端点: POST ${API_ENDPOINT}`);
    console.log(`   格式: ${bestResult.scenario.includes('multipart') ? 'multipart/form-data' : 'application/json'}`);
    console.log(`   返回 ID: ${bestResult.fileId || bestResult.response.match(/["']file_id["']:\s*["']?([^"'\s,}]+)/i)?.[1] || '需进一步解析'}`);
    
  } else {
    console.log('\n❌ 所有场景都失败了');
    console.log('   可能原因:');
    console.log('   1. LeadConnector API 不支持在 /conversations/messages 中上传附件');
    console.log('   2. 需要先通过独立端点上传附件');
    console.log('   3. contactId 必须真实存在且有效');
    console.log('   4. 需要使用真实的联系人 ID 进行测试');
  }
  
  return successResults;
}

// 主程序
async function main() {
  try {
    const results = await runTests();
    const successfulResults = printResultsTable(results);
    
    // 生成 Worker diff 建议
    console.log('\n' + '='.repeat(80));
    console.log('📝 Worker 代码修改建议 (daojie_attachments.js)');
    console.log('='.repeat(80));
    
    if (successfulResults.length > 0) {
      console.log(`
基于 Step C 测试结果，推荐的 Worker 修改方案:

1. 放弃使用独立的 /attachments 端点
2. 改用 /conversations/messages 端点附加文件
3. 使用 multipart/form-data 格式

关键代码改动:
\`\`\`javascript
// 修改上传逻辑
const response = await fetch('${API_ENDPOINT}', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${env.PIT_JWT}\`,
    'Accept': 'application/json',
    'Version': '2021-07-28'
    // 不设置 Content-Type，让 fetch 自动设置并生成 boundary
  },
  body: formData  // FormData 对象，自动设置 multipart/form-data
});

// 从响应中提取 file_id
const result = await response.json();
const fileId = result?.attachments?.[0]?.file_id || result?.id;
\`\`\`
`);
    } else {
      console.log(`
⚠️ Step C 也没有成功的端点，需要进一步调查:

建议操作:
1. 使用真实的 contactId 进行测试（当前使用假ID可能返回404）
2. 检查 LeadConnector API 文档确认附件上传的正确方式
3. 联系 Daojie/LeadConnector 支持确认正确的 API 端点

临时工作方案（如果必须立即可用）:
- 考虑使用 Base64 编码直接发送图片
- 或使用外部图片托管服务，将 URL 发送给 WhatsApp
`);
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

main();
