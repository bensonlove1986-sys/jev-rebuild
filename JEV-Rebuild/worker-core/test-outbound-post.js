// Test script to verify the fix for POST not being triggered
// This script directly tests the /api/outbound/daojie endpoint

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8787';

// Test cases for different scenarios
const testCases = [
  {
    name: 'Image only - Instagram',
    payload: {
      customer_id: 'test-customer-123',
      channel_id: 29, // Instagram channel ID
      image_url: 'https://picsum.photos/600/400',
      platform: 'instagram'
    }
  },
  {
    name: 'Image only - WhatsApp',
    payload: {
      customer_id: 'test-customer-123',
      channel_id: 19, // WhatsApp channel ID
      image_url: 'https://picsum.photos/600/400',
      platform: 'whatsapp'
    }
  }
];

async function runTest() {
  console.log('=== Testing POST /api/outbound/daojie endpoint ===\n');
  
  for (const testCase of testCases) {
    console.log(`=== Test: ${testCase.name} ===`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/outbound/daojie`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.payload)
      });
      
      const status = response.status;
      const body = await response.json();
      
      console.log(`Response status: ${status}`);
      console.log('Response body:', body);
      
      if (status >= 200 && status < 300) {
        console.log('✅ Test PASSED');
      } else {
        console.log('❌ Test FAILED');
      }
      
      console.log('');
    } catch (error) {
      console.error('❌ Test FAILED with error:', error.message);
      console.log('');
    }
  }
  
  console.log('=== Test completed ===');
}

runTest().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
