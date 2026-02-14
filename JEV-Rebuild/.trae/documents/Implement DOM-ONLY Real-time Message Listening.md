# DOM-ONLY 实时消息监听实现计划

## 1. 核心原则
- 仅使用 MutationObserver 监听新增消息节点
- 不接触 WhatsApp 内部 Store、webpack 或 Msg 对象
- 严格遵循 DOM-ONLY 消息规范
- 只处理实时 inbound 消息，不支持历史消息拉取

## 2. 主要修改点

### 2.1 修改文件
- `d:\PDF转网页\JEV-Rebuild\worker-core\playwright-whatsapp-engine.js`

### 2.2 移除 Store 依赖代码
- 删除所有 Store 查找和使用逻辑
- 移除 `whatsapp:get_messages` 事件处理
- 删除基于 Store 的消息获取函数
- 移除所有 Store 相关的注入和验证

### 2.3 实现 DOM-ONLY 消息监听
- 添加 DOM-ONLY 模式声明
- 实现基于 MutationObserver 的消息监听
- 仅处理 `addedNodes`
- 实现严格的消息验证规则

### 2.4 消息处理流程
1. 监听聊天消息容器 (`#main`)
2. 过滤新增节点，只处理有效的消息节点
3. 验证消息符合规范
4. 生成稳定的 `pseudoMessageId`
5. 使用 `Date.now()` 作为 `receivedAt`
6. 发送符合规范的消息格式

### 2.5 伪 MessageID 生成
```javascript
pseudoId = hash(chatId + normalizedText + bubblePositionY)
```
- normalizedText: 去空格/去多余换行
- bubblePositionY: `getBoundingClientRect().top` 向下取整

### 2.6 消息格式
```json
{
  "mode": "dom-only",
  "chatId": "wa_dom_xxxx",
  "pseudoMessageId": "dom_xxxxx",
  "direction": "inbound",
  "text": "消息内容",
  "receivedAt": 1769093523456,
  "source": "whatsapp-web-dom"
}
```

## 3. 具体实现步骤

1. **添加模式声明**：在文件顶部添加 DOM-ONLY 模式声明
2. **修改消息钩子注入**：替换当前 Store 钩子为纯 DOM 监听
3. **实现 MutationObserver**：
   - 监听 `#main` 元素
   - 仅处理 `addedNodes`
   - 添加消息验证逻辑
4. **实现消息过滤**：
   - 排除转发消息、下载消息、联系人消息等
   - 排除系统提示和时间分隔条
5. **实现方向判定**：基于气泡位置或类名判断 `inbound/outbound`
6. **实现伪 ID 生成**：使用指定公式生成稳定 ID
7. **移除历史消息拉取**：删除 `whatsapp:get_messages` 处理
8. **更新消息发送格式**：确保符合 DOM-ONLY 规范
9. **添加去重逻辑**：确保同一个 `pseudoMessageId` 只发送一次

## 4. 关键代码实现

### 4.1 MutationObserver 初始化
```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      // 处理新增消息节点
    });
  });
});

observer.observe(chatWindow, {
  childList: true,
  subtree: true
});
```

### 4.2 消息验证和处理
```javascript
function processNewMessageNode(node) {
  // 1. 验证节点是否为有效的消息节点
  // 2. 提取消息文本和方向
  // 3. 生成伪 ID
  // 4. 发送符合规范的消息
}
```

### 4.3 伪 ID 生成函数
```javascript
function generatePseudoMessageId(chatId, text, yPosition) {
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  const hashInput = `${chatId}${normalizedText}${Math.floor(yPosition)}`;
  // 使用简单的哈希算法生成伪 ID
  return `dom_${hash(hashInput)}`;
}
```

## 5. 预期效果
- 仅使用 DOM MutationObserver 监听实时消息
- 消息格式符合 DOM-ONLY 规范
- 不再依赖 WhatsApp 内部 Store
- 系统更加稳定，不被 WhatsApp 内部更新影响
- 严格遵循禁止事项，只处理新增消息节点