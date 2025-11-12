// 简化版UI渲染修复脚本
const fs = require('fs');

console.log('开始简化版UI修复...');

// 目标文件路径
const targetFile = 'd:\\PDF转网页\\scripts\\daojiem_capture_optimized.user.js';

// 读取文件内容
let content = fs.readFileSync(targetFile, 'utf8');

// 修复1: 确保ensurePanel调用createUnifiedWindow
if (content.includes('createJevWindow()')) {
    content = content.replace('createJevWindow();', 'createUnifiedWindow();');
    console.log('修复1: 已将ensurePanel中的createJevWindow替换为createUnifiedWindow');
}

// 修复2: 确保init函数正确暴露UI函数
const oldInit = 'function init() {\n        // 确保window对象存在\n        if (!window) return;\n        \n        // 暴露公共函数 - 使用统一命名\n        window.createJEVUnifiedWindow = createUnifiedWindow;\n        window.processImageToWorker = processImageToWorker;\n        \n        // 保持向后兼容\n        window.createJEVChatWindow = createUnifiedWindow;\n    }';

const newInit = 'function init() {\n        // 确保window对象存在\n        if (!window) return;\n        \n        // 确保JEV对象存在\n        if (!window.JEV) {\n            window.JEV = {};\n        }\n        \n        // 确保STATE对象存在\n        if (!window.JEV.STATE) {\n            window.JEV.STATE = {};\n        }\n        \n        // 暴露公共函数\n        window.ensurePanel = ensurePanel;\n        window.renderFlags = renderFlags;\n        window.createUnifiedWindow = createUnifiedWindow;\n        window.processImageToWorker = processImageToWorker;\n        \n        // 添加到JEV对象\n        window.JEV.ensurePanel = ensurePanel;\n        window.JEV.renderFlags = renderFlags;\n        window.JEV.createUnifiedWindow = createUnifiedWindow;\n        \n        // 保持向后兼容\n        window.createJEVChatWindow = createUnifiedWindow;\n    }';

if (content.includes(oldInit)) {
    content = content.replace(oldInit, newInit);
    console.log('修复2: 增强了init函数，确保正确初始化JEV对象和暴露UI函数');
}

// 修复3: 添加UI检查和修复函数
const uiFixCode = `
// 全局UI修复函数
function fixUI() {
  try {
    console.log('[JEV-UI] 执行UI修复...');
    
    // 修复窗口创建冲突
    if (typeof createJevWindow === 'function' && typeof createUnifiedWindow === 'function') {
      console.log('[JEV-UI] 修复窗口创建冲突，将createJevWindow重定向到createUnifiedWindow');
      window.JEV.createJevWindow = createUnifiedWindow;
    }
    
    // 确保面板存在
    if (typeof ensurePanel === 'function') {
      console.log('[JEV-UI] 尝试显示UI面板...');
      ensurePanel();
    } else if (window.JEV && typeof window.JEV.ensurePanel === 'function') {
      console.log('[JEV-UI] 使用JEV对象中的ensurePanel...');
      window.JEV.ensurePanel();
    }
    
    // 修复日志功能
    if (!window.logUI && window.JEV && window.JEV.logUI) {
      window.logUI = window.JEV.logUI;
      console.log('[JEV-UI] 修复logUI全局函数');
    }
    
    // 立即尝试显示面板
    setTimeout(() => {
      if (window.ensurePanel) {
        window.ensurePanel();
      }
    }, 100);
    
  } catch (e) {
    console.error('[JEV-UI] 修复失败:', e);
  }
}

// 自动执行修复
setTimeout(fixUI, 500);
`;

// 在init()调用前添加修复代码
if (content.includes('init();')) {
    content = content.replace('init();', uiFixCode + '\n\ninit();');
    console.log('修复3: 添加了全局UI修复函数');
}

// 保存修复后的文件
fs.writeFileSync(targetFile, content, 'utf8');

console.log('\nUI修复完成！');
console.log('主要修复内容：');
console.log('1. 修复了窗口创建函数的调用冲突');
console.log('2. 增强了init函数以正确初始化UI组件');
console.log('3. 添加了自动UI修复和检测功能');
console.log('\n请刷新页面或重新加载脚本以查看效果。');