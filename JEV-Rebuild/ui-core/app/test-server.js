const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (d) => {
    process.stdout.write(d);
  });
  
  res.on('end', () => {
    console.log('\n\n✅ Server is running and responding correctly!');
  });
});

req.on('error', (error) => {
  console.error(`❌ Error connecting to server: ${error.message}`);
});

req.end();