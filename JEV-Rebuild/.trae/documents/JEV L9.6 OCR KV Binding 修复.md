## 问题分析

经过代码搜索和分析，我发现了导致 [OCR_MISSING_KV] KV binding not configured 错误的根本原因：

1. **代码中使用的 KV binding 名称**：在 `worker-core/index.js` 文件中，OCR 相关代码使用了 `env.KV` 作为 KV binding 名称
   - 第 177-178 行：`if (this.env.KV) { await this.env.KV.put(kvKey, JSON.stringify({...})) }`
   - 第 349-350 行：`if (this.env.KV) { const result = await this.env.KV.get(kvKey, { type: 'json' }); }`

2. **wrangler.toml 中配置的 binding 名称**：在 `wrangler.toml` 文件中，KV namespace 的 binding 名称是 `MEDIA_KV`
   ```toml
   [[kv_namespaces]]
   binding = "MEDIA_KV"
   ```

## 修复方案

### 1. 修改 wrangler.toml 文件

将 KV namespace 的 binding 名称从 `MEDIA_KV` 改为 `KV`，以匹配代码中使用的名称：

```toml
# KV Namespace (will be automatically created or configured in dashboard)
[[kv_namespaces]]
binding = "KV"
```

### 2. 验证修复效果

修复后，执行 OCR 操作应该会看到以下日志：
- [OCR_RESULT_ROUTE_HIT]
- [OCR_READ_KV]
- [OCR_WRITE_KV]

并且不再出现：
- [OCR_MISSING_KV]

### 3. 执行边界

- 不修改任何 API 路径、结构或调度逻辑
- 不改变现有 UI、Scheduler、DO 架构
- 仅修复 Worker KV 绑定缺失问题
- 不创建新 KV，不修改账户结构

## 预期结果

修复后，OCR 功能应该能够正常工作，能够正确存储和检索 OCR 结果，恢复 OCR_RESULT 正常返回文本。