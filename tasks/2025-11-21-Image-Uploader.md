# 🧠 任务标识
JEV/2025-11-21/Image-Uploader

---

## 🎯 执行目标
开发并部署 R2 产品图库上传模块，
实现系统在控制面板内直接上传产品图片到 Cloudflare R2 的功能，
完成以下功能：

- 📤 在 `jev_panel.html` 添加图片上传小窗口
- 🔄 支持本地图片选择和一键上传到 R2 `jevproductimage` bucket
- 🔗 自动生成并复制公共访问 URL
- 🖥️ 提供用户友好的上传进度和状态反馈
- 🔧 与 `send-image` 模块集成，实现上传后直接发送

---

## 🔍 上下文说明

此模块基于：
- Cloudflare R2 `jevproductimage` 存储桶
- Cloudflare Worker `/upload-product` 接口
- `jev_panel.html` 控制面板

目标是简化产品图片管理工作流：
> 让用户无需离开控制面板，就能完成产品图片的上传、获取URL并直接使用，
> 提高产品信息管理和客户沟通效率。

---

## ⚙️ 操作步骤

1️⃣ 在 `jev_panel.html` 添加上传按钮和模态窗口
2️⃣ 实现图片选择和预览功能
3️⃣ 添加上传进度条和状态显示
4️⃣ 集成 `/upload-product` API 调用
5️⃣ 实现 URL 自动复制功能
6️⃣ 添加上传后直接发送图片的选项
7️⃣ 进行功能测试和验证

---

## 💻 HTML 实现（添加到 jev_panel.html）

```html
<!-- 上传按钮 - 可放置在控制面板顶部或产品管理区域 -->
<button id="uploadImageBtn" class="btn btn-primary mb-2">
  <i class="fas fa-cloud-upload-alt"></i> 上传产品图片
</button>

<!-- 图片上传模态框 -->
<div id="uploadImageModal" class="modal fade" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">上传产品图片</h5>
        <button type="button" class="close" data-dismiss="modal">&times;</button>
      </div>
      <div class="modal-body">
        <!-- 图片预览区域 -->
        <div id="imagePreview" class="mb-3 text-center" style="display: none;">
          <img id="previewImg" src="" alt="预览图片" class="img-thumbnail" style="max-height: 200px;">
        </div>
        
        <!-- 图片选择 -->
        <div class="form-group">
          <label for="imageFile">选择图片文件</label>
          <div class="custom-file">
            <input type="file" class="custom-file-input" id="imageFile" accept="image/*">
            <label class="custom-file-label" for="imageFile">选择图片...</label>
          </div>
          <small class="form-text text-muted">支持 JPG, PNG, GIF 等格式</small>
        </div>
        
        <!-- 文件名输入 -->
        <div class="form-group">
          <label for="fileName">保存文件名</label>
          <input type="text" id="fileName" class="form-control" placeholder="自动从文件获取，可修改">
          <small class="form-text text-muted">建议使用产品型号作为文件名，例如: E2E-X3D1-N.jpg</small>
        </div>
        
        <!-- 产品信息关联 -->
        <div class="form-group">
          <label for="modelAssoc">关联产品型号（可选）</label>
          <input type="text" id="modelAssoc" class="form-control" placeholder="输入产品型号以自动关联">
        </div>
        
        <!-- 上传进度条 -->
        <div id="uploadProgressContainer" class="mt-3" style="display: none;">
          <div class="progress">
            <div id="uploadProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">0%</div>
          </div>
        </div>
        
        <!-- 上传状态 -->
        <div id="uploadStatus" class="mt-2 text-center" style="display: none;">
          <div class="spinner-border" role="status">
            <span class="sr-only">上传中...</span>
          </div>
          <p id="statusMessage" class="mt-2"></p>
        </div>
        
        <!-- 上传成功后的URL展示 -->
        <div id="uploadResult" class="mt-3" style="display: none;">
          <div class="alert alert-success" role="alert">
            <h6 class="alert-heading">上传成功！</h6>
            <div class="input-group mb-2">
              <input type="text" id="imageUrl" class="form-control" readonly>
              <div class="input-group-append">
                <button id="copyUrlBtn" class="btn btn-outline-secondary" type="button">复制</button>
              </div>
            </div>
            <p class="mb-0">URL已复制到剪贴板，可直接用于发送图片或更新产品数据库。</p>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <!-- 发送选项 -->
        <div class="mr-auto">
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" id="directSend" value="option1">
            <label class="form-check-label" for="directSend">上传后直接发送</label>
          </div>
        </div>
        
        <button type="button" class="btn btn-secondary" data-dismiss="modal">关闭</button>
        <button type="button" id="confirmUploadBtn" class="btn btn-primary" disabled>上传图片</button>
      </div>
    </div>
  </div>
</div>

<!-- Toast 提示 -->
<div id="copySuccessToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true" style="position: fixed; top: 20px; right: 20px; z-index: 9999;">
  <div class="toast-header bg-success text-white">
    <strong class="mr-auto">成功</strong>
    <button type="button" class="ml-2 mb-1 close text-white" data-dismiss="toast">&times;</button>
  </div>
  <div class="toast-body">
    URL已复制到剪贴板！
  </div>
</div>

<!-- Font Awesome 图标库 (如果尚未加载) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
```

---

## 💻 JavaScript 实现

```javascript
// 图片上传模块初始化
function initImageUploader() {
  // 获取DOM元素
  const uploadImageBtn = document.getElementById('uploadImageBtn');
  const uploadImageModal = document.getElementById('uploadImageModal');
  const imageFile = document.getElementById('imageFile');
  const fileName = document.getElementById('fileName');
  const modelAssoc = document.getElementById('modelAssoc');
  const previewImg = document.getElementById('previewImg');
  const imagePreview = document.getElementById('imagePreview');
  const confirmUploadBtn = document.getElementById('confirmUploadBtn');
  const uploadProgressContainer = document.getElementById('uploadProgressContainer');
  const uploadProgressBar = document.getElementById('uploadProgressBar');
  const uploadStatus = document.getElementById('uploadStatus');
  const statusMessage = document.getElementById('statusMessage');
  const uploadResult = document.getElementById('uploadResult');
  const imageUrl = document.getElementById('imageUrl');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const copySuccessToast = document.getElementById('copySuccessToast');
  const directSend = document.getElementById('directSend');
  
  // 打开模态框
  uploadImageBtn.addEventListener('click', function() {
    // 重置表单
    resetUploadForm();
    $('#uploadImageModal').modal('show');
  });
  
  // 选择文件后处理
  imageFile.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      const file = this.files[0];
      
      // 预览图片
      const reader = new FileReader();
      reader.onload = function(e) {
        previewImg.src = e.target.result;
        imagePreview.style.display = 'block';
      }
      reader.readAsDataURL(file);
      
      // 设置文件名
      fileName.value = file.name;
      
      // 启用上传按钮
      confirmUploadBtn.disabled = false;
    }
  });
  
  // 上传图片
  confirmUploadBtn.addEventListener('click', async function() {
    if (!imageFile.files || !imageFile.files[0]) {
      alert('请先选择一张图片');
      return;
    }
    
    const file = imageFile.files[0];
    const targetFileName = fileName.value.trim() || file.name;
    
    // 显示上传进度
    uploadProgressContainer.style.display = 'block';
    uploadStatus.style.display = 'block';
    statusMessage.textContent = '正在上传图片...';
    confirmUploadBtn.disabled = true;
    
    try {
      // 构建FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', targetFileName);
      if (modelAssoc.value.trim()) {
        formData.append('model', modelAssoc.value.trim());
      }
      
      // 创建XMLHttpRequest以支持进度条
      const xhr = new XMLHttpRequest();
      
      // 监听上传进度
      xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded * 100) / e.total);
          uploadProgressBar.style.width = percentComplete + '%';
          uploadProgressBar.setAttribute('aria-valuenow', percentComplete);
          uploadProgressBar.textContent = percentComplete + '%';
        }
      });
      
      // 监听完成事件
      xhr.addEventListener('load', async function() {
        uploadStatus.style.display = 'none';
        
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          
          if (response.success) {
            // 显示结果
            uploadResult.style.display = 'block';
            imageUrl.value = response.url;
            
            // 自动复制URL
            imageUrl.select();
            document.execCommand('copy');
            $(copySuccessToast).toast('show');
            
            // 如果勾选了直接发送
            if (directSend.checked) {
              statusMessage.textContent = '准备发送图片...';
              uploadStatus.style.display = 'block';
              
              // 获取当前选中的客户ID
              const contactId = getCurrentContactId(); // 需要实现此函数
              
              if (contactId) {
                try {
                  // 调用发送图片接口
                  const sendResponse = await fetch('/send-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contact_id: contactId,
                      image_url: response.url,
                      caption: modelAssoc.value.trim() ? 
                        `${modelAssoc.value.trim()} - 产品图片` : 
                        targetFileName.split('.')[0]
                    })
                  });
                  
                  const sendResult = await sendResponse.json();
                  uploadStatus.style.display = 'none';
                  
                  if (sendResult.success) {
                    alert('图片已成功上传并发送给客户！');
                  } else {
                    alert('图片上传成功，但发送失败: ' + (sendResult.error || '未知错误'));
                  }
                } catch (sendError) {
                  uploadStatus.style.display = 'none';
                  alert('图片上传成功，但发送时出错: ' + sendError.message);
                }
              } else {
                uploadStatus.style.display = 'none';
                alert('请先选择一个客户再发送图片');
              }
            }
          } else {
            alert('上传失败: ' + (response.error || '未知错误'));
            resetUploadState();
          }
        } else {
          alert('上传失败，服务器返回状态: ' + xhr.status);
          resetUploadState();
        }
      });
      
      // 监听错误事件
      xhr.addEventListener('error', function() {
        uploadStatus.style.display = 'none';
        alert('上传过程中发生网络错误');
        resetUploadState();
      });
      
      // 发送请求
      xhr.open('POST', '/upload-product');
      xhr.send(formData);
      
    } catch (error) {
      uploadStatus.style.display = 'none';
      alert('上传错误: ' + error.message);
      resetUploadState();
    }
  });
  
  // 复制URL按钮
  copyUrlBtn.addEventListener('click', function() {
    imageUrl.select();
    document.execCommand('copy');
    $(copySuccessToast).toast('show');
  });
  
  // 辅助函数：重置上传状态
  function resetUploadState() {
    uploadProgressBar.style.width = '0%';
    uploadProgressBar.setAttribute('aria-valuenow', '0');
    uploadProgressBar.textContent = '0%';
    uploadProgressContainer.style.display = 'none';
    uploadStatus.style.display = 'none';
    confirmUploadBtn.disabled = false;
  }
  
  // 辅助函数：重置表单
  function resetUploadForm() {
    imageFile.value = '';
    fileName.value = '';
    modelAssoc.value = '';
    previewImg.src = '';
    imagePreview.style.display = 'none';
    uploadProgressBar.style.width = '0%';
    uploadProgressBar.setAttribute('aria-valuenow', '0');
    uploadProgressBar.textContent = '0%';
    uploadProgressContainer.style.display = 'none';
    uploadStatus.style.display = 'none';
    uploadResult.style.display = 'none';
    imageUrl.value = '';
    directSend.checked = false;
    confirmUploadBtn.disabled = true;
  }
  
  // 辅助函数：获取当前选中的客户ID
  // 需要根据控制面板的实际实现来定义
  function getCurrentContactId() {
    // 这里需要返回当前在面板中选中的客户ID
    // 例如：return document.getElementById('currentContactId').value;
    return localStorage.getItem('currentContactId');
  }
}

// 在页面加载完成后初始化
$(document).ready(function() {
  initImageUploader();
});
```

---

## 🔧 Worker `/upload-product` 接口实现

```js
// === JEV R2 Image Uploader ===
if (path === "/upload-product") {
  try {
    // 检查请求方法
    if (request.method !== "POST") {
      return json({ success: false, error: "Method not allowed" }, 405);
    }

    // 检查是否是 multipart/form-data
    const contentType = request.headers.get("Content-Type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return json({ success: false, error: "Content-Type must be multipart/form-data" }, 400);
    }

    // 解析 form data
    const formData = await request.formData();
    const file = formData.get("file");
    let filename = formData.get("filename");
    const model = formData.get("model");

    // 验证文件
    if (!file || !(file instanceof File)) {
      return json({ success: false, error: "No file uploaded" }, 400);
    }

    // 验证和处理文件名
    if (!filename) {
      filename = file.name;
    }
    
    // 确保文件名有扩展名
    const hasExtension = /\.[^.]+$/.test(filename);
    if (!hasExtension) {
      const fileExtension = file.name.split('.').pop();
      if (fileExtension) {
        filename += '.' + fileExtension;
      } else {
        return json({ success: false, error: "Filename must have an extension" }, 400);
      }
    }

    // 确保文件名安全
    filename = filename.replace(/[^a-zA-Z0-9_\-\.]+/g, '_');
    const filePath = `products/${filename}`;

    // 读取文件内容
    const fileData = await file.arrayBuffer();
    
    // 获取内容类型
    const contentType = file.type || getContentTypeFromExtension(filename);
    
    // 上传到 R2
    await env.JEV_PRODUCT_IMAGE.put(filePath, fileData, {
      httpMetadata: {
        contentType: contentType
      },
      customMetadata: {
        uploadedBy: "JEV Panel",
        uploadedAt: new Date().toISOString(),
        model: model || ""
      }
    });

    // 构建公共URL
    // 这里使用环境变量或默认URL格式
    let publicUrl;
    if (env.R2_PUBLIC_DOMAIN) {
      publicUrl = `${env.R2_PUBLIC_DOMAIN}/${filePath}`;
    } else if (env.R2_ACCOUNT_ID) {
      publicUrl = `https://pub-${env.R2_ACCOUNT_ID}.r2.dev/${filePath}`;
    } else {
      // 默认URL格式，需要根据实际情况调整
      publicUrl = `https://cdn.jevshop.com/${filePath}`;
    }

    // 如果提供了产品型号，将图片URL更新到产品数据库
    if (model) {
      try {
        // 获取当前产品数据库
        const priceDb = await env.JEVPI.get("price_db", { type: "json" }) || [];
        
        // 更新产品的ImageUrl
        const updatedDb = priceDb.map(product => {
          if (product.Model === model) {
            return { ...product, ImageUrl: publicUrl };
          }
          return product;
        });
        
        // 保存更新后的数据库
        await env.JEVPI.put("price_db", JSON.stringify(updatedDb));
      } catch (dbError) {
        console.error("Error updating product database:", dbError);
        // 继续执行，不影响上传结果
      }
    }

    return json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return json({ success: false, error: error.message || "Upload failed" }, 500);
  }
}

// 辅助函数：根据文件扩展名获取内容类型
function getContentTypeFromExtension(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const contentTypeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml'
  };
  
  return contentTypeMap[extension] || 'application/octet-stream';
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

## 🧾 验证方式

1️⃣ **界面功能测试**：
- 打开 `jev_panel.html`
- 点击「上传产品图片」按钮
- 选择本地产品图片文件
- 输入文件名和可选的产品型号
- 点击「上传图片」按钮
- 观察上传进度条和状态反馈
- 验证上传成功后是否显示URL并自动复制

2️⃣ **API接口测试**：

```bash
# 使用curl测试上传接口
curl -X POST "https://jevshop.bensonlove1986.workers.dev/upload-product" \
  -F "file=@E2E-X3D1-N.jpg" \
  -F "filename=E2E-X3D1-N.jpg" \
  -F "model=E2E-X3D1-N"
```

3️⃣ **预期响应**：

```json
{
  "success": true,
  "url": "https://cdn.jevshop.com/products/E2E-X3D1-N.jpg"
}
```

4️⃣ **上传后发送测试**：
- 勾选「上传后直接发送」选项
- 确保已选择客户
- 上传图片并验证是否自动发送给客户

---

## 🧱 任务完成标准

| 项目 | 要求 |
| ---- | ---- |
| UI界面 | 在`jev_panel.html`中成功添加上传按钮和模态窗口 |
| 文件选择 | 支持本地图片选择和预览 |
| 上传功能 | 成功上传图片到R2 `jevproductimage` bucket |
| 进度反馈 | 显示实时上传进度和状态信息 |
| URL生成 | 自动生成并复制公共访问URL |
| 关联功能 | 可选关联产品型号并更新产品数据库 |
| 集成发送 | 支持上传后直接发送图片给客户 |
| 错误处理 | 完善的错误处理和用户提示 |

---

## 💬 附加说明

完成此模块后，JEV系统将具备完整的产品图片管理能力：

* 📤 **一键上传**：无需离开控制面板即可完成图片上传
* 🔄 **自动处理**：自动生成URL并复制到剪贴板，方便后续使用
* 🔗 **产品关联**：可直接关联产品型号，自动更新产品数据库
* 📱 **即时发送**：上传完成后可直接发送给客户，提高沟通效率
* 🖥️ **用户友好**：提供完整的进度反馈和状态提示

此功能将显著简化产品图片的管理工作流，使操作人员能够在统一的界面内完成从图片上传、URL获取到客户发送的全流程，大大提高工作效率和用户体验。

---