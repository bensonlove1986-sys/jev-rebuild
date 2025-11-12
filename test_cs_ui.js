// 测试客服UI修复脚本
console.log('开始测试客服UI修复...');

// 确保JEV对象存在
if (!window.JEV) {
  window.JEV = {};
  console.log('已初始化JEV对象');
}

// 定义必要的辅助函数
if (!window.JEV.logUI) {
  window.JEV.logUI = function(message) {
    console.log(`[JEV-UI] ${message}`);
  };
  console.log('已定义logUI函数');
}

if (!window.JEV.setStatus) {
  window.JEV.setStatus = function(status) {
    console.log(`[JEV-Status] ${status}`);
    if (window.JEV.STATE?.jevStatusSpan) {
      window.JEV.STATE.jevStatusSpan.textContent = status;
    }
  };
  console.log('已定义setStatus函数');
}

if (!window.JEV.STATE) {
  window.JEV.STATE = {};
  console.log('已初始化JEV.STATE对象');
}

// 尝试创建面板
function testCreatePanel() {
  console.log('尝试创建客服面板...');
  try {
    // 直接调用createJevWindow函数
    if (typeof createJevWindow === 'function') {
      createJevWindow();
      console.log('✅ createJevWindow函数调用成功！');
    } else {
      console.log('❌ createJevWindow函数未找到，尝试调用ensurePanel...');
      if (window.JEV && window.JEV.ensurePanel) {
        window.JEV.ensurePanel();
        console.log('✅ ensurePanel函数调用成功！');
      } else {
        console.log('❌ ensurePanel函数也不可用');
      }
    }
    
    // 测试客服消息显示
    setTimeout(() => {
      if (typeof setCsText === 'function') {
        setCsText('🎉 客服UI修复成功！这是一条测试消息。');
        console.log('✅ 已显示测试客服消息！');
      }
    }, 1000);
    
  } catch (e) {
    console.error('❌ 创建面板时出错:', e);
  }
}

// 等待文档加载完成
document.addEventListener('DOMContentLoaded', () => {
  console.log('文档加载完成，开始测试...');
  testCreatePanel();
});

// 如果文档已经加载完成，立即测试
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  console.log('文档已就绪，立即测试...');
  testCreatePanel();
}

console.log('测试脚本已启动！');