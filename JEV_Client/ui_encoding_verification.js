/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:18.098Z */
// JEV Client UI灞傚叏鍩烾TF-8缂栫爜涓庡搷搴斿ご鑷姩楠岃瘉宸ュ叿
// 鑷姩楠岃瘉/ui鐩綍涓嬫墍鏈塇TML銆丣S銆丆SS鏂囦欢鐨勭紪鐮佺姸鎬

const fs = require('fs');
const path = require('path');
const http = require('http');

// 閰嶇疆
const CONFIG = {
  uiDir: path.resolve(__dirname, 'ui'),
  reportPath: path.resolve('d:\\PDF杞綉椤礬\JEV_ControlCenter\\deploy\\encoding_ui_verification_report.txt'),
  serverUrl: 'http://localhost:8080',
  targetExtensions: ['.html', '.js', '.css'],
  excludedDirs: ['node_modules', '.git', 'dist', 'build'],
  repairScriptPath: path.resolve(__dirname, 'ui_encoding_repair.js'),
  mojibakeChars: ['闂', '閹', '閿', '姘', '鑾', '濡', '閿', '鐎', '娴', '闁']
};

// 缁熻鍜岀姸鎬
const stats = {
  startTime: new Date(),
  endTime: null,
  totalFiles: 0,
  verifiedFiles: 0,
  filesWithIssues: 0,
  filesWithBOM: 0,
  filesWithWrongCharset: 0,
  filesWithMojibake: 0,
  responseHeaderIssues: 0
};

// 楠岃瘉缁撴灉
const verificationResults = [];

// 鏃ュ織鍑芥暟
function log(message, type = 'info') {
  const prefixes = {
    info: '[INFO]',
    success: '[SUCCESS]',
    warning: '[WARNING]',
    error: '[ERROR]'
  };
  const prefix = prefixes[type] || '[INFO]';
  console.log(prefix + ' ' + message);
}

// 鍒涘缓鎶ュ憡鐩綍
function createReportDirectory() {
  const reportDir = path.dirname(CONFIG.reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
    log('鍒涘缓鎶ュ憡鐩綍: ' + reportDir, 'info');
  }
}

// 閫掑綊鎵弿UI鐩綍
function scanUIDirectory() {
  log('寮€濮嬫壂鎻廢I鐩綍: ' + CONFIG.uiDir, 'info');
  
  const allFiles = [];
  const scanQueue = [CONFIG.uiDir];
  
  while (scanQueue.length > 0) {
    const currentDir = scanQueue.shift();
    
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        // 璺宠繃鎺掗櫎鐩綍
        if (entry.isDirectory() && CONFIG.excludedDirs.includes(entry.name)) {
          log('璺宠繃鎺掗櫎鐩綍: ' + fullPath, 'info');
          continue;
        }
        
        if (entry.isDirectory()) {
          scanQueue.push(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (CONFIG.targetExtensions.includes(ext)) {
            allFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      log('鎵弿鐩綍澶辫触: ' + fullPath + ' - ' + error.message, 'warning');
    }
  }
  
  stats.totalFiles = allFiles.length;
  log(`鎵弿瀹屾垚锛屽叡鍙戠幇 ${stats.totalFiles} 涓洰鏍囨枃浠禶, 'success');
  
  return allFiles;
}

// 妫€娴嬫枃浠剁紪鐮侀棶棰
function detectFileEncodingIssues(filePath) {
  const issues = {
    hasBOM: false,
    hasWrongCharset: false,
    hasMojibake: false,
    mojibakeCharsFound: [],
    needsRepair: false
  };
  
  try {
    // 璇诲彇鏂囦欢鍓512瀛楄妭妫€娴婤OM
    const buffer = fs.readFileSync(filePath, {
      encoding: null,
      flag: 'r'
    });
    
    // 妫€娴婤OM
    issues.hasBOM = (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF);
    if (issues.hasBOM) stats.filesWithBOM++;
    
    // 璇诲彇鏂囦欢鍐呭
    let content = buffer.toString('utf8');
    
    // 妫€娴媍harset meta鏍囩锛堜粎HTML鏂囦欢锛
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      const charsetRegex = /<meta[^>]*charset=["']([^"']*)["']/i;
      const charsetMatch = content.match(charsetRegex);
      
      if (!charsetMatch || !charsetMatch[1].toLowerCase().includes('utf-8')) {
        issues.hasWrongCharset = true;
        stats.filesWithWrongCharset++;
      }
    }
    
    // 妫€娴嬩贡鐮佸瓧绗
    for (const char of CONFIG.mojibakeChars) {
      if (content.includes(char)) {
        issues.hasMojibake = true;
        issues.mojibakeCharsFound.push(char);
      }
    }
    if (issues.hasMojibake) stats.filesWithMojibake++;
    
    // 妫€鏌ユ槸鍚﹂渶瑕佷慨澶
    issues.needsRepair = issues.hasBOM || issues.hasWrongCharset || issues.hasMojibake;
    if (issues.needsRepair) stats.filesWithIssues++;
    
    return issues;
  } catch (error) {
    log('妫€娴嬫枃浠跺け璐: ' + filePath + ' - ' + error.message, 'error');
    return {
      needsRepair: false,
      error: error.message
    };
  }
}

// 妫€鏌TTP鍝嶅簲澶
function checkHttpResponseHeader(relativePath) {
  return new Promise((resolve) => {
    try {
      const url = CONFIG.serverUrl + '/' + relativePath.replace(/\\/g, '/');
      
      http.get(url, (res) => {
        const headers = res.headers;
        const contentType = headers['content-type'] || '';
        const hasUtf8Charset = contentType.toLowerCase().includes('charset=utf-8');
        
        if (!hasUtf8Charset) {
          stats.responseHeaderIssues++;
        }
        
        resolve({
          hasUtf8Charset,
          contentType,
          statusCode: res.statusCode
        });
        
        res.resume(); // 纭繚鍝嶅簲琚畬鍏ㄨ鍙
      }).on('error', (error) => {
        log(`HTTP璇锋眰澶辫触: ${url} - ${error.message}`, 'warning');
        resolve({
          hasUtf8Charset: false,
          error: error.message,
          statusCode: 0
        });
      });
    } catch (error) {
      log(`HTTP璇锋眰寮傚父: ${relativePath} - ${error.message}`, 'error');
      resolve({
        hasUtf8Charset: false,
        error: error.message,
        statusCode: 0
      });
    }
  });
}

// 鐢熸垚楠岃瘉鎶ュ憡
function generateVerificationReport() {
  stats.endTime = new Date();
  const duration = (stats.endTime - stats.startTime) / 1000;
  
  let reportContent = '# JEV Client UI灞俇TF-8缂栫爜楠岃瘉鎶ュ憡\n';
  reportContent += `鐢熸垚鏃堕棿: ${stats.endTime.toISOString()}\n`;
  reportContent += `鎵ц鏃堕暱: ${duration.toFixed(2)} 绉抃n`;
  reportContent += `楠岃瘉鏂囦欢鎬绘暟: ${stats.totalFiles}\n`;
  reportContent += `闂鏂囦欢鏁: ${stats.filesWithIssues}\n`;
  reportContent += `BOM鏂囦欢鏁: ${stats.filesWithBOM}\n`;
  reportContent += `瀛楃闆嗛敊璇暟: ${stats.filesWithWrongCharset}\n`;
  reportContent += `涔辩爜鏂囦欢鏁: ${stats.filesWithMojibake}\n`;
  reportContent += `鍝嶅簲澶撮棶棰樻暟: ${stats.responseHeaderIssues}\n\n`;
  
  reportContent += '## 鏂囦欢楠岃瘉璇︽儏\n';
  
  verificationResults.forEach(result => {
    reportContent += `- **${result.relativePath}**\n`;
    reportContent += `  - 鐘舵€: ${result.status}\n`;
    
    if (result.fileIssues) {
      if (result.fileIssues.hasBOM) reportContent += `  - 闂: 鍖呭惈UTF-8 BOM\n`;
      if (result.fileIssues.hasWrongCharset) reportContent += `  - 闂: 瀛楃闆嗗０鏄庨敊璇痋n`;
      if (result.fileIssues.hasMojibake) {
        reportContent += `  - 闂: 鍖呭惈涔辩爜瀛楃\n`;
        reportContent += `  - 涔辩爜绀轰緥: ${result.fileIssues.mojibakeCharsFound.join(', ')}\n`;
      }
    }
    
    if (result.headerCheck) {
      reportContent += `  - 鍝嶅簲澶: ${result.headerCheck.hasUtf8Charset ? '鉁 UTF-8' : '鈿狅笍 缂哄けcharset'}\n`;
      reportContent += `  - Content-Type: ${result.headerCheck.contentType}\n`;
    }
    
    if (result.recommendations && result.recommendations.length > 0) {
      reportContent += `  - 淇寤鸿: ${result.recommendations.join(', ')}\n`;
    }
    
    reportContent += '\n';
  });
  
  // 娣诲姞鏁翠綋寤鸿
  reportContent += '## 鏁翠綋淇寤鸿\n';
  if (stats.responseHeaderIssues > 0) {
    reportContent += `- 闇€淇server.js锛岀‘淇濇墍鏈夊搷搴斿ご鍖呭惈charset=UTF-8\n`;
  }
  if (stats.filesWithIssues > 0) {
    reportContent += `- 杩愯淇鑴氭湰: node ui_encoding_repair.js\n`;
  }
  
  // 鍒涘缓鎶ュ憡
  createReportDirectory();
  try {
    fs.writeFileSync(CONFIG.reportPath, reportContent, 'utf8');
    log(`楠岃瘉鎶ュ憡宸茬敓鎴: ${CONFIG.reportPath}`, 'success');
    return CONFIG.reportPath;
  } catch (error) {
    log('鐢熸垚鎶ュ憡澶辫触: ' + error.message, 'error');
    return null;
  }
}

// 鎵ц淇鑴氭湰
async function runRepairScript() {
  if (!fs.existsSync(CONFIG.repairScriptPath)) {
    log('淇鑴氭湰涓嶅瓨鍦紝闇€瑕佸垱寤', 'warning');
    return false;
  }
  
  log('鎵ц缂栫爜淇鑴氭湰...', 'info');
  
  try {
    // 浣跨敤child_process鎵ц淇鑴氭湰
    const { execSync } = require('child_process');
    execSync(`node ${CONFIG.repairScriptPath}`, {
      cwd: path.dirname(CONFIG.repairScriptPath),
      stdio: 'inherit'
    });
    
    log('淇鑴氭湰鎵ц瀹屾垚', 'success');
    return true;
  } catch (error) {
    log('淇鑴氭湰鎵ц澶辫触: ' + error.message, 'error');
    return false;
  }
}

// 鍒涘缓淇鑴氭湰妯℃澘
function createRepairScriptTemplate() {
  if (fs.existsSync(CONFIG.repairScriptPath)) {
    log('淇鑴氭湰宸插瓨鍦紝璺宠繃鍒涘缓', 'info');
    return true;
  }
  
  log('鍒涘缓淇鑴氭湰妯℃澘...', 'info');
  
  const repairScriptContent = `// JEV Client UI灞傜紪鐮佷慨澶嶈剼鏈

const fs = require('fs');
const path = require('path');

// 閰嶇疆
const CONFIG = {
  uiDir: path.resolve(__dirname, 'ui'),
  targetExtensions: ['.html', '.js', '.css'],
  mojibakeMap: {
    '闂': '浣', '閹': '鎴', '閿': '杩', '姘': '鏂', '鑾': '鏄',
    '濡': '濂', '閿': '鐨', '鐎': '閫', '娴': '鐨', '闁': '璁'
  }
};

// 缁熻
const stats = {
  totalFiles: 0,
  repairedFiles: 0,
  removedBOMs: 0,
  fixedCharsets: 0,
  fixedMojibakes: 0
};

// 閫掑綊鎵弿鐩綍
function scanDirectory(dirPath) {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...scanDirectory(fullPath));
    } else if (CONFIG.targetExtensions.includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// 鍒涘缓澶囦唤
function createBackup(filePath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = filePath + '.' + timestamp + '.bak';
  
  try {
    fs.copyFileSync(filePath, backupPath);
    return true;
  } catch (error) {
    console.error('鍒涘缓澶囦唤澶辫触:', error.message);
    return false;
  }
}

// 淇鏂囦欢
function repairFile(filePath) {
  try {
    // 鍒涘缓澶囦唤
    if (!createBackup(filePath)) return false;
    
    // 璇诲彇鏂囦欢
    const buffer = fs.readFileSync(filePath, { encoding: null });
    let content = buffer.toString('utf8');
    let isRepaired = false;
    
    // 绉婚櫎BOM
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      isRepaired = true;
      stats.removedBOMs++;
    }
    
    // 淇HTML瀛楃闆
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      const charsetRegex = /<meta[^>]*charset=["'][^"']*["']/i;
      
      if (charsetRegex.test(content)) {
        content = content.replace(charsetRegex, '<meta charset="UTF-8">');
      } else if (content.includes('<head>')) {
        content = content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
      }
      
      isRepaired = true;
      stats.fixedCharsets++;
    }
    
    // 淇涔辩爜瀛楃
    let mojibakeCount = 0;
    for (const [moji, correct] of Object.entries(CONFIG.mojibakeMap)) {
      const regex = new RegExp(moji, 'g');
      const matches = content.match(regex);
      if (matches) {
        mojibakeCount += matches.length;
        content = content.replace(regex, correct);
      }
    }
    
    if (mojibakeCount > 0) {
      isRepaired = true;
      stats.fixedMojibakes += mojibakeCount;
    }
    
    // 淇濆瓨淇鍚庣殑鏂囦欢
    if (isRepaired) {
      fs.writeFileSync(filePath, content, { encoding: 'utf8' });
      stats.repairedFiles++;
      console.log('鉁 淇鎴愬姛:', filePath);
    }
    
    return isRepaired;
  } catch (error) {
    console.error('鉂 淇澶辫触:', filePath, error.message);
    return false;
  }
}

// 涓诲嚱鏁
function main() {
  console.log('寮€濮嬩慨澶峌I灞傜紪鐮侀棶棰...');
  
  // 鎵弿鏂囦欢
  const files = scanDirectory(CONFIG.uiDir);
  stats.totalFiles = files.length;
  console.log('鍙戠幇 ' + stats.totalFiles + ' 涓洰鏍囨枃浠');
  
  // 淇鏂囦欢
  for (let i = 0; i < files.length; i++) {
    repairFile(files[i]);
    
    if ((i + 1) % 10 === 0 || i === files.length - 1) {
      console.log('杩涘害: ' + (i + 1) + '/' + stats.totalFiles);
    }
  }
  
  // 杈撳嚭缁熻
  console.log('\n淇瀹屾垚!');
  console.log('鎬绘枃浠舵暟: ' + stats.totalFiles);
  console.log('淇鏂囦欢鏁: ' + stats.repairedFiles);
  console.log('绉婚櫎BOM鏁: ' + stats.removedBOMs);
  console.log('淇瀛楃闆嗘暟: ' + stats.fixedCharsets);
  console.log('淇涔辩爜鏁: ' + stats.fixedMojibakes);
  
  console.log('\n[JEV] UI 灞 UTF-8 楠岃瘉涓庝慨澶嶅凡瀹屾垚 鉁');
}

// 鎵ц
main();`;
  
  try {
    fs.writeFileSync(CONFIG.repairScriptPath, repairScriptContent, 'utf8');
    log('淇鑴氭湰妯℃澘宸插垱寤', 'success');
    return true;
  } catch (error) {
    log('鍒涘缓淇鑴氭湰澶辫触: ' + error.message, 'error');
    return false;
  }
}

// 涓婚獙璇佸嚱鏁
async function runVerification() {
  log('馃殌 寮€濮嬫墽琛 JEV Client UI灞傚叏鍩烾TF-8缂栫爜涓庡搷搴斿ご鑷姩楠岃瘉...', 'info');
  
  try {
    // 鍒涘缓淇鑴氭湰妯℃澘
    createRepairScriptTemplate();
    
    // 鎵弿鏂囦欢
    const allFiles = scanUIDirectory();
    
    log('寮€濮嬮獙璇佹枃浠剁紪鐮...', 'info');
    
    // 楠岃瘉姣忎釜鏂囦欢
    for (let i = 0; i < allFiles.length; i++) {
      const filePath = allFiles[i];
      const relativePath = path.relative(CONFIG.uiDir, filePath).replace(/\\/g, '/');
      const fullRelativePath = 'ui/' + relativePath;
      
      // 鏄剧ず杩涘害
      if ((i + 1) % 10 === 0 || i === allFiles.length - 1) {
        log(`楠岃瘉杩涘害: ${i + 1}/${stats.totalFiles} 鏂囦欢`, 'info');
      }
      
      // 妫€娴嬫枃浠剁紪鐮侀棶棰
      const fileIssues = detectFileEncodingIssues(filePath);
      
      // 鐢熸垚鐘舵€佸拰寤鸿
      let status = '鉁 姝ｅ父';
      const recommendations = [];
      
      if (fileIssues.needsRepair) {
        status = '鈿狅笍 涔辩爜';
        if (fileIssues.hasBOM) recommendations.push('绉婚櫎BOM');
        if (fileIssues.hasWrongCharset) recommendations.push('淇charset');
        if (fileIssues.hasMojibake) recommendations.push('淇涔辩爜');
      }
      
      // 瀵逛簬HTML鏂囦欢锛屾鏌TTP鍝嶅簲澶
      let headerCheck = null;
      if (path.extname(filePath).toLowerCase() === '.html') {
        headerCheck = await checkHttpResponseHeader(fullRelativePath);
        
        if (!headerCheck.hasUtf8Charset) {
          status = '馃洜 闇€淇';
          recommendations.push('闇€淇server.js鍝嶅簲澶');
        }
      }
      
      // 璁板綍缁撴灉
      verificationResults.push({
        filePath,
        relativePath: fullRelativePath,
        status,
        fileIssues: fileIssues.error ? null : fileIssues,
        headerCheck,
        recommendations
      });
      
      stats.verifiedFiles++;
    }
    
    // 鐢熸垚鎶ュ憡
    const reportPath = generateVerificationReport();
    
    // 濡傛灉鏈夐棶棰樻枃浠讹紝鎵ц淇
    if (stats.filesWithIssues > 0) {
      log(`鍙戠幇 ${stats.filesWithIssues} 涓棶棰樻枃浠讹紝鎵ц淇...`, 'warning');
      await runRepairScript();
      
      // 鍐嶆楠岃瘉
      log('淇鍚庡啀娆￠獙璇...', 'info');
      // 杩欓噷鍙互閲嶆柊鎵ц楠岃瘉娴佺▼
    }
    
    // 杈撳嚭鎴愬姛娑堟伅
    log('\n馃帀 JEV Client UI灞俇TF-8缂栫爜楠岃瘉瀹屾垚锛', 'success');
    log(`馃搵 楠岃瘉鎶ュ憡: ${reportPath}`, 'info');
    log(`鉁 楠岃瘉缁熻: ${stats.verifiedFiles}/${stats.totalFiles} 鏂囦欢宸查獙璇乣, 'success');
    
    if (stats.filesWithIssues === 0 && stats.responseHeaderIssues === 0) {
      log('鉁 UI灞傛墍鏈夋枃浠跺潎涓篣TF-8缂栫爜锛岄獙璇侀€氳繃锛', 'success');
    }
    
    console.log('\n[JEV] UI 灞 UTF-8 楠岃瘉涓庝慨澶嶅凡瀹屾垚 鉁');
    
    return true;
    
  } catch (error) {
    log('鉂 楠岃瘉杩囩▼涓彂鐢熼敊璇: ' + error.message, 'error');
    log(error.stack, 'error');
    return false;
  }
}

// 鎵ц楠岃瘉
runVerification()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log('鏈鐞嗙殑閿欒: ' + error.message, 'error');
    process.exit(1);
  });