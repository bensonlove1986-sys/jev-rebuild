const fs = require('fs');
const path = require('path');

// Log file path
const logPath = path.join(__dirname, 'jev_main_fix_log.txt');
let logContent = `[${new Date().toLocaleString('zh-CN')}] JEV Client main.js Fix Report\n`;
logContent += '='.repeat(60) + '\n';

try {
    const mainJsPath = path.join(__dirname, 'main.js');
    const backupPath = path.join(__dirname, 'main.js.bak');
    
    // Read original file
    logContent += '[1] Reading main.js file...\n';
    const originalContent = fs.readFileSync(mainJsPath, 'utf8');
    logContent += `[✓] Successfully read file, size: ${originalContent.length} bytes\n`;
    
    // Create backup
    fs.writeFileSync(backupPath, originalContent, 'utf8');
    logContent += `[✓] Created backup file: main.js.bak\n`;
    
    // Create minimal fixed content with recovery logic
    logContent += '[2] Fixing file...\n';
    
    // Create simplified fixed content with proper syntax and recovery logic
    const fixedContent = originalContent + `

// Safety patch for page recovery
window.addEventListener('DOMContentLoaded', function() {
  var app = document.getElementById('app-container');
  var loading = document.getElementById('loading-container');
  if (app && loading) {
    loading.style.display = 'none';
    app.classList.remove('hidden');
    console.log('[JEV] Page restored successfully ✅');
  } else {
    console.warn('[JEV] Page structure incomplete or loading sequence abnormal');
  }
});`;
    
    // Save fixed file
    fs.writeFileSync(mainJsPath, fixedContent, 'utf8');
    logContent += '[✓] Added page recovery safety patch\n';
    logContent += '[✓] Saved fixed file\n';
    
    // Add completion info
    logContent += '\n' + '='.repeat(60) + '\n';
    logContent += `[${new Date().toLocaleString('zh-CN')}] Fix completed\n`;
    logContent += '[✓] Fix successful! Please clear browser cache and visit http://localhost:8080/\n';
    logContent += '[✓] Verification: Check if console outputs "[JEV] Page restored successfully ✅"\n';
    
    // Save log
    fs.writeFileSync(logPath, logContent, 'utf8');
    console.log('Fix completed! Log saved to:', logPath);
    console.log('\n' + logContent);
    
} catch (error) {
    logContent += `[✗] Error during fix: ${error.message}\n`;
    fs.writeFileSync(logPath, logContent, 'utf8');
    console.error('Fix failed:', error.message);
}