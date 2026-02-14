// Test script to simulate Twilio inbound message
// This script will send a POST request to the Twilio webhook endpoint
// to test the text message persistence fix

import fetch from 'node-fetch';

const BASE_URL = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
const TEST_CUSTOMER_ID = 'whatsapp:+1234567890';
const TEST_MESSAGE = 'Hello, this is a test text message to verify persistence!';

async function testTwilioInboundMessage() {
  console.log('=== Testing Twilio Inbound Message Persistence ===\n');
  
  // Step 1: Simulate Twilio inbound message (text)
  console.log('Step 1: Sending simulated Twilio inbound text message...');
  
  // Create form data similar to what Twilio sends
  const formData = new URLSearchParams();
  formData.append('MessageSid', `SM${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  formData.append('From', TEST_CUSTOMER_ID);
  formData.append('To', 'whatsapp:+1234567890');
  formData.append('Body', TEST_MESSAGE);
  formData.append('NumMedia', '0');
  formData.append('ProfileName', 'Test User');
  formData.append('WaId', TEST_CUSTOMER_ID.replace('whatsapp:', ''));
  formData.append('AccountSid', 'ACee45c048bea1ac15047eab84b39f8147');
  
  const sendResponse = await fetch(`${BASE_URL}/api/inbound/whatsapp/twilio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });
  
  console.log('Send Response Status:', sendResponse.status);
  console.log('Send Response Status Text:', sendResponse.statusText);
  
  if (!sendResponse.ok) {
    console.error('Failed to send simulated Twilio message:', sendResponse.status);
    return;
  }
  
  console.log('Simulated Twilio message sent successfully!');
  
  // Step 2: Pull messages to verify persistence
  console.log('\nStep 2: Pulling messages to verify persistence...');
  
  const pullResponse = await fetch(`${BASE_URL}/api/inbox/pull?customer_id=${encodeURIComponent(TEST_CUSTOMER_ID)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  console.log('Pull Response Status:', pullResponse.status);
  
  if (!pullResponse.ok) {
    console.error('Failed to pull messages:', pullResponse.status);
    return;
  }
  
  const pullResult = await pullResponse.json();
  console.log('Pull Response:', {
    messages: pullResult.messages.map(m => ({
      id: m.id,
      text: m.text,
      ts: m.ts
    })),
    last_ts: pullResult.last_ts,
    messages_length: pullResult.messages.length
  });
  
  // Step 3: Verify the message is persisted
  console.log('\nStep 3: Verifying message persistence...');
  
  if (pullResult.messages.length > 0) {
    console.log('✅ SUCCESS: Messages found in inbox pull!');
    console.log('✅ SUCCESS: Text message persistence test passed!');
    console.log('✅ SUCCESS: Total messages:', pullResult.messages.length);
  } else {
    console.error('❌ FAILURE: No messages found in inbox pull!');
    console.error('❌ FAILURE: Text message persistence test failed!');
  }
  
  console.log('\n=== Test Complete ===');
}

testTwilioInboundMessage().catch(console.error);
