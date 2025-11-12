/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:18.095Z */
// JEV Client UI灞傜紪鐮佷慨澶嶈剼鏈

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

// 鎵弿鐩綍
function scanDirectory(dirPath) {
  const files = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      const subFiles = scanDirectory(fullPath);
      for (let j = 0; j < subFiles.length; j++) {
        files.push(subFiles[j]);
      }
    } else if (CONFIG.targetExtensions.indexOf(path.extname(entry.name).toLowerCase()) !== -1) {
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
      } else if (content.indexOf('<head>') !== -1) {
        content = content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
      }
      
      isRepaired = true;
      stats.fixedCharsets++;
    }
    
    // 淇涔辩爜瀛楃
    let mojibakeCount = 0;
    for (const moji in CONFIG.mojibakeMap) {
      if (CONFIG.mojibakeMap.hasOwnProperty(moji)) {
        const correct = CONFIG.mojibakeMap[moji];
        const regex = new RegExp(moji, 'g');
        const matches = content.match(regex);
        if (matches) {
          mojibakeCount += matches.length;
          content = content.replace(regex, correct);
        }
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
main();