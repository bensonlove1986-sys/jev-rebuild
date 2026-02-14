# 聊天窗口全历史扫描报告

## 一、扫描范围

| 版本 | 目录/文件 | 状态 |
|------|-----------|------|
| v1 | /src/components/Chat.tsx | ✅ 存在 |
| v1 | /src/layouts/ChatLayout.tsx | ✅ 存在 |
| v2 | /src/modules/chat/ | ✅ 存在 |
| v2 | /src/modules/chat_v2/ | ✅ 存在 |
| v3 | /src/modules/chat_v3/ | ✅ 存在（当前版本） |

## 二、详细扫描结果

### 1. 第一版（v1）

| 文件路径 | 是否被import | 是否被Router/Module Loader使用 | 包含store/api/ai | 是否可访问 | 功能是否被v3覆盖 | 建议处理 |
|----------|--------------|--------------------------------|------------------|------------|----------------|----------|
| `/src/components/Chat.tsx` | ✅ 是（被ChatLayout和ChatModule引用） | ❌ 否 | ✅ 是（store、ai.service） | ✅ 是（通过旧的ChatModule） | ✅ 是 | 🟥 移入legacy/v1 |
| `/src/layouts/ChatLayout.tsx` | ❌ 否 | ❌ 否 | ✅ 是（引用Chat组件） | ❌ 否 | ✅ 是 | 🟥 移入legacy/v1 |

### 2. 中间版本（chat_v2/legacy）

| 文件路径 | 是否被import | 是否被Router/Module Loader使用 | 包含store/api/ai | 是否可访问 | 功能是否被v3覆盖 | 建议处理 |
|----------|--------------|--------------------------------|------------------|------------|----------------|----------|
| `/src/modules/chat/ChatModule.tsx` | ✅ 是（moduleRegistry注册） | ✅ 是（moduleRegistry注册） | ✅ 是（store、Chat组件） | ✅ 是（但已被禁用） | ✅ 是 | 🟡 移入legacy/v2 |
| `/src/modules/chat/BrowserModule.tsx` | ✅ 是（moduleRegistry注册） | ✅ 是（moduleRegistry注册） | ❌ 否（内置浏览器功能） | ✅ 是 | ❌ 否（非聊天功能） | ✅ 保留 |
| `/src/modules/chat_v2/ChatShell.tsx` | ❌ 否 | ❌ 否 | ✅ 是（store） | ❌ 否 | ✅ 是 | 🟡 移入legacy/v2 |
| `/src/modules/chat_v2/ChatComposer.tsx` | ✅ 是（被ChatShell引用） | ❌ 否 | ❌ 否 | ❌ 否 | ✅ 是 | 🟡 移入legacy/v2 |
| `/src/modules/chat_v2/MessageTimeline.tsx` | ✅ 是（被ChatShell引用） | ❌ 否 | ✅ 是（store上下文） | ❌ 否 | ✅ 是 | 🟡 移入legacy/v2 |
| `/src/modules/chat_v2/AISuggestionPlugin.tsx` | ✅ 是（被ChatShell引用） | ❌ 否 | ✅ 是（ai.service） | ❌ 否 | ✅ 是 | 🟡 移入legacy/v2 |
| `/src/modules/chat_v2/SystemNoticePlugin.tsx` | ✅ 是（被ChatShell引用） | ❌ 否 | ❌ 否 | ❌ 否 | ✅ 是 | 🟡 移入legacy/v2 |
| `/src/modules/chat_v2/DebugPanel.tsx` | ✅ 是（被ChatShell引用） | ❌ 否 | ✅ 是（store上下文） | ❌ 否 | ✅ 是 | 🟡 移入legacy/v2 |

### 3. 当前版本（chat_v3）

| 文件路径 | 是否被import | 是否被Router/Module Loader使用 | 包含store/api/ai | 是否可访问 | 功能是否被v3覆盖 | 建议处理 |
|----------|--------------|--------------------------------|------------------|------------|----------------|----------|
| `/src/modules/chat_v3/ChatShell.tsx` | ✅ 是（被ChatModule_v3引用） | ✅ 是（moduleRegistry注册） | ❌ 否（通过props接收数据） | ✅ 是（默认聊天入口） | ❌ 否 | 🟢 保留 |
| `/src/modules/chat_v3/ChatHeader.tsx` | ✅ 是（被ChatShell引用） | ❌ 否 | ❌ 否 | ✅ 是 | ❌ 否 | 🟢 保留 |
| `/src/modules/chat_v3/MessageTimeline.tsx` | ✅ 是（被ChatShell引用） | ❌ 否 | ❌ 否 | ✅ 是 | ❌ 否 | 🟢 保留 |
| `/src/modules/chat_v3/MessageBubble.tsx` | ✅ 是（被MessageTimeline引用） | ❌ 否 | ❌ 否 | ✅ 是 | ❌ 否 | 🟢 保留 |
| `/src/modules/chat_v3/ChatComposer.tsx` | ✅ 是（被ChatShell引用） | ❌ 否 | ❌ 否 | ✅ 是 | ❌ 否 | 🟢 保留 |
| `/src/modules/chat_v3/PluginsBar.tsx` | ✅ 是（被ChatShell引用） | ❌ 否 | ❌ 否 | ✅ 是 | ❌ 否 | 🟢 保留 |
| `/src/modules/chat_v3/plugins/AISuggestionPlugin.tsx` | ✅ 是（被PluginsBar引用） | ❌ 否 | ✅ 是（ai.service） | ✅ 是 | ❌ 否 | 🟢 保留 |
| `/src/modules/chat_v3/plugins/SystemNoticePlugin.tsx` | ✅ 是（被PluginsBar引用） | ❌ 否 | ❌ 否 | ✅ 是 | ❌ 否 | 🟢 保留 |
| `/src/modules/chat_v3/plugins/PlaceholderPlugin.tsx` | ✅ 是（被PluginsBar引用） | ❌ 否 | ❌ 否 | ✅ 是 | ❌ 否 | 🟢 保留 |
| `/src/modules/ChatModule_v3.tsx` | ✅ 是（moduleRegistry注册） | ✅ 是（moduleRegistry注册） | ✅ 是（store） | ✅ 是（默认聊天入口） | ❌ 否 | 🟢 保留 |

## 三、处理建议

### 1. 第一版（v1）
- 移入 `/src/_legacy/chat_v1/`
- 文件头统一添加：
  ```
  // @deprecated
  // first generation chat UI
  ```

### 2. 中间版本（v2）
- 移入 `/src/_legacy/chat_v2/`
- 保留但不参与构建
- 不再作为入口

### 3. 保留文件
- `/src/modules/chat/BrowserModule.tsx`（非聊天功能）
- `/src/modules/chat_v3/**`（当前版本）

### 4. 入口统一
- 确保只有 `chat_v3/ChatShell.tsx` 作为聊天入口
- 确认 moduleRegistry 中只有 `chat_v3` 作为活跃聊天模块

## 四、验证要点

1. ✅ TypeScript编译检查：`npx tsc --noEmit`
2. ✅ 开发服务器启动：`npm run dev`
3. ✅ 构建验证：`npm run build`
4. ✅ 页面访问验证：确保聊天页面可正常打开，无500错误
5. ✅ 消息收发验证：确保消息可正常发送和接收

## 五、风险评估

- 低风险：所有操作仅涉及UI层，不修改核心业务逻辑
- 回滚方案：将冻结文件移回原位置，恢复moduleRegistry配置
- 影响范围：仅聊天窗口UI，不影响其他功能
