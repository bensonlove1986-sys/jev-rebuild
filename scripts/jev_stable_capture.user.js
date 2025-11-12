// ==UserScript==
// @name         超稳图片捕获测试
// @namespace    https://daojiemarketing.com/
// @version      1.0
// @description  测试三层兜底图片捕获策略
// @author       JEV
// @match        https://*/*
// @match        http://*/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

// 全局禁用 PowerShell 弹窗
(() => {
  window.JEV_FORCE_BROWSER_MODE = true;
  window.JEV_DISABLE_POWERSHELL = true;

  // 拦截任何触发 PowerShell 弹窗的函数
  const dummyDialog = () => console.warn("[JEV] PowerShell 模式已禁用");
  window.showPowerShellDialog = dummyDialog;
  window.JEV = window.JEV || {};
  window.JEV.showPowerShellDialog = dummyDialog;

  console.log("%c[JEV] PowerShell 弹窗已全局禁用", "color:#00e0ff;font-weight:bold");
})();

// 全局配置
window.JEV = window.JEV || {};
let lastCaptureTs = 0;

/**
 * 超稳拿图函数 - 三层兜底
 * 适配 Daojie 聊天、网页、CRM 图片上传区
 */
async function JEV_captureImage(imgElement, forceCompress = false) {
  // 截图限频机制
  const now = Date.now();
  if (!forceCompress && now - lastCaptureTs < 3000) { // 3秒内限制截图
    console.log('⏳ 截图限频触发，跳过');
    return null;
  }
  lastCaptureTs = now;
  
  if (!imgElement) return null;
  console.log("[JEV] 尝试捕获图片...");

  let dataUrl = "";

  // 🧩 方案一：canvas 直接截图（最快）
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const w = imgElement.naturalWidth || imgElement.width * 2;
    const h = imgElement.naturalHeight || imgElement.height * 2;
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.filter = "contrast(1.3) brightness(1.05)";
    ctx.drawImage(imgElement, 0, 0, w, h);
    dataUrl = canvas.toDataURL("image/png", 1.0);
    if (dataUrl && dataUrl.length > 5000) {
      console.log("[JEV] ✅ 第一层拿图成功");
      return dataUrl;
    }
  } catch (e) {
    console.warn("[JEV] 第一层失败，进入第二层", e);
  }

  // 🧩 方案二：fetch Blob 转 base64（兼容 blob:URL）
  try {
    const src = imgElement.src;
    const resp = await fetch(src);
    const blob = await resp.blob();
    dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    if (dataUrl && dataUrl.length > 5000) {
      console.log("[JEV] ✅ 第二层拿图成功");
      return dataUrl;
    }
  } catch (e) {
    console.warn("[JEV] 第二层失败，尝试第三层", e);
  }

  // 🧩 方案三：直接上传图片URL给 Worker（最保险）
  try {
    const workerUrl = "https://jevshop.bensonlove1986.workers.dev/get-image-by-url";
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imgElement.src }),
    });
    const json = await res.json();
    if (json && json.base64_url && json.base64_url.length > 5000) {
      console.log("[JEV] ✅ 第三层成功：Worker返回图片base64");
      return json.base64_url;
    }
  } catch (e) {
    console.error("[JEV] ❌ 所有方案均失败：", e);
  }

  console.error("[JEV] ❌ 拿图失败：dataUrl为空");
  return null;
}

// 替换原始的captureImgToDataUrl函数
window.captureImgToDataUrl = JEV_captureImage;

// 添加测试按钮
function addTestButton() {
  const button = document.createElement('div');
  button.innerText = '测试拿图';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    z-index: 9999;
    font-size: 14px;
    font-weight: bold;
  `;
  
  button.onclick = async () => {
    const img = document.querySelector('img');
    if (!img) {
      alert('未找到图片元素');
      return;
    }
    
    button.innerText = '正在拿图...';
    const dataUrl = await JEV_captureImage(img);
    
    if (dataUrl) {
      button.innerText = '✅ 拿图成功';
      console.log('拿图成功，长度:', dataUrl.length);
      alert(`拿图成功！数据长度: ${dataUrl.length} 字符`);
    } else {
      button.innerText = '❌ 拿图失败';
      alert('拿图失败');
    }
    
    setTimeout(() => {
      button.innerText = '测试拿图';
    }, 2000);
  };
  
  document.body.appendChild(button);
}

// 页面加载完成后添加测试按钮
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addTestButton);
} else {
  addTestButton();
}