// 测试脚本：验证PIT API（LeadConnector）配置
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
      const cleanValue = value.replace(/['"]/g, '');
      vars[key] = cleanValue;
    } else if (inVarsSection && trimmedLine.startsWith('[')) {
      break;
    }
  }
  
  return vars;
}

const vars = parseWranglerConfig(wranglerConfig);
console.log('[TEST] Loaded vars:', vars);

// 测试PIT API
async function testPITAPI() {
  const PIT_JWT = vars.PIT_JWT;
  const DAOJIE_LOCATION_ID = vars.DAOJIE_LOCATION_ID;
  const pitEndpoint = 'https://services.leadconnectorhq.com/conversations/messages';
  
  if (!PIT_JWT) {
    console.error('[TEST] PIT_JWT not found in wrangler.toml');
    process.exit(1);
  }
  
  console.log('[TEST] Testing PIT API with JWT:', PIT_JWT.substring(0, 20) + '...');
  console.log('[TEST] Location ID:', DAOJIE_LOCATION_ID);
  console.log('[TEST] Endpoint:', pitEndpoint);
  
  // 测试1：验证JWT是否有效（获取联系人列表）
  console.log('\n[TEST 1] Testing JWT validity by fetching contacts...');
  try {
    const contactsResponse = await fetch('https://services.leadconnectorhq.com/contacts', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PIT_JWT}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });
    
    const contactsText = await contactsResponse.text();
    console.log('[TEST 1] Contacts API Response Status:', contactsResponse.status, contactsResponse.statusText);
    
    if (contactsResponse.ok) {
      console.log('[TEST 1] ✅ JWT is valid!');
      try {
        const contacts = JSON.parse(contactsText);
        console.log('[TEST 1] Contacts found:', contacts.length || Object.keys(contacts).length);
        if (Array.isArray(contacts) && contacts.length > 0) {
          // 获取第一个联系人的ID用于后续测试
          const testContact = contacts[0];
          const contactId = testContact.id || testContact.contactId;
          console.log('[TEST 1] Test contact found:', { name: testContact.firstName || testContact.name, id: contactId });
          
          // 测试2：测试发送消息
  console.log('\n[TEST 2] Testing message sending...');
  await testMessageSending(PIT_JWT, pitEndpoint, contactId, DAOJIE_LOCATION_ID);
        } else {
          console.log('[TEST 1] No contacts found, skipping message test.');
        }
      } catch (parseError) {
        console.error('[TEST 1] ❌ Failed to parse contacts response:', parseError.message);
      }
    } else {
      console.error('[TEST 1] ❌ JWT is invalid or has insufficient permissions');
      console.error('[TEST 1] Response:', contactsText);
    }
  } catch (error) {
    console.error('[TEST 1] ❌ Network error:', error.message);
    console.error('[TEST 1] Stack:', error.stack);
  }
}

// 测试发送消息
async function testMessageSending(PIT_JWT, pitEndpoint, contactId, locationId) {
  const testMessage = {
    locationId: locationId,
    type: 'WhatsApp',
    channel: 'whatsapp',
    contactId: contactId,
    message: 'Hello from PIT API test script',
    messageType: 1
  };
  
  try {
    const response = await fetch(pitEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PIT_JWT}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    const responseText = await response.text();
    console.log('[TEST 2] Message API Response Status:', response.status, response.statusText);
    console.log('[TEST 2] Response:', responseText);
    
    if (response.ok) {
      console.log('[TEST 2] ✅ Message sent successfully!');
      try {
        const responseData = JSON.parse(responseText);
        console.log('[TEST 2] Message ID:', responseData.id || responseData.messageId);
        console.log('[TEST 2] Status:', responseData.status);
      } catch (parseError) {
        console.error('[TEST 2] ❌ Failed to parse message response:', parseError.message);
      }
    } else {
      console.error('[TEST 2] ❌ Failed to send message');
      try {
        const errorData = JSON.parse(responseText);
        console.error('[TEST 2] Error Code:', errorData.code || errorData.errorCode);
        console.error('[TEST 2] Error Message:', errorData.message || errorData.error);
        console.error('[TEST 2] Error Details:', JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        console.error('[TEST 2] ❌ Failed to parse error response:', parseError.message);
      }
    }
  } catch (error) {
    console.error('[TEST 2] ❌ Network error:', error.message);
    console.error('[TEST 2] Stack:', error.stack);
  }
}

// 执行测试
testPITAPI();