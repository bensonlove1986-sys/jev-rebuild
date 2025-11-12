# JEV Client 系统功能分析文档

## 1. 功能模块清单

### 1.1 用户管理模块
- **登录功能**：支持用户名/密码登录，带验证码验证
- **注册功能**：支持新用户注册，包含邮箱验证
- **认证服务**：JWT token管理，自动刷新机制
- **会话管理**：会话超时处理，安全验证

### 1.2 核心通信模块
- **WebSocket连接管理**：实时消息推送与接收
- **多通道消息处理**：支持DAOJIE、Facebook、WhatsApp等渠道
- **消息队列管理**：离线消息处理，消息重发机制
- **Client Gateway Bridge**：连接前端与后端服务的桥梁

### 1.3 AI智能功能
- **自动回复系统**：AI辅助自动回复功能
- **实时翻译**：支持多语言实时翻译
- **AI推荐系统**：智能内容推荐
- **情绪识别**：用户情绪分析

### 1.4 系统监控与诊断
- **状态监控**：实时监控系统各服务状态
- **错误日志记录**：异常捕获和日志记录
- **自动修复机制**：系统自我修复功能
- **环境检测**：系统环境配置检测

### 1.5 数据管理
- **数据同步**：实时数据同步机制
- **本地存储**：用户数据和配置本地缓存
- **KV存储接口**：支持Cloudflare KV存储
- **数据加密**：敏感数据加密存储

### 1.6 界面控制
- **响应式UI**：适配不同设备屏幕
- **主题切换**：支持深色模式
- **仪表板**：系统状态可视化展示
- **消息界面**：聊天消息展示和交互

## 2. API接口详细说明

### 2.1 认证相关接口
- **生成验证码**
  - URL: `/api/generate-captcha`
  - 方法: `GET`
  - 返回: 6位随机验证码，有效期5分钟
  - 响应示例: `{"success": true, "captchaId": "1623456789012", "captchaText": "AbCdEf"}`

- **用户登录**
  - URL: `/api/login`
  - 方法: `POST`
  - 请求参数: `username`, `password`, `captcha`
  - 返回: JWT token和用户信息
  - 响应示例: `{"success": true, "message": "登录成功", "token": "mock-jwt-token-1623456789012", "user": {...}}`

- **用户注册**
  - URL: `/api/register`
  - 方法: `POST`
  - 请求参数: `username`, `password`, `email`, `captcha`
  - 返回: 注册结果和用户ID
  - 响应示例: `{"success": true, "message": "注册成功", "userId": 3}`

### 2.2 系统状态接口
- **获取系统数据**
  - URL: `/api/data`
  - 方法: `GET`
  - 返回: 系统模块信息和统计数据
  - 响应内容: 模块列表、版本信息、运行时间等

- **获取系统状态**
  - URL: `/api/status`
  - 方法: `GET`
  - 返回: 系统在线状态和各服务状态
  - 响应内容: 核心、API、UI服务的活跃状态

- **获取系统信息**
  - URL: `/api/info`
  - 方法: `GET`
  - 返回: 应用基本信息
  - 响应内容: 版本、描述、支持的端点列表等

### 2.3 中继服务接口
- **中继请求**
  - URL: `/api/relay`
  - 方法: `POST`
  - 功能: 转发请求到Cloudflare Worker或其他服务
  - 请求参数: `url`, `method`, `headers`, `body`

### 2.4 管理接口（面板）
- **获取/更新设置**
  - URL: `/api/settings`
  - 方法: `GET`, `POST`
  - 功能: 管理系统设置

- **重置设置**
  - URL: `/api/settings/reset`
  - 方法: `POST`
  - 功能: 重置系统设置到默认值

- **检查编码**
  - URL: `/api/encoding/check`
  - 方法: `GET`
  - 功能: 检查系统编码状态

- **重启服务**
  - URL: `/api/services/restart`
  - 方法: `POST`
  - 功能: 重启系统服务

- **服务状态**
  - URL: `/api/services/status`
  - 方法: `GET`
  - 功能: 获取服务运行状态

- **安全设置**
  - URL: `/api/security/settings`
  - 方法: `GET`, `POST`
  - 功能: 管理安全相关设置

## 3. 系统架构与依赖关系

### 3.1 模块依赖关系
```
invite → auth → core → api → data → ui
         auth → security
         core → monitor
client_gateway_bridge → multiChannelGateway → jev_client_web
```

### 3.2 核心模块依赖
- **认证模块**: 依赖邀请码系统，为其他模块提供认证服务
- **核心模块**: 依赖认证模块，是其他功能模块的基础
- **API模块**: 依赖核心模块，处理所有API请求
- **数据模块**: 依赖API模块，管理数据存储和同步
- **UI模块**: 依赖核心和数据模块，提供用户界面
- **安全模块**: 依赖认证模块，提供安全保障
- **监控模块**: 依赖核心模块，监控系统状态

### 3.3 前端与后端交互
- 前端通过REST API与后端服务通信
- 使用WebSocket进行实时消息传递
- 通过Client Gateway Bridge连接到MultiChannel Gateway
- 支持本地Agent与云端Worker的自动切换

## 4. 功能与UI联动

### 4.1 登录流程
1. 用户访问登录页面
2. 系统调用`/api/generate-captcha`生成验证码
3. 用户输入凭据并提交
4. 系统调用`/api/login`验证
5. 成功后获取token并存储在localStorage
6. 跳转到仪表板页面

### 4.2 消息交互流程
1. 前端通过WebSocket连接到后端
2. 后端推送多渠道消息到前端
3. 用户在UI界面查看和回复消息
4. 消息通过Client Gateway Bridge转发到相应渠道

### 4.3 系统监控展示
1. 仪表板页面定期调用`/api/status`获取状态
2. 展示系统服务状态、模块信息和统计数据
3. 提供实时状态更新和告警功能

## 5. 系统特性

### 5.1 双模式切换
- 支持本地Agent与云端Worker自动切换
- 提供稳定的服务保障和性能优化

### 5.2 模块化架构
- 所有功能模块独立加载，可热更新
- 支持插件化扩展，便于功能扩展

### 5.3 安全保障
- JWT token认证机制
- 请求签名和加密传输
- 会话超时自动处理
- 错误日志记录和审计

### 5.4 响应式设计
- 适配不同设备屏幕尺寸
- 支持移动端和桌面端访问
- 优化的用户交互体验

### 5.5 自动修复能力
- 系统自我诊断和修复
- 环境检测和配置优化
- 自动恢复服务功能

## 6. 技术栈与兼容性

### 6.1 前端技术
- HTML5, CSS3, JavaScript (ES6+)
- 响应式设计
- WebSocket通信

### 6.2 后端技术
- Node.js HTTP服务器
- WebSocket服务
- RESTful API设计

### 6.3 浏览器兼容性
- Chrome (90+)
- Firefox (88+)
- Safari (14+)
- Edge (90+)
- iOS (14.0+)
- Android (10.0+)

## 7. 输入输出示例

### 7.1 登录流程示例
输入:
```javascript
fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'admin',
    password: 'admin123',
    captcha: 'AbCdEf'
  })
})
```

输出:
```json
{
  "success": true,
  "message": "登录成功",
  "token": "mock-jwt-token-1623456789012",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

### 7.2 获取系统状态示例
输入:
```javascript
fetch('/api/status')
```

输出:
```json
{
  "status": "online",
  "services": [
    {
      "name": "core",
      "status": "active",
      "lastCheck": "2023-12-01T10:00:00.000Z"
    },
    {
      "name": "api",
      "status": "active",
      "lastCheck": "2023-12-01T10:00:00.000Z"
    },
    {
      "name": "ui",
      "status": "active",
      "lastCheck": "2023-12-01T10:00:00.000Z"
    }
  ]
}
```

## 8. 部署与配置

### 8.1 部署方式
- 静态文件部署到本地服务器
- Node.js服务启动命令: `node server.js`
- 支持PWA安装

### 8.2 配置文件
- `config/settings.json`: 系统主要配置
- `config/channel_endpoints.json`: 渠道端点配置
- `config/identity_profile.json`: 身份配置

### 8.3 环境变量
- 开发环境: `NODE_ENV=development`
- 生产环境: `NODE_ENV=production`

## 9. 总结

JEV Client是一个功能完善的在线服务助手系统，采用模块化架构设计，支持多通道消息处理、AI智能功能、实时通信等核心特性。系统通过完善的API接口与后端服务交互，提供良好的用户体验和安全保障。双模式切换机制确保服务的稳定性和高性能，模块化设计便于系统维护和功能扩展。