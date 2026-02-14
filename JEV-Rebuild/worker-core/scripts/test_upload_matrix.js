/**
 * LeadConnector/Daojie 附件上传端点探测矩阵
 * 执行方式: node scripts/test_upload_matrix.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 🔴 从 wrangler.toml 读取配置
function loadConfig() {
  const configPath = path.join(__dirname, '../wrangler.toml');
  const content = fs.readFileSync(configPath, 'utf-8');
  
  const config = {
    PIT_JWT: null,
    DAOJIE_LOCATION_ID: null
  };
  
  // 解析 PIT_JWT
  const jwtMatch = content.match(/PIT_JWT\s*=\s*"([^"]+)"/);
  if (jwtMatch) config.PIT_JWT = jwtMatch[1];
  
  // 解析 DAOJIE_LOCATION_ID
  const locationMatch = content.match(/DAOJIE_LOCATION_ID\s*=\s*"([^"]+)"/);
  if (locationMatch) config.DAOJIE_LOCATION_ID = locationMatch[1];
  
  return config;
}

const config = loadConfig();
const PIT_JWT = config.PIT_JWT;
const LOCATION_ID = config.DAOJIE_LOCATION_ID;

console.log("=".repeat(80));
console.log("LeadConnector/Daojie 附件上传端点探测矩阵");
console.log("=".repeat(80));
console.log("配置信息:");
console.log(`  PIT_JWT: ${PIT_JWT ? PIT_JWT.substring(0, 20) + '...' : 'MISSING'}`);
console.log(`  LOCATION_ID: ${LOCATION_ID || 'MISSING'}`);
console.log("=".repeat(80));

if (!PIT_JWT) {
  console.error("❌ 错误: 未找到 PIT_JWT 配置");
  process.exit(1);
}

if (!LOCATION_ID) {
  console.error("❌ 错误: 未找到 DAOJIE_LOCATION_ID 配置");
  process.exit(1);
}

// 🔴 候选端点矩阵
const CANDIDATE_ENDPOINTS = [
  { name: "/attachments", path: "/attachments" },
  { name: "/media/upload", path: "/media/upload" },
  { name: "/medias/upload", path: "/medias/upload" },
  { name: "/conversations/media", path: "/conversations/media" },
  { name: "/conversations/messages/media", path: "/conversations/messages/media" },
  { name: "/locations/{locationId}/media", path: `/locations/${LOCATION_ID}/media`, hasLocationIdInPath: true },
  { name: "/files/upload", path: "/files/upload" },
  { name: "/attachments/upload", path: "/attachments/upload" },
];

// 🔴 FormData 变体
const VARIANTS = [
  { name: "file only", fields: { file: "FILE" } },
  { name: "file + locationId", fields: { file: "FILE", locationId: LOCATION_ID } },
  { name: "file + locationId + type", fields: { file: "FILE", locationId: LOCATION_ID, type: "image" } },
  { name: "file + locationId + messageType", fields: { file: "FILE", locationId: LOCATION_ID, messageType: "image" } },
];

const BASE_URL = "https://services.leadconnectorhq.com";
const VERSION_HEADER = "2021-07-28";

// 🔴 创建一个测试图片文件（1x1 像素 PNG）
function createTestImage() {
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  return Buffer.from(pngBase64, 'base64');
}

const TEST_IMAGE = createTestImage();

// 🔴 探测函数
async function probeEndpoint(endpoint, variant) {
  const url = `${BASE_URL}${endpoint.path}`;
  
  const formData = new FormData();
  for (const [key, value] of Object.entries(variant.fields)) {
    if (value === "FILE") {
      const blob = new Blob([TEST_IMAGE], { type: "image/png" });
      formData.append(key, blob, "test-image.png");
    } else {
      formData.append(key, String(value));
    }
  }
  
  const headers = {
    "Authorization": `Bearer ${PIT_JWT}`,
    "Version": VERSION_HEADER,
    "Accept": "application/json"
  };
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData
    });
    
    const duration = Date.now() - startTime;
    const bodyText = await response.text();
    const bodySnippet = bodyText.substring(0, 500);
    
    let hasFileIdField = false;
    let guessFileIdFieldName = null;
    
    const lowerBody = bodyText.toLowerCase();
    const possibleIdFields = ['file_id', 'media_id', 'id', 'attachment_id', 'attachmentid', 'url', 'media_url'];
    
    for (const field of possibleIdFields) {
      if (lowerBody.includes(field)) {
        hasFileIdField = true;
        guessFileIdFieldName = field;
        break;
      }
    }
    
    return {
      endpoint: endpoint.name,
      variant: variant.name,
      status: response.status,
      duration,
      hasFileIdField,
      guessFileIdFieldName,
      bodySnippet,
      fullBody: bodyText
    };
    
  } catch (error) {
    return {
      endpoint: endpoint.name,
      variant: variant.name,
      status: "NETWORK_ERROR",
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// 🔴 主执行函数
async function runMatrix() {
  const results = [];
  
  console.log("\n开始探测候选端点...\n");
  
  for (const endpoint of CANDIDATE_ENDPOINTS) {
    console.log(`\n🔍 探测: ${endpoint.name}`);
    
    for (const variant of VARIANTS) {
      if (endpoint.hasLocationIdInPath && variant.name === "file only") {
        console.log(`   └─ ${variant.name}: ⏭️ 跳过`);
        continue;
      }
      
      process.stdout.write(`   └─ ${variant.name}: `);
      
      const result = await probeEndpoint(endpoint, variant);
      results.push(result);
      
      if (result.status === "NETWORK_ERROR") {
        console.log(`❌ ${result.status} - ${result.error}`);
      } else {
        const statusIcon = result.status >= 200 && result.status < 300 ? "✅" : 
                          result.status === 401 ? "🔒" : 
                          result.status === 404 ? "❌" : 
                          result.status === 422 ? "⚠️" : "💥";
        console.log(`${statusIcon} ${result.status} | hasFileId: ${result.hasFileIdField} | ${result.duration}ms`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // 🔴 输出结果表格
  console.log("\n" + "=".repeat(80));
  console.log("探测结果表格");
  console.log("=".repeat(80));
  
  const tableHeader = "| endpoint                    | variant                    | status | hasFileId | field      | snippet                                    |";
  const tableSeparator = "|-----------------------------|----------------------------|--------|-----------|------------|--------------------------------------------|";
  
  console.log(tableHeader);
  console.log(tableSeparator);
  
  for (const r of results) {
    const endpoint = r.endpoint.padEnd(27);
    const variant = r.variant.padEnd(28);
    const status = String(r.status).padEnd(6);
    const hasFileId = r.hasFileIdField ? "YES" : "NO ";
    const field = (r.guessFileIdFieldName || "-").padEnd(10);
    const snippet = (r.bodySnippet || r.error || "-").substring(0, 44).padEnd(44);
    
    console.log(`| ${endpoint} | ${variant} | ${status} | ${hasFileId} | ${field} | ${snippet} |`);
  }
  
  // 🔴 找出可用的端点
  console.log("\n" + "=".repeat(80));
  console.log("可用端点分析");
  console.log("=".repeat(80));
  
  const successful = results.filter(r => 
    typeof r.status === 'number' && r.status >= 200 && r.status < 300 && r.hasFileIdField
  );
  
  if (successful.length > 0) {
    console.log("\n✅ 找到可用的上传端点:");
    for (const r of successful) {
      console.log(`  - ${r.endpoint} (variant: ${r.variant})`);
      console.log(`    返回字段: ${r.guessFileIdFieldName}`);
    }
  } else {
    console.log("\n❌ 未找到独立的附件上传端点");
    console.log("\n将执行 Step C：测试附件随消息一起发送");
  }
  
  return results;
}

// 🔴 执行
runMatrix().catch(console.error);
