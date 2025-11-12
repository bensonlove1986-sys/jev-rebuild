// JEV 控制面板重置工具
console.log('==================== JEV 控制面板重置 ====================');

// 清理全局变量
if (window.__JEV_CONTROL_PANEL__) {
    console.log('移除旧的全局标志: __JEV_CONTROL_PANEL__');
    try {
        delete window.__JEV_CONTROL_PANEL__;
    } catch (e) {
        window.__JEV_CONTROL_PANEL__ = null;
    }
}

// 清理面板元素
const oldPanels = document.querySelectorAll('#jev-control-panel, .jev-control-panel, [data-jev-panel]');
if (oldPanels.length > 0) {
    console.log(`找到 ${oldPanels.length} 个旧面板实例，正在移除...`);
    oldPanels.forEach((panel, index) => {
        try {
            if (panel.parentNode) {
                panel.parentNode.removeChild(panel);
                console.log(`已移除面板实例 ${index + 1}`);
            }
        } catch (e) {
            console.error(`移除面板实例失败:`, e);
        }
    });
}

// 重置 JEVControlPanel
if (window.JEVControlPanel) {
    console.log('检测到 JEVControlPanel 实例，执行清理...');
    try {
        if (typeof window.JEVControlPanel.cleanup === 'function') {
            window.JEVControlPanel.cleanup();
        }
        delete window.JEVControlPanel;
        console.log('JEVControlPanel 已清理');
    } catch (e) {
        console.error('清理 JEVControlPanel 失败:', e);
        window.JEVControlPanel = null;
    }
}

console.log('==================== 重置完成 ====================');
console.log('请刷新页面以重新加载 JEV 控制面板。');
