# JEV 认证模块使用指南

## 目录
- [概述](#概述)
- [快速开始](#快速开始)
- [核心功能](#核心功能)
- [配置选项](#配置选项)
- [API 参考](#api-参考)
- [事件系统](#事件系统)
- [安全特性](#安全特性)
- [常见问题](#常见问题)
- [错误处理](#错误处理)
- [调试指南](#调试指南)
- [最佳实践](#最佳实践)

## 概述

JEV 认证模块是一个功能完整的认证解决方案，提供安全的令牌管理、请求拦截和响应处理机制。该模块通过统一的事件系统与插件其他模块集成，确保认证信息能够影响所有API请求。

### 主要特点

- 安全的令牌存储和管理（支持加密存储）
- 自动令牌刷新和过期处理
- 统一的请求拦截（支持 fetch 和 XMLHttpRequest）
- 完善的错误处理和重试机制
- 丰富的安全特性（请求签名、来源验证、频率限制等）
- 跨模块事件系统
- 详细的日志和性能监控
- 支持离线模式和网络状态监测

## 快速开始

### 模块初始化

认证模块已在插件启动时自动初始化，但您也可以手动管理它：

```javascript
// 获取认证服务实例
const authService = window.JEV.getAuthService();

// 检查认证状态
const isAuthenticated = await window.JEV.isAuthenticated();

// 刷新认证令牌
const refreshed = await window.JEV.refreshAuth();

// 注销（清除凭证）
await window.JEV.logout();
```

### 监听认证事件

```javascript
// 监听认证成功事件
window.JEV.getCore().events.on('auth:success', (authData) => {
  console.log('认证成功:', authData);
});

// 监听认证错误事件
window.JEV.getCore().events.on('auth:error', (error) => {
  console.error('认证错误:', error);
});

// 监听会话超时事件
window.JEV.getCore().events.on('auth:session:timeout', () => {
  console.log('会话已超时');
  // 显示重新登录提示
});
```

## 核心功能

### 1. 认证状态管理

认证模块提供了完整的认证状态跟踪机制：

- 存储和加密用户凭证
- 跟踪令牌过期时间
- 管理认证会话
- 提供认证状态查询接口

### 2. 请求拦截与认证

认证模块自动拦截以下请求类型：

- `fetch` API 请求
- `XMLHttpRequest` 请求
- （如果存在）`axios` 请求

拦截器会：
- 添加适当的认证头部（如 `Authorization`）
- 处理请求重试逻辑
- 验证请求安全性
- 监控请求性能

### 3. 令牌管理

- 安全存储访问令牌和刷新令牌
- 自动检测令牌过期
- 后台刷新令牌（无感知体验）
- 令牌轮换机制

### 4. 错误处理与恢复

- 智能重试策略（指数退避）
- 网络错误检测与恢复
- 认证错误分类与处理
- 用户友好的错误提示

## 配置选项

### 基本配置

| 配置项 | 类型 | 默认值 | 描述 |
|-------|------|-------|------|
| `authUrl` | String | 'https://api.example.com/auth' | 认证服务URL |
| `refreshUrl` | String | 'https://api.example.com/auth/refresh' | 令牌刷新URL |
| `tokenExpiryThreshold` | Number | 300000 (5分钟) | 令牌过期阈值 |
| `storageKey` | String | 'jev_auth_credentials' | 凭证存储键名 |
| `autoRefresh` | Boolean | true | 是否启用自动刷新 |
| `encryptedStorage` | Boolean | true | 是否加密存储 |
| `tokenKey` | String | 'jev_auth_token' | 令牌存储键名 |
| `refreshTokenKey` | String | 'jev_refresh_token' | 刷新令牌存储键名 |
| `authType` | String | 'bearer' | 认证类型（bearer, basic, api_key） |

### 安全配置 (`security`) 【重要】

| 配置项 | 类型 | 默认值 | 描述 |
|-------|------|-------|------|
| `enableRequestSigning` | Boolean | true | 启用请求签名 |
| `signingAlgorithm` | String | 'HMAC-SHA256' | 签名算法 |
| `sessionTimeout` | Number | 1800000 (30分钟) | 会话超时时间 |
| `corsProtection` | Boolean | true | 启用跨域保护 |
| `validateOrigin` | Boolean | true | 验证请求来源 |
| `allowedOrigins` | Array | ['app.daojiemarketing.com', 'jevshop.workers.dev'] | 允许的来源域名 |
| `rateLimit` | Boolean | true | 启用请求频率限制 |
| `maxRequestsPerMinute` | Number | 60 | 最大请求频率（每分钟） |
| `enforceHttps` | Boolean | true | 强制使用HTTPS |
| `enableCsrfProtection` | Boolean | true | 启用CSRF保护 |
| `enableTokenRotation` | Boolean | true | 启用令牌轮换 |

### 集成配置 (`integration`) 【重要】

| 配置项 | 类型 | 默认值 | 描述 |
|-------|------|-------|------|
| `enableEventSystem` | Boolean | true | 启用事件系统 |
| `apiEndpoints` | Array | ['https://api.example.com/auth', ...] | API端点配置 |
| `errorHandling.autoRetry.enabled` | Boolean | true | 启用自动重试 |
| `errorHandling.autoRetry.maxAttempts` | Number | 3 | 最大重试次数 |
| `userExperience.silentRefresh` | Boolean | true | 静默刷新令牌 |
| `userExperience.backgroundAuthCheck` | Boolean | true | 背景认证检查 |
| `userExperience.autoReconnect` | Boolean | true | 网络中断自动重连 |

## API 参考

### 全局 JEV API

```javascript
// 检查认证状态
const isAuthenticated = await window.JEV.isAuthenticated();

// 检查详细认证状态
const authStatus = await window.JEV.checkAuthStatus();
// 返回: { authenticated: true/false, tokenExpiry: Date, userId: String, ... }

// 刷新认证令牌
const refreshed = await window.JEV.refreshAuth();

// 注销（清除凭证）
await window.JEV.logout();

// 检查网络环境
const networkStatus = await window.JEV.checkNetwork();

// 清理资源
window.JEV.cleanup();
```

### 认证服务 API

```javascript
const authService = window.JEV.getAuthService();

// 设置凭证
await authService.setCredentials({ token: '...', refreshToken: '...' });

// 获取认证头部
const headers = await authService.getAuthHeaders();

// 拦截请求
const interceptedRequest = await authService.interceptRequest(request);

// 处理响应
const handledResponse = await authService.handleResponse(response, retryFunction);

// 刷新令牌
const refreshed = await authService.refreshToken();

// 清除凭证
await authService.clearCredentials(forceCleanup);

// 获取性能统计
const stats = authService.getPerformanceStats();
```

## 事件系统

认证模块使用事件系统与其他模块通信，以下是关键事件：

### 核心事件

| 事件名 | 触发时机 | 数据 |
|-------|---------|------|
| `auth:success` | 认证成功 | `{ userId, token, expiry }` |
| `auth:error` | 认证失败 | `{ code, message, error }` |
| `auth:logout` | 用户登出 | 无 |
| `auth:session:timeout` | 会话超时 | `{ sessionId, timestamp }` |
| `auth:token:refreshed` | 令牌刷新成功 | `{ newToken, newExpiry }` |

### 网络事件

| 事件名 | 触发时机 | 数据 |
|-------|---------|------|
| `network:status:change` | 网络状态变化 | `{ isOnline: true/false }` |
| `network:environment:checked` | 网络环境检查完成 | `{ online: Boolean, endpoints: Object }` |

## 安全特性

### 1. 凭证存储安全

- **加密存储**：凭证使用浏览器的安全存储机制，并支持额外加密层
- **令牌管理**：自动处理令牌的创建、刷新和销毁
- **安全清除**：登出时彻底清除所有认证信息，防止凭证泄露

### 2. 传输安全

- **强制 HTTPS**：确保所有认证请求使用 HTTPS
- **请求签名**：为关键请求添加安全签名，防止篡改
- **CSRF 保护**：添加防跨站请求伪造保护

### 3. 请求验证

- **来源验证**：验证请求来源域名，防止跨域攻击
- **频率限制**：控制 API 请求频率，防止滥用
- **异常检测**：检测并阻止异常请求模式

## 常见问题

### Q: 如何处理认证失败？

**A:** 监听 `auth:error` 事件并根据错误类型处理：

```javascript
window.JEV.getCore().events.on('auth:error', (error) => {
  if (error.code === 'SESSION_TIMEOUT') {
    // 显示登录界面
    showLoginForm();
  } else if (error.code === 'NETWORK_ERROR') {
    // 提示网络问题
    showNetworkError();
  }
});
```

### Q: 令牌自动刷新失败怎么办？

**A:** 系统会自动重试（根据配置的 `maxRefreshAttempts`），如果仍然失败，会触发 `auth:error` 事件，错误代码为 `REFRESH_FAILED`。您可以在该事件中引导用户重新登录。

### Q: 如何在特定请求中跳过认证？

**A:** 对于 axios 请求，可以添加 `skipAuth: true` 标志：

```javascript
axios.get('/public-data', { skipAuth: true });
```

对于 fetch 请求，可以在 headers 中添加 `'jev-skip-auth': 'true'`：

```javascript
fetch('/public-data', {
  headers: {
    'jev-skip-auth': 'true'
  }
});
```

### Q: 如何获取当前认证状态？

**A:** 使用 `isAuthenticated()` 方法检查基本状态，或使用 `checkAuthStatus()` 获取详细信息：

```javascript
const isAuth = await window.JEV.isAuthenticated();
const details = await window.JEV.checkAuthStatus();
console.log(`用户 ${details.userId} 认证状态: ${isAuth ? '已认证' : '未认证'}`);
console.log(`令牌过期时间: ${new Date(details.tokenExpiry).toLocaleString()}`);
```

## 错误处理

### 常见错误代码

| 错误代码 | 描述 | 处理建议 |
|---------|------|----------|
| `AUTHENTICATION_FAILED` | 认证失败 | 提示用户重新登录 |
| `SESSION_TIMEOUT` | 会话超时 | 清除本地凭证并显示登录界面 |
| `TOKEN_REVOKED` | 令牌已被撤销 | 清除本地凭证并显示登录界面 |
| `RATE_LIMIT_EXCEEDED` | 请求频率超限 | 提示用户放慢操作速度 |
| `NETWORK_ERROR` | 网络连接错误 | 检查网络连接并重试 |
| `REFRESH_FAILED` | 令牌刷新失败 | 引导用户重新登录 |

### 全局错误处理器

```javascript
// 设置全局认证错误处理器
function setupGlobalAuthErrorHandler() {
  window.addEventListener('jev-auth-error', (event) => {
    const { code, message } = event.detail;
    
    switch(code) {
      case 'SESSION_TIMEOUT':
        showReloginDialog('您的会话已超时，请重新登录');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        showNotification('操作过于频繁，请稍后再试', 'warning');
        break;
      case 'NETWORK_ERROR':
        showOfflineMode();
        break;
      default:
        showNotification(`认证错误: ${message}`, 'error');
    }
  });
}

// 在插件初始化时调用
setupGlobalAuthErrorHandler();
```

## 调试指南

### 启用调试模式

1. 在控制台启用调试日志：

```javascript
// 临时启用调试模式
window.JEV_MODULES.DEBUG = true;
```

2. 或者修改配置文件中的 `DEBUG` 选项：

```javascript
// 在 DEFAULT_CONFIG 中设置
DEBUG: true
```

### 查看认证状态

```javascript
// 打印当前认证状态
console.log('认证状态:', await window.JEV.checkAuthStatus());

// 打印性能统计
console.log('认证性能:', window.JEV.getAuthService().getPerformanceStats());
```

### 网络请求调试

```javascript
// 检查网络环境
const networkStatus = await window.JEV.checkNetwork();
console.log('网络状态:', networkStatus);

// 监控请求拦截情况
window.JEV.getCore().events.on('network:request:intercepted', (data) => {
  console.log('请求已拦截:', data.url, data.authApplied);
});
```

## 最佳实践

### 1. 初始化与清理

- 确保正确初始化认证模块并在插件卸载时清理资源
- 使用 `window.JEV.cleanup()` 进行完整清理

### 2. 错误处理

- 始终监听认证错误事件
- 为用户提供清晰的错误反馈
- 实现自动重试机制

### 3. 安全建议

- 不要在控制台或日志中打印完整令牌
- 定期检查安全配置
- 启用所有推荐的安全选项
- 限制认证信息的访问范围

### 4. 用户体验优化

- 实现无感知的令牌刷新
- 在网络不稳定时提供优雅的降级体验
- 为长时间运行的任务保存进度，以便在会话过期后恢复

### 5. 性能考量

- 避免频繁的认证状态检查
- 使用缓存减少认证请求
- 监控认证模块的性能指标

## 更新日志

### v2.2.0
- 集成用户反馈收集系统
- 增强认证模块与其他系统的集成能力
- 添加更详细的安全配置选项

### v2.1.0
- 完整的请求拦截器与认证头部添加机制
- 增强凭证管理和资源清理
- 添加更详细的配置选项

### v2.0.1
- 集成统一的请求拦截与认证头部添加机制
- 实现动态凭证更新和请求重试逻辑
- 添加完整的安全防护和日志记录功能
- 增强的异常处理和用户反馈机制

---

如有更多问题，请联系 JEV 技术支持团队。