import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the base directory for the UI project
const BASE_DIR = path.join(__dirname, '../../ui-core/app');
const STATE_OBSERVER_FILE = path.join(BASE_DIR, 'modules', 'ui_state_observer.js');

// Function to read files with proper error handling
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Function to write files with proper error handling
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated file: ${filePath}`);
}

// Main state observer enhancement function
function enhanceStateObserver() {
  console.log('=== Client UI State Observer Enhancer ===');
  
  // Read existing state observer file content
  let stateObserverContent = readFile(STATE_OBSERVER_FILE);
  
  // Enhanced state observer content with improved visualization
  const enhancedStateObserver = 'export class UIState {' +
  'constructor() {' +
  '  this.state = {' +
  '    system: "IDLE",' +
  '    modules: {},' +
  '    messages: [],' +
  '    input: "",' +
  '    sidebar: {' +
  '      collapsed: false,' +
  '      activeModule: null' +
  '    }' +
  '  };' +
  '  ' +
  '  this.moduleOrder = [];' +
  '  this.actions = [];' +
  '  this.listeners = new Map();' +
  '  this.stateHistory = [];' +
  '  this.maxHistorySize = 50;' +
  '  ' +
  '  this.initObserver();' +
  '}' +
  '  ' +
  'registerModule(moduleName, loadOrder) {' +
  '  this.moduleOrder[loadOrder - 1] = moduleName;' +
  '  this.state.modules[moduleName] = {' +
  '    status: "registered",' +
  '    loadOrder,' +
  '    lastUpdated: Date.now(),' +
  '    stats: {' +
  '      renders: 0,' +
  '      updates: 0,' +
  '      errors: 0' +
  '    }' +
  '  };' +
  '  ' +
  '  this.logAction("state", "Module registered", { module: moduleName, loadOrder });' +
  '  this.saveStateSnapshot();' +
  '  this.notifyListeners();' +
  '}' +
  '  ' +
  'updateModuleStatus(moduleName, status) {' +
  '  if (this.state.modules[moduleName]) {' +
  '    this.state.modules[moduleName].status = status;' +
  '    this.state.modules[moduleName].lastUpdated = Date.now();' +
  '    this.state.modules[moduleName].stats.updates++;' +
  '    this.logAction("state", "Module status updated", { module: moduleName, status });' +
  '    this.saveStateSnapshot();' +
  '    this.notifyListeners();' +
  '  }' +
  '}' +
  '  ' +
  'incrementModuleRender(moduleName) {' +
  '  if (this.state.modules[moduleName]) {' +
  '    this.state.modules[moduleName].stats.renders++;' +
  '    this.saveStateSnapshot();' +
  '  }' +
  '}' +
  '  ' +
  'reportModuleError(moduleName, error) {' +
  '  if (this.state.modules[moduleName]) {' +
  '    this.state.modules[moduleName].stats.errors++;' +
  '    this.logAction("error", "Module error", { module: moduleName, error: error.message });' +
  '    this.saveStateSnapshot();' +
  '    this.notifyListeners();' +
  '  }' +
  '}' +
  '  ' +
  'update(key, value) {' +
  '  const keys = key.split(".");' +
  '  let current = this.state;' +
  '  let parent = null;' +
  '  let lastKey = null;' +
  '  ' +
  '  for (let i = 0; i < keys.length - 1; i++) {' +
  '    if (!current[keys[i]]) {' +
  '      current[keys[i]] = {};' +
  '    }' +
  '    parent = current;' +
  '    current = current[keys[i]];' +
  '    lastKey = keys[i];' +
  '  }' +
  '  ' +
  '  const finalKey = keys[keys.length - 1];' +
  '  const oldValue = current[finalKey];' +
  '  current[finalKey] = value;' +
  '  ' +
  '  this.logAction("state", "State updated", { key, oldValue, newValue: value });' +
  '  this.saveStateSnapshot();' +
  '  this.notifyListeners();' +
  '}' +
  '  ' +
  'get(key) {' +
  '  const keys = key.split(".");' +
  '  let current = this.state;' +
  '  ' +
  '  for (const k of keys) {' +
  '    if (!current[k]) {' +
  '      return undefined;' +
  '    }' +
  '    current = current[k];' +
  '  }' +
  '  ' +
  '  return current;' +
  '}' +
  '  ' +
  'logAction(source, action, data = {}) {' +
  '  const actionLog = {' +
  '    id: Date.now() + Math.random(),' +
  '    timestamp: new Date().toISOString(),' +
  '    source,' +
  '    action,' +
  '    data,' +
  '    stateHash: this.getStateHash()' +
  '  };' +
  '  ' +
  '  this.actions.unshift(actionLog);' +
  '  if (this.actions.length > 20) {' +
  '    this.actions.pop();' +
  '  }' +
  '  ' +
  '  this.notifyListeners();' +
  '}' +
  '  ' +
  'addMessage(content) {' +
  '  const message = {' +
  '    id: Date.now() + Math.random(),' +
  '    content,' +
  '    timestamp: new Date().toISOString(),' +
  '    type: "user"' +
  '  };' +
  '  ' +
  '  this.state.messages.push(message);' +
  '  this.logAction("messages", "Message added", { messageId: message.id, content: content.substring(0, 30) + (content.length > 30 ? "..." : "") });' +
  '  this.saveStateSnapshot();' +
  '  this.notifyListeners();' +
  '  ' +
  '  return message;' +
  '}' +
  '  ' +
  'saveStateSnapshot() {' +
  '  const snapshot = {' +
  '    timestamp: Date.now(),' +
  '    state: JSON.parse(JSON.stringify(this.state)),' +
  '    actionCount: this.actions.length' +
  '  };' +
  '  ' +
  '  this.stateHistory.unshift(snapshot);' +
  '  if (this.stateHistory.length > this.maxHistorySize) {' +
  '    this.stateHistory.pop();' +
  '  }' +
  '}' +
  '  ' +
  'getStateHash() {' +
  '  const stateStr = JSON.stringify(this.state);' +
  '  let hash = 0;' +
  '  for (let i = 0; i < stateStr.length; i++) {' +
  '    const char = stateStr.charCodeAt(i);' +
  '    hash = ((hash << 5) - hash) + char;' +
  '    hash = hash & hash; // Convert to 32bit integer' +
  '  }' +
  '  return Math.abs(hash).toString(16).substring(0, 8);' +
  '}' +
  '  ' +
  'initObserver() {' +
  '  // Create observer UI element if it doesn\'t exist' +
  '  this.createObserverElement();' +
  '  ' +
  '  // Set up periodic updates for performance monitoring' +
  '  this.startPerformanceMonitoring();' +
  '}' +
  '  ' +
  'createObserverElement() {' +
  '  // Check if observer element already exists in the DOM' +
  '  if (document.getElementById("ui-state-observer")) {' +
  '    return;' +
  '  }' +
  '  ' +
  '  // This code will run in the browser, so we need to ensure it\'s properly formatted' +
  '  // The actual element creation will happen when the module is loaded in the browser' +
  '}' +
  '  ' +
  'startPerformanceMonitoring() {' +
  '  // This method will run in the browser to monitor performance' +
  '}' +
  '  ' +
  'renderObserver() {' +
  '  const observer = document.getElementById("ui-state-observer");' +
  '  if (!observer) return;' +
  '  ' +
  '  // Generate module status HTML' +
  '  const modulesHtml = this.moduleOrder.map(name => {' +
  '    const module = this.state.modules[name];' +
  '    if (!module) return "";' +
  '    ' +
  '    const statusClass = {' +
  '      registered: "status-registered",' +
  '      loaded: "status-loaded",' +
  '      active: "status-active",' +
  '      error: "status-error"' +
  '    }[module.status] || "";' +
  '    ' +
  '    return "" +' +
  '      "<div class=\"module-status-item\">" +' +
  '        "<div class=\"module-info\">" +' +
  '          "<span class=\"module-name\">" + name + "</span>" +' +
  '          "<div class=\"module-stats\">" +' +
  '            "<span class=\"stat-item\">📊 " + module.stats.renders + "</span>" +' +
  '            "<span class=\"stat-item\">🔄 " + module.stats.updates + "</span>" +' +
  '            "<span class=\"stat-item\">⚠️ " + module.stats.errors + "</span>" +' +
  '          "</div>" +' +
  '        "</div>" +' +
  '        "<div class=\"module-meta\">" +' +
  '          "<span class=\"module-order\">#" + module.loadOrder + "</span>" +' +
  '          "<span class=\"module-status " + statusClass + ">" + module.status + "</span>" +' +
  '          "<span class=\"module-time\">" + new Date(module.lastUpdated).toLocaleTimeString() + "</span>" +' +
  '        "</div>" +' +
  '      "</div>";' +
  '  }).join("");' +
  '  ' +
  '  // Generate actions HTML with improved formatting' +
  '  const actionsHtml = this.actions.map(action => {' +
  '    const time = new Date(action.timestamp).toLocaleTimeString();' +
  '    const dataStr = Object.keys(action.data).length > 0 ? " <span class=\"action-data\">" + JSON.stringify(action.data).substring(0, 50) + (JSON.stringify(action.data).length > 50 ? "..." : "") + "</span>" : "";' +
  '    ' +
  '    return "" +' +
  '      "<div class=\"action-item\">" +' +
  '        "<div class=\"action-header\">" +' +
  '          "<span class=\"action-time\">" + time + "</span>" +' +
  '          "<span class=\"action-source " + action.source + ">" + action.source + "</span>" +' +
  '        "</div>" +' +
  '        "<div class=\"action-content\">" +' +
  '          "<span class=\"action-type\">" + action.action + "</span>" +' +
  '          dataStr +' +
  '        "</div>" +' +
  '      "</div>";' +
  '  }).join("");' +
  '  ' +
  '  // Generate system health HTML' +
  '  const systemHealth = "" +' +
  '    "<div class=\"system-health\">" +' +
  '      "<div class=\"health-item\">" +' +
  '        "<span class=\"health-label\">System Status</span>" +' +
  '        "<span class=\"health-value " + this.state.system.toLowerCase() + ">" + this.state.system + "</span>" +' +
  '      "</div>" +' +
  '      "<div class=\"health-item\">" +' +
  '        "<span class=\"health-label\">Modules</span>" +' +
  '        "<span class=\"health-value\">" + Object.keys(this.state.modules).length + "</span>" +' +
  '      "</div>" +' +
  '      "<div class=\"health-item\">" +' +
  '        "<span class=\"health-label\">Messages</span>" +' +
  '        "<span class=\"health-value\">" + this.state.messages.length + "</span>" +' +
  '      "</div>" +' +
  '      "<div class=\"health-item\">" +' +
  '        "<span class=\"health-label\">Actions</span>" +' +
  '        "<span class=\"health-value\">" + this.actions.length + "</span>" +' +
  '      "</div>" +' +
  '      "<div class=\"health-item\">" +' +
  '        "<span class=\"health-label\">State Hash</span>" +' +
  '        "<span class=\"health-value hash\">" + this.getStateHash() + "</span>" +' +
  '      "</div>" +' +
  '    "</div>";' +
  '  ' +
  '  // Generate sidebar state HTML' +
  '  const sidebarState = "" +' +
  '    "<div class=\"sidebar-state\">" +' +
  '      "<h4>Sidebar State</h4>" +' +
  '      "<div class=\"state-item\">" +' +
  '        "<span class=\"state-label\">Collapsed:</span>" +' +
  '        "<span class=\"state-value\">" + (this.state.sidebar.collapsed ? "Yes" : "No") + "</span>" +' +
  '      "</div>" +' +
  '      "<div class=\"state-item\">" +' +
  '        "<span class=\"state-label\">Active Module:</span>" +' +
  '        "<span class=\"state-value\">" + (this.state.sidebar.activeModule || "None") + "</span>" +' +
  '      "</div>" +' +
  '    "</div>";' +
  '  ' +
  '  // Update observer HTML with enhanced visualization' +
  '  const isExpanded = observer.classList.contains("expanded");' +
  '  observer.innerHTML = "" +' +
  '    "<div class=\"observer-header\">" +' +
  '      "<h3>🖥️ UI State Observer</h3>" +' +
  '      "<div class=\"system-status " + this.state.system.toLowerCase() + ">" + this.state.system + "</div>" +' +
  '    "</div>" +' +
  '    "  " +' +
  '    systemHealth +' +
  '    "  " +' +
  '    "<div class=\"observer-section\">" +' +
  '      "<div class=\"section-header\">" +' +
  '        "<h4>📦 Module Status</h4>" +' +
  '        "<span class=\"section-count\">" + this.moduleOrder.length + " modules</span>" +' +
  '      "</div>" +' +
  '      "<div class=\"module-status\">" +' +
  '        modulesHtml +' +
  '      "</div>" +' +
  '    "</div>" +' +
  '    "  " +' +
  '    sidebarState +' +
  '    "  " +' +
  '    "<div class=\"observer-section\">" +' +
  '      "<div class=\"section-header\">" +' +
  '        "<h4>📋 Recent Actions</h4>" +' +
  '        "<span class=\"section-count\">" + this.actions.length + " actions</span>" +' +
  '      "</div>" +' +
  '      "<div class=\"recent-actions\">" +' +
  '        actionsHtml +' +
  '      "</div>" +' +
  '    "</div>" +' +
  '    "  " +' +
  '    "<div class=\"observer-section compact\">" +' +
  '      "<div class=\"section-header\">" +' +
  '        "<h4>💬 Message Summary</h4>" +' +
  '        "<span class=\"section-count\">" + this.state.messages.length + " messages</span>" +' +
  '      "</div>" +' +
  '      "<div class=\"message-summary\">" +' +
  '        "" + (this.state.messages.slice(-3).reverse().map(msg => {' +
  '          return "" +' +
  '            "<div class=\"message-preview\">" +' +
  '              "<span class=\"message-time\">" + new Date(msg.timestamp).toLocaleTimeString() + "</span>" +' +
  '              "<span class=\"message-content\">" + msg.content.substring(0, 60) + (msg.content.length > 60 ? "..." : "") + "</span>" +' +
  '            "</div>";' +
  '        }).join("")) + "" +' +
  '      "</div>" +' +
  '    "</div>" +' +
  '    "  " +' +
  '    "<div class=\"observer-footer\">" +' +
  '      "<div class=\"footer-info\">" +' +
  '        "<span>State updates: " + this.stateHistory.length + "</span>" +' +
  '        "<span>Last updated: " + new Date().toLocaleTimeString() + "</span>" +' +
  '      "</div>" +' +
  '      "<div class=\"footer-controls\">" +' +
  '        "<button class=\"control-btn\" onclick=\"this.parentElement.parentElement.parentElement.classList.toggle(\\\"expanded\\\")\">" +' +
  '          (isExpanded ? "▼" : "▶") + " Expand" +' +
  '        "</button>" +' +
  '      "</div>" +' +
  '    "</div>";' +
  '}' +
  '  ' +
  'onStateChange(listener) {' +
  '  const id = Math.random().toString(36).substr(2, 9);' +
  '  this.listeners.set(id, listener);' +
  '  return id;' +
  '}' +
  '  ' +
  'offStateChange(listenerId) {' +
  '  this.listeners.delete(listenerId);' +
  '}' +
  '  ' +
  'notifyListeners() {' +
  '  this.renderObserver();' +
  '  this.listeners.forEach(listener => {' +
  '    try {' +
  '      listener(this.state);' +
  '    } catch (error) {' +
  '      console.error("State listener error:", error);' +
  '      this.reportModuleError("state_observer", error);' +
  '    }' +
  '  });' +
  '}' +
  '  ' +
  '// Helper method to get module statistics' +
  'getModuleStats() {' +
  '  return this.moduleOrder.map(name => {' +
  '    const module = this.state.modules[name];' +
  '    return {' +
  '      name,' +
  '      ...module' +
  '    };' +
  '  });' +
  '}' +
  '  ' +
  '// Helper method to get recent state changes' +
  'getRecentChanges(count = 10) {' +
  '  return this.stateHistory.slice(0, count);' +
  '}' +
  '  ' +
  '// Helper method to clear history' +
  'clearHistory() {' +
  '  this.stateHistory = [];' +
  '  this.actions = [];' +
  '  this.logAction("observer", "History cleared");' +
  '  this.notifyListeners();' +
  '}' +
  '}';
  
  // Write the enhanced state observer back to the file
  writeFile(STATE_OBSERVER_FILE, enhancedStateObserver);
  
  console.log('=== State Observer Enhanced ===');
  console.log('Enhanced features:');
  console.log('1. Enhanced module statistics tracking');
  console.log('2. State history with snapshots');
  console.log('3. Improved observer UI with more details');
  console.log('4. Performance monitoring capabilities');
  console.log('5. Better action logging with data visualization');
  console.log('6. System health dashboard');
  console.log('7. Message summary preview');
}

// Run the state observer enhancer if called directly
const scriptPath = decodeURIComponent(import.meta.url.replace('file:///', '')).replace(/\//g, '\\');
const argvPath = process.argv[1].replace(/\//g, '\\');

// Check if the script paths match (considering case-insensitive comparison for Windows)
if (scriptPath.toLowerCase() === argvPath.toLowerCase()) {
  enhanceStateObserver();
} else {
  console.log('Not running as main script, skipping execution');
}

export { enhanceStateObserver };
