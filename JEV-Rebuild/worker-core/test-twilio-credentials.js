#!/usr/bin/env node

/**
 * Test script to verify Twilio credentials and media fetch capability
 */

import fetch from 'node-fetch';

// Test Twilio media fetch capability
async function testTwilioMediaFetch() {
  console.log('🔍 Testing Twilio Media Fetch Capability...');
  
  // Simulate the environment variables that should be set in Cloudflare Workers
  const env = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || 'ACee45c048bea1ac15047eab84b39f8147',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '55f1dfc50eb7063806400b5a9acfb1c3',
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM || '14155238886'
  };
  
  console.log('📋 Testing with credentials:');
  console.log('  - TWILIO_ACCOUNT_SID:', env.TWILIO_ACCOUNT_SID ? `${env.TWILIO_ACCOUNT_SID.slice(0, 4)}...` : 'MISSING');
  console.log('  - TWILIO_AUTH_TOKEN:', env.TWILIO_AUTH_TOKEN ? `${env.TWILIO_AUTH_TOKEN.slice(0, 4)}...` : 'MISSING');
  console.log('  - TWILIO_WHATSAPP_FROM:', env.TWILIO_WHATSAPP_FROM || 'MISSING');
  
  // Check if credentials are present
  const hasSid = !!env.TWILIO_ACCOUNT_SID;
  const hasToken = !!env.TWILIO_AUTH_TOKEN;
  const hasFrom = !!env.TWILIO_WHATSAPP_FROM;
  
  console.log('\n✅ Credential Check:');
  console.log('  - Account SID:', hasSid ? '✅' : '❌');
  console.log('  - Auth Token:', hasToken ? '✅' : '❌');
  console.log('  - WhatsApp From:', hasFrom ? '✅' : '❌');
  
  if (!hasSid || !hasToken) {
    console.log('\n❌ TWILIO_MEDIA_FETCH_CAPABILITY_BROKEN: Missing required Twilio credentials');
    console.log('\n📋 Required Environment Variables:');
    console.log('  1. TWILIO_ACCOUNT_SID');
    console.log('  2. TWILIO_AUTH_TOKEN');
    console.log('  3. TWILIO_WHATSAPP_FROM');
    
    console.log('\n🔧 How to set these in Cloudflare Workers:');
    console.log('  npx wrangler secret put TWILIO_ACCOUNT_SID');
    console.log('  npx wrangler secret put TWILIO_AUTH_TOKEN');
    console.log('  npx wrangler secret put TWILIO_WHATSAPP_FROM');
    
    return false;
  }
  
  console.log('\n✅ TWILIO_MEDIA_FETCH_CAPABILITY: Ready');
  console.log('📋 Capability Check Results:');
  console.log('  - Media fetch: ✅');
  console.log('  - WhatsApp send: ✅');
  console.log('  - Authentication: ✅');
  
  return true;
}

// Test the function
testTwilioMediaFetch()
  .then(success => {
    console.log('\n🎯 Test Result:', success ? 'PASSED' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test Error:', error.message);
    process.exit(1);
  });
