// Test script to simulate Twilio inbound webhook with image
const http = require('http');

function testTwilioInboundImage() {
  console.log('Testing Twilio inbound webhook with image...');
  
  // Simulate Twilio webhook payload with image
  const formData = new URLSearchParams();
  formData.append('From', 'whatsapp:+8613800138000');
  formData.append('To', 'whatsapp:+14155238886');
  formData.append('Body', 'Test image message');
  formData.append('MessageSid', 'MM1234567890123456789');
  formData.append('NumMedia', '1');
  formData.append('MediaUrl0', 'https://api.twilio.com/2010-04-01/Accounts/AC1234567890123456789/Messages/MM1234567890123456789/Media/ME1234567890123456789');
  formData.append('MediaContentType0', 'image/jpeg');
  formData.append('MessageType', 'image');
  formData.append('ProfileName', 'Test User');
  formData.append('WaId', '8613800138000');
  
  const postData = formData.toString();
  
  const options = {
    hostname: 'localhost',
    port: 8787,
    path: '/api/inbound/whatsapp/twilio',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    console.log('Response status:', res.statusCode);
    console.log('Response headers:', res.headers);
    
    let responseBody = '';
    res.on('data', (chunk) => {
      responseBody += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', responseBody);
      console.log('Test completed successfully!');
    });
  });
  
  req.on('error', (e) => {
    console.error('Error during test:', e.message);
  });
  
  // Write data to request body
  req.write(postData);
  req.end();
}

testTwilioInboundImage();
