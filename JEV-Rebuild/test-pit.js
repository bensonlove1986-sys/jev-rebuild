const http = require('http');

const timestamp = Date.now();
const data = JSON.stringify({
  contactId: 'GakCvF3msAuChq2DtER9',
  message: `ping-${timestamp}`
});

const options = {
  hostname: 'localhost',
  port: 8787,
  path: '/api/daojie/pit/reply',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(data);
req.end();