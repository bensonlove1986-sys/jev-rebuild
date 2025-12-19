// Test script to verify PIT JWT fix
import fetch from 'node-fetch';

async function testReplyToCustomer() {
  const url = 'https://jev-rebuild-worker.bensonlove1986.workers.dev/api/daojie/conversations/messages';
  
  const payload = {
    conversationId: 'test-conversation-123',
    contactId: 'test-contact-456',
    locationId: 'test-location-789',
    message: 'Hello from test script!'
  };

  console.log('Testing POST /api/daojie/conversations/messages...');
  console.log('URL:', url);
  console.log('Payload:', payload);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Note: No Authorization header sent from UI, as requested
      },
      body: JSON.stringify(payload)
    });
    
    console.log('\nResponse Status:', response.status);
    console.log('Response Headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));
    
    const responseBody = await response.text();
    console.log('Response Body:', responseBody);
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testReplyToCustomer();