# JEV L9.6 URL Root Seal 修复计划

## 目标
让整个系统只有一个地方能拼 BASE，其余地方全部使用相对路径，彻底禁止 `/api/api` 与 https 二次拼接。

## 修复步骤

### 1. 更新 main.tsx fetch wrapper（唯一入口）
- 替换当前的 `toFinalUrl` 函数为 `normalizeUrl` 函数
- 实现防止 `/api/api` 重复的逻辑
- 更新 `window.fetch` 覆盖逻辑
- 确保 BASE 固定为 `https://jev-rebuild-worker.bensonlove1986.workers.dev`

### 2. 修复 contactStore.ts
- 将 `const apiUrl = `${JEV_RUNTIME.API_BASE}/inbox/list`;` 改为 `const apiUrl = "/api/inbox/list";`

### 3. 修复 ChatLayout.tsx
- 将 `fetch(`${API_BASE_URL}/outbound/whatsapp`, {...})` 改为 `fetch("/api/outbound/whatsapp", {...})`

### 4. 修复 translateService.ts
- 将 `fetch(`${API_BASE_URL}/translate`, {...})` 改为 `fetch("/api/translate", {...})`

### 5. 修复 ChatInterface.tsx
- 将 `fetch(`${JEV_RUNTIME.API_BASE}/outbound/whatsapp`, {...})` 改为 `fetch("/api/outbound/whatsapp", {...})`（两处）

### 6. 修复 ChatComposer.tsx
- 将 `fetch(`${JEV_RUNTIME.API_BASE}/upload/media`, {...})` 改为 `fetch("/api/upload/media", {...})`
- 将 `fetch(`${API_BASE}/api/upload/media`, {...})` 改为 `fetch("/api/upload/media", {...})`

### 7. 修复 MessageBubble.tsx
- 将 `fetch(`${API_BASE_URL}/api/vision/ocr`, {...})` 改为 `fetch("/api/vision/ocr", {...})`

## 验收标准
- ✅ `[FETCH_URL_FINAL_SAFE] https://jev-rebuild-worker.bensonlove1986.workers.dev/api/inbox/pull?customer_id=...`
- ✅ 消失：`/api/api/`、`/runhttps://`、`https://...https://...`
- ✅ 所有组件使用相对路径，不再拼接 BASE URL
- ✅ 只有 main.tsx 的 fetch wrapper 能拼 BASE

## 注意事项
- 不修改 Worker 代码
- 不改接口路径
- 不改部署
- 仅修 URL 构造链路
- 确保所有 fetch 调用都使用相对路径