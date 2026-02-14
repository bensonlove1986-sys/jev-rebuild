## 集成 Google Vision API 用于图片识别

### 目标
使用用户提供的 Google Cloud 服务账号，将图片识别功能从前端直接调用 Google Vision API 改为通过 Cloudflare Worker 代理调用，提高安全性并避免暴露密钥。

### 实现步骤

1. **配置环境变量**
   - 在 Cloudflare Worker 中添加 Google Cloud 服务账号相关环境变量：
     - `GOOGLE_PROJECT_ID`: 项目 ID (tonal-plateau-437106-u3)
     - `GOOGLE_PRIVATE_KEY`: 私钥（去除换行符）
     - `GOOGLE_CLIENT_EMAIL`: 服务账号邮箱 (vision-access-864@tonal-plateau-437106-u3.iam.gserviceaccount.com)
     - `GOOGLE_PRIVATE_KEY_ID`: 私钥 ID (d028e4ad1bea70b449ca84868873cf142415fb1b)

2. **添加 Google Vision API 代理路由**
   - 在 `worker-core/index.js` 中添加 POST `/api/vision/text-detection` 路由
   - 实现服务账号身份验证逻辑，生成 JWT Token
   - 转发请求到 Google Vision API `images:annotate` 端点
   - 返回识别结果

3. **修改前端代码**
   - 更新 `MessageBubble.tsx` 中的 `handleImageRecognition` 函数
   - 将直接调用 Google Vision API 改为调用 Worker 的 `/api/vision/text-detection` 路由
   - 移除硬编码的 API 密钥

4. **测试和验证**
   - 确保图片识别功能正常工作
   - 验证服务账号身份验证正确
   - 确保前端不再暴露任何敏感信息

### 技术要点

1. **服务账号身份验证**
   - 生成符合 Google Cloud 要求的 JWT Token
   - 使用 RS256 算法签名
   - 包含正确的 scope: `https://www.googleapis.com/auth/cloud-vision`

2. **API 调用流程**
   - 前端发送图片 URL 到 Worker
   - Worker 生成 JWT Token
   - Worker 调用 Google Vision API
   - Worker 返回识别结果到前端

3. **安全性考虑**
   - 服务账号私钥仅存储在 Cloudflare Worker 环境变量中
   - 前端不直接与 Google Vision API 通信
   - 所有 API 请求通过 HTTPS 加密传输

### 文件修改清单

1. **worker-core/index.js** - 添加 Google Vision API 代理路由
2. **ui-core/app/src/modules/chat_modular/components/ChatInterface/MessageBubble.tsx** - 更新图片识别逻辑
3. **worker-core/package.json** - 添加必要的依赖（如果需要）

### 预期结果

- 图片识别功能正常工作
- 浏览器 Network 中无直接的 Google Vision API 请求
- 所有图片识别请求通过 Worker 代理
- 服务账号信息安全存储，不暴露给前端

### 验收标准

- 图片识别按钮点击后能正确识别图片中的文字
- 识别结果显示在消息气泡下方
- 无控制台错误
- 浏览器 Network 中只有对 Worker 域名的请求