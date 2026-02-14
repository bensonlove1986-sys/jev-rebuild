// Test script for AI reply strategy based on deal stage
import http from 'http';

// Helper function to make HTTP POST requests
const postRequest = (path, data) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8787,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(responseData));
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify(data));
    req.end();
  });
};

// Test cases for different deal stages
const testCases = [
  {
    name: 'CHAT Stage Test',
    customerId: 'test-chat-123',
    message: 'Hey, how are you?',
    expectedStage: 'CHAT',
    contextMessages: [
      {
        role: 'customer',
        text: 'Hey, how are you?',
        timestamp: Date.now()
      }
    ]
  },
  {
    name: 'INQUIRY Stage Test',
    customerId: 'test-inquiry-456',
    message: 'What\'s the price of your temperature sensors?',
    expectedStage: 'INQUIRY',
    contextMessages: [
      {
        role: 'customer',
        text: 'What\'s the price of your temperature sensors?',
        timestamp: Date.now()
      }
    ]
  },
  {
    name: 'ORDER Stage Test',
    customerId: 'test-order-789',
    message: 'I want to order 100 units of sensor model X',
    expectedStage: 'ORDER',
    contextMessages: [
      {
        role: 'customer',
        text: 'I want to order 100 units of sensor model X',
        timestamp: Date.now()
      }
    ]
  }
];

// Run all test cases
async function runTests() {
  console.log('=== Testing AI Reply Strategy Based on Deal Stage ===\n');
  
  for (const testCase of testCases) {
    console.log(`Running: ${testCase.name}`);
    console.log(`Customer ID: ${testCase.customerId}`);
    console.log(`Message: ${testCase.message}`);
    console.log(`Expected Stage: ${testCase.expectedStage}`);
    
    try {
      // First, simulate inbound message to trigger deal stage detection
      await postRequest('/api/inbound/daojie', {
        customer_id: testCase.customerId,
        text: testCase.message,
        channel_id: 19,
        platform: 'whatsapp'
      });
      
      // Then, get AI reply suggestion
      const aiReply = await postRequest('/api/ai/reply/suggest', {
        customerId: testCase.customerId,
        contextMessages: testCase.contextMessages,
        scene: 'CHAT',
        targetLang: 'en'
      });
      
      console.log(`AI Reply: ${aiReply.reply}`);
      console.log(`Status: ${aiReply.ok ? 'SUCCESS' : 'FAILED'}`);
      console.log('---');
    } catch (error) {
      console.error(`Error: ${error.message}`);
      console.log('---');
    }
  }
  
  console.log('=== All Tests Completed ===');
}

// Run the tests
runTests();
