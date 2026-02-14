// 测试脚本：验证联系人创建功能
import fs from 'fs';
import path from 'path';

// 读取wrangler.toml配置
const wranglerConfigPath = path.join(process.cwd(), 'wrangler.toml');
const wranglerConfig = fs.readFileSync(wranglerConfigPath, 'utf8');

// 解析wrangler.toml配置
function parseWranglerConfig(config) {
  const vars = {};
  const lines = config.split('\n');
  let inVarsSection = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === '[vars]') {
      inVarsSection = true;
      continue;
    }
    
    if (inVarsSection && trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('[')) {
      const [key, value] = trimmedLine.split('=').map(v => v.trim());
      // 移除引号
      const cleanValue = value.replace(/['"']/g, '');
      vars[key] = cleanValue;
    } else if (inVarsSection && trimmedLine.startsWith('[')) {
      break;
    }
  }
  
  return vars;
}

const vars = parseWranglerConfig(wranglerConfig);
console.log('[TEST] Loaded vars:', vars);

// 测试联系人创建功能
async function testContactCreation() {
  const PIT_JWT = vars.PIT_JWT;
  const DAOJIE_LOCATION_ID = vars.DAOJIE_LOCATION_ID;
  
  if (!PIT_JWT) {
    console.error('[TEST] PIT_JWT not found in wrangler.toml');
    process.exit(1);
  }
  
  if (!DAOJIE_LOCATION_ID) {
    console.error('[TEST] DAOJIE_LOCATION_ID not found in wrangler.toml');
    process.exit(1);
  }
  
  console.log('[TEST] Testing contact creation...');
  console.log('[TEST] JWT:', PIT_JWT.substring(0, 20) + '...');
  console.log('[TEST] Location ID:', DAOJIE_LOCATION_ID);
  
  // 构造创建联系人的请求体
  const customer_id = `test_${Date.now()}`;
  const createContactBody = {
    locationId: DAOJIE_LOCATION_ID,
    name: `Customer ${customer_id.substring(0, 8)}`,
    phone: `13800000000`,
    email: `customer_${customer_id}@example.com`,
    source: 'daojie'
  };
  
  console.log('[TEST] Create contact body:', createContactBody);
  
  try {
    // 调用API创建联系人
    const createContactResponse = await fetch('https://services.leadconnectorhq.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIT_JWT}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createContactBody)
    });
    
    const createContactText = await createContactResponse.text();
    console.log('[TEST] Response Status:', createContactResponse.status, createContactResponse.statusText);
    console.log('[TEST] Response Body:', createContactText);
    
    if (createContactResponse.ok) {
      console.log('[TEST] ✅ Contact created successfully!');
      try {
        const createdContact = JSON.parse(createContactText);
        console.log('[TEST] Contact ID:', createdContact.id || createdContact.contactId);
        console.log('[TEST] Contact Name:', createdContact.name || createdContact.firstName || 'unknown');
      } catch (parseError) {
        console.log('[TEST] ❌ Failed to parse contact response:', parseError.message);
      }
    } else {
      console.log('[TEST] ❌ Failed to create contact');
      // 尝试解析错误信息
      try {
        const errorData = JSON.parse(createContactText);
        console.log('[TEST] Error Code:', errorData.code || errorData.errorCode || 'unknown');
        console.log('[TEST] Error Message:', errorData.message || errorData.error || 'unknown');
        console.log('[TEST] Error Details:', JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        console.log('[TEST] Error parsing error response:', parseError.message);
      }
    }
  } catch (error) {
    console.error('[TEST] ❌ Network error:', error.message);
    console.error('[TEST] Stack:', error.stack);
  }
}

// 执行测试
testContactCreation();
