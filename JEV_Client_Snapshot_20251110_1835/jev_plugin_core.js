/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.369Z */
// JEV Plugin Core v11.1 - Customer Service Assistant

// Configuration
const JEV_CONFIG = {
  version: 'v11.1',
  relayUrl: 'http://localhost:8080/Cloud_Relay',
  apiKey: 'DAOJIE_API_KEY',
  autoDetectImages: true,
  autoTranslate: true,
  defaultLanguage: 'zh-CN',
  aiEnabled: true,
 盲潞潞氓路楼忙篓隆氓录聫: false
};

// Initialize plugin
function initJEVPlugin() {
  console.log('[JEV Plugin] Initializing v11.1');
  
  // Create UI elements
  createPluginUI();
  
  // Set up event listeners
  setupEventListeners();
  
  // Start monitoring for images
  if (JEV_CONFIG.autoDetectImages) {
    monitorImages();
  }
  
  // Connect to relay to check status
  checkSystemStatus();
  
  console.log('[JEV Plugin] Initialized successfully');
}

// Create plugin UI
function createPluginUI() {
  // Create status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'jev-status';
  statusIndicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #ff4444;
    z-index: 9999;
  `;
  document.body.appendChild(statusIndicator);
  
  // Create control panel
  const controlPanel = document.createElement('div');
  controlPanel.id = 'jev-control';
  controlPanel.style.cssText = `
    position: fixed;
    bottom: 50px;
    right: 20px;
    width: 300px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    display: none;
    z-index: 9998;
  `;
  
  controlPanel.innerHTML = `
    <h3>JEV Assistant v11.1</h3>
    <div>
      <label><input type="checkbox" id="jev-ai-toggle" checked> AI Mode</label>
    </div>
    <div>
      <label><input type="checkbox" id="jev-translate-toggle" checked> Auto Translate</label>
    </div>
    <div>
      <select id="jev-language">
        <option value="zh-CN">Chinese</option>
        <option value="en-US">English</option>
        <option value="ja-JP">Japanese</option>
        <option value="ko-KR">Korean</option>
      </select>
    </div>
    <button id="jev-check-status">Check Status</button>
  `;
  
  document.body.appendChild(controlPanel);
  
  // Toggle control panel on status click
  statusIndicator.addEventListener('click', () => {
    controlPanel.style.display = controlPanel.style.display === 'none' ? 'block' : 'none';
  });
}

// Setup event listeners
function setupEventListeners() {
  // AI toggle
  document.getElementById('jev-ai-toggle')?.addEventListener('change', (e) => {
    JEV_CONFIG.aiEnabled = e.target.checked;
    JEV_CONFIG.盲潞潞氓路楼忙篓隆氓录聫 = !e.target.checked;
    console.log('[JEV] AI Mode:', JEV_CONFIG.aiEnabled);
  });
  
  // Translate toggle
  document.getElementById('jev-translate-toggle')?.addEventListener('change', (e) => {
    JEV_CONFIG.autoTranslate = e.target.checked;
    console.log('[JEV] Auto Translate:', JEV_CONFIG.autoTranslate);
  });
  
  // Language change
  document.getElementById('jev-language')?.addEventListener('change', (e) => {
    JEV_CONFIG.defaultLanguage = e.target.value;
    console.log('[JEV] Language:', JEV_CONFIG.defaultLanguage);
  });
  
  // Status check
  document.getElementById('jev-check-status')?.addEventListener('click', checkSystemStatus);
}

// Monitor images in chat
function monitorImages() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'IMG') {
          processImage(node.src);
        }
        
        // Check for images in child nodes
        if (node.querySelectorAll) {
          node.querySelectorAll('img').forEach(img => {
            processImage(img.src);
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Process image through OCR
async function processImage(imageUrl) {
  if (!JEV_CONFIG.aiEnabled) return;
  
  console.log('[JEV] Processing image:', imageUrl);
  
  try {
    const result = await sendToRelay('ocr', { image: imageUrl });
    
    if (result.success) {
      console.log('[JEV] OCR Result:', result.text);
      
      // Auto translate if enabled
      if (JEV_CONFIG.autoTranslate) {
        const translated = await sendToRelay('translate', {
          text: result.text,
          targetLang: JEV_CONFIG.defaultLanguage
        });
        
        if (translated.success) {
          console.log('[JEV] Translation:', translated.translated);
          showNotification('JEV: ' + translated.translated);
        }
      }
    }
  } catch (error) {
    console.error('[JEV] Image processing error:', error);
  }
}

// Send request to relay
async function sendToRelay(action, data) {
  const headers = {
    'Authorization': `Bearer ${JEV_CONFIG.apiKey}`,
    'X-Origin': 'client',
    'X-Relay-Server': 'active',
    'Content-Type': 'application/json'
  };
  
  const response = await fetch(JEV_CONFIG.relayUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, data })
  });
  
  return await response.json();
}

// Check system status
async function checkSystemStatus() {
  try {
    const status = await sendToRelay('status', {});
    const statusIndicator = document.getElementById('jev-status');
    
    if (status && status.status === 'online') {
      statusIndicator.style.backgroundColor = '#44ff44';
      showNotification('JEV System: Online');
    } else {
      statusIndicator.style.backgroundColor = '#ff4444';
      showNotification('JEV System: Offline');
    }
    
    return status;
  } catch (error) {
    document.getElementById('jev-status').style.backgroundColor = '#ff4444';
    console.error('[JEV] Status check failed:', error);
    return null;
  }
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 10000;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// AI response generation
async function generateAIResponse(message, context) {
  if (!JEV_CONFIG.aiEnabled) return null;
  
  try {
    // This would normally use a specific AI endpoint
    const response = await sendToRelay('translate', {
      text: message,
      targetLang: JEV_CONFIG.defaultLanguage,
      context: context
    });
    
    return response.translated;
  } catch (error) {
    console.error('[JEV] AI response error:', error);
    return null;
  }
}

// Quote calculation
async function calculateQuote(product, quantity) {
  try {
    return await sendToRelay('quote', {
      product,
      quantity
    });
  } catch (error) {
    console.error('[JEV] Quote calculation error:', error);
    return null;
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initJEVPlugin);
} else {
  initJEVPlugin();
}

// Export functions for Tampermonkey
window.JEV = {
  version: JEV_CONFIG.version,
  sendToRelay,
  checkStatus: checkSystemStatus,
  toggleAIMode: (enabled) => { JEV_CONFIG.aiEnabled = enabled; },
  generateAIResponse,
  calculateQuote
};