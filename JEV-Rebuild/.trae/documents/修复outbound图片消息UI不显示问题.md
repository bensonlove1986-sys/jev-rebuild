## 修复outbound图片消息UI不显示问题

### 根因分析
- **问题**：outbound图片消息在UI中不显示
- **原因**：MessageBubble.tsx中的isImageMessage函数只检查`msg?.kind === 'image'`，但outbound消息使用的是`type: 'image'`字段
- **结果**：函数返回false，MessageBubble不渲染图片，fallback显示undefined

### 修复方案

1. **修改MessageBubble.tsx中的isImageMessage函数**
   - 扩展判断逻辑，同时检查`type`字段
   - 确保outbound和inbound消息都能被正确识别为图片消息

2. **修改代码**
   ```typescript
   // 修改前
   if ((msg?.kind === 'image' || msg?.kind === 'media') && typeof msg?.media_path === 'string' && msg.media_path.length > 0 && msg.media_path.startsWith('/api/media/r2/'))
   
   // 修改后
   if (((msg?.kind === 'image' || msg?.kind === 'media') || msg?.type === 'image') && typeof msg?.media_path === 'string' && msg.media_path.length > 0 && msg.media_path.startsWith('/api/media/r2/'))
   ```

3. **验证步骤**
   - 发送图片消息
   - 确认UI立即显示图片缩略图
   - 确认客户能收到图片
   - 确认控制台不再显示undefined

### 修复原则
- 保持与inbound消息结构的一致性
- 不影响现有的inbound图片消息处理
- 只修改UI渲染逻辑，不修改API调用
- 确保media_path是相对路径

### 预期效果
- outbound图片消息在UI中正常显示
- 客户能收到图片消息
- 不再出现undefined文本
- 与inbound图片消息显示效果一致