// 简单的网络诊断脚本
// 目标：检测Windows环境下Node.js网络连接问题

console.log('\n🔍 Node.js网络诊断 - 简化版');
console.log('='.repeat(40));
console.log(`Node.js版本: ${process.version}`);
console.log(`操作系统: ${process.platform} ${process.arch}`);
console.log('='.repeat(40));

// 检查Windows代理设置
console.log('\n🔍 检查Windows代理设置...');
try {
  const { execSync } = require('child_process');
  const proxySettings = execSync('netsh winhttp show proxy', { encoding: 'utf8' });
  console.log('Windows代理设置:');
  console.log(proxySettings);
} catch (e) {
  console.log('无法获取Windows代理设置:', e.message);
}

// 检查hosts文件
console.log('\n🔍 检查hosts文件...');
try {
  const hostsPath = 'C:\\Windows\\System32\\drivers\\etc\\hosts';
  const fs = require('fs');
  if (fs.existsSync(hostsPath)) {
    const hostsContent = fs.readFileSync(hostsPath, 'utf8');
    const lines = hostsContent.split('\n');
    console.log(`Hosts文件行数: ${lines.length}`);
    console.log('是否包含jevshop相关条目:', lines.some(line => line.includes('jevshop')));
  } else {
    console.log('hosts文件不存在');
  }
} catch (e) {
  console.log('无法读取hosts文件:', e.message);
}

// 简单的TCP连接测试
console.log('\n🔍 TCP连接测试...');
const net = require('net');

function testTcpConnection(host, port, family = 4) {
  return new Promise((resolve) => {
    console.log(`\n测试 ${host}:${port} (IPv${family})...`);
    const socket = new net.Socket();
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      console.log(`✅ TCP连接成功: ${host}:${port}`);
      socket.end();
      resolve(true);
    });
    
    socket.on('error', (err) => {
      console.log(`❌ TCP连接失败: ${err.message}`);
      resolve(false);
    });
    
    socket.on('timeout', () => {
      console.log(`❌ TCP连接超时`);
      socket.destroy();
      resolve(false);
    });
    
    socket.connect({ port, host, family });
  });
}

// 运行TCP测试
testTcpConnection('8.8.8.8', 53).then(() => {
  console.log('\n📝 诊断总结：');
  console.log('1. 检查Windows防火墙是否阻止Node.js访问网络');
  console.log('2. 检查是否有VPN或安全软件拦截HTTPS连接');
  console.log('3. 尝试使用HTTP版本的测试（如果可用）');
  console.log('4. 考虑临时禁用Windows防火墙进行测试');
  console.log('\n💡 关键线索：');
  console.log('- cURL成功但Node.js失败，说明是Node.js特定的网络问题');
  console.log('- 出现127.0.0.1:443错误，可能是本地代理或安全软件');
});
