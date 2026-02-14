// Test script to verify Twilio API credentials
const accountSid = 'ACee45c048bea1ac15047eab84b39f8147';
const authToken = '55f1dfc50eb7063806400b5a9acfb1c3';
const mediaUrl = 'https://api.twilio.com/2010-04-01/Accounts/ACee45c048bea1ac15047eab84b39f8147/Messages/MM678a3cf37372c8417b24b97d8284bf10/Media/MEad1d3e3f7acd019a6ede1ae8da31f49d';

async function testTwilioMediaAccess() {
  try {
    console.log('Testing Twilio media access...');
    console.log('Account SID:', accountSid);
    console.log('Auth Token length:', authToken.length);
    console.log('Media URL:', mediaUrl);
    
    // Create auth header
    const authHeader = `Basic ${btoa(`${accountSid}:${authToken}`)}`;
    console.log('Auth header created successfully');
    
    // Test fetch
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'JEV-Rebuild-Worker'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      console.log('Success!');
      console.log('Content-Type:', contentType);
      console.log('Content-Length:', contentLength);
    } else {
      console.log('Failed to fetch media');
      try {
        const errorText = await response.text();
        console.log('Error response:', errorText);
      } catch (e) {
        console.log('Failed to read error response:', e);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testTwilioMediaAccess();
