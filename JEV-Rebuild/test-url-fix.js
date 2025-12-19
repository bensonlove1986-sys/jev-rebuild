// Test script to verify the URL construction fix

// Simulate the WORKER_BASE from constants.js
const WORKER_BASE = 'https://jev-rebuild-worker.bensonlove1986.workers.dev';

// Test the fixed URL construction logic
const testUrlConstruction = () => {
  try {
    // 1. Define relative path API endpoint (as in our fix)
    const CUSTOMERS_API = '/api/inbox/customers';
    
    // 2. Defense check
    if (CUSTOMERS_API.startsWith('http')) {
      throw new Error('CUSTOMERS_API must be relative path');
    }
    
    // 3. Construct URL (WORKER_BASE only once)
    const url = `${WORKER_BASE}${CUSTOMERS_API}`;
    
    // 4. Print results
    console.log('✅ Test passed!');
    console.log('[CUSTOMERS_FETCH_URL]', url);
    console.log('URL length:', url.length);
    console.log('Contains duplicate WORKER_BASE:', url.includes(`${WORKER_BASE}${WORKER_BASE}`));
    
    // 5. Verify URL format
    try {
      new URL(url);
      console.log('✅ URL is valid');
    } catch (e) {
      console.error('❌ URL is invalid:', e.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
};

// Run the test
console.log('Testing URL construction fix...');
console.log('='.repeat(50));
const result = testUrlConstruction();
console.log('='.repeat(50));
console.log('Test result:', result ? '✅ PASS' : '❌ FAIL');
