# HMR Bus 验证测试脚本

## 1. 启动命令

```bash
cd ui-core/app
npm run dev
```

## 2. 操作步骤

1. 启动开发服务器，等待编译完成
2. 打开浏览器开发者控制台
3. 找到并修改以下文件：`src/modules/chat_modular/ai_assistant/AIAssistantSidebar.tsx`
4. 连续修改 5 次，每次修改后保存文件，等待 HMR 完成后再进行下一次修改
5. 修改内容示例：
   - 第一次：修改第 50 行的 `AI_SIDEBAR_ENABLED` 常量
   - 第二次：修改第 100 行的 `handleMouseDown` 函数
   - 第三次：修改第 200 行的 `handleGenerateReply` 函数
   - 第四次：修改第 300 行的 `SceneSelector` 组件属性
   - 第五次：修改第 400 行的 `SuggestionPanel` 组件属性

## 3. 预期控制台输出

### 关键日志必须出现：

1. **BUS_SINGLETON_CREATE** 只出现一次
   ```
   [BUS_SINGLETON_CREATE] { id: "1767534567890-abc123", createdAt: 1767534567890 }
   ```

2. **BUS_SINGLETON_REUSE** 出现多次（每次 HMR 时出现）
   ```
   [BUS_SINGLETON_REUSE] { id: "1767534567890-abc123", createdAt: 1767534567890 }
   ```

3. **BUS_REGISTER_ONCE** 中 "registered" 对同一个 key 只出现一次，后续为 "skipped"
   ```
   [BUS_REGISTER_ONCE] { key: "chat-shell-fill-input", eventName: "ai:fillInput", action: "registered" }
   [BUS_REGISTER_ONCE] { key: "chat-shell-fill-input", eventName: "ai:fillInput", action: "skipped" }
   [BUS_REGISTER_ONCE] { key: "chat-shell-send-message", eventName: "ai:sendMessage", action: "registered" }
   [BUS_REGISTER_ONCE] { key: "chat-shell-send-message", eventName: "ai:sendMessage", action: "skipped" }
   ```

4. **BUS_HMR_DISPOSE** 每次热更新出现一次，并且 afterCount=0
   ```
   [BUS_HMR_DISPOSE] { id: "1767534567890-abc123", cleared: true, beforeCount: 5, afterCount: 0 }
   ```

5. **BUS_LISTENER_STATS** 显示监听器统计信息
   ```
   [BUS_LISTENER_STATS] [{ eventName: "ai:fillInput", listenerCount: 1 }, { eventName: "ai:sendMessage", listenerCount: 1 }]
   ```

## 4. 判定标准

✅ **通过条件**：
- BUS_SINGLETON_CREATE 只出现一次
- 同一个 key 的 BUS_REGISTER_ONCE 中 "registered" 只出现一次
- 每次 HMR 后 BUS_HMR_DISPOSE 中的 afterCount 为 0
- 任意时刻同一 event 的 listenerCount 不持续增长
- 页面没有出现 HMR 500 错误
- 页面功能正常，没有出现白屏或崩溃

❌ **失败条件**：
- 出现 "removed listener → registered listener" 循环日志
- 同一 event 的 listenerCount 持续增长
- 页面出现 HMR 500 错误
- 页面功能异常或崩溃

## 5. 验证结果

| 修改次数 | 预期结果 | 实际结果 |
|----------|----------|----------|
| 1        | HMR 成功，无 500 错误 |          |
| 2        | HMR 成功，无 500 错误 |          |
| 3        | HMR 成功，无 500 错误 |          |
| 4        | HMR 成功，无 500 错误 |          |
| 5        | HMR 成功，无 500 错误 |          |

## 6. 结论

如果所有测试步骤都通过，说明 assistantBus 的 HMR 免疫修复成功，能够在多次热更新后保持稳定运行。