// 修复UI渲染冲突问题
const fs = require('fs');
const path = require('path');

// 目标文件路径
const targetFile = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

// 读取文件内容
let content = fs.readFileSync(targetFile, 'utf8');

console.log('开始修复UI渲染冲突问题...');

// 1. 修复ensurePanel函数，使其调用createUnifiedWindow而不是createJevWindow
content = content.replace(
  /function ensurePanel\(\)\s*{[\s\S]*?createJevWindow\(\);/,
  function(match) {
    console.log('修复ensurePanel函数调用...');
    return match.replace('createJevWindow();', 'createUnifiedWindow();');
  }
);

// 2. 修复init函数，确保正确暴露createUnifiedWindow并初始化JEV对象
content = content.replace(
  /function init\(\)\s*{[\s\S]*?}\s*\}/,
  `function init() {
        // 确保window对象存在
        if (!window) return;
        
        // 确保JEV对象存在
        if (!window.JEV) {
            window.JEV = {};
        }
        
        // 确保STATE对象存在
        if (!window.JEV.STATE) {
            window.JEV.STATE = {};
        }
        
        // 暴露公共函数
        window.ensurePanel = ensurePanel;
        window.renderFlags = renderFlags;
        window.logUI = window.JEV.logUI;
        window.createUnifiedWindow = createUnifiedWindow;
        window.processImageToWorker = processImageToWorker;
        
        // 添加到JEV对象
        window.JEV.ensurePanel = ensurePanel;
        window.JEV.renderFlags = renderFlags;
        window.JEV.createUnifiedWindow = createUnifiedWindow;
        
        // 保持向后兼容
        window.createJEVChatWindow = createUnifiedWindow;
    }`
);

// 3. 修复flushLogs函数，确保正确查找日志框
content = content.replace(
  /function flushLogs\(\)\s*{[\s\S]*?logBox\s*=\s*document\.getElementById\('jev-log'\);[\s\S]*?}/,
  `function flushLogs() {
  if (jevLogQueue.length === 0) {
    jevLogScheduled = false;
    return;
  }

  try { // 确保有对应的catch块
    // 多方式获取日志框
    let logBox = window.JEV.STATE.jevLogBox;
    if (!logBox) {
      logBox = document.getElementById('jev-log');
      // 同时检查其他可能的日志框ID
      if (!logBox) {
        logBox = document.querySelector('#jev-window .jev-log');
      }
      window.JEV.STATE.jevLogBox = logBox;
    }

    // 如果没有日志框，尝试确保面板存在
    if (!logBox) {
      try {
        if (window.ensurePanel) {
          window.ensurePanel();
          // 再次尝试获取日志框
          logBox = document.getElementById('jev-log');
          if (!logBox) {
            logBox = document.querySelector('#jev-window .jev-log');
          }
          window.JEV.STATE.jevLogBox = logBox;
        }
      } catch (e) {
        console.warn('JEV: 尝试创建面板失败:', e);
      }
    }

    // 如果仍然没有日志框，清空队列并退出
    if (!logBox) {
      console.warn('JEV: 找不到日志框，无法显示日志');
      jevLogQueue = [];
      jevLogScheduled = false;
      return;
    }

    // 批量创建日志内容
    const logContent = document.createElement('div');
    const logsToFlush = jevLogQueue.splice(0, 50); // 每次最多处理50条

    logsToFlush.forEach(logMsg => {
      const logItem = document.createElement('div');
      logItem.style.cssText = 'margin:2px 0;padding:2px 4px;border-radius:2px;font-size:14px;line-height:1.3';
      logItem.textContent = logMsg; // 使用textContent更安全
      logContent.appendChild(logItem);
    });

    // 一次性添加到DOM
    logBox.appendChild(logContent);
    logBox.scrollTop = logBox.scrollHeight;

    // 限制日志数量
    if (logBox.children.length > 100) {
      while (logBox.children.length > 100) {
        logBox.removeChild(logBox.firstChild);
      }
    }
  } catch (e) {
    console.error('JEV: 批量刷新日志失败:', e);
  }

  // 如果还有日志，继续调度下一次刷新
  if (jevLogQueue.length > 0) {
    setTimeout(flushLogs, 2000);
  } else {
    jevLogScheduled = false;
  }
}`
);

// 4. 确保logUI函数正确处理日志
content = content.replace(
  /window\.JEV\.logUI\s*=\s*function logUI\(msg\)\s*{[\s\S]*?}\s*}/,
  `window.JEV.logUI = function logUI(msg) {
  if (!msg) return;

  // 同时输出到控制台
  console.log('[JEV-UI]', msg);

  // 添加到队列
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-CN', {hour12: false});
  jevLogQueue.push(`${timeStr} ${msg}`);

  // 如果没有调度刷新，立即安排一次
  if (!jevLogScheduled) {
    jevLogScheduled = true;
    setTimeout(flushLogs, 0); // 立即执行，不再延迟
  }
}`
);

// 5. 添加一个全局的UI初始化检查函数
const uiCheckFunction = `
// 全局UI检查函数
function checkAndFixUI() {
  try {
    console.log('[JEV] 执行UI检查...');
    
    // 确保关键的全局函数存在
    if (!window.ensurePanel) {
      console.warn('[JEV] ensurePanel函数不存在，尝试修复...');
      if (window.JEV && window.JEV.ensurePanel) {
        window.ensurePanel = window.JEV.ensurePanel;
      }
    }
    
    if (!window.renderFlags) {
      console.warn('[JEV] renderFlags函数不存在，尝试修复...');
      if (window.JEV && window.JEV.renderFlags) {
        window.renderFlags = window.JEV.renderFlags;
      }
    }
    
    if (!window.logUI) {
      console.warn('[JEV] logUI函数不存在，尝试修复...');
      if (window.JEV && window.JEV.logUI) {
        window.logUI = window.JEV.logUI;
      }
    }
    
    // 尝试显示UI
    if (window.ensurePanel) {
      console.log('[JEV] 尝试显示UI面板...');
      window.ensurePanel();
    }
    
  } catch (e) {
    console.error('[JEV] UI检查失败:', e);
  }
}

// 确保在页面加载完成后执行UI检查
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(checkAndFixUI, 100);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkAndFixUI, 100);
  });
}
`;

// 将UI检查函数添加到文件末尾（在init()调用之前）
content = content.replace(/init\(\);/g, uiCheckFunction + '\n\ninit();');

// 保存修复后的文件
fs.writeFileSync(targetFile, content, 'utf8');

console.log('UI渲染冲突修复完成！');
console.log('\n修复内容：');
console.log('1. 修复了ensurePanel函数，使其调用createUnifiedWindow而不是createJevWindow');
console.log('2. 增强了init函数，确保正确初始化JEV对象和暴露所有必要的UI函数');
console.log('3. 改进了flushLogs函数，添加了更健壮的日志框查找逻辑');
console.log('4. 优化了logUI函数，减少了日志显示延迟');
console.log('5. 添加了全局UI检查函数，确保UI组件正确初始化');

console.log('\n请运行验证脚本检查修复是否成功。');