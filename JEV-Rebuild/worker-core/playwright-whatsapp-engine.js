// DOM-ONLY 最终消息规范（Final · Locked）
// 当前系统运行在 DOM-ONLY 模式
// 本模式不接触 WhatsApp 内部 Store、webpack、Msg 对象
// 不保证历史完整性、不保证顺序、不提供官方 messageId
// 仅对"新出现的可判定消息 DOM 节点"负责

// Playwright WhatsApp Engine
// 使用 Playwright + 真实 Chrome 替代 whatsapp-web.js
// 保持与现有 whatsapp:* 事件协议兼容

// 不可伪造指纹
console.log('🔥🔥🔥 WHATSAPP ENGINE FILE LOADED 🔥🔥🔥');
console.log('🔥 ENGINE_FILE =', import.meta.url);
console.log('🔥 ENGINE_CWD  =', process.cwd());
console.log('🔥 ENGINE_PID  =', process.pid);

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(
  '[ENGINE][BOOT]',
  'file=', __filename,
  'pid=', process.pid,
  'cwd=', process.cwd()
);

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { chromium } = require('playwright');
const path = require('path');

console.log('Starting Playwright WhatsApp Engine...');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());
console.log('[ENGINE] ENGINE_BOOT PID=', process.pid, 'PORT=', process.env.PORT || 3001);
console.log('[ENGINE] ENGINE_BOOT', new Date().toISOString());

// 记录Engine启动时间，用于判断消息是否为新消息
const ENGINE_START_TIME = Date.now();
console.log('[ENGINE][START_TIME]', ENGINE_START_TIME);

// 创建Express应用
const app = express();

// 配置CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8787'],
  credentials: true
}));

// 创建HTTP服务器
const server = http.createServer(app);

// 添加HTTP原始探针
server.on('request', (req, res) => {
  console.log('[ENGINE][HTTP]', req.method, req.url);
});

// 添加健康检查路由
app.get('/health', (req, res) => {
  res.json({ ok: true, pid: process.pid });
});

// 创建Socket.io服务器
const io = new Server(server, {
  path: '/socket.io', // 明确指定WebSocket路径，与UI对齐
  cors: {
    origin: '*', // 允许所有来源
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['*']
  },
  transports: ['websocket'],
  upgrade: false,
  allowEIO3: true
});

// 全局变量用于验证
global.__ENGINE_IO__ = io;
console.log('[ENGINE] IO_CREATED', io === global.__ENGINE_IO__, 'PID=', process.pid);

// 打印io配置（启动时）
console.log('[ENGINE][IO_CONFIG]', {
  path: io.opts?.path,
  namespaces: Array.from(io._nsps.keys())
});

// 立即设置socket.io事件监听器，确保它们总是被执行
io.on('connection', (socket) => {
  console.log('[ENGINE][CONNECT]', socket.id, 'PID=', process.pid);
  
  // 发送初始状态
  const initialStatus = { status: 'ready' };
  
  console.log('[ENGINE][EMIT] whatsapp:status', JSON.stringify(initialStatus));
  socket.emit('whatsapp:status', initialStatus);
  
  // 添加onAny监听器，记录所有事件
  socket.onAny((event, ...args) => {
    console.log('[ENGINE][ON_ANY]', event, args);
    // 禁止处理任何get_*事件
    if (event.startsWith('whatsapp:get_')) {
      console.log('[ENGINE][FORBIDDEN] Ignoring get_* event:', event);
      return;
    }
  });
  
  socket.on('disconnect', () => {
    console.log('[ENGINE][DISCONNECT]', socket.id);
  });
});

// Playwright WhatsApp Engine 类
class PlaywrightWhatsAppEngine {
  constructor(io) {
    this.io = io;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isReady = false;
    this.isQR = false;
    this.customersInited = false;
    
    // 使用ES模块方式获取当前目录，修复Windows路径问题
    const __filename = process.cwd();
    // 生成随机的临时目录作为新的userDataDir，确保每次启动都是全新的
    this.tempProfileDir = path.join(__filename, `.whatsapp_temp_${Date.now()}`);
    console.log('[ENGINE_COLD_START] Using temporary profile directory:', this.tempProfileDir);
    
    // 事件监听器标志
    this.isMessageHooked = false;
    
    // Bridge状态标志
    this.isBridgeReady = false;
  }

  async initialize() {
    try {
      console.log('[ENGINE_COLD_START] Starting cold boot mode...');
      
      // 1. 确保没有旧的浏览器实例在运行
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      
      // 2. 启动全新的浏览器实例
      this.browser = await chromium.launch({
        headless: false, // 使用真实Chrome
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1280,720',
          '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreHTTPSErrors: true
      });
      
      console.log('[NEW_CONTEXT_CONFIRMED] Browser instance created successfully');
      
      // 3. 创建全新的上下文，不使用persistent context，使用临时目录
      this.context = await this.browser.newContext({
        storageState: undefined, // 不加载任何旧的存储状态
        userDataDir: this.tempProfileDir, // 使用全新的临时目录
        viewport: { width: 1280, height: 720 },
        acceptDownloads: false,
        javaScriptEnabled: true,
        ignoreHTTPSErrors: true
      });
      
      console.log('[NO_PREVIOUS_STATE_DETECTED] New context created with empty state');
      
      // 4. 创建全新的页面
      this.page = await this.context.newPage();
      
      // 5. 只在第一次创建页面时暴露函数
      if (!this.isBridgeReady) {
        // Expose a function to handle incoming messages
        await this.page.exposeFunction('__JEV_HANDLE_MESSAGE__', (data) => {
          if (data?.type === 'JEV_WHATSAPP_MESSAGE') {
            // 直接发送消息到UI，不依赖Store状态
            this.io.emit('whatsapp:message', data.payload);
            console.log('[ENGINE][EMIT] whatsapp:message', data.payload);
          }
        });
        this.isBridgeReady = true;
        console.log('[ENGINE][BRIDGE] Message handling bridge registered successfully');
      }
      
      // 6. Inject DOM-ONLY message listener using MutationObserver
      await this.page.evaluate(() => {
        if (window.__JEV_REAL_TIME_HOOKED__) return;
        window.__JEV_REAL_TIME_HOOKED__ = true;
        
        console.log('[JEV] Injecting DOM-ONLY real-time message listener...');
        
        // DOM-ONLY模式：仅使用MutationObserver监听新增消息节点
        // 简单的哈希函数，用于生成伪消息ID
        const simpleHash = (str) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
          }
          return Math.abs(hash).toString(16);
        };
        
        // 用于存储已处理的消息ID，防止重复处理
        window.__JEV_PROCESSED_MESSAGES__ = new Set();
        
        // 监听整个文档，包括聊天窗口的创建
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            // 仅处理新增节点（addedNodes）
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType !== 1) return; // 仅处理元素节点
              
              // 检查是否为消息节点
              // 查找消息气泡元素，使用当前WhatsApp Web的消息容器类名
              const messageBubbles = [
                node.closest('.message-in'), // 新样式接收消息容器
                node.closest('.message-out') // 新样式发送消息容器
              ].filter(Boolean);
              
              for (const bubble of messageBubbles) {
                try {
                  // 获取文本内容
                  const textElement = bubble.querySelector('span.selectable-text, span[dir="auto"]');
                  let textContent = textElement?.textContent?.trim() || '';
                  
                  // 如果找不到文本，尝试从父元素中查找
                  if (!textContent) {
                    const directText = bubble.textContent?.trim() || '';
                    if (directText) {
                      textContent = directText;
                    }
                  }
                  
                  // 过滤掉空消息
                  if (!textContent || textContent.trim().length === 0) {
                    continue;
                  }
                  
                  // 过滤掉系统提示
                  if (
                    textContent.includes('消息已删除') ||
                    textContent.includes('message deleted') ||
                    textContent.includes('已下载') ||
                    textContent.includes('downloaded') ||
                    textContent.includes('加密') ||
                    textContent.includes('encrypted') ||
                    textContent.includes('今天') ||
                    textContent.includes('Yesterday') ||
                    textContent.includes('星期') ||
                    textContent.includes('Monday') ||
                    textContent.includes('Tuesday') ||
                    textContent.includes('Wednesday') ||
                    textContent.includes('Thursday') ||
                    textContent.includes('Friday') ||
                    textContent.includes('Saturday') ||
                    textContent.includes('Sunday')
                  ) {
                    continue;
                  }
                  
                  // 生成唯一的chatId，基于聊天窗口的哈希
                  const chatContainer = document.querySelector('#main');
                  const containerId = chatContainer ? 
                    (chatContainer.id || chatContainer.className || Math.random().toString(36)) : 
                    Math.random().toString(36);
                  const chatId = `wa_dom_${simpleHash(containerId)}`;
                  
                  // 生成伪消息ID
                  const normalizedText = textContent.replace(/\s+/g, ' ').trim();
                  const pseudoMessageId = `dom_${simpleHash(`${chatId}${normalizedText}${Date.now()}`)}`;
                  
                  // 检查是否已处理过该消息
                  if (window.__JEV_PROCESSED_MESSAGES__.has(pseudoMessageId)) {
                    continue;
                  }
                  
                  // 标记为已处理
                  window.__JEV_PROCESSED_MESSAGES__.add(pseudoMessageId);
                  
                  // 创建消息对象，严格遵循最小结构要求
                  const message = {
                    chatId: chatId,
                    text: normalizedText,
                    direction: 'unknown',
                    timestamp: Date.now(),
                    source: 'dom-only'
                  };
                  
                  console.log('[DOM_MESSAGE_ADDED] text="' + normalizedText + '" source=dom-only');
                  
                  // 发送消息到外部进行处理
                  window.postMessage({
                    type: 'JEV_WHATSAPP_MESSAGE',
                    payload: message
                  }, '*');
                } catch (error) {
                  // 简化错误处理，继续处理下一个气泡
                  console.error('[JEV][ERROR] Processing message bubble:', error.message);
                  continue;
                }
              }
            });
          });
        });
        
        // 监听整个文档，以便在聊天窗口创建时也能捕获消息
        // 只监听childList变化，不监听其他变化
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        console.log('[ENGINE][DOM observer attached]');
        console.log('[ENGINE][Waiting for incoming message...]');
      });
      
      // 7. 监听页面消息
      await this.page.evaluate(() => {
        window.addEventListener('message', (event) => {
          if (event.data?.type === 'JEV_WHATSAPP_MESSAGE') {
            // Forward to exposed function
            window.__JEV_HANDLE_MESSAGE__(event.data);
          }
        });
      });
      
      // 8. 导航到WhatsApp Web
      await this.page.goto('https://web.whatsapp.com/', {
        waitUntil: 'commit',
        timeout: 60000
      });
      
      console.log('[ENGINE_COLD_START] Navigated to WhatsApp Web');
      
    } catch (error) {
      console.error('[ENGINE_COLD_START] Initialization error:', error);
      // 不重试，只记录错误
    }
  }
}

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Playwright WhatsApp Engine running on http://localhost:${PORT}`);
  console.log('Waiting for WhatsApp connection...');
  console.log('[ENGINE][LISTEN] port=' + PORT + ' pid=' + process.pid);
});

// 创建引擎实例
const engine = new PlaywrightWhatsAppEngine(io);

// 初始化引擎
engine.initialize();
