# DeepSeek聊天弹窗组件设计方案

## 1. 功能需求
- 在现有emoji按钮右边新增DeepSeek聊天按钮
- 点击按钮弹出聊天窗口，支持实时与DeepSeek交互
- 弹窗支持拖动、缩放功能
- 支持持久化存储聊天历史
- 实时显示DeepSeek的回答

## 2. 技术实现

### 2.1 新增DeepSeek聊天按钮
- 在`ChatComposer.tsx`的`chat-composer-tools`中添加新按钮
- 按钮样式与现有emoji按钮保持一致
- 点击按钮触发弹窗显示

### 2.2 弹窗组件设计
- 创建新组件`DeepSeekChatPopup.tsx`
- 使用React的Portal技术实现弹窗
- 支持拖动、缩放功能
- 实现实时聊天界面

### 2.3 聊天功能实现
- 使用现有的`safeFetch`调用DeepSeek API
- 实现消息发送和接收的实时显示
- 支持消息历史记录

### 2.4 持久化存储
- 使用localStorage存储聊天历史
- 支持会话管理

## 3. UI设计

### 3.1 按钮设计
- 按钮图标：🤖
- 按钮样式：与现有emoji按钮保持一致
- 位置：emoji按钮右侧

### 3.2 弹窗设计
- 标题栏：显示"DeepSeek聊天助手"
- 消息区域：显示聊天历史，区分用户和AI消息
- 输入区域：文本输入框和发送按钮
- 控制按钮：最小化、最大化、关闭
- 拖动手柄：标题栏支持拖动
- 缩放手柄：右下角支持缩放

### 3.3 消息样式
- 用户消息：右侧对齐，蓝色背景
- AI消息：左侧对齐，灰色背景
- 加载状态：显示"AI正在思考..."

## 4. 代码结构

### 4.1 新增文件
- `ui-core/app/src/modules/chat_modular/components/AIDeepSeekAssistant/DeepSeekChatPopup.tsx`
- `ui-core/app/src/modules/chat_modular/components/AIDeepSeekAssistant/DeepSeekChatPopup.css`

### 4.2 修改文件
- `ui-core/app/src/modules/chat_modular/components/ChatComposer.tsx` - 添加新按钮
- `ui-core/app/src/modules/chat_modular/components/ChatComposer.css` - 添加按钮样式

## 5. 交互流程
1. 用户点击DeepSeek聊天按钮
2. 弹出聊天窗口，显示历史聊天记录
3. 用户输入问题并发送
4. 系统显示"AI正在思考..."状态
5. DeepSeek返回回答，显示在聊天窗口
6. 聊天记录自动保存
7. 用户可以拖动、缩放窗口
8. 关闭窗口后，下次打开仍能看到历史记录

## 6. 技术要点
- 使用React的useState和useEffect管理状态
- 使用React的useRef实现拖动和缩放
- 使用ReactDOM.createPortal实现弹窗
- 使用localStorage实现持久化
- 使用async/await处理API调用
- 使用CSS实现响应式设计

## 7. 预期效果
- 按钮位置合理，样式统一
- 弹窗功能完整，交互流畅
- 聊天响应及时，显示美观
- 窗口操作灵活，体验良好
- 历史记录持久，用户体验连贯