/**
 * Step C Final: 使用真实联系人 ID 测试附件上传
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

// 真实联系人 ID（从之前的用户消息获取）
const REAL_CONTACT_ID = 'GakCvF3msAuChq2DtER9';

console.log('='.repeat(80));
console.log('STEP C FINAL: 使用真实联系人 ID 测试附件上传');
console.log('='.repeat(80));
console.log(`PIT_JWT: ${PIT_JWT ? PIT_JWT.substring(0, 20) + '...' : 'MISSING'}`);
console.log(`LOCATION_ID: ${LOCATION_ID || 'MISSING'}`);
console.log(`REAL_CONTACT_ID: ${REAL_CONTACT_ID}`);
console.log('');

if (!PIT_JWT || !LOCATION_ID || !REAL_CONTACT_ID) {
  console.error('❌ 配置缺失，无法继续测试');
  process.exit(1);
}

// 创建测试图片 (1x1 PNG, red)
function createTestImage() {
  const pngBytes = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
    0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
    0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F, 0x00,
    0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
  ]);
  return pngBytes;
}

// 创建测试临时文件
const testImagePath = path.join(__dirname, 'test_final_image.png');
fs.writeFileSync(testImagePath, createTestImage());
console.log(`📁 创建测试图片: ${testImagePath}`);

// PIT API 配置
const PIT_BASE_URL = 'https://services.leadconnectorhq.com';
const MESSAGES_ENDPOINT = `${PIT_BASE_URL}/conversations/messages`;

// 最终测试场景
const FINAL_TEST_SCENARIOS = [
  {
    name: "JSON: 带 base64 图片附件",
    description: "测试 JSON 格式带 base64 编码的图片",
    contentType: 'application/json',
    body: {
      locationId: LOCATION_ID,
      contactId: REAL_CONTACT_ID,
      message: ' ',
      type: 'WhatsApp',
      messageType: 19,
      attachments: [
        {
          type: 'image',
          file: fs.readFileSync(testImagePath).toString('base64')
        }
      ]
    },
    expectedSuccess: true
  },
  {
    name: "JSON: 带 file_url 附件",
    description: "测试 JSON 格式带图片 URL",
    contentType: 'application/json',
    body: {
      locationId: LOCATION_ID,
      contactId: REAL_CONTACT_ID,
      message: ' ',
      type: 'WhatsApp',
      messageType: 19,
      attachments: [
        {
          type: 'image',
          url: 'https://example.com/test-image.png'
        }
      ]
    },
    expectedSuccess: true
  },
  {
    name: "JSON: 带 messageMediaId (WhatsApp 格式)",
    description: "测试 WhatsApp 消息格式 - messageMediaId",
    contentType: 'application/json',
    body: {
      locationId: LOCATION_ID,
      contactId: REAL_CONTACT_ID,
      type: 'WhatsApp',
      messageType: 19,
      message: ' ',
      messageMediaId: 'test-media-id-123'
    },
    expectedSuccess: false
  },
  {
    name: "JSON: 带 media 字段",
    description: "测试通用 media 字段格式",
    contentType: 'application/json',
    body: {
      locationId: LOCATION_ID,
      contactId: REAL_CONTACT_ID,
      type: 'WhatsApp',
      messageType: 19,
      message: ' ',
      media: {
        type: 'image',
        url: 'https://example.com/test.png'
      }
    },
    expectedSuccess: false
  }
];

// 执行测试
async function runFinalTests() {
  const results = [];
  
  for (const scenario of FINAL_TEST_SCENARIOS) {
    console.log('\n' + '='.repeat(60));
    console.log(`🧪 ${scenario.name}`);
    console.log(`📝 ${scenario.description}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    let status = 'PENDING';
    let httpStatus = 'N/A';
    let responseBody = '';
    let fileIdFound = null;
    
    try {
      const headers = {
        'Authorization': `Bearer ${PIT_JWT}`,
        'Accept': 'application/json',
        'Version': '2021-07-28',
        'Content-Type': scenario.contentType
      };
      
      const body = JSON.stringify(scenario.body);
      
      console.log(`📤 Request: POST ${MESSAGES_ENDPOINT}`);
      console.log(`📋 Content-Type: ${scenario.contentType}`);
      console.log(`📋 Body keys: ${Object.keys(scenario.body).join(', ')}`);
      
      const response = await fetch(MESSAGES_ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: body
      });
      
      const duration = Date.now() - startTime;
      httpStatus = response.status;
      responseBody = await response.text();
      
      console.log(`📥 Response: ${httpStatus} (${duration}ms)`);
      console.log(`📥 Body: ${responseBody.substring(0, 800)}`);
      
      // 检查是否返回了 file_id
      const fileIdMatch = responseBody.match(/["']file_id["']:\s*["']?([^"'\s,}]+)["']?/i);
      const mediaIdMatch = responseBody.match(/["']mediaId["']:\s*["']?([^"'\s,}]+)["']?/i);
      const idMatch = responseBody.match(/["']id["']:\s*["']?([^"'\s,}]+)["']?/i);
      const messageIdMatch = responseBody.match(/["']messageId["']:\s*["']?([^"'\s,}]+)["']?/i);
      
      fileIdFound = fileIdMatch?.[1] || mediaIdMatch?.[1] || idMatch?.[1] || messageIdMatch?.[1];
      
      if (fileIdFound) {
        console.log(`✅ 找到 ID: ${fileIdFound}`);
      }
      
      // 判断成功
      const isSuccess = httpStatus >= 200 && httpStatus <= 201 && fileIdFound;
      status = isSuccess ? 'SUCCESS' : 'FAILED';
      
      if (scenario.expectedSuccess && !isSuccess) {
        console.log(`⚠️  期望成功但失败了`);
      }
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      status = 'ERROR';
    }
    
    const duration = Date.now() - startTime;
    
    results.push({
      scenario: scenario.name,
      description: scenario.description,
      status: status,
      httpStatus: httpStatus,
      duration: duration,
      fileId: fileIdFound,
      response: responseBody.substring(0, 500),
      expectedSuccess: scenario.expectedSuccess
    });
    
    console.log(`📊 Result: ${status}\n`);
  }
  
  // 清理测试文件
  try {
    fs.unlinkSync(testImagePath);
    console.log(`🗑️ 清理测试图片: ${testImagePath}`);
  } catch (e) {}
  
  return results;
}

// 输出结果表格
function printFinalResultsTable(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 STEP C FINAL 测试结果汇总表');
  console.log('='.repeat(80));
  console.log(
    '| # | 场景 | 状态 | HTTP | 耗时 | 返回 ID |'
  );
  console.log('|---|------|------|------|------|---------|');
  
  results.forEach((r, idx) => {
    const id = r.fileId ? (r.fileId.length > 15 ? r.fileId.substring(0, 12) + '...' : r.fileId) : '-';
    console.log(
      `| ${idx + 1} | ${r.scenario.substring(0, 20).padEnd(20)} | ${r.status.padEnd(7)} | ${String(r.httpStatus).padEnd(4)} | ${String(r.duration + 'ms').padEnd(6)} | ${id} |`
    );
  });
  
  console.log('='.repeat(80));
  
  const successResults = results.filter(r => r.status === 'SUCCESS');
  
  if (successResults.length > 0) {
    console.log('\n✅ 成功的场景:');
    successResults.forEach(r => {
      console.log(`   - ${r.scenario}`);
      console.log(`     HTTP: ${r.httpStatus}, 返回的 ID: ${r.fileId || '需从响应解析'}`);
      console.log(`     响应: ${r.response.substring(0, 200)}`);
    });
    
    // 生成最终 Worker diff
    const bestResult = successResults[0];
    console.log('\n' + '='.repeat(80));
    console.log('🎯 最终 Worker 代码修改建议 (daojie_attachments.js)');
    console.log('='.repeat(80));
    
    // 根据成功的场景生成代码
    const isBase64 = bestResult.scenario.includes('base64');
    const isUrl = bestResult.scenario.includes('file_url') || bestResult.scenario.includes('URL');
    
    console.log(`
基于最终测试结果，推荐的 Worker 修改方案:

1. 端点: POST ${MESSAGES_ENDPOINT}
2. 格式: application/json
3. 附件传递方式: ${isBase64 ? 'base64 编码' : isUrl ? 'URL 引用' : '待确认'}

关键代码改动:
\`\`\`javascript
// daojie_attachments.js 修改

export async function handleDaojieAttachmentUpload(request, env) {
  const imageUrl = new URL(request.url).searchParams.get('url');
  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Step 1: Fetch image
  const imageResponse = await fetch(imageUrl);
  const imageBlob = await imageResponse.blob();
  const base64Data = await imageBlob.text(); // Get as base64
  
  // Step 2: Upload via /conversations/messages with JSON
  const locationId = env.DAOJIE_LOCATION_ID;
  const pitHeaders = {
    'Authorization': \`Bearer \${env.PIT_JWT}\`,
    'Accept': 'application/json',
    'Version': '2021-07-28',
    'Content-Type': 'application/json'
  };

  const pitBody = {
    locationId: locationId,
    contactId: contactId,  // 从请求参数获取
    message: ' ',  // 必须是非空空格
    type: 'WhatsApp',
    messageType: 19,
    attachments: [
      {
        type: 'image',
        ${isBase64 ? `file: base64Data` : isUrl ? `url: imageUrl` : `/* 待确认格式 */`}
      }
    ]
  };

  const response = await fetch('${MESSAGES_ENDPOINT}', {
    method: 'POST',
    headers: pitHeaders,
    body: JSON.stringify(pitBody)
  });

  const result = await response.json();
  
  // 从响应中提取 file_id
  const fileId = result?.attachments?.[0]?.file_id || 
                 result?.id || 
                 result?.messageId ||
                 null;

  return new Response(JSON.stringify({ file_id: fileId }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
\`\`\`
`);
    
    // 生成 curl 示例
    console.log('\n📝 curl 测试示例:');
    console.log('='.repeat(80));
    console.log(`# 上传图片并获取 file_id`);
    console.log(`curl -X POST "${MESSAGES_ENDPOINT}" \\`);
    console.log(`  -H "Authorization: Bearer ${PIT_JWT}" \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Version: 2021-07-28" \\`);
    console.log(`  -d '{`);
    console.log(`    "locationId": "${LOCATION_ID}",`);
    console.log(`    "contactId": "${REAL_CONTACT_ID}",`);
    console.log(`    "message": " ",`);
    console.log(`    "type": "WhatsApp",`);
    console.log(`    "messageType": 19,`);
    console.log(`    "attachments": [`);
    console.log(`      {`);
    console.log(`        "type": "image",`);
    console.log(`        "file": "<base64数据>"`);
    console.log(`      }`);
    console.log(`    ]`);
    console.log(`  }'`);
    console.log('');
    
  } else {
    console.log('\n❌ 所有场景都失败了');
    console.log('');
    console.log('🔍 调试建议:');
    console.log('   1. 确认 contactId 真实存在于 LeadConnector/GoHighLevel');
    console.log('   2. 尝试使用 /conversations/messages 发送文本消息确认认证正常');
    console.log('   3. 检查 LeadConnector API 文档是否有附件上传的新版本');
    console.log('   4. 联系 Daojie 技术支持确认正确的附件上传方式');
  }
  
  return successResults;
}

// 主程序
async function main() {
  try {
    const results = await runFinalTests();
    const successfulResults = printFinalResultsTable(results);
    
    // 生成完整报告
    console.log('\n' + '='.repeat(80));
    console.log('📋 完整 Probe 结果报告');
    console.log('='.repeat(80));
    
    console.log(`
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LeadConnector 附件上传端点探测报告                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  测试环境:                                                                   │
│    - PIT_JWT: ${PIT_JWT ? PIT_JWT.substring(0, 30) + '...' : 'MISSING'}                   │
│    - LOCATION_ID: ${LOCATION_ID || 'MISSING'}                                         │
│    - CONTACTS_ID: ${REAL_CONTACT_ID}                                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Step A/B 结果 (独立上传端点):                                               │
│    - /attachments .................. 404 Not Found                          │
│    - /media/upload ................. 404 Not Found                          │
│    - /medias/upload ................ 401 Unauthorized                       │
│    - /conversations/media .......... 404 Not Found                          │
│    - /conversations/messages/media . 404 Not Found                          │
│    - /locations/{id}/media ......... (未测试)                                │
│    - /files/upload ................. 404 Not Found                          │
│    - /attachments/upload ........... 404 Not Found                          │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Step C 结果 (随消息上传):                                                   │
│    - multipart/form-data + file .... 404 (Contact id not given)             │
│    - JSON + base64 ................. ${results[0]?.status === 'SUCCESS' ? 'SUCCESS ✅' : 'FAILED ❌'}                              │
│    - JSON + file_url ............... ${results[1]?.status === 'SUCCESS' ? 'SUCCESS ✅' : 'FAILED ❌'}                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  最终结论:                                                                   │
│    ${successfulResults.length > 0 ? '✅ 找到可行的附件上传方式' : '❌ 所有方式均失败，需要进一步调查'}                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
`);
    
    if (successfulResults.length > 0) {
      console.log('\n✅ 任务完成：已找到可行的附件上传方案');
    } else {
      console.log('\n⚠️  需要进一步调查：');
      console.log('   建议: 手动测试 /conversations/messages 端点，验证认证和基本功能');
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  }
}

main();
