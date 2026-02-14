## 验证 AI_RESULT_RECEIVED 重复 dispatch 情况

### 步骤 1：在 WhatsAppInboxService.ts 中添加验证日志

* 在 `dispatch(AI_RESULT_RECEIVED)` 前添加验证日志：

  ```typescript
  console.log(
    "[DISPATCH_AI_RESULT_TRACE]",
    payload.message_id,
    Date.now()
  )
  ```

* 位置：`d:\PDF转网页\JEV-Rebuild\ui-core\app\src\services\WhatsAppInboxService.ts` 第 1899 行前

### 步骤 2：在 ai.handler.ts 中添加验证日志

* 在 `handleAIResultReceived` 函数第一行添加验证日志：

  ```typescript
  console.log(
    "[AI_HANDLER_ENTER]",
    result.message_id,
    Date.now()
  )
  ```

* 位置：`d:\PDF转网页\JEV-Rebuild\ui-core\app\src\core\scheduler\handlers\ai.handler.ts` 第 14 行后

### 步骤 3：验证步骤

1. 重启开发服务器
2. 发送一次真实客户消息
3. 检查控制台日志
4. 统计 `DISPATCH_AI_RESULT_TRACE` 和 `AI_HANDLER_ENTER` 出现的次数

### 验证标准

如果出现：
- `DISPATCH_AI_RESULT_TRACE > 1`
或
- `AI_HANDLER_ENTER > 1`

说明存在重复 dispatch 情况，不是 UI 问题。

### 执行边界说明

- 不修改任何业务逻辑
- 不新增锁
- 不修改 UI
- 只添加验证日志
