// Test script to verify the /api/inbox/pull endpoint fix
import fetch from 'node-fetch';

const API_URL = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';
const ENDPOINT = '/api/inbox/pull';

async function testInboxPull() {
  console.log('Testing /api/inbox/pull endpoint...');
  
  try {
    // First request with since=0
    console.log('\n=== First Request (since=0) ===');
    const response1 = await fetch(`${API_URL}${ENDPOINT}?since=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data1 = await response1.json();
    console.log('Response:', JSON.stringify(data1, null, 2));
    
    // Verify required fields
    if (!('next_cursor' in data1)) {
      throw new Error('Missing next_cursor field');
    }
    
    if (!('has_more' in data1)) {
      throw new Error('Missing has_more field');
    }
    
    if (!Array.isArray(data1.messages)) {
      throw new Error('messages must be an array');
    }
    
    console.log('✓ All required fields are present');
    console.log(`✓ next_cursor: ${data1.next_cursor}`);
    console.log(`✓ has_more: ${data1.has_more}`);
    console.log(`✓ messages.length: ${data1.messages.length}`);
    
    // Verify next_cursor is greater than 0 if there are messages
    if (data1.messages.length > 0 && data1.next_cursor <= 0) {
      throw new Error('next_cursor should be > 0 when messages are returned');
    }
    
    // Verify next_cursor equals since when no messages
    if (data1.messages.length === 0 && data1.next_cursor !== 0) {
      throw new Error('next_cursor should equal since when no messages');
    }
    
    console.log('✓ next_cursor value is correct');
    
    // Second request with since=next_cursor
    console.log('\n=== Second Request (since=next_cursor) ===');
    const response2 = await fetch(`${API_URL}${ENDPOINT}?since=${data1.next_cursor}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data2 = await response2.json();
    console.log('Response:', JSON.stringify(data2, null, 2));
    
    // Verify next_cursor is present in second response
    if (!('next_cursor' in data2)) {
      throw new Error('Missing next_cursor field in second response');
    }
    
    // Verify next_cursor is monotonic
    if (data2.next_cursor < data1.next_cursor) {
      throw new Error('next_cursor is not monotonic');
    }
    
    console.log('✓ Second response also has next_cursor field');
    console.log('✓ next_cursor is monotonic');
    
    console.log('\n✅ All tests passed! The /api/inbox/pull endpoint is working correctly.');
    
    return {
      first_request: data1,
      second_request: data2,
      success: true
    };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testInboxPull();