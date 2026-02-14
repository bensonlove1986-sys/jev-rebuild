// Clear all history information script
// This script will completely remove all chat history data and prevent future history pulling

import { chatStore } from './src/stores/chatStore';

// Clear chatStore data
function clearChatStore() {
  console.log('Clearing chatStore data...');
  chatStore.getState().resetHard();
  console.log('chatStore data cleared successfully');
}

// Clear localStorage data
function clearLocalStorage() {
  console.log('Clearing localStorage data...');
  // Remove all chat-related keys from localStorage
  const keysToRemove = [
    'jev-chat-store',
    'jev-chat-history',
    'jev-contacts',
    'jev-last-pull-time',
    'jev-worker-history-loaded',
    'jev-websocket-enabled'
  ];
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`Removed localStorage key: ${key}`);
    }
  });
  
  console.log('localStorage data cleared successfully');
}

// Clear all history
function clearAllHistory() {
  console.log('=== Starting complete history clearing ===');
  clearChatStore();
  clearLocalStorage();
  console.log('=== All history cleared successfully ===');
  console.log('System will no longer pull historical information');
}

// Execute the clearing process
if (typeof window !== 'undefined') {
  // Browser environment
  window.clearAllHistory = clearAllHistory;
  console.log('History clearing function added to window.clearAllHistory');
  console.log('Call window.clearAllHistory() to clear all history data');
} else {
  // Node.js environment
  clearAllHistory();
}

export { clearAllHistory };