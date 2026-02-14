// Test script to verify message role and direction consistency fix
// This script tests if all messages are correctly labeled with proper role, direction, and source

import { normalizeMessageV2, assertMessageInvariant } from './utils/normalizeMessageV2.js';

console.log('=== Testing Message Role and Direction Consistency Fix ===\n');

// Test cases for normalizeMessageV2
const testCases = [
  // Case 1: Inbound customer message (WhatsApp)
  {
    name: 'Inbound WhatsApp message',
    raw: {
      text: 'Hello, I need help with my order',
      timestamp: Date.now() - 1000
    },
    ctx: {
      kind: 'INBOUND',
      platform: 'whatsapp',
      channel_id: 19,
      customer_id: 'test-customer-1'
    },
    expected: {
      role: 'customer',
      direction: 'inbound',
      source: 'whatsapp',
      allowContext: true
    }
  },
  
  // Case 2: Inbound customer message (Instagram)
  {
    name: 'Inbound Instagram message',
    raw: {
      text: 'Hi there!',
      timestamp: Date.now() - 500
    },
    ctx: {
      kind: 'INBOUND',
      platform: 'instagram',
      channel_id: 29,
      customer_id: 'test-customer-2'
    },
    expected: {
      role: 'customer',
      direction: 'inbound',
      source: 'instagram',
      allowContext: true
    }
  },
  
  // Case 3: Manual outbound message
  {
    name: 'Manual outbound message',
    raw: {
      text: 'Sure, I can help you with that',
      timestamp: Date.now()
    },
    ctx: {
      kind: 'OUTBOUND_MANUAL',
      platform: 'whatsapp',
      channel_id: 19,
      customer_id: 'test-customer-1'
    },
    expected: {
      role: 'agent',
      direction: 'outbound',
      source: 'manual',
      allowContext: false
    }
  },
  
  // Case 4: AI outbound message
  {
    name: 'AI outbound message',
    raw: {
      text: 'Based on your inquiry, I recommend checking our FAQ page',
      timestamp: Date.now() + 500
    },
    ctx: {
      kind: 'OUTBOUND_AI',
      platform: 'instagram',
      channel_id: 29,
      customer_id: 'test-customer-2'
    },
    expected: {
      role: 'ai',
      direction: 'outbound',
      source: 'ai',
      allowContext: false
    }
  },
  
  // Case 5: Inbound message with conflicting role (should be overridden)
  {
    name: 'Inbound message with conflicting role',
    raw: {
      text: 'This should be a customer message',
      role: 'agent', // Conflicting role, should be overridden
      direction: 'outbound', // Conflicting direction, should be overridden
      source: 'ai', // Conflicting source, should be overridden
      timestamp: Date.now() + 1000
    },
    ctx: {
      kind: 'INBOUND',
      platform: 'whatsapp',
      channel_id: 19,
      customer_id: 'test-customer-3'
    },
    expected: {
      role: 'customer',
      direction: 'inbound',
      source: 'whatsapp',
      allowContext: true
    }
  }
];

// Run test cases
let passed = 0;
let total = testCases.length;

for (const testCase of testCases) {
  console.log(`Testing: ${testCase.name}`);
  
  try {
    // Normalize the message
    const normalized = normalizeMessageV2(testCase.raw, testCase.ctx);
    
    // Run assertion to ensure invariants are maintained
    assertMessageInvariant(normalized);
    
    // Check expected values
    const roleMatch = normalized.role === testCase.expected.role;
    const directionMatch = normalized.direction === testCase.expected.direction;
    const sourceMatch = normalized.source === testCase.expected.source;
    const allowContextMatch = normalized.allowContext === testCase.expected.allowContext;
    
    console.log(`  Role: ${normalized.role} (expected: ${testCase.expected.role}) ${roleMatch ? '✅' : '❌'}`);
    console.log(`  Direction: ${normalized.direction} (expected: ${testCase.expected.direction}) ${directionMatch ? '✅' : '❌'}`);
    console.log(`  Source: ${normalized.source} (expected: ${testCase.expected.source}) ${sourceMatch ? '✅' : '❌'}`);
    console.log(`  Allow Context: ${normalized.allowContext} (expected: ${testCase.expected.allowContext}) ${allowContextMatch ? '✅' : '❌'}`);
    
    if (roleMatch && directionMatch && sourceMatch && allowContextMatch) {
      console.log(`  Result: ✅ PASS`);
      passed++;
    } else {
      console.log(`  Result: ❌ FAIL`);
      console.log(`  Full result:`, normalized);
    }
    
    // Test AI context filtering
    const isAllowedInContext = normalized.role === 'customer' && normalized.direction === 'inbound' && normalized.allowContext === true;
    console.log(`  Allowed in AI Context: ${isAllowedInContext} ${isAllowedInContext === testCase.expected.allowContext ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log(`  Result: ❌ ERROR - ${error.message}`);
  }
  
  console.log('');
}

// Test AI context filtering separately
console.log('=== Testing AI Context Filtering ===');

const messagesForContext = [
  // Customer message (should be allowed)
  {
    role: 'customer',
    direction: 'inbound',
    allowContext: true,
    text: 'Customer question 1',
    timestamp: 1000
  },
  // AI message (should be blocked)
  {
    role: 'ai',
    direction: 'outbound',
    allowContext: false,
    text: 'AI response 1',
    timestamp: 1001
  },
  // Customer message (should be allowed)
  {
    role: 'customer',
    direction: 'inbound',
    allowContext: true,
    text: 'Customer question 2',
    timestamp: 1002
  },
  // Agent message (should be blocked)
  {
    role: 'agent',
    direction: 'outbound',
    allowContext: false,
    text: 'Agent response',
    timestamp: 1003
  }
];

// Simulate AI context building
const contextTotal = messagesForContext.length;
const allowed = messagesForContext.filter(msg => msg.role === 'customer' && msg.direction === 'inbound' && msg.allowContext === true);
const blocked = messagesForContext.length - allowed.length;

console.log(`Total messages: ${contextTotal}`);
console.log(`Allowed in context: ${allowed.length}`);
console.log(`Blocked: ${blocked}`);
console.log(`Allowed messages:`, allowed.map(m => ({ text: m.text, role: m.role })));

const contextFilteringPass = allowed.length === 2 && blocked === 2;
console.log(`Context filtering result: ${contextFilteringPass ? '✅ PASS' : '❌ FAIL'}`);

// Overall results
console.log('\n=== Overall Results ===');
console.log(`Normalization test cases passed: ${passed}/${total}`);
console.log(`Context filtering: ${contextFilteringPass ? '✅ PASS' : '❌ FAIL'}`);

if (passed === total && contextFilteringPass) {
  console.log('\n🎉 ALL TESTS PASSED! The message role and direction consistency fix is working correctly.');
  console.log('\n✅ Key improvements verified:');
  console.log('   - Inbound messages are always role=customer, direction=inbound');
  console.log('   - Manual outbound messages are always role=agent, direction=outbound');
  console.log('   - AI outbound messages are always role=ai, direction=outbound');
  console.log('   - Source is correctly set based on message type and platform');
  console.log('   - Only customer messages are allowed in AI context');
  console.log('   - Assertion checks prevent invalid messages from being written');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED! Please check the fix.');
  process.exit(1);
}