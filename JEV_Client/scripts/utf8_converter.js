/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.839Z */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// 纭繚iconv-lite鍙敤
function ensureIconvLite() {
  try {
    require('iconv-lite');
    return true;
  } catch (e) {
    console.log('鈿狅笍 iconv-lite 鏈畨瑁咃紝灏濊瘯鑷姩瀹夎...');
    try {
      const { execSync } = require('child_process');
      execSync('npm install iconv-lite', { stdio: 'inherit' });
      console.log('鉁 iconv-lite 瀹夎鎴愬姛');
      // 閲嶆柊鍔犺浇妯″潡
      delete require.cache[require.resolve('iconv-lite')];
      return true;
    } catch (e) {
      console.error('鉂 iconv-lite 瀹夎澶辫触锛屼娇鐢ㄥ鐢ㄦ柟娉');
      return false;
    }
  }
}

// 妫€娴嬪苟杞崲鏂囦欢涓篣TF-8 with BOM
function convertToUTF8WithBOM(filePath) {
  try {
    // 鍒涘缓澶囦唤
    const backupPath = filePath + '.utf8_backup';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      console.log(`馃攧 鍒涘缓澶囦唤: ${path.basename(filePath)}`);
    }
    
    // 璇诲彇鏂囦欢鍐呭
    const buffer = fs.readFileSync(filePath);
    
    // 灏濊瘯妫€娴嬬紪鐮佸苟杞崲
    let content;
    try {
      // 灏濊瘯鐢╱tf8璇诲彇
      content = buffer.toString('utf8');
      // 濡傛灉鍖呭惈涔辩爜鏍囪锛屽皾璇曞叾浠栫紪鐮
      if (content.includes('锟') || /閿焲閻殀閳/.test(content)) {
        // 灏濊瘯GBK缂栫爜
        if (iconv) {
          content = iconv.decode(buffer, 'gbk');
        } else {
          // 澶囩敤鏂规硶锛氱洿鎺ヤ娇鐢˙uffer鐨則oString
          console.log('鈿狅笍 浣跨敤澶囩敤瑙ｇ爜鏂规硶');
        }
      }
    } catch (e) {
      console.error(`瑙ｇ爜閿欒 ${filePath}:`, e.message);
      content = buffer.toString('utf8');
    }
    
    // 鍒涘缓UTF-8 with BOM鐨勫唴瀹
    const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);
    const utf8Content = Buffer.from(content, 'utf8');
    const bomContent = Buffer.concat([BOM, utf8Content]);
    
    // 鍐欏洖鏂囦欢
    fs.writeFileSync(filePath, bomContent);
    console.log(`鉁 杞崲瀹屾垚: ${path.basename(filePath)} 鈫 UTF-8 with BOM`);
    
  } catch (e) {
    console.error(`鉂 杞崲澶辫触 ${filePath}:`, e.message);
  }
}

// 鎵弿骞惰浆鎹㈡寚瀹氱洰褰曚笅鐨勬墍鏈塇TML/JS/CSS/JSON鏂囦欢
function scanAndConvert(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // 璺宠繃澶囦唤鐩綍鍜宯ode_modules
        if (!file.startsWith('.') && file !== 'node_modules' && file !== 'backup') {
          scanAndConvert(fullPath);
        }
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.html', '.js', '.css', '.json', '.ps1'].includes(ext)) {
          convertToUTF8WithBOM(fullPath);
        }
      }
    }
  } catch (e) {
    console.error(`鉂 鎵弿鐩綍澶辫触 ${dir}:`, e.message);
  }
}

// 涓诲嚱鏁
function main() {
  const baseDir = 'D:\\PDF杞綉椤礬\JEV_Client';
  console.log('馃殌 寮€濮婾TF-8 with BOM缂栫爜缁熶竴杞崲');
  console.log(`馃搧 鐩爣鐩綍: ${baseDir}`);
  
  ensureIconvLite();
  scanAndConvert(baseDir);
  
  console.log('鉁 鎵€鏈夋枃浠剁紪鐮佽浆鎹㈠畬鎴');
}

main();