import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the base directory for the UI project
const BASE_DIR = path.join(__dirname, '../../ui-core/app');
const CSS_FILE = path.join(BASE_DIR, 'styles', 'base.css');

// Function to read files with proper error handling
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// Function to write files with proper error handling
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated file: ${filePath}`);
}

// Main layout engine function
function updateLayoutStyles() {
  console.log('=== Client UI Layout Engine ===');
  
  // Read existing CSS content
  let cssContent = readFile(CSS_FILE);
  
  // Append layout styles to the CSS file
  const layoutStyles = `
/* Layout System */
/* Header Styles */
.ui-header {
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
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.system-status-indicator {
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.system-status-indicator.initializing {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.system-status-indicator.ready {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

.system-status-indicator.error {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
}

.system-status-indicator.idle {
  background-color: rgba(107, 114, 128, 0.1);
  color: var(--secondary-color);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.user-avatar:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}

/* Sidebar Styles */
.ui-sidebar {
  width: 280px;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: var(--transition);
  overflow: hidden;
}

.ui-sidebar.collapsed {
  width: 80px;
}

.sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.sidebar-toggle {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
}

.sidebar-toggle:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
}

.nav-item:hover {
  background-color: var(--bg-secondary);
}

.nav-item.active {
  background-color: rgba(59, 130, 246, 0.1);
  border-left: 3px solid var(--primary-color);
}

.nav-label {
  font-weight: 500;
  color: var(--text-primary);
}

.nav-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-registered {
  background-color: var(--warning-color);
}

.status-loaded {
  background-color: var(--success-color);
}

.status-active {
  background-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.status-error {
  background-color: var(--error-color);
}

.status-unknown {
  background-color: var(--text-tertiary);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-tertiary);
}

.module-count {
  text-align: center;
}

/* Main Content Area */
.ui-workspace {
  flex: 1;
  background-color: var(--bg-secondary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.workspace-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow-y: auto;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.workspace-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.workspace-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 16px;
  background-color: var(--bg-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Dashboard Grid Layout */
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
  transition: var(--transition);
}

.workspace-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.workspace-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
}

.module-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.module-stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.module-stat-item:last-child {
  border-bottom: none;
}

.module-stat-name {
  font-size: 14px;
  color: var(--text-secondary);
}

.module-stat-status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.module-stat-status.status-registered {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.module-stat-status.status-loaded {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

.module-stat-status.status-active {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--primary-color);
}

.module-stat-status.status-error {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
}

/* Recent Actions */
.recent-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recent-action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 14px;
}

.action-source {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 12px;
}

.action-desc {
  color: var(--text-secondary);
  flex: 1;
}

/* Message List */
.message-list {
  flex: 1;
  background-color: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  overflow-y: auto;
  margin-bottom: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-tertiary);
  text-align: center;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0;
}

.messages-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 16px;
  transition: var(--transition);
}

.message-item:hover {
  background-color: var(--bg-tertiary);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-type {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--primary-color);
}

.message-time {
  font-size: 12px;
  color: var(--text-tertiary);
}

.message-content {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
}

/* Input Panel */
.input-panel {
  background-color: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  padding: 16px 20px;
}

.input-panel-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar-buttons {
  display: flex;
  gap: 8px;
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
}

.toolbar-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.input-container {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  min-height: 80px;
  max-height: 200px;
  resize: vertical;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  line-height: 1.5;
  transition: var(--transition);
  outline: none;
}

.message-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.send-button {
  height: 40px;
  padding: 0 24px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.send-button:hover {
  background-color: #2563eb;
  box-shadow: var(--shadow-md);
}

.send-button:active {
  transform: translateY(1px);
}

/* UI State Observer */
.ui-state-observer {
  position: fixed;
  top: 70px;
  right: 20px;
  width: 350px;
  max-height: calc(100vh - 100px);
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: 1000;
}

.observer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.observer-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.system-status {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: var(--radius-full);
}

.system-status.initializing {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.system-status.ready {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

.system-status.error {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
}

.system-status.idle {
  background-color: rgba(107, 114, 128, 0.1);
  color: var(--secondary-color);
}

.observer-section {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.observer-section:last-child {
  border-bottom: none;
}

.observer-section h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.module-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.module-status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.module-name {
  font-weight: 500;
  color: var(--text-primary);
}

.module-order {
  font-size: 10px;
  color: var(--text-tertiary);
  background-color: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: var(--radius-full);
}

.module-status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-full);
}

.module-status.status-registered {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.module-status.status-loaded {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

.module-status.status-active {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--primary-color);
}

.module-status.status-error {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
}

.action-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.action-time {
  font-size: 10px;
  color: var(--text-tertiary);
}

.action-source {
  font-weight: 500;
  color: var(--primary-color);
}

.action-type {
  font-size: 10px;
  color: var(--text-secondary);
}

.current-state {
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px;
}

.current-state pre {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-primary);
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Responsive Design */
@media (max-width: 768px) {
  .ui-sidebar {
    position: absolute;
    left: 0;
    top: 60px;
    height: calc(100vh - 60px);
    z-index: 99;
  }
  
  .ui-sidebar.collapsed {
    left: -280px;
  }
  
  .workspace-grid {
    grid-template-columns: 1fr;
  }
  
  .input-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .send-button {
    height: 44px;
  }
  
  .ui-state-observer {
    width: calc(100vw - 40px);
    right: 20px;
    left: 20px;
  }
}

/* Loading States */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--text-tertiary);
}

.loading::after {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-left: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-tertiary);
  text-align: center;
}

.empty-state::before {
  content: '📭';
  font-size: 3rem;
  margin-bottom: 16px;
}

/* Notification Badges */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-full);
  min-width: 16px;
  text-align: center;
}

.badge-primary {
  background-color: var(--primary-color);
  color: white;
}

.badge-success {
  background-color: var(--success-color);
  color: white;
}

.badge-warning {
  background-color: var(--warning-color);
  color: white;
}

.badge-error {
  background-color: var(--error-color);
  color: white;
}

/* Scrollbar Styles */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background-color: var(--bg-secondary);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb {
  background-color: var(--bg-tertiary);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--secondary-color);
}

/* Animation Classes */
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Status Indicators */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 14px;
}

.status-indicator.success {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

.status-indicator.warning {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.status-indicator.error {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
}

.status-indicator.info {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--primary-color);
}

/* App Layout Structure */
#app {
  display: grid;
  grid-template-rows: 60px 1fr auto;
  grid-template-columns: 280px 1fr;
  grid-template-areas: 
    "header header"
    "sidebar workspace"
    "sidebar input";
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.ui-header {
  grid-area: header;
}

.ui-sidebar {
  grid-area: sidebar;
}

.ui-workspace {
  grid-area: workspace;
  overflow-y: auto;
}

.input-panel {
  grid-area: input;
}

/* Collapsed Sidebar Layout */
#app.sidebar-collapsed .ui-sidebar {
  width: 80px;
}

#app.sidebar-collapsed .ui-workspace {
  grid-column: 2 / -1;
}
`;
  
  // Append the layout styles to the CSS content
  cssContent += layoutStyles;
  
  // Write the updated CSS back to the file
  writeFile(CSS_FILE, cssContent);
  
  console.log('=== Layout Styles Updated ===');
}

// Run the layout engine if called directly
const scriptPath = decodeURIComponent(import.meta.url.replace('file:///', '')).replace(/\//g, '\\');
const argvPath = process.argv[1].replace(/\//g, '\\');

// Check if the script paths match (considering case-insensitive comparison for Windows)
if (scriptPath.toLowerCase() === argvPath.toLowerCase()) {
  updateLayoutStyles();
} else {
  console.log('Not running as main script, skipping execution');
}

export { updateLayoutStyles };
