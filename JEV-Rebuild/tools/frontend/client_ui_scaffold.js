import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the base directory for the UI project
const BASE_DIR = path.join(__dirname, '../../ui-core/app');

// Function to create directories recursively
function createDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log('Created directory:', dirPath);
  } else {
    console.log('Directory already exists:', dirPath);
  }
}

// Function to write files with proper error handling
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Created file:', filePath);
}

// Main scaffold function
function scaffoldUISystem() {
  console.log('=== Client UI Scaffold Generator ===');
  
  // Debug: Log the base directory
  console.log('Base directory:', BASE_DIR);
  console.log('Current working directory:', process.cwd());
  
  // Create main directories
  console.log('Creating directories...');
  createDir(BASE_DIR);
  createDir(path.join(BASE_DIR, 'styles'));
  createDir(path.join(BASE_DIR, 'modules'));
  
  // Generate index.html
  console.log('Generating index.html...');
  const indexHtml = '<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client UI</title>
  <link rel="stylesheet" href="./styles/base.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.js"></script>
</body>
</html>';
  writeFile(path.join(BASE_DIR, 'index.html'), indexHtml);
  
  // Generate main.js
  console.log('Generating main.js...');
  const mainJs = 'import { UIBootstrap } from \'./modules/ui_bootstrap.js\';

// Initialize the UI system
const ui = new UIBootstrap();
ui.init();';
  writeFile(path.join(BASE_DIR, 'main.js'), mainJs);
  
  // Generate base.css
  console.log('Generating base.css...');
  const baseCss = '/* CSS Variables */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #6b7280;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --bg-tertiary: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-tertiary: #9ca3af;
  --border-color: #e5e7eb;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --transition: all 0.2s ease;
}

/* Reset Styles */
* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  overflow: hidden;
}

/* App Container */
#app {
  width: 100vw;
  height: 100vh;
  display: grid;
  grid-template-rows: 60px 1fr auto;
  grid-template-columns: 280px 1fr;
  grid-template-areas: 
    \'header header\'
    \'sidebar workspace\'
    \'sidebar input\';
  overflow: hidden;
}

/* Header Styles */
.ui-header {
  grid-area: header;
  height: 60px;
  background-color: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 0 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.system-status-indicator {
  padding: 4px 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.system-status-indicator.initializing {
  background-color: #fef3c7;
  color: #d97706;
}

.system-status-indicator.ready {
  background-color: #d1fae5;
  color: #065f46;
}

.system-status-indicator.error {
  background-color: #fee2e2;
  color: #991b1b;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
}

/* Sidebar Styles */
.ui-sidebar {
  grid-area: sidebar;
  width: 280px;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: var(--transition);
  overflow: hidden;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.sidebar-toggle {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 5px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.sidebar-toggle:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
  padding: 10px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: var(--transition);
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background-color: var(--bg-secondary);
}

.nav-item.active {
  background-color: var(--bg-secondary);
  border-left-color: var(--primary-color);
  font-weight: 500;
}

.nav-label {
  font-size: 14px;
  color: var(--text-primary);
}

.nav-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-tertiary);
}

.nav-status.status-loaded {
  background-color: var(--success-color);
}

.nav-status.status-active {
  background-color: var(--primary-color);
  animation: pulse 2s infinite;
}

.nav-status.status-error {
  background-color: var(--error-color);
}

.sidebar-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-tertiary);
}

.module-count {
  text-align: center;
}

/* Workspace Styles */
.ui-workspace {
  grid-area: workspace;
  background-color: var(--bg-secondary);
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.workspace-content {
  padding: 20px;
  flex: 1;
  overflow: auto;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

.workspace-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.workspace-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.workspace-card {
  background-color: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  transition: var(--transition);
}

.workspace-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.workspace-card h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 15px 0;
  color: var(--text-primary);
}

.module-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.module-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--bg-tertiary);
}

.module-stat-item:last-child {
  border-bottom: none;
}

.module-stat-name {
  font-size: 14px;
  color: var(--text-primary);
}

.module-stat-status {
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.module-stat-status.status-registered {
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
}

.module-stat-status.status-loaded {
  background-color: #d1fae5;
  color: #065f46;
}

.module-stat-status.status-active {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.module-stat-status.status-error {
  background-color: #fee2e2;
  color: #991b1b;
}

/* Message List Styles */
.message-list {
  background-color: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  margin-bottom: 20px;
  overflow: hidden;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-tertiary);
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: var(--text-secondary);
}

.empty-state p {
  font-size: 14px;
  margin: 0;
}

.messages-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 20px;
}

.message-item {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--bg-tertiary);
}

.message-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.message-type {
  font-weight: 500;
  color: var(--primary-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.message-time {
  color: var(--text-tertiary);
}

.message-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
}

/* Input Panel Styles */
.input-panel {
  grid-area: input;
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
  padding: 20px;
  z-index: 100;
}

.input-panel-content {
  max-width: 1200px;
  margin: 0 auto;
}

.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.toolbar-buttons {
  display: flex;
  gap: 10px;
}

.toolbar-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 8px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.toolbar-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.input-container {
  display: flex;
  gap: 15px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  max-height: 200px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.message-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.send-button {
  padding: 12px 30px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
  height: fit-content;
}

.send-button:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.send-button:active {
  transform: translateY(0);
}

.send-button:disabled {
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Loading States */
.loading {
  opacity: 0.6;
  pointer-events: none;
}

.loading::after {
  content: \'\';
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-left: 10px;
  border: 2px solid var(--text-tertiary);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Scrollbar Styles */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: 4px;
  transition: var(--transition);
}

::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}

/* Responsive Design */
@media (max-width: 768px) {
  #app {
    grid-template-columns: 1fr;
    grid-template-rows: 60px auto 1fr auto;
    grid-template-areas: 
      \'header\'
      \'sidebar\'
      \'workspace\'
      \'input\';
  }
  
  .ui-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  
  .workspace-grid {
    grid-template-columns: 1fr;
  }
  
  .input-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .send-button {
    width: 100%;
  }
}

/* Utility Classes */
.hidden {
  display: none !important;
}

.visible {
  display: block !important;
}

.text-center {
  text-align: center;
}

.text-left {
  text-align: left;
}

.text-right {
  text-align: right;
}

.mt-10 { margin-top: 10px; }
.mt-20 { margin-top: 20px; }
.mb-10 { margin-bottom: 10px; }
.mb-20 { margin-bottom: 20px; }

/* UI State Observer Styles */
.ui-state-observer {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  width: 350px;
  max-height: 600px;
  overflow: hidden;
  transition: var(--transition);
}

.ui-state-observer.collapsed {
  height: auto;
  max-height: 60px;
}

.observer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
}

.observer-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.observer-toggle {
  background: none;
  border: none;
  font-size: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.observer-toggle:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.observer-content {
  padding: 20px;
  overflow-y: auto;
  max-height: 540px;
}

.observer-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--bg-tertiary);
}

.observer-section:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.observer-section h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.observer-module-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 12px;
}

.module-name {
  font-weight: 500;
  color: var(--text-primary);
}

.observer-action-item {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.action-time {
  font-family: monospace;
  color: var(--text-tertiary);
  min-width: 60px;
}

.action-source {
  font-weight: 500;
  color: var(--primary-color);
  min-width: 80px;
}

.action-type {
  flex: 1;
  color: var(--text-primary);
}';
  writeFile(path.join(BASE_DIR, 'styles', 'base.css'), baseCss);
  
  // Generate ui_bootstrap.js
  console.log('Generating ui_bootstrap.js...');
  const uiBootstrapJs = 'import { UIState } from \'./ui_state_observer.js\';
import { UIHeader } from \'./ui_header.js\';
import { UISidebar } from \'./ui_sidebar.js\';
import { UIWorkspace } from \'./ui_workspace.js\';
import { MessageList } from \'./message_list.js\';
import { InputPanel } from \'./input_panel.js\';

export class UIBootstrap {
  constructor() {
    this.state = new UIState();
    this.modules = [];
    this.isInitialized = false;
  }
  
  async init() {
    try {
      this.state.update(\'system\', \'INITIALIZING\');
      const app = document.getElementById(\'app\');
      app.innerHTML = \'\';
      this.initModules();
      await this.renderModules();
      this.state.update(\'system\', \'READY\');
      this.isInitialized = true;
      this.state.logAction(\'system\', \'UI initialized successfully\');
    } catch (error) {
      console.error(\'UI initialization error:\', error);
      this.state.update(\'system\', \'ERROR\');
      this.state.logAction(\'system\', \'UI initialization failed\', { error: error.message });
    }
  }
  
  initModules() {
    this.modules = [
      new UIHeader(this.state),
      new UISidebar(this.state),
      new UIWorkspace(this.state),
      new MessageList(this.state),
      new InputPanel(this.state)
    ];
    this.modules.forEach((module, index) => {
      module.loadOrder = index + 1;
      this.state.registerModule(module.name, module.loadOrder);
    });
  }
  
  async renderModules() {
    for (const module of this.modules) {
      await module.render();
      this.state.updateModuleStatus(module.name, \'loaded\');
    }
  }
}';
  writeFile(path.join(BASE_DIR, 'modules', 'ui_bootstrap.js'), uiBootstrapJs);
  
  // Generate ui_state_observer.js
  console.log('Generating ui_state_observer.js...');
  const uiStateObserverJs = 'export class UIState {
  constructor() {
    this.state = {
      system: \'IDLE\',
      modules: {},
      messages: [],
      input: \'\',
      sidebar: {
        collapsed: false,
        activeModule: null
      }
    };
    this.moduleOrder = [];
    this.actions = [];
    this.listeners = new Map();
    this.initObserver();
  }
  
  registerModule(moduleName, loadOrder) {
    this.moduleOrder[loadOrder - 1] = moduleName;
    this.state.modules[moduleName] = {
      status: \'registered\',
      loadOrder,
      lastUpdated: Date.now()
    };
    this.logAction(\'state\', \'Module registered\', { module: moduleName, loadOrder });
    this.notifyListeners();
  }
  
  updateModuleStatus(moduleName, status) {
    if (this.state.modules[moduleName]) {
      this.state.modules[moduleName].status = status;
      this.state.modules[moduleName].lastUpdated = Date.now();
      this.logAction(\'state\', \'Module status updated\', { module: moduleName, status });
      this.notifyListeners();
    }
  }
  
  update(key, value) {
    const keys = key.split(\'.\');
    let current = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    this.logAction(\'state\', \'State updated\', { key, value });
    this.notifyListeners();
  }
  
  get(key) {
    const keys = key.split(\'.\');
    let current = this.state;
    for (const k of keys) {
      if (!current[k]) {
        return undefined;
      }
      current = current[k];
    }
    return current;
  }
  
  logAction(source, action, data = {}) {
    const actionLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      source,
      action,
      data
    };
    this.actions.unshift(actionLog);
    if (this.actions.length > 20) {
      this.actions.pop();
    }
    this.notifyListeners();
  }
  
  addMessage(content) {
    const message = {
      id: Date.now() + Math.random(),
      content,
      timestamp: new Date().toISOString(),
      type: \'user\'
    };
    this.state.messages.push(message);
    this.logAction(\'messages\', \'Message added\', { messageId: message.id });
    this.notifyListeners();
    return message;
  }
  
  initObserver() {
    // Create observer UI element if it doesn\'t exist
    if (!document.getElementById(\'ui-state-observer\')) {
      const observer = document.createElement(\'div\');
      observer.id = \'ui-state-observer\';
      observer.className = \'ui-state-observer collapsed\';
      document.body.appendChild(observer);
      this.renderObserver();
    }
  }
  
  renderObserver() {
    const observer = document.getElementById(\'ui-state-observer\');
    if (!observer) return;
    
    // Generate module status HTML
    const modulesHtml = this.moduleOrder.map(name => {
      const module = this.state.modules[name];
      if (!module) return \'\';
      
      const statusClass = {
        registered: \'status-registered\',
        loaded: \'status-loaded\',
        active: \'status-active\',
        error: \'status-error\'
      }[module.status] || \'\';
      
      return \'<div class=\"observer-module-item\">\' +
        \'<span class=\"module-name\">\' + name + \'</span>\' +
        \'<span class=\"module-status \' + statusClass + \'\">\' + module.status + \'</span>\' +
      \'</div>\';
    }).join(\'\');
    
    // Generate actions HTML
    const actionsHtml = this.actions.slice(0, 5).map(action => {
      const time = new Date(action.timestamp).toLocaleTimeString();
      return \'<div class=\"observer-action-item\">\' +
        \'<span class=\"action-time\">\' + time + \'</span>\' +
        \'<span class=\"action-source\">\' + action.source + \'</span>\' +
        \'<span class=\"action-type\">\' + action.action + \'</span>\' +
      \'</div>\';
    }).join(\'\');
    
    // Update observer HTML
    observer.innerHTML = \n      \'<div class=\"observer-header\">\' +
        \'<h3>🖥️ UI State</h3>\' +
        \'<button class=\"observer-toggle\" onclick=\"this.parentElement.parentElement.classList.toggle(\'collapsed\')\">\' +
          (observer.classList.contains(\'collapsed\') ? \'▶\' : \'▼\') +\n        \'</button>\' +
      \'</div>\' +
      \'<div class=\"observer-content\">\' +
        \'<div class=\"observer-section\">\' +
          \'<h4>System Status</h4>\' +
          \'<div class=\"system-status-indicator \' + this.state.system.toLowerCase() + \'\'>\' + this.state.system + \'</div>\' +
        \'</div>\' +
        \'<div class=\"observer-section\">\' +
          \'<h4>Modules</h4>\' +
          \'<div class=\"modules-list\">\' + modulesHtml + \'</div>\' +
        \'</div>\' +
        \'<div class=\"observer-section\">\' +
          \'<h4>Recent Actions</h4>\' +
          \'<div class=\"actions-list\">\' + actionsHtml + \'</div>\' +
        \'</div>\' +
        \'<div class=\"observer-section\">\' +
          \'<h4>Messages</h4>\' +
          \'<div class=\"message-count\">\' + this.state.messages.length + \' messages</div>\' +
        \'</div>\' +
      \'</div>\';
  }
  
  onStateChange(listener) {
    const id = Math.random().toString(36).substr(2, 9);
    this.listeners.set(id, listener);
    return id;
  }
  
  offStateChange(listenerId) {
    this.listeners.delete(listenerId);
  }
  
  notifyListeners() {
    this.renderObserver();
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error(\'State listener error:\', error);
      }
    });
  }
}';
  writeFile(path.join(BASE_DIR, 'modules', 'ui_state_observer.js'), uiStateObserverJs);
  
  // Generate ui_header.js
  console.log('Generating ui_header.js...');
  const uiHeaderJs = 'export class UIHeader {\n  constructor(state) {\n    this.name = \'ui_header\';\n    this.state = state;\n    this.loadOrder = 0;\n  }\n  \n  async render() {\n    const app = document.getElementById(\'app\');\n    let header = document.getElementById(\'ui-header\');\n    if (!header) {\n      header = document.createElement(\'header\');\n      header.id = \'ui-header\';\n      header.className = \'ui-header\';\n      app.appendChild(header);\n    }\n    header.innerHTML = \n      \'<div class=\"header-content\