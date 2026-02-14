import https from 'https';

// 测试的 Twilio Media URL
const mediaUrl = 'https://api.twilio.com/2010-04-01/Accounts/ACee45c048bea1ac15047eab84b39f8147/Media/ME123456';

// 编码 Media URL
const encodedMediaUrl = encodeURIComponent(mediaUrl);

// 构建代理 URL
const proxyUrl = `https://jev-rebuild-worker.bensonlove1986.workers.dev/api/proxy/twilio/media/${encodedMediaUrl}`;

console.log('Testing Media Proxy...');
console.log('Original Media URL:', mediaUrl);
console.log('Encoded Media URL:', encodedMediaUrl);
console.log('Proxy URL:', proxyUrl);

// 发起请求
const req = https.request(proxyUrl, (res) => {
  console.log('\nResponse:');
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = [];
  res.on('data', (chunk) => {
    data.push(chunk);
  });
  
  res.on('end', () => {
    const buffer = Buffer.concat(data);
    console.log('Response length:', buffer.length, 'bytes');
    console.log('Content-Type:', res.headers['content-type']);
    
    if (buffer.length > 0 && res.headers['content-type']?.includes('image/')) {
      console.log('\n✅ Success: Received image data');
    } else {
      console.log('\n❌ Error: No image data received');
      console.log('Response body:', buffer.toString());
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ Request error:', e.message);
});

req.end();
