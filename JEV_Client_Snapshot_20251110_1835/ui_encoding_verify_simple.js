/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:18.100Z */
// JEV Client UI灞俇TF-8缂栫爜楠岃瘉宸ュ叿锛堢畝鍖栫増锛
// 楠岃瘉/ui鐩綍涓嬫墍鏈塇TML銆丣S銆丆SS鏂囦欢鐨勭紪鐮佺姸鎬

const fs = require('fs');
const path = require('path');
const http = require('http');

// 閰嶇疆
const CONFIG = {
  uiDir: path.resolve(__dirname, 'ui'),
  reportPath: path.resolve('D:\\PDF杞綉椤礬\JEV_ControlCenter\\deploy\\encoding_ui_verification_report.txt'),
  serverUrl: 'http://localhost:8080',
  targetExtensions: ['.html', '.js', '.css'],
  mojibakeChars: ['闂', '閹', '閿', '姘', '鑾', '濡', '閿', '鐎', '娴', '闁']
};

// 缁熻
const stats = {
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
function log(message, type) {
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

// 鎵弿UI鐩綍
function scanUIDirectory() {
  log('寮€濮嬫壂鎻廢I鐩綍: ' + CONFIG.uiDir, 'info');
  
  const allFiles = [];
  const scanQueue = [CONFIG.uiDir];
  
  while (scanQueue.length > 0) {
    const currentDir = scanQueue.shift();
    
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          scanQueue.push(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (CONFIG.targetExtensions.indexOf(ext) !== -1) {
            allFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      log('鎵弿鐩綍澶辫触: ' + error.message, 'warning');
    }
  }
  
  stats.totalFiles = allFiles.length;
  log('鎵弿瀹屾垚锛屽叡鍙戠幇 ' + stats.totalFiles + ' 涓洰鏍囨枃浠', 'success');
  
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
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      issues.hasBOM = true;
      stats.filesWithBOM++;
    }
    
    // 璇诲彇鏂囦欢鍐呭
    let content = buffer.toString('utf8');
    
    // 妫€娴媍harset meta鏍囩锛堜粎HTML鏂囦欢锛
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') {
      const charsetRegex = /<meta[^>]*charset=["']([^"']*)["']/i;
      const charsetMatch = content.match(charsetRegex);
      
      if (!charsetMatch || charsetMatch[1].toLowerCase().indexOf('utf-8') === -1) {
        issues.hasWrongCharset = true;
        stats.filesWithWrongCharset++;
      }
    }
    
    // 妫€娴嬩贡鐮佸瓧绗
    for (let i = 0; i < CONFIG.mojibakeChars.length; i++) {
      const char = CONFIG.mojibakeChars[i];
      if (content.indexOf(char) !== -1) {
        issues.hasMojibake = true;
        issues.mojibakeCharsFound.push(char);
      }
    }
    if (issues.hasMojibake) {
      stats.filesWithMojibake++;
    }
    
    // 妫€鏌ユ槸鍚﹂渶瑕佷慨澶
    issues.needsRepair = issues.hasBOM || issues.hasWrongCharset || issues.hasMojibake;
    if (issues.needsRepair) {
      stats.filesWithIssues++;
    }
    
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
  return new Promise(function(resolve) {
    try {
      const url = CONFIG.serverUrl + '/' + relativePath.replace(/\\/g, '/');
      
      http.get(url, function(res) {
        const headers = res.headers;
        const contentType = headers['content-type'] || '';
        const hasUtf8Charset = contentType.toLowerCase().indexOf('charset=utf-8') !== -1;
        
        if (!hasUtf8Charset) {
          stats.responseHeaderIssues++;
        }
        
        resolve({
          hasUtf8Charset: hasUtf8Charset,
          contentType: contentType,
          statusCode: res.statusCode
        });
        
        res.resume();
      }).on('error', function(error) {
        log('HTTP璇锋眰澶辫触: ' + url + ' - ' + error.message, 'warning');
        resolve({
          hasUtf8Charset: false,
          error: error.message,
          statusCode: 0
        });
      });
    } catch (error) {
      log('HTTP璇锋眰寮傚父: ' + error.message, 'error');
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
  const endTime = new Date();
  const startTime = new Date();
  const duration = (endTime - startTime) / 1000;
  
  let reportContent = '# JEV Client UI灞俇TF-8缂栫爜楠岃瘉鎶ュ憡\n';
  reportContent += '鐢熸垚鏃堕棿: ' + endTime.toISOString() + '\n';
  reportContent += '鎵ц鏃堕暱: ' + duration.toFixed(2) + ' 绉抃n';
  reportContent += '楠岃瘉鏂囦欢鎬绘暟: ' + stats.totalFiles + '\n';
  reportContent += '闂鏂囦欢鏁: ' + stats.filesWithIssues + '\n';
  reportContent += 'BOM鏂囦欢鏁: ' + stats.filesWithBOM + '\n';
  reportContent += '瀛楃闆嗛敊璇暟: ' + stats.filesWithWrongCharset + '\n';
  reportContent += '涔辩爜鏂囦欢鏁: ' + stats.filesWithMojibake + '\n';
  reportContent += '鍝嶅簲澶撮棶棰樻暟: ' + stats.responseHeaderIssues + '\n\n';
  
  reportContent += '## 鏂囦欢楠岃瘉璇︽儏\n';
  
  for (let i = 0; i < verificationResults.length; i++) {
    const result = verificationResults[i];
    reportContent += '- **' + result.relativePath + '**\n';
    reportContent += '  - 鐘舵€: ' + result.status + '\n';
    
    if (result.fileIssues) {
      if (result.fileIssues.hasBOM) {
        reportContent += '  - 闂: 鍖呭惈UTF-8 BOM\n';
      }
      if (result.fileIssues.hasWrongCharset) {
        reportContent += '  - 闂: 瀛楃闆嗗０鏄庨敊璇痋n';
      }
      if (result.fileIssues.hasMojibake) {
        reportContent += '  - 闂: 鍖呭惈涔辩爜瀛楃\n';
        reportContent += '  - 涔辩爜绀轰緥: ' + result.fileIssues.mojibakeCharsFound.join(', ') + '\n';
      }
    }
    
    if (result.headerCheck) {
      reportContent += '  - 鍝嶅簲澶: ' + (result.headerCheck.hasUtf8Charset ? '鉁 UTF-8' : '鈿狅笍 缂哄けcharset') + '\n';
      reportContent += '  - Content-Type: ' + result.headerCheck.contentType + '\n';
    }
    
    if (result.recommendations && result.recommendations.length > 0) {
      reportContent += '  - 淇寤鸿: ' + result.recommendations.join(', ') + '\n';
    }
    
    reportContent += '\n';
  }
  
  // 娣诲姞鏁翠綋寤鸿
  reportContent += '## 鏁翠綋淇寤鸿\n';
  if (stats.responseHeaderIssues > 0) {
    reportContent += '- 闇€淇server.js锛岀‘淇濇墍鏈夊搷搴斿ご鍖呭惈charset=UTF-8\n';
  }
  if (stats.filesWithIssues > 0) {
    reportContent += '- 杩愯淇鑴氭湰: node ui_encoding_repair.js\n';
  }
  
  // 鍒涘缓鎶ュ憡
  createReportDirectory();
  try {
    fs.writeFileSync(CONFIG.reportPath, reportContent, 'utf8');
    log('楠岃瘉鎶ュ憡宸茬敓鎴: ' + CONFIG.reportPath, 'success');
    return CONFIG.reportPath;
  } catch (error) {
    log('鐢熸垚鎶ュ憡澶辫触: ' + error.message, 'error');
    return null;
  }
}

// 鍒涘缓淇鑴氭湰
function createRepairScript() {
  const repairScriptPath = path.resolve(__dirname, 'ui_encoding_repair.js');
  
  if (fs.existsSync(repairScriptPath)) {
    log('淇鑴氭湰宸插瓨鍦紝璺宠繃鍒涘缓', 'info');
    return true;
  }
  
  log('鍒涘缓淇鑴氭湰...', 'info');
  
  const repairScriptContent = '// JEV Client UI灞傜紪鐮佷慨澶嶈剼鏈琝n\nconst fs = require(\'fs\');\nconst path = require(\'path\');\n\n// 閰嶇疆\nconst CONFIG = {\n  uiDir: path.resolve(__dirname, \'ui\'),\n  targetExtensions: [\'.html\', \'.js\', \'.css\'],\n  mojibakeMap: {\n    \'闂乗': \'浣燶', \'閹穃': \'鎴慭', \'閿焅': \'杩橽', \'姘揬': \'鏂嘰', \'鑾絓': \'鏄嶾',\n    \'濡': \'濂絓', \'閿沑': \'鐨刓', \'鐎筡': \'閫歕', \'娴': \'鐨刓', \'闁縗': \'璁'\n  }\n};\n\n// 缁熻\nconst stats = {\n  totalFiles: 0,\n  repairedFiles: 0,\n  removedBOMs: 0,\n  fixedCharsets: 0,\n  fixedMojibakes: 0\n};\n\n// 鎵弿鐩綍\nfunction scanDirectory(dirPath) {\n  const files = [];\n  const entries = fs.readdirSync(dirPath, { withFileTypes: true });\n  \n  for (let i = 0; i < entries.length; i++) {\n    const entry = entries[i];\n    const fullPath = path.join(dirPath, entry.name);\n    \n    if (entry.isDirectory()) {\n      const subFiles = scanDirectory(fullPath);\n      for (let j = 0; j < subFiles.length; j++) {\n        files.push(subFiles[j]);\n      }\n    } else if (CONFIG.targetExtensions.indexOf(path.extname(entry.name).toLowerCase()) !== -1) {\n      files.push(fullPath);\n    }\n  }\n  \n  return files;\n}\n\n// 鍒涘缓澶囦唤\nfunction createBackup(filePath) {\n  const timestamp = new Date().toISOString().replace(/[:.]/g, \'-\');\n  const backupPath = filePath + \'.\' + timestamp + \'.bak\';\n  \n  try {\n    fs.copyFileSync(filePath, backupPath);\n    return true;\n  } catch (error) {\n    console.error(\'鍒涘缓澶囦唤澶辫触:\', error.message);\n    return false;\n  }\n}\n\n// 淇鏂囦欢\nfunction repairFile(filePath) {\n  try {\n    // 鍒涘缓澶囦唤\n    if (!createBackup(filePath)) return false;\n    \n    // 璇诲彇鏂囦欢\n    const buffer = fs.readFileSync(filePath, { encoding: null });\n    let content = buffer.toString(\'utf8\');\n    let isRepaired = false;\n    \n    // 绉婚櫎BOM\n    if (content.charCodeAt(0) === 0xFEFF) {\n      content = content.slice(1);\n      isRepaired = true;\n      stats.removedBOMs++;\n    }\n    \n    // 淇HTML瀛楃闆哱n    const ext = path.extname(filePath).toLowerCase();\n    if (ext === \'.html\') {\n      const charsetRegex = /<meta[^>]*charset=[\"\'][^\"\']*[\"\']/i;\n      \n      if (charsetRegex.test(content)) {\n        content = content.replace(charsetRegex, \'<meta charset=\"UTF-8\">\');\n      } else if (content.indexOf(\'<head>\') !== -1) {\n        content = content.replace(\'<head>\', \'<head>\\n    <meta charset=\"UTF-8\">\');\n      }\n      \n      isRepaired = true;\n      stats.fixedCharsets++;\n    }\n    \n    // 淇涔辩爜瀛楃\n    let mojibakeCount = 0;\n    for (const moji in CONFIG.mojibakeMap) {\n      if (CONFIG.mojibakeMap.hasOwnProperty(moji)) {\n        const correct = CONFIG.mojibakeMap[moji];\n        const regex = new RegExp(moji, \'g\');\n        const matches = content.match(regex);\n        if (matches) {\n          mojibakeCount += matches.length;\n          content = content.replace(regex, correct);\n        }\n      }\n    }\n    \n    if (mojibakeCount > 0) {\n      isRepaired = true;\n      stats.fixedMojibakes += mojibakeCount;\n    }\n    \n    // 淇濆瓨淇鍚庣殑鏂囦欢\n    if (isRepaired) {\n      fs.writeFileSync(filePath, content, { encoding: \'utf8\' });\n      stats.repairedFiles++;\n      console.log(\'鉁 淇鎴愬姛:\', filePath);\n    }\n    \n    return isRepaired;\n  } catch (error) {\n    console.error(\'鉂 淇澶辫触:\', filePath, error.message);\n    return false;\n  }\n}\n\n// 涓诲嚱鏁癨nfunction main() {\n  console.log(\'寮€濮嬩慨澶峌I灞傜紪鐮侀棶棰...\');\n  \n  // 鎵弿鏂囦欢\n  const files = scanDirectory(CONFIG.uiDir);\n  stats.totalFiles = files.length;\n  console.log(\'鍙戠幇 \' + stats.totalFiles + \' 涓洰鏍囨枃浠禱');\n  \n  // 淇鏂囦欢\n  for (let i = 0; i < files.length; i++) {\n    repairFile(files[i]);\n    \n    if ((i + 1) % 10 === 0 || i === files.length - 1) {\n      console.log(\'杩涘害: \' + (i + 1) + \'/\' + stats.totalFiles);\n    }\n  }\n  \n  // 杈撳嚭缁熻\n  console.log(\'\\n淇瀹屾垚!\');\n  console.log(\'鎬绘枃浠舵暟: \' + stats.totalFiles);\n  console.log(\'淇鏂囦欢鏁: \' + stats.repairedFiles);\n  console.log(\'绉婚櫎BOM鏁: \' + stats.removedBOMs);\n  console.log(\'淇瀛楃闆嗘暟: \' + stats.fixedCharsets);\n  console.log(\'淇涔辩爜鏁: \' + stats.fixedMojibakes);\n  \n  console.log(\'\\n[JEV] UI 灞 UTF-8 楠岃瘉涓庝慨澶嶅凡瀹屾垚 鉁匼');\n}\n\n// 鎵ц\nmain();';
  
  try {
    fs.writeFileSync(repairScriptPath, repairScriptContent, 'utf8');
    log('淇鑴氭湰宸插垱寤', 'success');
    return true;
  } catch (error) {
    log('鍒涘缓淇鑴氭湰澶辫触: ' + error.message, 'error');
    return false;
  }
}

// 涓婚獙璇佸嚱鏁
async function runVerification() {
  log('馃殌 寮€濮嬫墽琛 JEV Client UI灞傚叏鍩烾TF-8缂栫爜楠岃瘉...', 'info');
  
  try {
    // 鍒涘缓淇鑴氭湰
    createRepairScript();
    
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
        log('楠岃瘉杩涘害: ' + (i + 1) + '/' + stats.totalFiles + ' 鏂囦欢', 'info');
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
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.html') {
        headerCheck = await checkHttpResponseHeader(fullRelativePath);
        
        if (!headerCheck.hasUtf8Charset) {
          status = '馃洜 闇€淇';
          recommendations.push('闇€淇server.js鍝嶅簲澶');
        }
      }
      
      // 璁板綍缁撴灉
      verificationResults.push({
        filePath: filePath,
        relativePath: fullRelativePath,
        status: status,
        fileIssues: fileIssues.error ? null : fileIssues,
        headerCheck: headerCheck,
        recommendations: recommendations
      });
      
      stats.verifiedFiles++;
    }
    
    // 鐢熸垚鎶ュ憡
    const reportPath = generateVerificationReport();
    
    // 杈撳嚭鎴愬姛娑堟伅
    log('\n馃帀 JEV Client UI灞俇TF-8缂栫爜楠岃瘉瀹屾垚锛', 'success');
    log('馃搵 楠岃瘉鎶ュ憡: ' + reportPath, 'info');
    log('鉁 楠岃瘉缁熻: ' + stats.verifiedFiles + '/' + stats.totalFiles + ' 鏂囦欢宸查獙璇', 'success');
    
    if (stats.filesWithIssues === 0 && stats.responseHeaderIssues === 0) {
      log('鉁 UI灞傛墍鏈夋枃浠跺潎涓篣TF-8缂栫爜锛岄獙璇侀€氳繃锛', 'success');
    }
    
    console.log('\n[JEV] UI 灞 UTF-8 楠岃瘉涓庝慨澶嶅凡瀹屾垚 鉁');
    
    return true;
    
  } catch (error) {
    log('鉂 楠岃瘉杩囩▼涓彂鐢熼敊璇: ' + error.message, 'error');
    console.error(error.stack);
    return false;
  }
}

// 鎵ц楠岃瘉
runVerification()
  .then(function(success) {
    process.exit(success ? 0 : 1);
  })
  .catch(function(error) {
    log('鏈鐞嗙殑閿欒: ' + error.message, 'error');
    process.exit(1);
  });