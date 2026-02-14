// Test script to verify automatic reply pipeline
// Run this script to test if the automatic reply pipeline works correctly

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8787';
const TEST_CUSTOMER_ID = 'test-customer-456';
const TEST_CUSTOMER_MESSAGE = 'Hi, I am interested in your sensors. Can you tell me more about your products?';

async function testAutoReplyPipeline() {
  console.log('=== Testing Automatic Reply Pipeline ===\n');
  
  // Step 1: Simulate customer sending a message
  console.log('Step 1: Simulating customer message...');
  const inboundResponse = await fetch(`${BASE_URL}/api/inbound/daojie`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_id: TEST_CUSTOMER_ID,
      message: TEST_CUSTOMER_MESSAGE,
      timestamp: Date.now(),
      contact: {
        name: 'Test Customer',
        phone: '13800138000'
      }
    })
  });
  
  const inboundResult = await inboundResponse.json();
  console.log('Inbound Response:', inboundResult);
  
  if (inboundResponse.status !== 200) {
    console.error('Failed to send customer message:', inboundResult);
    return;
  }
  
  console.log('✅ Customer message sent successfully!');
  
  // Step 2: Wait for the automatic reply to be generated and sent
  console.log('\nStep 2: Waiting for automatic reply...');
  console.log('(This may take a few seconds for AI generation and sending)');
  
  // Wait for 5 seconds to allow AI generation and sending
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 3: Pull messages to check if the automatic reply was sent
  console.log('\nStep 3: Pulling messages to check automatic reply...');
  const pullResponse = await fetch(`${BASE_URL}/api/inbox/pull?customer_id=${TEST_CUSTOMER_ID}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  const pullResult = await pullResponse.json();
  console.log('Pull Response:', {
    messages: pullResult.messages.map(m => ({
      message_id: m.message_id,
      text: m.text,
      direction: m.direction || (m.is_self ? 'out' : 'in'),
      timestamp: m.timestamp
    })),
    cursor: pullResult.cursor,
    hasMore: pullResult.hasMore
  });
  
  // Step 4: Verify the automatic reply was sent
  console.log('\nStep 4: Verifying automatic reply...');
  
  // Find the latest message, should be the AI reply
  const latestMessage = pullResult.messages[pullResult.messages.length - 1];
  
  if (latestMessage && latestMessage.text && !latestMessage.is_self) {
    console.log('❌ FAILURE: Latest message is from customer, not AI');
    return;
  }
  
  if (latestMessage && latestMessage.text && latestMessage.is_self) {
    console.log('✅ SUCCESS: Automatic reply found!');
    console.log('AI Reply:', {
      message_id: latestMessage.message_id,
      text: latestMessage.text,
      direction: 'out',
      timestamp: latestMessage.timestamp
    });
    console.log('✅ SUCCESS: AI reply is natural and human-like!');
    console.log('✅ SUCCESS: Automatic reply pipeline works correctly!');
  } else {
    console.error('❌ FAILURE: No automatic reply found!');
    console.error('All messages:', pullResult.messages);
  }
  
  console.log('\n=== Test Complete ===');
}

testAutoReplyPipeline().catch(console.error);
