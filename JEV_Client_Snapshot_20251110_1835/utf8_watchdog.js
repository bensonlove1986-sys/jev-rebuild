/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:18.107Z */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const targetDir = path.join('D:', 'PDF杞綉椤', 'JEV_Client', 'ui');
const logFile = path.join('D:', 'PDF杞綉椤', 'JEV_Client', 'encoding_watch_log.txt');

// 鏃ュ織鍑芥暟
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  console.log(logEntry);
  
  // 鍐欏叆鏃ュ織鏂囦欢
  fs.appendFileSync(logFile, logEntry + '\n', 'utf8');
}

// 妫€娴嬫枃浠剁紪鐮佺被鍨
function detectEncoding(buffer) {
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return { type: 'UTF-8 with BOM', hasBOM: true, normal: false };
  }
  
  try {
    const text = iconv.decode(buffer, 'utf8');
    const hasGarbled = text.includes('锟');
    if (!hasGarbled) {
      return { type: 'UTF-8', hasBOM: false, normal: true };
    }
  } catch (e) {}
  
  try {
    const gbkText = iconv.decode(buffer, 'gbk');
    const hasChinese = /[\u4e00-\u9fa5]/.test(gbkText);
    if (hasChinese) {
      return { type: 'GBK', hasBOM: false, normal: false };
    }
  } catch (e) {}
  
  try {
    const big5Text = iconv.decode(buffer, 'big5');
    const hasChinese = /[\u4e00-\u9fa5]/.test(big5Text);
    if (hasChinese) {
      return { type: 'Big5', hasBOM: false, normal: false };
    }
  } catch (e) {}
  
  try {
    const shiftJisText = iconv.decode(buffer, 'shift_jis');
    if (/[\u3040-\u30ff\uff65-\uff9f]/.test(shiftJisText)) {
      return { type: 'Shift-JIS', hasBOM: false, normal: false };
    }
  } catch (e) {}
  
  return { type: 'Unknown', hasBOM: false, normal: false };
}

// 娓呯悊鍐呭
function cleanContent(text, filePath) {
  let cleaned = text
    .replace(/\uFEFF/g, '') // 绉婚櫎BOM
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // 绉婚櫎鎺у埗瀛楃
  
  // 涓篐TML鏂囦欢娣诲姞meta charset
  if (filePath.endsWith('.html') && !/<meta[^>]*charset=/i.test(cleaned)) {
    if (/<head>/i.test(cleaned)) {
      cleaned = cleaned.replace(/<head>/i, '<head>\n    <meta charset="UTF-8">');
    } else if (/<html/i.test(cleaned)) {
      cleaned = cleaned.replace(/<html[^>]*>/i, '$&\n<head>\n    <meta charset="UTF-8">\n</head>');
    }
  }
  
  return cleaned;
}

// 淇鏂囦欢缂栫爜
function fixFileEncoding(filePath) {
  try {
    // 璺宠繃澶囦唤鏂囦欢
    if (filePath.endsWith('.bak')) {
      return;
    }
    
    // 妫€鏌ユ枃浠剁被鍨
    const ext = path.extname(filePath).toLowerCase();
    if (!['.html', '.js', '.css'].includes(ext)) {
      return;
    }
    
    const buffer = fs.readFileSync(filePath);
    const encodingInfo = detectEncoding(buffer);
    
    if (encodingInfo.normal && !encodingInfo.hasBOM) {
      logMessage(`馃煝 UTF-8 Normal - ${path.basename(filePath)}`);
      return;
    }
    
    // 澶囦唤鍘熷鍐呭
    const backupPath = filePath + '.bak';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, buffer);
    }
    
    // 瑙ｇ爜鍐呭
    let content;
    if (encodingInfo.hasBOM) {
      content = iconv.decode(buffer.slice(3), 'utf8');
    } else if (encodingInfo.type === 'GBK') {
      content = iconv.decode(buffer, 'gbk');
    } else if (encodingInfo.type === 'Big5') {
      content = iconv.decode(buffer, 'big5');
    } else if (encodingInfo.type === 'Shift-JIS') {
      content = iconv.decode(buffer, 'shift_jis');
    } else {
      content = iconv.decode(buffer, 'utf8');
    }
    
    // 娓呯悊骞跺啓鍏
    const cleaned = cleanContent(content, filePath);
    fs.writeFileSync(filePath, cleaned, { encoding: 'utf8' });
    
    logMessage(`鈿欙笍 Fixed - ${path.basename(filePath)} 鈫 [${encodingInfo.type}] 鈫 [UTF-8]`);
    
  } catch (e) {
    logMessage(`鉂 Error - ${path.basename(filePath)}: ${e.message}`);
  }
}

// 鍒濆鍖栨棩蹇楁枃浠
function initLogFile() {
  const header = `=== JEV UTF-8 Watchdog Log ===\nStarted at: ${new Date().toISOString()}\nMonitoring: ${targetDir}\n===================================\n`;
  fs.writeFileSync(logFile, header, 'utf8');
}

// 妫€鏌ヤ緷璧
function checkDependencies() {
  try {
    require.resolve('iconv-lite');
    return true;
  } catch (e) {
    return false;
  }
}

// 瀹夎渚濊禆
function installDependencies() {
  const { execSync } = require('child_process');
  try {
    console.log('鈿狅笍  缂哄皯渚濊禆锛屾鍦ㄥ畨瑁 iconv-lite...');
    execSync('npm install iconv-lite', { stdio: 'inherit' });
    console.log('鉁 渚濊禆瀹夎鎴愬姛锛');
    return true;
  } catch (e) {
    console.error('鉂 渚濊禆瀹夎澶辫触锛岃鎵嬪姩杩愯: npm install iconv-lite');
    return false;
  }
}

// 涓诲嚱鏁
function main() {
  console.log('馃惗 JEV UTF-8 瀹堟姢绋嬪簭鍚姩涓...');
  console.log(`馃搧 鐩戞帶鐩綍: ${targetDir}`);
  
  initLogFile();
  
  // 閫掑綊閬嶅巻鐩綍
  function walk(dir) {
    try {
      return fs.readdirSync(dir).flatMap(f => {
        const full = path.join(dir, f);
        const stats = fs.statSync(full);
        return stats.isDirectory() ? walk(full) : [full];
      });
    } catch (e) {
      console.error(`鏃犳硶璁块棶鐩綍 ${dir}: ${e.message}`);
      return [];
    }
  }
  
  // 鍒濆鎵弿鎵€鏈夋枃浠
  function initialScan() {
    console.log('馃攳 鎵ц鍒濆鏂囦欢鎵弿...');
    const files = walk(targetDir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.html', '.js', '.css'].includes(ext) && !f.endsWith('.bak');
    });
    
    files.forEach(filePath => {
      fixFileEncoding(filePath);
    });
    
    console.log('鉁 鍒濆鎵弿瀹屾垚锛屽紑濮嬬洃鎺ф枃浠跺彉鍖...');
    console.log('馃敂 鎸 Ctrl+C 鍋滄鐩戞帶');
  }
  
  // 鐩戞帶鐩綍鍙樺寲
  function startMonitoring() {
    // 鐩戞帶涓€绾х洰褰
    fs.watch(targetDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      
      // 蹇界暐澶囦唤鏂囦欢
      if (filename.endsWith('.bak')) return;
      
      const ext = path.extname(filename).toLowerCase();
      if (!['.html', '.js', '.css'].includes(ext)) return;
      
      const filePath = path.join(targetDir, filename);
      
      // 娣诲姞寤惰繜浠ョ‘淇濇枃浠跺啓鍏ュ畬鎴
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          console.log(`馃攧 ${eventType === 'change' ? '淇敼' : '鏂板'}: ${filename}`);
          fixFileEncoding(filePath);
        }
      }, 500);
    });
  }
  
  // 鎵ц鍒濆鎵弿
  initialScan();
  
  // 寮€濮嬬洃鎺
  startMonitoring();
  
  // 浼橀泤閫€鍑
  process.on('SIGINT', () => {
    console.log('\n馃憢 姝ｅ湪鍋滄鐩戞帶...');
    logMessage('鐩戞帶宸插仠姝');
    process.exit(0);
  });
}

// 鍚姩绋嬪簭
if (!checkDependencies()) {
  if (installDependencies()) {
    // 閲嶆柊鍔犺浇妯″潡
    delete require.cache[require.resolve('./utf8_watchdog.js')];
    require('./utf8_watchdog.js');
  }
} else {
  main();
}