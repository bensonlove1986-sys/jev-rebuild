const https = require('https');
const http = require('http');

// 测试API响应
const testApi = () => {
  const options = {
    hostname: 'localhost',
    port: 8787,
    path: '/api/inbox/customers',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('API Response:', JSON.stringify(result, null, 2));
        
        // 检查返回的客户数据是否包含stable_name字段
        if (result.customers && Array.isArray(result.customers)) {
          console.log('\n=== Customers Analysis ===');
          result.customers.forEach((customer, index) => {
            console.log(`\nCustomer ${index + 1}:`);
            console.log(`- customer_id: ${customer.customer_id}`);
            console.log(`- stable_name: ${customer.stable_name}`);
            console.log(`- display_name: ${customer.display_name}`);
            console.log(`- customer_name: ${customer.customer_name}`);
            console.log(`- real_name: ${customer.real_name}`);
          });
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('API Request Error:', error);
  });

  req.end();
};

// 运行测试
testApi();
