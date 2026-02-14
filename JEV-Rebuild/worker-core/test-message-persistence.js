// Test script to verify message persistence fix
// Run this script to test if sent messages are stored in inbox KV and can be retrieved

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8787';
const TEST_CUSTOMER_ID = 'test-customer-123';
const TEST_MESSAGE = 'Hello, this is a test message to verify persistence!';

async function testMessagePersistence() {
  console.log('=== Testing Message Persistence Fix ===\n');
  
  // Step 1: Send a test message
  console.log('Step 1: Sending test message...');
  const sendResponse = await fetch(`${BASE_URL}/api/daojie/pit/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contactId: TEST_CUSTOMER_ID,
      message: TEST_MESSAGE,
      locationId: 'test-location-123'
    })
  });
  
  const sendResult = await sendResponse.json();
  console.log('Send Response:', sendResult);
  
  if (!sendResult.ok) {
    console.error('Failed to send message:', sendResult);
    return;
  }
  
  const messageId = sendResult.message_id;
  console.log('Message sent successfully! Message ID:', messageId);
  
  // Step 2: Pull messages (simulate page refresh)
  console.log('\nStep 2: Pulling messages (simulating page refresh)...');
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
      direction: m.direction,
      timestamp: m.timestamp
    })),
    cursor: pullResult.cursor,
    hasMore: pullResult.hasMore
  });
  
  // Step 3: Verify the sent message is in the pulled messages
  console.log('\nStep 3: Verifying message persistence...');
  
  // 查找最新的消息，应该是我们刚发送的那条
  const latestMessage = pullResult.messages[pullResult.messages.length - 1];
  
  if (latestMessage && latestMessage.text === TEST_MESSAGE) {
    console.log('✅ SUCCESS: Sent message found in inbox pull!');
    console.log('Verified Message:', {
      message_id: latestMessage.message_id,
      text: latestMessage.text,
      direction: latestMessage.direction || 'out',
      timestamp: latestMessage.timestamp
    });
    
    console.log('✅ SUCCESS: Message content matches!');
    console.log('✅ SUCCESS: Message is persisted in inbox!');
    console.log('✅ SUCCESS: Refresh persistence test passed!');
    
  } else {
    console.error('❌ FAILURE: Sent message not found in inbox pull!');
    console.error('Expected message text:', TEST_MESSAGE);
    console.error('Latest message found:', latestMessage);
    console.error('All pulled messages:', pullResult.messages);
  }
  
  console.log('\n=== Test Complete ===');
}

testMessagePersistence().catch(console.error);
