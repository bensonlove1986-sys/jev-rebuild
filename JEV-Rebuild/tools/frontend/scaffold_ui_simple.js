#!/usr/bin/env node
// 简单版本的UI脚手架工具

import fs from 'fs';
import path from 'path';

// 定义目录路径
const UI_DIR = 'D:/PDF转网页/JEV-Rebuild/ui-core/app';
const MODULES_DIR = path.join(UI_DIR, 'modules');
const STYLES_DIR = path.join(UI_DIR, 'styles');

console.log('=== UI Scaffolding Tool ===');

// 确保目录存在
function ensureDirectory(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    } else {
      console.log(`✓ Directory already exists: ${dir}`);
    }
  } catch (error) {
    console.error(`✗ Failed to create directory ${dir}:`, error.message);
    process.exit(1);
  }
}

// 写入文件
function writeFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Created file: ${filePath}`);
  } catch (error) {
    console.error(`✗ Failed to create file ${filePath}:`, error.message);
    process.exit(1);
  }
}

// 创建目录结构
console.log('\n1. Creating directory structure...');
ensureDirectory(UI_DIR);
ensureDirectory(MODULES_DIR);
ensureDirectory(STYLES_DIR);

// 生成index.html
console.log('\n2. Generating HTML files...');
const indexHtmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JEV UI Core</title>
    <link rel="stylesheet" href="./styles/base.css">
</head>
<body>
    <div id="app">
        <div class="status-indicator" id="status-indicator"></div>
        <div id="chat-messages"></div>
        <div class="input-area" id="input-area">
            <input type="text" id="message-input" placeholder="输入消息...">
            <button id="send-button">发送</button>
        </div>
    </div>
    <script type="module" src="./bootstrap.js"></script>
</body>
</html>`;
writeFile(path.join(UI_DIR, 'index.html'), indexHtmlContent);

// 生成bootstrap.js
console.log('\n3. Generating JavaScript files...');
const bootstrapJsContent = `// UI 启动入口
import { init as initState } from './modules/state.js';
import { connect } from './modules/ws_client.js';
import { init as initUIRender } from './modules/ui_render.js';

// 初始化应用
function init() {
  // 初始化状态机
  initState();
  
  // 初始化UI渲染
  initUIRender();
  
  // 连接WebSocket服务器
  // 使用占位符，实际环境中应从配置获取
  const WS_ENDPOINT = 'ws://localhost:8080';
  connect(WS_ENDPOINT);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
`;
writeFile(path.join(UI_DIR, 'bootstrap.js'), bootstrapJsContent);

// 生成state.js
const stateJsContent = `// 状态机模块
import { EventTypes } from './event_bus.js';
import { emit } from './event_bus.js';

// 连接状态枚举
export const ConnectionStatus = {
  OFFLINE: 'offline',
  CONNECTING: 'connecting',
  ONLINE: 'online',
  ERROR: 'error'
};

// 初始状态
let state = {
  connectionStatus: ConnectionStatus.OFFLINE,
  messages: [],
  inputEnabled: false
};

// 初始化状态机
export function init() {
  // 监听WebSocket事件
  // 事件处理将在ws_client中通过event_bus触发
}

// 获取当前状态
export function getState() {
  return { ...state };
}

// 更新状态
export function setState(newState) {
  const oldState = { ...state };
  state = { ...state, ...newState };
  
  // 触发状态变化事件
  emit(EventTypes.STATE_CHANGED, { oldState, newState: state });
  
  return state;
}

// 添加消息
export function addMessage(message, isUser = false) {
  const newMessage = {
    id: Date.now(),
    content: message,
    isUser,
    timestamp: new Date()
  };
  
  setState({
    messages: [...state.messages, newMessage]
  });
}
`;
writeFile(path.join(MODULES_DIR, 'state.js'), stateJsContent);

// 生成ws_client.js
const wsClientJsContent = `// WebSocket客户端模块（单实例）
import { ConnectionStatus, setState, addMessage } from './state.js';
import { emit, EventTypes } from './event_bus.js';

class WebSocketClient {
  constructor() {
    if (WebSocketClient.instance) {
      return WebSocketClient.instance;
    }
    
    this.ws = null;
    this.url = null;
    
    WebSocketClient.instance = this;
  }
  
  // 连接到服务器
  connect(url) {
    if (!url) {
      console.error('WebSocket URL not set');
      setState({ connectionStatus: ConnectionStatus.ERROR });
      return;
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }
    
    setState({ connectionStatus: ConnectionStatus.CONNECTING });
    
    try {
      this.ws = new WebSocket(url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        setState({ 
          connectionStatus: ConnectionStatus.ONLINE,
          inputEnabled: true
        });
        addMessage('已连接到服务器');
        emit(EventTypes.WS_CONNECTED);
      };
      
      this.ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        addMessage(event.data, false);
        emit(EventTypes.WS_MESSAGE, event.data);
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setState({ 
          connectionStatus: ConnectionStatus.OFFLINE,
          inputEnabled: false
        });
        addMessage('连接已关闭');
        emit(EventTypes.WS_DISCONNECTED, { code: event.code, reason: event.reason });
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState({ 
          connectionStatus: ConnectionStatus.ERROR,
          inputEnabled: false
        });
        addMessage('连接错误');
        emit(EventTypes.WS_ERROR, error);
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setState({ 
        connectionStatus: ConnectionStatus.ERROR,
        inputEnabled: false
      });
      addMessage('连接失败');
      emit(EventTypes.WS_ERROR, error);
    }
  }
  
  // 断开连接
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  // 发送消息
  send(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }
    
    try {
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }
  
  // 获取连接状态
  getReadyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }
}

// 导出单例实例
const wsClient = new WebSocketClient();

export function connect(url) {
  return wsClient.connect(url);
}

export function disconnect() {
  return wsClient.disconnect();
}

export function send(message) {
  return wsClient.send(message);
}

export function getReadyState() {
  return wsClient.getReadyState();
}
`;
writeFile(path.join(MODULES_DIR, 'ws_client.js'), wsClientJsContent);

// 生成event_bus.js
const eventBusJsContent = `// 前端内部事件总线

// 事件类型枚举
export const EventTypes = {
  STATE_CHANGED: 'state_changed',
  WS_CONNECTED: 'ws_connected',
  WS_DISCONNECTED: 'ws_disconnected',
  WS_MESSAGE: 'ws_message',
  WS_ERROR: 'ws_error',
  UI_INPUT_SUBMIT: 'ui_input_submit'
};

// 事件监听器映射
const listeners = new Map();

// 注册事件监听器
export function on(eventType, listener) {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, []);
  }
  
  listeners.get(eventType).push(listener);
  
  // 返回取消监听函数
  return () => {
    const eventListeners = listeners.get(eventType) || [];
    listeners.set(eventType, eventListeners.filter(l => l !== listener));
  };
}

// 触发事件
export function emit(eventType, data = null) {
  const eventListeners = listeners.get(eventType) || [];
  
  eventListeners.forEach(listener => {
    try {
      listener(data);
    } catch (error) {
      console.error('Event listener error for ' + eventType + ':', error);
    }
  });
}

// 清除特定事件类型的所有监听器
export function clearListeners(eventType) {
  listeners.delete(eventType);
}

// 清除所有监听器
export function clearAllListeners() {
  listeners.clear();
}
`;
writeFile(path.join(MODULES_DIR, 'event_bus.js'), eventBusJsContent);

// 生成ui_render.js
const uiRenderJsContent = `// 纯渲染逻辑
import { getState } from './state.js';
import { on, EventTypes } from './event_bus.js';
import { send } from './ws_client.js';
import { ConnectionStatus } from './state.js';

// DOM元素引用
let statusIndicator = null;
let chatMessages = null;
let messageInput = null;
let sendButton = null;

// 初始化UI渲染
export function init() {
  // 获取DOM元素
  statusIndicator = document.getElementById('status-indicator');
  chatMessages = document.getElementById('chat-messages');
  messageInput = document.getElementById('message-input');
  sendButton = document.getElementById('send-button');
  
  // 注册事件监听器
  registerEventListeners();
  
  // 初始渲染
  render();
}

// 注册事件监听器
function registerEventListeners() {
  // 监听状态变化
  on(EventTypes.STATE_CHANGED, () => {
    render();
  });
  
  // 监听UI输入提交
  sendButton.addEventListener('click', handleSendClick);
  messageInput.addEventListener('keypress', handleKeyPress);
}

// 渲染UI
function render() {
  const state = getState();
  
  // 渲染连接状态
  renderStatus(state.connectionStatus);
  
  // 渲染消息
  renderMessages(state.messages);
  
  // 渲染输入控件状态
  renderInputControls(state.inputEnabled);
}

// 渲染连接状态
function renderStatus(status) {
  let statusText = '';
  let statusClass = '';
  
  switch (status) {
    case ConnectionStatus.OFFLINE:
      statusText = '离线';
      statusClass = 'offline';
      break;
    case ConnectionStatus.CONNECTING:
      statusText = '连接中...';
      statusClass = 'connecting';
      break;
    case ConnectionStatus.ONLINE:
      statusText = '在线';
      statusClass = 'online';
      break;
    case ConnectionStatus.ERROR:
      statusText = '连接错误';
      statusClass = 'error';
      break;
    default:
      statusText = '未知状态';
      statusClass = 'offline';
  }
  
  statusIndicator.textContent = statusText;
  statusIndicator.className = 'status-indicator ' + statusClass;
}

// 渲染消息
function renderMessages(messages) {
  chatMessages.innerHTML = '';
  
  messages.forEach(message => {
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + (message.isUser ? 'user-message' : 'system-message');
    messageElement.textContent = message.content;
    chatMessages.appendChild(messageElement);
  });
  
  // 滚动到底部
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 渲染输入控件状态
function renderInputControls(enabled) {
  messageInput.disabled = !enabled;
  sendButton.disabled = !enabled;
}

// 处理发送按钮点击
function handleSendClick() {
  sendMessage();
}

// 处理键盘事件
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

// 发送消息
function sendMessage() {
  const message = messageInput.value.trim();
  
  if (!message) {
    return;
  }
  
  // 使用ws_client发送消息
  const success = send(message);
  
  if (success) {
    // 清空输入框
    messageInput.value = '';
    // 触发UI输入提交事件
    import('./state.js').then(({ addMessage }) => {
      addMessage(message, true);
    });
  }
}
`;
writeFile(path.join(MODULES_DIR, 'ui_render.js'), uiRenderJsContent);

// 生成base.css
console.log('\n4. Generating CSS files...');
const baseCssContent = '/* 基础样式 */\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;\n  background-color: #f5f5f5;\n  color: #333;\n  line-height: 1.6;\n}\n\n#app {\n  max-width: 600px;\n  margin: 0 auto;\n  padding: 20px;\n  background-color: white;\n  height: 100vh;\n  display: flex;\n  flex-direction: column;\n  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);\n}\n\n/* 状态指示器 */\n.status-indicator {\n  padding: 10px;\n  border-radius: 4px;\n  text-align: center;\n  font-weight: bold;\n  margin-bottom: 15px;\n  transition: all 0.3s ease;\n}\n\n.status-indicator.offline {\n  background-color: #ffebee;\n  color: #c62828;\n  border: 1px solid #ef5350;\n}\n\n.status-indicator.connecting {\n  background-color: #fff3e0;\n  color: #ef6c00;\n  border: 1px solid #ff9800;\n}\n\n.status-indicator.online {\n  background-color: #e8f5e8;\n  color: #2e7d32;\n  border: 1px solid #4caf50;\n}\n\n.status-indicator.error {\n  background-color: #ffebee;\n  color: #c62828;\n  border: 1px solid #ef5350;\n}\n\n/* 消息区域 */\n#chat-messages {\n  flex: 1;\n  overflow-y: auto;\n  padding: 10px;\n  border: 1px solid #e0e0e0;\n  border-radius: 4px;\n  margin-bottom: 15px;\n  background-color: #fafafa;\n}\n\n/* 消息样式 */\n.message {\n  margin-bottom: 10px;\n  padding: 8px 12px;\n  border-radius: 8px;\n  max-width: 80%;\n  word-wrap: break-word;\n}\n\n.message.system-message {\n  background-color: #e3f2fd;\n  color: #1565c0;\n  align-self: flex-start;\n  margin-right: auto;\n}\n\n.message.user-message {\n  background-color: #e8f5e8;\n  color: #2e7d32;\n  align-self: flex-end;\n  margin-left: auto;\n  text-align: right;\n}\n\n/* 输入区域 */\n.input-area {\n  display: flex;\n  gap: 10px;\n}\n\n#message-input {\n  flex: 1;\n  padding: 10px;\n  border: 1px solid #e0e0e0;\n  border-radius: 4px;\n  font-size: 14px;\n}\n\n#message-input:focus {\n  outline: none;\n  border-color: #2196f3;\n  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);\n}\n\n#message-input:disabled {\n  background-color: #f5f5f5;\n  cursor: not-allowed;\n}\n\n#send-button {\n  padding: 10px 20px;\n  background-color: #2196f3;\n  color: white;\n  border: none;\n  border-radius: 4px;\n  cursor: pointer;\n  font-size: 14px;\n  transition: background-color 0.3s ease;\n}\n\n#send-button:hover:not(:disabled) {\n  background-color: #1976d2;\n}\n\n#send-button:disabled {\n  background-color: #bdbdbd;\n  cursor: not-allowed;\n}\n';
writeFile(path.join(STYLES_DIR, 'base.css'), baseCssContent);

console.log('\n=== UI Scaffolding Completed ===');
console.log('所有UI文件已成功生成！');
console.log('\n生成的文件结构：');
console.log(`${UI_DIR}/`);
console.log(`├─ index.html`);
console.log(`├─ bootstrap.js`);
console.log(`├─ modules/`);
console.log(`│  ├─ state.js`);
console.log(`│  ├─ ws_client.js`);
console.log(`│  ├─ event_bus.js`);
console.log(`│  └─ ui_render.js`);
console.log(`└─ styles/`);
console.log(`   └─ base.css`);
