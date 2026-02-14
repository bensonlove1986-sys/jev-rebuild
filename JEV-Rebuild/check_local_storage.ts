// Check and clear localStorage history data script

function checkAndClearLocalStorage() {
  console.log('=== Checking localStorage for history data ===');
  
  // List of potential history-related keys
  const historyKeys = [
    'jev-chat-store',
    'jev-chat-history',
    'jev-contacts',
    'jev-last-pull-time',
    'jev-worker-history-loaded',
    'jev-websocket-enabled',
    'chat_messages_v1',
    'chat_chats_v1',
    'jev_sync_last_ts_v1',
    'jev_sync_status',
    'jev_processed_message_ids',
    'jev_ws_connection_status',
    'jev_ws_connection_status_80',
    'jev_poll_leader',
    'jev_poll_leader_80',
    'jev_ws_leader',
    'jev_ws_heartbeat'
  ];
  
  let foundKeys = 0;
  
  // Check each key
  historyKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`Found history-related key: ${key}`);
      localStorage.removeItem(key);
      console.log(`Removed key: ${key}`);
      foundKeys++;
    }
  });
  
  // Check for any other potential chat-related keys
  console.log('\n=== Checking all localStorage keys ===');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('chat') || key.includes('jev') || key.includes('history'))) {
      console.log(`Found potential chat-related key: ${key}`);
      localStorage.removeItem(key);
      console.log(`Removed key: ${key}`);
      foundKeys++;
    }
  }
  
  if (foundKeys === 0) {
    console.log('=== No history data found in localStorage ===');
  } else {
    console.log(`=== Removed ${foundKeys} history-related keys from localStorage ===`);
  }
  
  console.log('=== localStorage cleanup completed ===');
  console.log('System will no longer pull historical information');
}

// Execute the check and cleanup
if (typeof window !== 'undefined') {
  // Browser environment
  window.checkAndClearLocalStorage = checkAndClearLocalStorage;
  console.log('LocalStorage cleanup function added to window.checkAndClearLocalStorage');
  console.log('Call window.checkAndClearLocalStorage() to check and clear localStorage data');
  // Auto-execute in browser console
  checkAndClearLocalStorage();
} else {
  // Node.js environment
  console.log('This script is designed to run in a browser environment');
  console.log('Please run it in the browser console');
}

export { checkAndClearLocalStorage };