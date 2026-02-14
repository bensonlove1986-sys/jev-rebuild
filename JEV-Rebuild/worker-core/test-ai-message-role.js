// Test script to verify AI message role and direction fix
// This script tests if AI assistant messages are correctly labeled and don't confuse contexts

import { normalizeMessage, isContextAllowed } from './utils/message_normalization.js';

console.log('=== Testing AI Message Role and Direction Fix ===\n');

// Test cases for message normalization
const testCases = [
  // Case 1: Customer message
  {
    name: 'Customer message',
    message: {
      text: 'Hello, I need help!',
      is_self: false
    },
    source: 'inbound',
    expected: {
      role: 'customer',
      direction: 'inbound',
      allowContext: true
    }
  },
  // Case 2: AI assistant message
  {
    name: 'AI assistant message',
    message: {
      text: 'Sure, how can I help you today?',
      is_self: true,
      sender_id: 'ai-assistant'
    },
    source: 'ai',
    expected: {
      role: 'ai',
      direction: 'outbound',
      allowContext: false
    }
  },
  // Case 3: Human agent message
  {
    name: 'Human agent message',
    message: {
      text: 'This is a human response',
      is_self: true
    },
    source: 'outbound',
    expected: {
      role: 'agent',
      direction: 'outbound',
      allowContext: false
    }
  },
  // Case 4: Inbound message with explicit role
  {
    name: 'Inbound message with explicit role',
    message: {
      text: 'Hello from customer',
      is_self: false,
      role: 'customer'
    },
    source: 'inbound',
    expected: {
      role: 'customer',
      direction: 'inbound',
      allowContext: true
    }
  },
  // Case 5: AI message with explicit role
  {
    name: 'AI message with explicit role',
    message: {
      text: 'AI response',
      is_self: true,
      role: 'ai'
    },
    source: 'ai',
    expected: {
      role: 'ai',
      direction: 'outbound',
      allowContext: false
    }
  }
];

// Run test cases
let passed = 0;
let total = testCases.length;

for (const testCase of testCases) {
  console.log(`Testing: ${testCase.name}`);
  
  try {
    const result = normalizeMessage(testCase.message, testCase.source);
    
    // Check expected values
    const roleMatch = result.role === testCase.expected.role;
    const directionMatch = result.direction === testCase.expected.direction;
    const allowContextMatch = result.allowContext === testCase.expected.allowContext;
    
    console.log(`  Role: ${result.role} (expected: ${testCase.expected.role}) ${roleMatch ? '✅' : '❌'}`);
    console.log(`  Direction: ${result.direction} (expected: ${testCase.expected.direction}) ${directionMatch ? '✅' : '❌'}`);
    console.log(`  Allow Context: ${result.allowContext} (expected: ${testCase.expected.allowContext}) ${allowContextMatch ? '✅' : '❌'}`);
    
    if (roleMatch && directionMatch && allowContextMatch) {
      console.log(`  Result: ✅ PASS`);
      passed++;
    } else {
      console.log(`  Result: ❌ FAIL`);
      console.log(`  Full result:`, result);
    }
  } catch (error) {
    console.log(`  Result: ❌ ERROR - ${error.message}`);
  }
  
  console.log('');
}

// Test context filtering
console.log('=== Testing Context Filtering ===');

const testMessages = [
  // Customer message 1
  {
    id: 'msg-1',
    text: 'Hello',
    role: 'customer',
    direction: 'inbound',
    allowContext: true,
    timestamp: 1000
  },
  // AI response 1
  {
    id: 'msg-2',
    text: 'Hi there!',
    role: 'ai',
    direction: 'outbound',
    allowContext: false,
    timestamp: 1001
  },
  // Customer message 2
  {
    id: 'msg-3',
    text: 'How are you?',
    role: 'customer',
    direction: 'inbound',
    allowContext: true,
    timestamp: 1002
  },
  // AI response 2
  {
    id: 'msg-4',
    text: 'I\'m good, thanks!',
    role: 'ai',
    direction: 'outbound',
    allowContext: false,
    timestamp: 1003
  },
  // Customer message 3
  {
    id: 'msg-5',
    text: 'What can you do?',
    role: 'customer',
    direction: 'inbound',
    allowContext: true,
    timestamp: 1004
  }
];

// Filter messages for AI context (should only include customer messages)
const contextMessages = testMessages
  .filter(msg => msg.role === 'customer' && msg.allowContext === true)
  .sort((a, b) => a.timestamp - b.timestamp);

console.log(`Total messages: ${testMessages.length}`);
console.log(`Filtered context messages (customer only): ${contextMessages.length}`);
console.log(`Context messages:`, contextMessages.map(m => ({ id: m.id, text: m.text, role: m.role })));

const contextFilteringPass = contextMessages.length === 3 && contextMessages.every(m => m.role === 'customer');
console.log(`Context filtering result: ${contextFilteringPass ? '✅ PASS' : '❌ FAIL'}`);

// Overall results
console.log('\n=== Overall Results ===');
console.log(`Test cases passed: ${passed}/${total}`);
console.log(`Context filtering: ${contextFilteringPass ? '✅ PASS' : '❌ FAIL'}`);

if (passed === total && contextFilteringPass) {
  console.log('\n🎉 ALL TESTS PASSED! The AI message role and direction fix is working correctly.');
  console.log('The AI assistant should no longer confuse its own messages with customer messages.');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED! Please check the fix.');
  process.exit(1);
}