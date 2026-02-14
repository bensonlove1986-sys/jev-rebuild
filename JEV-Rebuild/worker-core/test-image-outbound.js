// Test script to verify image outbound channel final status
// This script performs the 4 verification steps required by TRAE

import fetch from 'node-fetch';

// Test configuration
const BASE_URL = 'http://localhost:8787'; // Local worker URL for testing
const TEST_CUSTOMER_ID = 'test-customer-123';
const TEST_IMAGE_URL = 'https://picsum.photos/600/400'; // More reliable test image URL

// Test cases for different platforms
const testCases = [
  {
    name: 'WhatsApp Image Send',
    channel_id: 19,
    platform: 'whatsapp'
  },
  {
    name: 'Instagram Image Send',
    channel_id: 29,
    platform: 'instagram'
  }
];

// Step 1: Platform Payload Minimal Consistency Verification
async function verifyPlatformPayload(testCase) {
  console.log(`=== Step 1: ${testCase.name} ===`);
  
  // Build test payload
  const payload = {
    contactId: TEST_CUSTOMER_ID,
    channel_id: testCase.channel_id,
    image_url: TEST_IMAGE_URL,
    locationId: 'test-location-id'
  };
  
  try {
    // Send test request
    const response = await fetch(`${BASE_URL}/api/daojie/pit/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const status = response.status;
    const body = await response.text();
    
    // Parse response if possible
    let parsedBody = null;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      console.log('[WARNING] Response is not JSON:', body);
    }
    
    // Log final payload and platform response
    console.log('[IMAGE_OUTBOUND_PAYLOAD_FINAL]', {
      platform: testCase.platform,
      channel_id: testCase.channel_id,
      payload: payload
    });
    
    console.log('[IMAGE_OUTBOUND_PLATFORM_RESPONSE]', {
      status: status,
      body: parsedBody || body
    });
    
    // Determine platform acceptance
    if (status >= 200 && status <= 201) {
      if (parsedBody && parsedBody.ok) {
        console.log('[VERIFICATION] Platform accepted the message');
        return { ok: true, status: status, body: parsedBody };
      } else {
        console.log('[VERIFICATION] Platform returned 200 but message might not be delivered');
        return { ok: false, status: status, body: parsedBody, reason: 'platform_accepted_but_no_ack' };
      }
    } else {
      console.log('[VERIFICATION] Platform rejected the message');
      return { ok: false, status: status, body: parsedBody, reason: 'platform_rejected' };
    }
  } catch (error) {
    console.error('[ERROR] Platform payload verification failed:', error.message);
    return { ok: false, reason: 'network_error', error: error.message };
  }
}

// Step 2: Image URL Reachability Verification (Platform Perspective)
async function verifyImageUrlReachability(imageUrl) {
  console.log(`\n=== Step 2: Image URL Reachability Verification ===`);
  console.log(`Testing URL: ${imageUrl}`);
  
  try {
    // Simulate platform server perspective
    const response = await fetch(imageUrl, {
      method: 'HEAD', // Use HEAD to avoid downloading the entire image
      redirect: 'manual' // Don't follow redirects
    });
    
    // Check URL requirements
    const isHttps = imageUrl.startsWith('https://');
    const isSuccess = response.status === 200;
    const isRedirect = response.status >= 300 && response.status < 400;
    const isForbidden = response.status === 403;
    
    const result = isHttps && isSuccess && !isRedirect && !isForbidden;
    
    console.log('[IMAGE_URL_PLATFORM_FETCH_OK]', result);
    console.log(`[DETAILS] HTTPS: ${isHttps}, Status: ${response.status}, Redirect: ${isRedirect}, Forbidden: ${isForbidden}`);
    
    if (result) {
      console.log('[VERIFICATION] Image URL is platform-reachable');
    } else {
      console.log('[VERIFICATION] Image URL is NOT platform-reachable');
    }
    
    return result;
  } catch (error) {
    console.error('[ERROR] Image URL verification failed:', error.message);
    console.log('[IMAGE_URL_PLATFORM_FETCH_OK]', false);
    return false;
  }
}

// Step 3: Message ID Receipt Verification
function verifyMessageIdAck(responseBody) {
  console.log(`\n=== Step 3: Message ID Receipt Verification ===`);
  
  if (!responseBody) {
    console.log('[IMAGE_OUTBOUND_ACK_VALID]', false);
    console.log('[VERIFICATION] No response body received');
    return false;
  }
  
  // Check for message ID in response
  const hasMessageId = !!(responseBody.messageId || responseBody.mid || responseBody.id || responseBody.message_id);
  
  console.log('[IMAGE_OUTBOUND_ACK_VALID]', hasMessageId);
  
  if (hasMessageId) {
    console.log('[VERIFICATION] Valid message ID received');
  } else {
    console.log('[VERIFICATION] No valid message ID received (false success)');
  }
  
  return hasMessageId;
}

// Step 4: Final Decision
function makeFinalDecision(step1Results, step2Result, step3Results) {
  console.log(`\n=== Step 4: Final Decision ===`);
  
  // Check if all platforms passed
  const allPlatformsOk = step1Results.every(result => result.ok);
  const allMessageIdsValid = step3Results.every(result => result);
  
  // Check for specific issues
  const hasUrlIssue = !step2Result;
  const hasPlatformIssue = step1Results.some(result => result.reason);
  const hasMessageIdIssue = !allMessageIdsValid;
  
  // Make final decision
  let decision = 'A'; // Default: System is correct
  let reason = '';
  
  if (hasUrlIssue) {
    decision = 'C';
    reason = 'URL';
  } else if (hasPlatformIssue || hasMessageIdIssue) {
    decision = 'B';
    reason = 'payload';
  }
  
  console.log('[IMAGE_OUTBOUND_FINAL_DECISION]', decision);
  
  // Output final verdict
  console.log(`\n【最终裁决】`);
  console.log(`图片发送链路在系统侧：${allPlatformsOk && step2Result && allMessageIdsValid ? 'PASS' : 'FAIL'}`);
  console.log(`失败唯一原因：${reason || '无'}`);
  console.log(`是否允许进入 Freeze：${allPlatformsOk && step2Result && allMessageIdsValid ? 'YES' : 'NO'}`);
  
  return {
    verdict: allPlatformsOk && step2Result && allMessageIdsValid ? 'PASS' : 'FAIL',
    reason: reason,
    freezeAllowed: allPlatformsOk && step2Result && allMessageIdsValid
  };
}

// Main test function
async function runTests() {
  console.log('=== Image Outbound Channel Final Verification ===\n');
  
  // Run tests for all platforms
  const step1Results = [];
  const step3Results = [];
  
  for (const testCase of testCases) {
    const step1Result = await verifyPlatformPayload(testCase);
    step1Results.push(step1Result);
    
    const step3Result = verifyMessageIdAck(step1Result.body);
    step3Results.push(step3Result);
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
  
  // Run URL reachability test
  const step2Result = await verifyImageUrlReachability(TEST_IMAGE_URL);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Make final decision
  const finalDecision = makeFinalDecision(step1Results, step2Result, step3Results);
  
  return finalDecision;
}

// Run the tests
runTests().catch(error => {
  console.error('[ERROR] Test execution failed:', error.message);
  process.exit(1);
});