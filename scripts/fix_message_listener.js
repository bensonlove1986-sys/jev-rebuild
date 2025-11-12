const fs = require('fs');
const path = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

console.log('修复Chrome消息监听器问题...');

// 读取文件
fs.readFile(path, 'utf8', (err, data) => {
    if (err) {
        console.error('读取文件失败:', err);
        return;
    }
    
    // 查找所有可能的Chrome消息监听器
    const listenerPattern = /chrome\.runtime\.onMessage\.addListener\s*\(([^)]*)\)\s*{([\s\S]*?)sendResponse\s*\([^)]*\)\s*;/g;
    let fixedData = data;
    let found = false;
    
    // 使用正则表达式查找并修复所有匹配的监听器
    fixedData = fixedData.replace(listenerPattern, (match, params, body) => {
        found = true;
        console.log('找到消息监听器，添加return true');
        return `chrome.runtime.onMessage.addListener(${params}) {${body}sendResponse();\n    return true; // 保持端口打开`;
    });
    
    // 如果没有找到标准模式，尝试查找简单的监听器模式
    if (!found) {
        const simplePattern = /chrome\.runtime\.onMessage\.addListener\s*\([^)]*\)/g;
        const match = data.match(simplePattern);
        
        if (match) {
            console.log(`找到${match.length}个消息监听器，将手动添加修复提示`);
            // 添加一个全局的修复函数
            const fixCode = `
// 修复消息监听器端口关闭问题
function fixChromeMessageListeners() {
    const originalAddListener = chrome.runtime.onMessage.addListener;
    chrome.runtime.onMessage.addListener = function(callback) {
        return originalAddListener.call(this, function(message, sender, sendResponse) {
            // 执行原始回调
            const result = callback(message, sender, sendResponse);
            // 确保返回true以保持端口打开
            return result === false ? false : true;
        });
    };
    console.log('[JEV] Chrome消息监听器已修复');
}

// 应用修复
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    fixChromeMessageListeners();
}`;
            
            // 在安全初始化代码后添加这个修复函数
            const initEndIndex = fixedData.indexOf('// 自动切换 Worker 地址');
            if (initEndIndex !== -1) {
                const insertionPoint = fixedData.indexOf('}', initEndIndex) + 1;
                fixedData = fixedData.substring(0, insertionPoint) + fixCode + fixedData.substring(insertionPoint);
            } else {
                // 如果找不到特定位置，添加到文件开头
                const metaEndIndex = fixedData.indexOf('// ==/UserScript==');
                if (metaEndIndex !== -1) {
                    const insertionPoint = metaEndIndex + '// ==/UserScript=='.length;
                    fixedData = fixedData.substring(0, insertionPoint) + fixCode + fixedData.substring(insertionPoint);
                }
            }
        } else {
            console.log('未找到Chrome消息监听器，可能脚本中不包含此类代码');
        }
    }
    
    // 保存修复后的文件
    fs.writeFile(path, fixedData, 'utf8', (err) => {
        if (err) {
            console.error('写入文件失败:', err);
            return;
        }
        console.log('✓ Chrome消息监听器修复完成！');
        if (found) {
            console.log('已在现有监听器中添加了return true语句');
        } else {
            console.log('已添加全局监听器修复函数');
        }
    });
});