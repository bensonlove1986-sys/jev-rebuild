// Test script to verify AI reply is based on the latest customer message
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

// Test case: Multiple customer messages
async function runTest() {
  console.log('=== Testing AI Reply Based on Latest Customer Message ===\n');
  
  const customerId = 'test-multi-messages-123';
  
  // Test context with multiple messages, including different roles and timestamps
  const contextMessages = [
    {
      id: 'msg-1',
      text: 'Hello, can you help me with some sensor products?',
      role: 'customer',
      is_self: false,
      timestamp: Date.now() - 30000 // 30 seconds ago
    },
    {
      id: 'msg-2',
      text: 'Hi! I\'d be happy to help. What type of sensors are you looking for?',
      role: 'operator',
      is_self: true,
      timestamp: Date.now() - 25000 // 25 seconds ago
    },
    {
      id: 'msg-3',
      text: 'I need information about proximity sensors.',
      role: 'customer',
      is_self: false,
      timestamp: Date.now() - 20000 // 20 seconds ago
    },
    {
      id: 'msg-4',
      text: 'Perfect! We offer a wide range of proximity sensors. Can you specify the model or specifications you need?',
      role: 'operator',
      is_self: true,
      timestamp: Date.now() - 15000 // 15 seconds ago
    },
    {
      id: 'msg-5',
      text: 'Omron Proximity Sensor\nModel No. : E2E-X3D1-M1G\nWith Connector Cable\nQty. 10 Pcs',
      role: 'customer',
      is_self: false,
      timestamp: Date.now() // latest message
    }
  ];
  
  console.log('Customer messages:');
  contextMessages.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.role}] ${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''} (${new Date(msg.timestamp).toLocaleTimeString()})`);
  });
  console.log('\nExpected: AI should reply to the latest message about Omron Proximity Sensor');
  
  try {
    // Call AI reply API
    const aiReply = await postRequest('/api/ai/reply/suggest', {
      customerId: customerId,
      contextMessages: contextMessages,
      scene: 'INQUIRY',
      targetLang: 'en'
    });
    
    console.log('\nAI Reply Result:');
    console.log('Status:', aiReply.ok ? 'SUCCESS' : 'FAILED');
    console.log('AI Reply:', aiReply.reply);
    console.log('Chinese Version:', aiReply.zh);
    console.log('Confidence:', aiReply.confidence);
    console.log('Source:', aiReply.source);
    
    // Verify the reply is relevant to the latest message
    const replyLower = aiReply.reply.toLowerCase();
    const latestMsgLower = contextMessages[contextMessages.length - 1].text.toLowerCase();
    
    const isRelevant = replyLower.includes('omron') || 
                      replyLower.includes('e2e-x3d1-m1g') || 
                      replyLower.includes('proximity') ||
                      replyLower.includes('10 pcs') ||
                      replyLower.includes('connector cable');
    
    console.log('\nTest Result:');
    console.log('Is AI reply relevant to latest message:', isRelevant ? '✅ YES' : '❌ NO');
    
    if (isRelevant) {
      console.log('✅ TEST PASSED: AI reply is based on the latest customer message!');
    } else {
      console.log('❌ TEST FAILED: AI reply is not based on the latest customer message!');
    }
    
  } catch (error) {
    console.error('Error during test:', error.message);
  }
  
  console.log('\n=== Test Completed ===');
}

// Run the test
runTest();
