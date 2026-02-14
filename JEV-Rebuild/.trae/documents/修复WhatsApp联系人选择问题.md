## 修复WhatsApp联系人选择问题

### 问题分析
1. **联系人选择逻辑错误**：`handleSelectCustomer`函数中存在`isWhatsappContact`条件判断，当`whatsappContacts`与`customersStore.customers`不匹配时，导致无法选择联系人
2. **ID不匹配问题**：联系人列表使用`customersStore.customers`，但选择逻辑检查的是`whatsappContacts`，两者ID格式可能不一致
3. **聊天框切换问题**：`currentContactId`依赖`selectedWhatsappContactId`，但选择逻辑可能没有正确更新此状态

### 修复计划
1. **修复handleSelectCustomer函数**：
   - 移除`isWhatsappContact`条件判断，直接使用传入的customerId
   - 确保正确调用`setSelectedWhatsappContactId`更新选中状态
   - 确保正确调用`whatsappWebSocketService.getMessages`获取历史消息

2. **统一联系人ID处理**：
   - 确保`formattedWhatsappContacts`生成的ID与`handleSelectCustomer`接收的ID格式一致
   - 检查并修复ID映射逻辑

3. **修复聊天框切换逻辑**：
   - 确保`currentContactId`能正确反映当前选中的联系人
   - 检查并修复状态更新依赖项

### 具体修改
1. 修改`ChatModule.tsx`中的`handleSelectCustomer`函数
2. 检查并修复联系人ID映射逻辑
3. 确保状态更新依赖项正确
4. 测试联系人选择功能
5. 测试聊天框切换功能

### 预期效果
- 点击左侧联系人列表中的联系人，聊天框能正确切换到该联系人
- 显示该联系人的聊天记录
- 聊天框标题显示正确的联系人名称
- 能正常发送和接收消息