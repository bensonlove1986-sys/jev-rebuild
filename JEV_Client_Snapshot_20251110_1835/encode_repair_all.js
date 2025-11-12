/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.214Z */
const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");

const targetDir = path.join("D:", "PDF杞綉椤", "JEV_Client", "ui");

// 妫€娴嬫枃浠剁紪鐮佺被鍨
function detectEncoding(buffer) {
  // 妫€娴婤OM
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return { type: 'UTF-8 with BOM', hasBOM: true, normal: false };
  }
  
  // 灏濊瘯瑙ｇ爜骞舵娴嬩贡鐮
  try {
    const text = iconv.decode(buffer, "utf8");
    const hasGarbled = text.includes("锟");
    
    if (!hasGarbled) {
      return { type: 'UTF-8', hasBOM: false, normal: true };
    }
  } catch (e) {
    // 蹇界暐瑙ｇ爜閿欒
  }
  
  // 灏濊瘯GBK妫€娴
  try {
    const gbkText = iconv.decode(buffer, "gbk");
    // 妫€鏌ユ槸鍚﹀寘鍚腑鏂囧瓧绗︼紙GBK鑼冨洿锛
    const hasChinese = /[\u4e00-\u9fa5]/.test(gbkText);
    if (hasChinese) {
      return { type: 'GBK', hasBOM: false, normal: false };
    }
  } catch (e) {
    // 蹇界暐瑙ｇ爜閿欒
  }
  
  // 灏濊瘯鍏朵粬缂栫爜妫€娴
  try {
    const big5Text = iconv.decode(buffer, "big5");
    const hasChinese = /[\u4e00-\u9fa5]/.test(big5Text);
    if (hasChinese) {
      return { type: 'Big5', hasBOM: false, normal: false };
    }
  } catch (e) {}
  
  try {
    const shiftJisText = iconv.decode(buffer, "shift_jis");
    // Shift-JIS鐗规湁瀛楃妫€娴
    if (/[\u3040-\u30ff\uff65-\uff9f]/.test(shiftJisText)) {
      return { type: 'Shift-JIS', hasBOM: false, normal: false };
    }
  } catch (e) {}
  
  return { type: 'Unknown', hasBOM: false, normal: false };
}

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

// 娓呯悊涓嶅彲瑙佹帶鍒跺瓧绗
function cleanControlChars(text) {
  // 绉婚櫎BOM鍜屾帶鍒跺瓧绗
  return text
    .replace(/\uFEFF/g, "") // 绉婚櫎BOM
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // 绉婚櫎鎺у埗瀛楃
}

// 涓篐TML鏂囦欢娣诲姞meta charset
function ensureMetaCharset(text, filePath) {
  if (!filePath.endsWith('.html')) {
    return text;
  }
  
  if (/<meta[^>]*charset=/i.test(text)) {
    return text;
  }
  
  // 鍦╤ead鏍囩鍚庢坊鍔爉eta
  if (/<head>/i.test(text)) {
    return text.replace(/<head>/i, '<head>\n    <meta charset="UTF-8">');
  }
  
  // 濡傛灉娌℃湁head鏍囩锛屽湪html鏍囩鍚庢坊鍔
  if (/<html/i.test(text)) {
    return text.replace(/<html[^>]*>/i, '$&\n<head>\n    <meta charset="UTF-8">\n</head>');
  }
  
  // 娣诲姞鍒版枃浠跺紑澶
  return '<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="UTF-8">\n</head>\n<body>\n' + text + '\n</body>\n</html>';
}

// 涓诲嚱鏁
function main() {
  console.log("馃З 寮€濮嬪叏鐩綍缂栫爜淇鎵弿...");
  console.log(`馃搧 鎵弿璺緞: ${targetDir}`);
  
  // 鏀堕泦鏂囦欢
  const files = walk(targetDir).filter(f => /\.(html|js|css)$/i.test(f));
  
  let stats = {
    total: files.length,
    fixed: 0,
    normal: 0,
    bom: 0,
    skipped: 0
  };
  
  // 鎵ц淇
  for (const file of files) {
    try {
      const buf = fs.readFileSync(file);
      const encodingInfo = detectEncoding(buf);
      
      console.log(`馃搫 ${path.basename(file)} - 缂栫爜: ${encodingInfo.type}, 澶у皬: ${buf.length} 瀛楄妭`);
      
      // 鍒ゆ柇鏄惁闇€瑕佷慨澶
      if (encodingInfo.normal && !encodingInfo.hasBOM) {
        stats.normal++;
        continue;
      }
      
      // 澶囦唤鍘熷鏂囦欢
      const backupPath = file + ".bak";
      fs.writeFileSync(backupPath, buf);
      
      let content;
      
      // 鏍规嵁缂栫爜绫诲瀷杩涜瑙ｇ爜
      if (encodingInfo.hasBOM) {
        content = iconv.decode(buf.slice(3), "utf8");
        stats.bom++;
      } else if (encodingInfo.type === 'GBK') {
        content = iconv.decode(buf, "gbk");
      } else if (encodingInfo.type === 'Big5') {
        content = iconv.decode(buf, "big5");
      } else if (encodingInfo.type === 'Shift-JIS') {
        content = iconv.decode(buf, "shift_jis");
      } else {
        content = iconv.decode(buf, "utf8");
      }
      
      // 娓呯悊鍐呭
      let cleaned = cleanControlChars(content);
      cleaned = ensureMetaCharset(cleaned, file);
      
      // 鍐欏叆淇鍚庣殑鏂囦欢
      fs.writeFileSync(file, cleaned, { encoding: "utf8" });
      
      // 楠岃瘉淇缁撴灉
      const fixedBuf = fs.readFileSync(file);
      const fixedEncoding = detectEncoding(fixedBuf);
      const fixedContent = iconv.decode(fixedBuf, "utf8");
      
      if (fixedContent.includes("锟")) {
        console.log(`鈿狅笍  ${path.basename(file)} 浠嶇劧鍖呭惈涔辩爜锛屽皾璇曞啀娆′慨澶...`);
        // 鍐嶆淇
        fs.writeFileSync(file, cleaned, { encoding: "utf8" });
      }
      
      stats.fixed++;
      console.log(`鉁 淇: ${path.basename(file)} 鈫 浠 ${encodingInfo.type} 杞崲涓 UTF-8`);
      
    } catch (e) {
      console.error(`鉂 澶勭悊 ${path.basename(file)} 澶辫触: ${e.message}`);
      stats.skipped++;
    }
  }
  
  // 鐢熸垚鎶ュ憡
  console.log("\n=== Encoding Repair Report ===");
  console.log(`馃搧 Scan Path : ${targetDir}`);
  console.log(`馃搫 Total Files : ${stats.total}`);
  console.log(`鉁 Fixed : ${stats.fixed}`);
  console.log(`馃煝 Normal : ${stats.normal}`);
  console.log(`鈿狅笍 BOM Cleaned : ${stats.bom}`);
  console.log(`鉂 Skipped : ${stats.skipped}`);
  console.log(`馃敜 Encoding Standard : UTF-8 (No BOM)`);
  console.log(`馃搮 Completed at ${new Date().toLocaleString()}`);
  console.log("\n鉁 鍏ㄩ儴淇瀹屾垚锛佽鍒锋柊娴忚鍣ㄩ獙璇佹晥鏋溿€");
}

// 妫€鏌conv-lite鏄惁瀹夎
function checkDependencies() {
  try {
    require.resolve('iconv-lite');
    return true;
  } catch (e) {
    return false;
  }
}

// 瀹夎渚濊禆骞舵墽琛
if (!checkDependencies()) {
  console.log("鈿狅笍  缂哄皯iconv-lite渚濊禆锛屾鍦ㄥ畨瑁...");
  const { execSync } = require('child_process');
  try {
    execSync('npm install iconv-lite', { stdio: 'inherit' });
    console.log("鉁 iconv-lite瀹夎鎴愬姛锛");
    main();
  } catch (e) {
    console.error("鉂 瀹夎澶辫触锛岃鎵嬪姩杩愯: npm install iconv-lite");
  }
} else {
  main();
}