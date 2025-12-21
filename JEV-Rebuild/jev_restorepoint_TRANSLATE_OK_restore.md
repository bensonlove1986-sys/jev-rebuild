# 翻译系统恢复点回滚说明

## 回滚前置条件

1. **系统状态**：当前系统存在翻译功能异常，需要回滚到稳定版本
2. **权限要求**：具有代码仓库和服务器访问权限
3. **备份要求**：已备份当前修改的代码文件
4. **工具要求**：已安装Git、Node.js和相关依赖
5. **网络要求**：能够访问DeepSeek API和Cloudflare Workers平台

## Worker 回滚步骤

### 1. 本地开发环境回滚

```bash
# 进入Worker核心目录
cd D:\PDF转网页\JEV-Rebuild\worker-core

# 恢复核心文件
cp jev_restorepoint_TRANSLATE_OK_20251221_1042.json ./backup/

# 确保翻译函数逻辑正确
# 检查 translateWithDeepSeek 函数实现
# 检查 /api/translate/text 路由配置
```

### 2. 生产环境回滚

```bash
# 部署恢复点版本到Cloudflare Workers
wrangler deploy --env production

# 验证部署状态
curl https://your-worker-domain/api/health
curl https://your-worker-domain/api/status
```

## UI 回滚步骤

### 1. 前端代码回滚

```bash
# 进入UI核心目录
cd D:\PDF转网页\JEV-Rebuild\ui-core

# 恢复关键文件
# 1. fetchSafe.js - API路径解析逻辑
# 2. ChatPanel.jsx - 翻译按钮和展示逻辑

# 验证API模式配置
# 检查 API_MODE 是否为 HYBRID
# 检查 resolveApiUrl 函数实现
```

### 2. 构建和部署

```bash
# 构建前端代码
npm run build

# 部署到web-runtime
cp -r build/* ../web-runtime/
```

## 环境变量校验步骤

### 1. 本地开发环境

```bash
# 设置环境变量
$env:DEEPSEEK_API_KEY="sk-77dbd0cc5f30451daa863d5213e6607f"

# 启动mock-worker
node mock-worker.cjs

# 验证API密钥
curl -X POST http://localhost:8787/api/translate/text -H "Content-Type: application/json" -d '{"text":"Hello, world"}'
```

### 2. 生产环境

```bash
# 检查Cloudflare Workers环境变量
wrangler secret list

# 验证翻译API可用性
curl -X POST https://your-worker-domain/api/translate/text -H "Content-Type: application/json" -d '{"text":"Hello, world"}'
```

## 成功验证清单

### 1. 功能验证

| 测试项 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|------|
| 翻译按钮显示 | 客户消息下方显示"翻译"按钮 |  |  |
| 翻译请求发送 | 点击按钮后显示"翻译中..." |  |  |
| 翻译结果展示 | 显示"【原文】"和"【中文】"双栏格式 |  |  |
| 翻译内容准确 | "Hello, world" 翻译为 "你好，世界" |  |  |
| 多消息翻译 | 支持多条消息独立翻译 |  |  |

### 2. 性能验证

| 测试项 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|------|
| 翻译响应时间 | < 2秒 |  |  |
| 并发翻译支持 | 支持5条消息同时翻译 |  |  |
| 错误处理 | 显示友好错误信息 |  |  |

### 3. 稳定性验证

| 测试项 | 预期结果 | 实际结果 | 状态 |
|-------|---------|---------|------|
| 连续翻译10次 | 全部成功 |  |  |
| 长时间运行 | 24小时无故障 |  |  |
| 网络波动恢复 | 网络恢复后自动重试成功 |  |  |

## 常见问题排查

### 1. 翻译按钮不显示

- 检查 `isCustomerMessage` 逻辑是否正确
- 确认 `!isTranslated` 条件是否满足
- 检查消息渲染逻辑 `renderMessage` 函数

### 2. 翻译请求失败

- 检查 API_MODE 配置是否正确
- 验证 `resolveApiUrl` 函数实现
- 确认 DeepSeek API 密钥是否有效
- 检查 CORS 配置是否正确

### 3. 翻译结果不显示

- 检查 `translatedMessages` 状态更新逻辑
- 确认 `messageKey` 生成是否唯一
- 检查 UI 渲染条件 `isTranslated` 是否正确

## 恢复点信息

- **恢复点ID**: TRANSLATE_OK_20251221_1042
- **状态**: ACTIVE
- **翻译引擎**: DeepSeek (真实API)
- **API模式**: HYBRID
- **创建时间**: 2025-12-21 10:42

## 回滚完成确认

完成回滚后，请运行以下命令验证系统状态：

```bash
# 验证Worker健康状态
curl http://localhost:8787/api/health

# 验证翻译功能
curl -X POST http://localhost:8787/api/translate/text -H "Content-Type: application/json" -d '{"text":"Hello, this is a test message"}'

# 验证UI访问
open http://localhost:3000
```

回滚成功标志：
- RESTORE POINT CREATED
- TRANSLATION = DEEPSEEK (REAL)
- SAFE TO ITERATE
