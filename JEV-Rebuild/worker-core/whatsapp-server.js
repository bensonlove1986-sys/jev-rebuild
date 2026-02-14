// 完全按照官方文档示例实现，使用正确的ES模块导入语法
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

console.log('Starting WhatsApp client initialization...');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());

// 创建Express应用
const app = express();

// 配置CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8787'],
  credentials: true
}));

// 创建HTTP服务器
const server = http.createServer(app);

// 创建Socket.io服务器
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8787', 'http://192.168.1.85:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket'], // 只允许websocket传输，禁用polling
  upgrade: false, // 禁止从polling升级到websocket
  allowEIO3: true // 兼容旧版客户端
});

// 使用LocalAuth配置，确保会话持久化，固定设备身份，避免命中风控
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'whatsapp-client', // 固定的clientId，确保设备身份不变
        dataPath: '.wwebjs_auth', // 会话数据存储目录，避免每次启动重新生成
        restoreSession: true // 恢复现有会话，避免频繁重新登录
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', // 使用标准浏览器UA
            '--disable-dev-shm-usage', // 禁用/dev/shm使用，避免内存问题
            '--disable-gpu', // 禁用GPU加速，减少环境差异
            '--window-size=1280,720' // 设置标准窗口大小
        ],
        defaultViewport: {
            width: 1280,
            height: 720
        },
        ignoreHTTPSErrors: true, // 忽略HTTPS错误
        slowMo: 100 // 减慢操作速度，模拟真实用户行为
    },
    takeoverOnConflict: true, // 允许接管冲突的会话
    takeoverTimeoutMs: 10000 // 接管超时时间
});

// 添加更多事件监听器以调试
client.on('loading_screen', (percent, message) => {
    console.log('Loading screen:', percent, message);
    io.emit('whatsapp:status', { status: 'loading', percent, message });
});

client.on('browser_ready', () => {
    console.log('Browser is ready!');
    io.emit('whatsapp:status', { status: 'browser_ready' });
});

client.on('auth_failure', msg => {
    console.error('Auth failure:', msg);
    io.emit('whatsapp:status', { status: 'error', message: msg });
});

client.on('disconnected', (reason) => {
    console.log('Disconnected:', reason);
    io.emit('whatsapp:status', { status: 'disconnected', reason });
});

client.on('change_state', (state) => {
    console.log('State changed:', state);
    io.emit('whatsapp:status', { status: state });
});

client.on('message_create', (message) => {
    console.log('Message created:', message.body);
    io.emit('whatsapp:message', { message });
});

// 捕获未处理的错误
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    console.error('Stack:', error.stack);
    io.emit('whatsapp:status', { status: 'error', message: error.message });
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    console.error('Stack:', error.stack);
    io.emit('whatsapp:status', { status: 'error', message: error.message });
});

// 添加QR码生成冷却机制，避免短时间内多次生成QR码，命中风控
let lastQRGenerated = 0;
const QR_COOLDOWN = 30000; // 30秒冷却期
let currentQR = null; // 存储当前QR码，避免重复发送

client.on('qr', qr => {
    const now = Date.now();
    
    // 检查冷却期，避免短时间内多次生成QR码
    if (now - lastQRGenerated < QR_COOLDOWN) {
        console.log('QR code generation skipped due to cooldown. Wait', QR_COOLDOWN/1000, 'seconds.');
        return;
    }
    
    // 检查是否与当前QR码相同，避免重复发送
    if (qr === currentQR) {
        console.log('Same QR code received, skipping emission.');
        return;
    }
    
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
    
    // 更新QR码状态
    lastQRGenerated = now;
    currentQR = qr;
    
    // 严格使用whatsapp-web.js qr事件返回的原始字符串发送到前端
    // 禁止任何形式的encodeURIComponent、decode、base64、JSON包装、字符串拼接或裁剪
    console.log('Emitting whatsapp:qr event to clients with raw qr string');
    io.emit('whatsapp:qr', { qr });
    io.emit('whatsapp:status', { status: 'qr' });
    
    // 添加一次性延迟发送，确保前端能收到，避免频繁发送
    setTimeout(() => {
        if (currentQR === qr) { // 确保还是同一个QR码
            console.log('Sending final QR code update to clients with raw qr string');
            io.emit('whatsapp:qr', { qr });
            io.emit('whatsapp:status', { status: 'qr' });
        }
    }, 2000);
});

// 官方文档示例：客户端准备就绪 - 这是客户端真正就绪的标志
client.on('ready', () => {
    console.log('Client is ready! WhatsApp connection fully established.');
    // 发送ready状态，这是业务逻辑可以开始的标志
    io.emit('whatsapp:status', { status: 'ready' });
});

// 官方文档示例：认证成功
client.on('authenticated', () => {
    console.log('Authenticated! WhatsApp authentication successful.');
    // 认证成功后，客户端还需要时间准备，所以发送connecting状态
    io.emit('whatsapp:status', { status: 'connecting' });
});

console.log('About to initialize client...');

// 官方文档示例：启动客户端
client.initialize();

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WhatsApp server running on http://localhost:${PORT}`);
  console.log('WhatsApp client initialized, waiting for QR code...');
});

// 添加一个定时器，每5秒检查一次客户端状态
setInterval(() => {
    console.log('Client state check...');
    if (client.info) {
        console.log('Client info:', client.info);
    } else {
        console.log('Client info not available yet.');
    }
}, 5000);
