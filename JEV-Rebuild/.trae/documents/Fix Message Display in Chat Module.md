# 修复聊天模块中的消息显示问题

## 问题分析
消息都展示在用户名上面，没有展示在聊天框里的原因是：

- 在`formattedMessages`的生成逻辑中（第135-159行），代码从`msg.body`获取消息文本
- 但DOM-ONLY格式的消息文本存储在`msg.text`字段中
- 这导致格式化后的消息`text`字段为空，因此聊天框中没有显示内容
- 发送者名称仍然显示，因为它基于`msg.fromMe`字段生成

## 解决方案
修改`formattedMessages`的生成逻辑，确保从`msg.text`或`msg.body`中获取消息文本，优先使用`msg.text`，以兼容两种消息格式。

## 具体修改

1. **修改文件**：`d:\PDF转网页\JEV-Rebuild\ui-core\app\src\modules\chat_modular\ChatModule.tsx`

2. **修改内容**：
   - 在`formattedMessages`的map函数中，将消息文本的获取逻辑从`msg.body`改为`msg.text || msg.body`
   - 同时修改相关字段（`source_text`、`__isWhatsappImage`等）的处理逻辑

3. **预期效果**：
   - DOM-ONLY格式的消息能正确显示文本内容
   - 传统格式的消息仍能正常显示
   - 消息内容会显示在聊天框中，而不仅仅是用户名上方

## 修复代码
```javascript
// 格式化消息列表，确保按时间顺序排序
const formattedMessages = currentMessages
  // 先排序，再格式化
  .sort((a, b) => {
    // 优先按时间戳排序
    const timeDiff = (a.timestamp || 0) - (b.timestamp || 0);
    if (timeDiff !== 0) return timeDiff;
    // 时间戳相同时，按消息ID排序，确保排序稳定
    return (a.id || '').localeCompare(b.id || '');
  })
  .map((msg: any, index: number) => {
  // 只处理WhatsApp消息
  const messageText = msg.text || msg.body || '';
  return {
    id: msg.id,
    text: messageText,
    sender: msg.fromMe ? '我' : (msg.from ? msg.from.split('@')[0] : ''),
    role: msg.fromMe ? 'operator' : 'customer',
    timestamp: msg.timestamp,
    status: msg.status || 'sent',
    channel_id: 19, // WhatsApp渠道ID
    translated_text: msg.translated_text,
    translated_lang: msg.translated_lang,
    translation_status: msg.translation_status,
    source_text: messageText,
    translation: msg.translation,
    send: msg.send,
    attachments: msg.attachments,
    __isWhatsappImage: msg.type === 'image' || msg.__isWhatsappImage,
    __isWhatsappVoice: msg.type === 'ptt' || msg.type === 'audio' || msg.__isWhatsappVoice,
    __isWhatsappVideo: msg.type === 'video' || msg.__isWhatsappVideo,
    __isWhatsappDocument: msg.type === 'document' || msg.__isWhatsappDocument,
    media: msg.media,
    direction: msg.fromMe ? 'outbound' : 'inbound'
  };
});
```

这个修改将确保消息文本能正确从`msg.text`或`msg.body`中获取，解决消息只显示用户名而不显示内容的问题。