/* UTF-8 FIXED BY JEV @ 2025-11-09T15:11:17.444Z */
const fs = require('fs');
const path = require('path');
const http = require('http');

// 閰嶇疆甯搁噺
const HTML_FILE_PATH = path.join(__dirname, 'ui', 'login_portal.html');
const SERVER_JS_PATH = path.join(__dirname, 'server.js');
const STANDARD_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JEV Client 鐧诲綍闂ㄦ埛</title>
  <style>
    body {
      font-family: "Noto Sans SC", sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #f0f3f7, #cdd8e3);
    }
    .login-box {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      text-align: center;
    }
    input {
      width: 200px;
      padding: 8px;
      margin-top: 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
    }
    button {
      margin-top: 15px;
      padding: 8px 20px;
      cursor: pointer;
      border: none;
      border-radius: 8px;
      background-color: #0078ff;
      color: #fff;
      transition: 0.2s;
    }
    button:hover {
      background-color: #005cd6;
    }
  </style>
</head>
<body>
  <div class="login-box">
    <h2>JEV Client 鐧诲綍</h2>
    <input id="inviteCode" placeholder="璇疯緭鍏ラ個璇风爜">
    <button onclick="verifyInvite()">楠岃瘉</button>
    <p id="result"></p>
  </div>

  <script>
    async function verifyInvite() {
      const code = document.getElementById("inviteCode").value.trim();
      if (!code) {
        alert("璇疯緭鍏ラ個璇风爜");
        return;
      }
      try {
         const res = await fetch('/verify?code=' + encodeURIComponent(code));
        const data = await res.json();
        document.getElementById("result").innerText =
          data.success ? "鉁 楠岃瘉鎴愬姛" : "鉂 鏃犳晥鐨勯個璇风爜";
      } catch (e) {
        alert("楠岃瘉澶辫触锛" + e.message);
      }
    }
  </script>
</body>
</html>`;

// 鏃ュ織鍑芥暟
function log(message) {
  console.log(`[LOG] ${message}`);
}

function error(message) {
  console.error(`[ERROR] ${message}`);
}

// 1. 妫€娴婬TML鏂囦欢
async function detectHtmlFile() {
  log(`寮€濮嬫娴嬫枃浠: ${HTML_FILE_PATH}`);
  
  let fileExists = false;
  let fileContent = '';
  let fileSize = 0;
  
  try {
    if (fs.existsSync(HTML_FILE_PATH)) {
      fileExists = true;
      const buffer = fs.readFileSync(HTML_FILE_PATH);
      fileSize = buffer.length;
      
      // 妫€娴婤OM澶
      const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
      
      // 璇诲彇鏂囦欢鍐呭锛堢Щ闄OM澶达級
      fileContent = hasBOM ? buffer.slice(3).toString('utf8') : buffer.toString('utf8');
      
      log(`鏂囦欢瀛樺湪 - 澶у皬: ${fileSize} 瀛楄妭`);
      log(`BOM澶存娴: ${hasBOM ? '瀛樺湪' : '涓嶅瓨鍦'}`);
      
      // 妫€娴嬩贡鐮侊紙鍖呭惈锟藉瓧绗︼級
      const hasGarbled = fileContent.includes('锟');
      // 妫€娴嬪唴瀹规槸鍚︿涪澶憋紙澶у皬杩囧皬鎴栧彧鏈塵eta鍜宼itle锛
      const isEmptyOrMetaOnly = fileSize < 50 || 
                               (fileContent.includes('<meta') && 
                                fileContent.includes('<title') && 
                                fileContent.length < 200);
      
      if (hasGarbled || hasBOM || isEmptyOrMetaOnly) {
        log(`妫€娴嬪埌闂: ${hasGarbled ? '瀛樺湪涔辩爜' : ''} ${hasBOM ? '瀛樺湪BOM澶' : ''} ${isEmptyOrMetaOnly ? '鍐呭涓㈠け' : ''}`);
        return { needsRepair: true, fileSize, hasBOM, hasGarbled, isEmptyOrMetaOnly };
      }
    } else {
      log('鏂囦欢涓嶅瓨鍦紝闇€瑕佸垱寤');
      return { needsRepair: true, fileSize: 0 };
    }
    
    // 妫€鏌ュ唴瀹规槸鍚︽甯
    const hasFormElements = fileContent.includes('input') && 
                           fileContent.includes('button') && 
                           fileContent.includes('verify');
    const hasProperEncoding = fileContent.includes('charset="UTF-8"') || 
                             fileContent.includes("charset='UTF-8'");
    
    if (!hasFormElements || !hasProperEncoding) {
      log(`妫€娴嬪埌闂: ${!hasFormElements ? '缂哄皯琛ㄥ崟鍏冪礌' : ''} ${!hasProperEncoding ? '缂哄皯UTF-8缂栫爜澹版槑' : ''}`);
      return { needsRepair: true, fileSize };
    }
    
    log('鏂囦欢姝ｅ父锛屾棤闇€淇');
    return { needsRepair: false, fileSize };
  } catch (e) {
    error(`鏂囦欢妫€娴嬪け璐: ${e.message}`);
    return { needsRepair: true, fileSize };
  }
}

// 2. 淇HTML鏂囦欢
async function repairHtmlFile() {
  log('寮€濮嬩慨澶岺TML鏂囦欢...');
  
  try {
    // 纭繚鐩綍瀛樺湪
    const dir = path.dirname(HTML_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`宸插垱寤虹洰褰: ${dir}`);
    }
    
    // 鍐欏叆鏍囧噯妯℃澘锛堟棤BOM锛
    fs.writeFileSync(HTML_FILE_PATH, STANDARD_TEMPLATE, { encoding: 'utf8' });
    
    const newSize = fs.statSync(HTML_FILE_PATH).size;
    log(`鏂囦欢淇瀹屾垚 - 鏂板ぇ灏: ${newSize} 瀛楄妭`);
    
    return { success: true, newSize };
  } catch (e) {
    error(`鏂囦欢淇澶辫触: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// 3. 妫€娴嬪苟淇server.js鐨刄TF-8鍝嶅簲澶
async function repairServerJsMimeTypes() {
  log('妫€鏌erver.js鐨凪IME绫诲瀷閰嶇疆...');
  
  try {
    if (!fs.existsSync(SERVER_JS_PATH)) {
      error(`server.js涓嶅瓨鍦: ${SERVER_JS_PATH}`);
      return { needsRepair: false, message: '鏂囦欢涓嶅瓨鍦' };
    }
    
    let content = fs.readFileSync(SERVER_JS_PATH, 'utf8');
    let needsRepair = false;
    let repairsMade = [];
    
    // 妫€鏌.html MIME绫诲瀷
    if (!content.match(/\.html['"][^}]*charset=UTF-8/i)) {
      content = content.replace(/('|")\.html('|")\s*:\s*('|")text\/html('|")/i, '$1.html$2: $3text/html; charset=UTF-8$4');
      needsRepair = true;
      repairsMade.push('淇 .html MIME绫诲瀷');
    }
    
    // 妫€鏌.js MIME绫诲瀷
    if (!content.match(/\.js['"][^}]*charset=UTF-8/i)) {
      content = content.replace(/('|")\.js('|")\s*:\s*('|")application\/javascript('|")/i, '$1.js$2: $3application/javascript; charset=UTF-8$4');
      needsRepair = true;
      repairsMade.push('淇 .js MIME绫诲瀷');
    }
    
    // 妫€鏌.css MIME绫诲瀷
    if (!content.match(/\.css['"][^}]*charset=UTF-8/i)) {
      content = content.replace(/('|")\.css('|")\s*:\s*('|")text\/css('|")/i, '$1.css$2: $3text/css; charset=UTF-8$4');
      needsRepair = true;
      repairsMade.push('淇 .css MIME绫诲瀷');
    }
    
    if (needsRepair) {
      fs.writeFileSync(SERVER_JS_PATH, content, 'utf8');
      log(`server.js淇瀹屾垚 - 淇椤: ${repairsMade.join(', ')}`);
    } else {
      log('server.js MIME绫诲瀷閰嶇疆姝ｇ‘锛屾棤闇€淇');
    }
    
    return { needsRepair, repairsMade };
  } catch (e) {
    error(`server.js妫€鏌ュけ璐: ${e.message}`);
    return { needsRepair: false, error: e.message };
  }
}

// 4. 妫€娴/verify鎺ュ彛杩為€氭€
async function checkVerifyApi() {
  log('寮€濮嬫娴/verify鎺ュ彛杩為€氭€...');
  
  const testUrls = [
    'http://localhost:8080/verify?code=test123',
    'http://127.0.0.1:8080/verify?code=test123'
  ];
  
  let apiStatus = 'Offline';
  let responseData = null;
  
  for (const url of testUrls) {
    log(`妫€娴: ${url}`);
    
    try {
      const result = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('璇锋眰瓒呮椂')), 3000);
        
        http.get(url, (res) => {
          clearTimeout(timeout);
          
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP閿欒鐘舵€: ${res.statusCode}`));
            return;
          }
          
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              if ('success' in jsonData) {
                resolve({ success: true, data: jsonData });
              } else {
                reject(new Error('鍝嶅簲缂哄皯success瀛楁'));
              }
            } catch (e) {
              reject(new Error('鏃犳晥鐨凧SON鍝嶅簲'));
            }
          });
        }).on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      
      if (result.success) {
        apiStatus = 'Online';
        responseData = result.data;
        log(`鉁 鎺ュ彛杩炴帴鎴愬姛: ${url}`);
        break;
      }
    } catch (e) {
      log(`鉂 鎺ュ彛杩炴帴澶辫触: ${url} - ${e.message}`);
    }
  }
  
  return { status: apiStatus, data: responseData };
}

// 5. 涓诲嚱鏁
async function main() {
  console.log('=== JEV Client Portal 寮哄埗淇绋嬪簭 ===\n');
  
  // 璁板綍寮€濮嬫椂闂
  const startTime = Date.now();
  
  try {
    // 1. 妫€娴婬TML鏂囦欢
    const detectResult = await detectHtmlFile();
    let repairResult = null;
    
    // 2. 淇HTML鏂囦欢锛堝鏋滈渶瑕侊級
    if (detectResult.needsRepair) {
      repairResult = await repairHtmlFile();
    }
    
    // 3. 淇server.js MIME绫诲瀷锛堝鏋滈渶瑕侊級
    const serverJsResult = await repairServerJsMimeTypes();
    
    // 4. 妫€鏌/verify鎺ュ彛
    const apiResult = await checkVerifyApi();
    
    // 5. 鐢熸垚鎶ュ憡
    console.log('\n=== JEV Client Portal Repair Report ===');
    console.log(`馃搫 File: ${HTML_FILE_PATH}`);
    console.log(`馃搹 SizeBefore: ${detectResult.fileSize} bytes`);
    console.log(`馃搹 SizeAfter : ${repairResult ? repairResult.newSize : detectResult.fileSize} bytes`);
    console.log(`馃敜 Encoding : UTF-8 (no BOM)`);
    console.log(`馃攲 Verify API: ${apiResult.status}`);
    
    // 纭畾鐘舵€
    let finalStatus = '馃煝 SUCCESS';
    if (repairResult && !repairResult.success) {
      finalStatus = '鉂 FAIL';
    } else if (apiResult.status !== 'Online') {
      finalStatus = '鈿狅笍 WARNING';
    }
    
    console.log(`馃煝 Status: ${finalStatus}`);
    
    if (apiResult.status === 'Online' && apiResult.data) {
      console.log(`\n馃搳 鎺ュ彛鍝嶅簲鏁版嵁:`);
      console.log(`  Success: ${apiResult.data.success}`);
      if (apiResult.data.message) {
        console.log(`  Message: ${apiResult.data.message}`);
      }
    }
    
    if (serverJsResult.needsRepair) {
      console.log(`\n馃敡 Server.js淇椤:`);
      serverJsResult.repairsMade.forEach(repair => {
        console.log(`  - ${repair}`);
      });
    }
    
    const endTime = Date.now();
    console.log(`\n鈱 鎵ц鏃堕棿: ${(endTime - startTime) / 1000} 绉抈);
    
    if (repairResult && repairResult.success) {
      console.log('\n鉁 淇瀹屾垚锛佽璁块棶 http://localhost:8080/ui/login_portal.html 楠岃瘉鏁堟灉');
    } else if (!detectResult.needsRepair) {
      console.log('\n鉁 鏂囦欢鐘舵€佹甯革紝鏃犻渶淇');
    } else {
      console.log('\n鉂 淇澶辫触锛岃妫€鏌ラ敊璇俊鎭');
    }
    
  } catch (e) {
    error(`绋嬪簭鎵ц澶辫触: ${e.message}`);
    console.log('\n鉂 Status: FAIL');
  }
}

// 鎵ц涓诲嚱鏁
main();