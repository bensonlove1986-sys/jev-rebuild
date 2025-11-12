# JEV 系统 - 注册窗口模块

## 模块概述

注册窗口模块是JEV系统的用户注册功能组件，提供弹窗式注册表单、数据验证、Worker通信和用户信息存储功能。该模块采用玻璃拟态风格设计，与JEV系统显相层UI保持视觉一致性。

## 文件结构

```
/modules/
  ├── register_panel.html     # 注册窗口HTML界面
  ├── register_panel.js       # 注册窗口JavaScript逻辑
  ├── register_handler.js     # Worker端注册接口处理
  └── README_register.md      # 本说明文档
```

## 功能特性

- 🎨 玻璃拟态风格的居中弹出式注册窗口
- ✅ 表单字段验证（用户名、邮箱、密码、邀请码）
- 🔒 安全的Worker通信，包含X-Agent-Token验证
- 💾 注册成功后保存用户信息到localStorage
- 📝 完整的操作日志记录
- 🔄 支持与主系统状态同步
- ⚡ 加载状态指示和错误处理

## 快速开始

### 1. 引入模块

在需要使用注册功能的页面中引入模块文件：

```html
<!-- 在HTML文件中添加 -->
<link rel="stylesheet" href="/modules/register_panel.css">
<script src="/modules/register_panel.js"></script>
```

### 2. 打开注册窗口

通过JavaScript调用注册窗口：

```javascript
// 方法1：直接打开注册窗口
window.registerModule.openRegister();

// 方法2：通过按钮点击事件
const registerButton = document.getElementById('register-button');
registerButton.addEventListener('click', () => {
    window.registerModule.openRegister();
});
```

### 3. 监听注册成功事件

注册窗口会在成功注册后向父窗口发送消息：

```javascript
// 监听注册成功事件
window.addEventListener('message', (event) => {
    if (event.data === 'JEV_USER_REGISTERED') {
        console.log('用户注册成功，更新系统状态');
        // 执行系统状态更新操作
        updateSystemState();
    }
});
```

## 模块API

### RegisterModule 类

注册窗口模块提供以下API方法：

#### `openRegister()`
打开注册窗口弹窗。

#### `closeRegister()`
关闭注册窗口弹窗。

#### `submitForm()`
提交注册表单数据到Worker。

#### `updateUserStatus()`
更新用户状态信息（供外部调用）。

## Worker 接口规范

### /register 接口

#### 请求
- **方法**: POST
- **URL**: /register
- **Headers**:
  - Content-Type: application/json
  - X-Agent-Token: jev-secure-key-001

- **Body**:
```json
{
  "username": "用户名",
  "email": "邮箱地址",
  "password": "密码",
  "inviteCode": "邀请码"
}
```

#### 响应
```json
// 成功
{
  "success": true,
  "userId": "U1234567890",
  "token": "JEV-T-abcdef-123456",
  "message": "注册成功！欢迎使用JEV系统"
}

// 失败
{
  "success": false,
  "error": "错误信息"
}
```

## 安全特性

1. **密码处理**: 密码在Worker端进行哈希处理，不明文存储
2. **Token验证**: 所有API请求必须包含有效的X-Agent-Token
3. **数据验证**: 客户端和服务端双重验证输入数据
4. **HTTPS通信**: 所有网络请求使用HTTPS加密
5. **日志安全**: 日志记录不包含敏感信息，存储在指定路径

## 测试方法

JEV系统提供了专门的注册功能测试页面，用于验证注册模块的完整功能：

1. 打开测试页面：`/test_register.html`
2. 测试功能包括：
   - 打开注册窗口
   - 检查用户状态
   - 清除用户数据
   - 模拟注册请求

测试页面会模拟Worker环境，包括请求拦截、数据验证和响应处理，无需真实的后端服务即可进行完整测试。

## 有效邀请码

以下邀请码可在测试环境中使用：

- `JEV2025` - 普通用户
- `ADMIN2025` - 管理员
- `DEVELOPER` - 开发者
- `TEST2025` - 测试用户
- `PREMIUM2025` - 高级用户

## 错误处理

注册模块会处理以下常见错误情况：

1. 表单字段为空或格式不正确
2. 邮箱格式验证失败
3. 密码长度不足8位
4. 邀请码无效
5. Worker通信失败
6. Token验证失败

所有错误都会显示友好的提示信息，并记录到日志中。

## 集成注意事项

1. 确保页面引入了所有必要的CSS和JS文件
2. 注册窗口需要在具有localStorage访问权限的环境中运行
3. 如需自定义样式，请在引入模块CSS后添加自定义样式规则
4. 生产环境中请确保Worker端正确配置了/register路由
5. 定期清理过期的日志文件以节省存储空间

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 故障排除

### 常见问题

1. **注册窗口不显示**
   - 检查模块文件是否正确引入
   - 确认浏览器兼容性
   - 查看控制台是否有JavaScript错误

2. **注册请求失败**
   - 检查X-Agent-Token是否正确
   - 验证邀请码是否有效
   - 确认Worker端/register接口是否正常

3. **localStorage保存失败**
   - 检查浏览器隐私设置
   - 确认存储空间是否充足
   - 验证域名是否在同一源

### 日志查询

注册操作的日志会保存到以下位置：

- localStorage: 键名为 `register_log_${timestamp}`
- 文件系统: `/jev_logs/register/register_log_${timestamp}.json`

通过分析日志可以快速定位问题原因。

## 更新日志

### v1.0.0
- 初始版本发布
- 实现基本注册功能
- 添加表单验证和安全检查

### v1.1.0
- 添加父窗口消息通知
- 优化错误处理逻辑
- 增强日志记录功能

---

**JEV系统开发团队**
**© 2025 JEV Project**