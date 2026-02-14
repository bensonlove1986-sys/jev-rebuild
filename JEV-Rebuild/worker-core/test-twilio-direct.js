// Test script to directly test Twilio API credentials
const accountSid = 'ACee45c048bea1ac15047eab84b39f8147';
const authToken = '55f1dfc50eb7063806400b5a9acfb1c3';
const mediaUrl = 'https://api.twilio.com/2010-04-01/Accounts/ACee45c048bea1ac15047eab84b39f8147/Messages/MM7f7947a34cd087f792917b22845614c2/Media/ME6461cf51e3354cedf4192bcfff0acf0f';

async function testTwilioDirectAccess() {
  try {
    console.log('Testing Twilio direct access...');
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
      console.log('Failed to fetch media directly from Twilio');
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

testTwilioDirectAccess();
