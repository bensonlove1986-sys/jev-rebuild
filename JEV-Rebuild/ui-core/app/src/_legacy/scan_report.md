# 聊天窗口清理扫描报告

## 一、扫描文件清单

| 文件路径 | 是否仍被 import | 是否仍被路由引用 | 是否与 chat_v3 功能重复 | 建议动作 |
|---------|----------------|------------------|------------------------|----------|
| `/src/components/Chat.tsx` | ❌ 否 | ❌ 否 | ✅ 是 | 🟡 冻结 |
| `/src/modules/chat/ChatModule.tsx` | ✅ 是（moduleRegistry） | ✅ 是（moduleRegistry） | ✅ 是 | 🟡 冻结 |
| `/src/modules/chat/BrowserModule.tsx` | ✅ 是（moduleRegistry） | ✅ 是（moduleRegistry） | ❌ 否 | ✅ 保留 |
| `/src/modules/chat_v2/ChatShell.tsx` | ❌ 否 | ❌ 否 | ✅ 是 | 🟡 冻结 |
| `/src/modules/chat_v2/ChatComposer.tsx` | ❌ 否 | ❌ 否 | ✅ 是 | 🟡 冻结 |
| `/src/modules/chat_v2/MessageTimeline.tsx` | ❌ 否 | ❌ 否 | ✅ 是 | 🟡 冻结 |
| `/src/modules/chat_v2/AISuggestionPlugin.tsx` | ❌ 否 | ❌ 否 | ✅ 是 | 🟡 冻结 |
| `/src/modules/chat_v2/SystemNoticePlugin.tsx` | ❌ 否 | ❌ 否 | ✅ 是 | 🟡 冻结 |
| `/src/modules/chat_v2/DebugPanel.tsx` | ❌ 否 | ❌ 否 | ❌ 否 | 🟡 冻结 |
| `/src/layouts/ChatLayout.tsx` | ❌ 否 | ❌ 否 | ❌ 否 | 🟡 冻结 |
| `/src/modules/chat_v3/**` | ✅ 是 | ✅ 是 | ❌ 否 | ✅ 保留 |
| `/src/modules/ChatModule_v3.tsx` | ✅ 是（moduleRegistry） | ✅ 是（moduleRegistry） | ❌ 否 | ✅ 保留 |

## 二、详细分析

### 1. 活跃模块
- `chat_v3`：新的模块化聊天实现，已在 moduleRegistry 中注册
- `chat`：旧版聊天模块，仍在 moduleRegistry 中注册为默认模块
- `browser`：内置浏览器模块，与聊天功能无关，需保留

### 2. 废弃模块
- `components/Chat.tsx`：旧版聊天组件，无引用
- `chat_v2` 系列：无引用，功能已被 chat_v3 覆盖
- `ChatLayout.tsx`：旧版聊天布局，无引用

## 三、建议清理方案

### Step 1：冻结（移入 /_legacy/chat/）
- `/src/components/Chat.tsx`
- `/src/modules/chat/ChatModule.tsx`
- `/src/modules/chat_v2/**`
- `/src/layouts/ChatLayout.tsx`

### Step 2：保留
- `/src/modules/chat/BrowserModule.tsx`（非聊天功能）
- `/src/modules/chat_v3/**`（活跃聊天实现）
- `/src/modules/ChatModule_v3.tsx`（活跃聊天入口）

## 四、执行计划

1. 创建 `/src/_legacy/chat/` 目录
2. 移动冻结文件到该目录
3. 添加 `@deprecated` 注释
4. 验证构建成功
5. 测试页面可正常打开

## 五、风险评估

- 低风险：所有移动/删除的文件均无直接引用
- 回滚方案：将冻结文件移回原位置即可

## 六、预期效果

- 唯一活跃聊天入口：`chat_v3/ChatShell.tsx`
- 代码结构清晰，便于维护
- 减少冗余代码，提高构建效率
