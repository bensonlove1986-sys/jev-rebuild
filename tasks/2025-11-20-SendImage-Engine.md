# 🧠 任务标识
JEV/2025-11-20/SendImage-Engine

---

## 🎯 执行目标
开发并部署 `/send-image` 模块，
实现系统自动通过 Daojie WABA 向客户发送产品图片的能力，
完成以下功能：

- 📤 将图片（R2/网址/本地文件）通过 Daojie WABA 发送给客户
- 🔄 与报价引擎集成，实现关键词自动触发图片发送
- 🖥️ 在控制面板添加「发送图片」UI按钮
- 🔗 支持多种图片来源（R2存储/自建网站/公共URL）

---

## 🔍 上下文说明

此模块基于：
- Daojie WABA（WhatsApp Business API）集成
- Cloudflare Worker 中转服务
- 客户沟通历史和产品数据库

目标是实现系统双向闭环通信：
> 不仅能识别客户发送的产品图片并报价，
> 还能主动向客户发送产品图片进行展示，
> 形成完整的自动化对话流程。

---

## ⚙️ 操作步骤

1️⃣ 新增 `/send-image` Worker 端点；
2️⃣ 实现 Daojie WABA API 调用逻辑；
3️⃣ 在控制面板 `jev_panel.html` 添加发送图片UI；
4️⃣ 与报价引擎集成，实现关键词自动触发；
5️⃣ 配置图片来源映射（产品型号→图片URL）；
6️⃣ 添加错误处理和日志记录；
7️⃣ 进行功能测试和验证。

---

## 💻 Worker 代码实现

```js
// === JEV SendImage Engine ===
if (path === "/send-image") {
  try {
    const body = await request.json();
    const { contact_id, image_url, caption } = body;

    // 验证必要参数
    if (!contact_id || !image_url) {
      return json({ success: false, error: "Missing required parameters: contact_id and image_url" }, 400);
    }

    // 验证API令牌
    if (!env.DAOJIE_WABA_TOKEN) {
      return json({ success: false, error: "Missing DAOJIE_WABA_TOKEN in environment" }, 500);
    }

    // 发送图片到Daojie API
    const response = await fetch("https://services.leadconnectorhq.com/conversations/messages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.DAOJIE_WABA_TOKEN}`,
        "Version": env.LEADCONNECTOR_API_VERSION || "2021-07-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        locationId: "3SsfTbU1lmAPpkG9iB6C", // 固定位置ID
        contactId: contact_id,
        message: {
          type: "Image",
          body: image_url,
          text: caption || ""
        }
      })
    });

    const responseData = await response.text();
    
    // 记录发送日志
    const logEntry = {
      timestamp: new Date().toISOString(),
      contact_id,
      image_url,
      caption,
      success: response.ok,
      status: response.status,
      response: responseData
    };

    // 保存到KV日志
    const today = new Date().toISOString().split("T")[0];
    await env.JEVPI.put(`log:send-image:${today}:${Date.now()}`, JSON.stringify(logEntry));

    return json({ 
      success: response.ok, 
      status: response.status, 
      message: response.ok ? "Image sent successfully" : "Failed to send image",
      response: responseData 
    }, response.ok ? 200 : response.status);
  } catch (error) {
    console.error("SendImage Error:", error);
    return json({ 
      success: false, 
      error: `Internal error: ${error.message || "Unknown error occurred"}` 
    }, 500);
  }
}

// 辅助函数：构建JSON响应
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    status
  });
}
```

---

## 🔄 报价引擎集成代码

在报价处理逻辑中添加自动图片发送功能：

```js
// 在自动报价处理函数中集成
async function processQuoteRequest(request, env, message_text, contact_id) {
  // 现有的型号识别和报价逻辑...
  
  // 新增：检查是否包含图片请求关键词
  if (/photo|image|图片|发图|看看|照片/i.test(message_text)) {
    try {
      const model = extractModelFromMessage(message_text);
      if (model) {
        const item = findProductByModel(model, env);
        if (item?.ImageUrl) {
          await sendProductImage(contact_id, item, env);
          // 记录自动发送事件
          await env.JEVPI.put(`log:auto-image:${Date.now()}`, JSON.stringify({
            contact_id,
            model: item.Model,
            image_url: item.ImageUrl,
            timestamp: new Date().toISOString()
          }));
        }
      }
    } catch (e) {
      console.error("Auto image send error:", e);
    }
  }
  
  // 继续现有的报价处理...
}

// 发送产品图片的辅助函数
async function sendProductImage(contact_id, product, env) {
  const caption = `${product.Model} (${product.Brand}) — ${product.BasePrice} ${product.Currency}`;
  
  // 调用本地send-image端点或直接调用Daojie API
  const workerBase = env.WORKER_BASE_URL || "https://jevshop.bensonlove1986.workers.dev";
  
  await fetch(`${workerBase}/send-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contact_id,
      image_url: product.ImageUrl,
      caption
    })
  });
}

// 从产品数据库查找产品
function findProductByModel(model, env) {
  // 实现从价格数据库或产品目录查找产品信息
  // 可以是从KV获取或从API查询
  // 返回包含Model, Brand, BasePrice, Currency, ImageUrl的对象
  return null; // 示例占位符
}
```

---

## 🖥️ 控制面板UI实现

在 `jev_panel.html` 客户详情区域添加发送图片功能：

```html
<!-- 发送图片按钮和模态框 -->
<button id="sendImageBtn" class="btn btn-primary mb-2">发送图片</button>

<!-- 图片发送模态框 -->
<div id="imageModal" class="modal fade" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">发送产品图片</h5>
        <button type="button" class="close" data-dismiss="modal">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="contactId">客户ID</label>
          <input type="text" id="contactId" class="form-control" readonly>
        </div>
        <div class="form-group">
          <label for="imageUrl">图片URL</label>
          <input type="text" id="imageUrl" class="form-control" placeholder="输入图片URL">
        </div>
        <div class="form-group">
          <label for="caption">图片说明</label>
          <textarea id="caption" class="form-control" rows="2" placeholder="输入图片说明文字"></textarea>
        </div>
        <div id="productSelector" class="form-group">
          <label>从产品库选择</label>
          <input type="text" id="productSearch" class="form-control" placeholder="搜索产品型号">
          <div id="productResults" class="mt-2 max-h-60 overflow-y-auto"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">取消</button>
        <button type="button" id="confirmSendImage" class="btn btn-primary">发送图片</button>
      </div>
    </div>
  </div>
</div>

<!-- 发送成功提示 -->
<div id="sendSuccessToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
  <div class="toast-header bg-success text-white">
    <strong class="mr-auto">成功</strong>
    <button type="button" class="ml-2 mb-1 close text-white" data-dismiss="toast">&times;</button>
  </div>
  <div class="toast-body">
    图片发送成功！
  </div>
</div>
```

JavaScript实现：

```javascript
// 初始化图片发送功能
function initImageSender() {
  const sendImageBtn = document.getElementById('sendImageBtn');
  const imageModal = document.getElementById('imageModal');
  const confirmSendImage = document.getElementById('confirmSendImage');
  const contactIdInput = document.getElementById('contactId');
  const imageUrlInput = document.getElementById('imageUrl');
  const captionInput = document.getElementById('caption');
  const productSearch = document.getElementById('productSearch');
  const productResults = document.getElementById('productResults');
  const sendSuccessToast = document.getElementById('sendSuccessToast');
  
  // 打开模态框时设置当前客户ID
  sendImageBtn.addEventListener('click', function() {
    // 获取当前选中的客户ID
    const currentContactId = getCurrentContactId(); // 需要实现此函数
    contactIdInput.value = currentContactId;
    imageUrlInput.value = '';
    captionInput.value = '';
    
    $('#imageModal').modal('show');
  });
  
  // 产品搜索功能
  productSearch.addEventListener('input', async function() {
    const searchTerm = this.value.trim();
    if (searchTerm.length < 2) {
      productResults.innerHTML = '';
      return;
    }
    
    try {
      // 调用产品搜索API
      const response = await fetch(`/api/search-products?q=${encodeURIComponent(searchTerm)}`);
      const products = await response.json();
      
      // 渲染搜索结果
      productResults.innerHTML = products.map(product => `
        <div class="card mb-1 product-item" data-model="${product.Model}" data-image="${product.ImageUrl}">
          <div class="card-body p-2">
            <div class="row">
              <div class="col-6">
                <strong>${product.Model}</strong><br>
                <small>${product.Brand}</small>
              </div>
              <div class="col-6 text-right">
                ${product.BasePrice} ${product.Currency}
              </div>
            </div>
          </div>
        </div>
      `).join('');
      
      // 添加选择事件
      document.querySelectorAll('.product-item').forEach(item => {
        item.addEventListener('click', function() {
          imageUrlInput.value = this.dataset.image;
          const productInfo = products.find(p => p.Model === this.dataset.model);
          if (productInfo) {
            captionInput.value = `${productInfo.Model} (${productInfo.Brand}) — ${productInfo.BasePrice} ${productInfo.Currency}`;
          }
        });
      });
    } catch (error) {
      console.error('Product search error:', error);
    }
  });
  
  // 确认发送图片
  confirmSendImage.addEventListener('click', async function() {
    const contactId = contactIdInput.value;
    const imageUrl = imageUrlInput.value;
    const caption = captionInput.value;
    
    if (!contactId || !imageUrl) {
      alert('请填写客户ID和图片URL');
      return;
    }
    
    try {
      // 发送图片
      const response = await fetch('/send-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          image_url: imageUrl,
          caption: caption
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 显示成功提示
        $('#imageModal').modal('hide');
        $(sendSuccessToast).toast('show');
        
        // 记录到发送历史
        addToSentHistory(contactId, 'Image', { image_url: imageUrl, caption: caption });
      } else {
        alert('发送失败: ' + (result.error || '未知错误'));
      }
    } catch (error) {
      console.error('Send image error:', error);
      alert('发送图片时发生错误');
    }
  });
}

// 在页面加载完成后初始化
$(document).ready(function() {
  initImageSender();
});
```

---

## 📁 图片资源管理建议

创建图片资源映射配置文件（可存储在KV中）：

```json
// 产品图片映射示例 (存储为KV: image_mapping)
{
  "model_images": {
    "E2E-X3D1-N": "https://jevshop.com/products/e2e-x3d1-n.jpg",
    "TL-WN722N": "https://jevshop.com/products/tl-wn722n.jpg",
    "C2000-2024": "https://jevshop.com/products/c2000-2024.jpg"
  },
  "brand_images": {
    "OMRON": "https://jevshop.com/brands/omron-logo.png",
    "TP-LINK": "https://jevshop.com/brands/tplink-logo.png"
  },
  "categories": {
    "proximity_sensors": "https://jevshop.com/categories/proximity-sensors.jpg",
    "network_adapters": "https://jevshop.com/categories/network-adapters.jpg"
  }
}
```

---

## 🧾 验证方式

1️⃣ **API端点测试**：

```bash
# 使用curl测试send-image端点
curl -X POST https://jevshop.bensonlove1986.workers.dev/send-image \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "GakCvF3msAuChq2DtER9",
    "image_url": "https://jevshop.com/products/e2e-x3d1-n.jpg",
    "caption": "OMRON E2E-X3D1-N Proximity Sensor"
  }'
```

2️⃣ **预期响应**：

```json
{
  "success": true,
  "status": 200,
  "message": "Image sent successfully",
  "response": "{...}"
}
```

3️⃣ **控制面板UI测试**：
- 打开jev_panel.html
- 选择客户
- 点击「发送图片」按钮
- 选择产品或输入图片URL
- 确认发送
- 验证图片是否成功发送到客户WhatsApp

4️⃣ **自动触发测试**：
- 模拟客户发送包含"发图片"或"photo"关键词的消息
- 验证系统是否自动发送对应产品图片

---

## 🧱 任务完成标准

| 项目 | 要求 |
| ---- | ---- |
| `/send-image` 端点 | 成功实现并可正常调用 |
| Daojie API 集成 | 正确配置并可成功发送图片 |
| 控制面板UI | 成功添加发送图片按钮和交互界面 |
| 自动触发功能 | 成功实现关键词自动触发发送图片 |
| 错误处理 | 完善的错误处理和日志记录 |
| 响应格式 | 统一的JSON响应格式 |
| 安全性 | API令牌安全存储，输入验证 |

---

## 💬 附加说明

完成此模块后，JEV系统将具备完整的双向多媒体通信能力：

* 📥 **入向处理**：客户发送产品图片 → 系统识别型号并报价
* 📤 **出向处理**：系统自动发送产品图片 → 客户查看详情
* 🔄 **闭环形成**：完成全自动的视觉化产品咨询与报价流程
* 💡 **智能触发**：通过关键词自动识别客户需求并提供视觉资料
* 🖼️ **资源整合**：支持多种图片来源，提供统一的发送接口

此功能将显著提升客户体验，使沟通更加直观高效，同时减轻人工操作负担，实现真正的全自动化产品咨询流程。

---