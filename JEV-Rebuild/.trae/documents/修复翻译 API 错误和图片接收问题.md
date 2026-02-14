## 实现真实的DeepSeek API翻译功能

### 问题分析

1. **当前行为**：本地开发时使用的simple-server.js返回模拟的翻译结果
2. **期望行为**：点击翻译按钮时调用真实的DeepSeek API进行翻译
3. **根本原因**：simple-server.js使用模拟结果，而不是调用真实的DeepSeek API

### 解决方案

#### 1. 修改simple-server.js，调用真实的DeepSeek API

* 更新/api/translate端点，从环境变量读取DeepSeek API密钥

* 实现真实的DeepSeek API调用逻辑

* 保持与index.js中相同的API调用方式

#### 2. 配置环境变量

* 确保本地开发环境中有DeepSeek API密钥配置

* 提供环境变量配置示例

#### 3. 测试翻译功能

* 验证点击翻译按钮时是否调用真实的DeepSeek API

* 确保翻译结果正确显示

### 实施步骤

1. 修改simple-server.js中的/api/translate端点，实现真实的DeepSeek API调用
2. 配置DeepSeek API密钥环境变量
3. 测试翻译功能和按钮显示
4. 确保整体布局美观

### 预期结果

* 点击"翻译成中文"按钮时，调用真实的DeepSeek API

* 翻译完成后，正确的翻译结果显示在消息气泡下方

* 翻译结果支持折叠/展开操作

* 保持整体布局美观

