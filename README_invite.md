# JEV L8.9.6-invite 邀请码注册系统

## 系统概述

JEV L8.9.6-invite 是一个基于 Cloudflare Worker 的邀请码管理与验证系统，用于客服端注册流程的身份验证与权限控制。系统支持邀请码的生成、批量生成、验证、撤销和导出等功能，并提供了友好的管理界面和注册流程。

## 核心功能

- **邀请码管理**：生成、批量生成、验证、撤销和查询邀请码
- **安全验证**：管理接口基于 ADMIN_TOKEN 进行身份验证
- **灵活配置**：支持设置使用次数限制、过期时间、备注信息和用户角色
- **管理界面**：提供直观的管理界面用于操作邀请码
- **客户端集成**：包含注册流程页面，演示如何集成邀请码验证
- **审计日志**：记录操作日志，便于追踪和审计

## 文件结构

```
d:\PDF转网页\
├── worker_invite.js    # Cloudflare Worker 实现代码
├── invite_admin.html   # 邀请码管理系统前端
├── invite_register.html # 用户注册页面示例
└── README_invite.md    # 本说明文档
```

## 安装与部署

### Cloudflare Worker 部署

1. **准备工作**
   - 确保您有 Cloudflare 账户
   - 创建 KV 命名空间，命名为 `INVITE_KV`
   - 记录您的 ADMIN_TOKEN (用于管理接口验证)

2. **部署 Worker**
   - 复制 `worker_invite.js` 内容到 Cloudflare Workers 编辑器
   - 在 Worker 设置中绑定 KV 命名空间，变量名设置为 `INVITE_KV`
   - 添加环境变量 `ADMIN_TOKEN`，设置为您的安全令牌
   - 部署 Worker

### 本地测试

1. **使用 Wrangler 本地开发**
   ```bash
   # 安装 Wrangler (如果尚未安装)
   npm install -g wrangler
   
   # 复制 worker_invite.js 并重命名为 index.js
   cp worker_invite.js index.js
   
   # 创建 wrangler.toml 配置文件
   wrangler init
   
   # 在 wrangler.toml 中配置 KV 命名空间绑定和环境变量
   # 开发模式运行
   wrangler dev
   ```

2. **测试管理界面**
   - 直接在浏览器中打开 `invite_admin.html`
   - 在连接设置中配置 Worker API 地址和 ADMIN_TOKEN

3. **测试注册流程**
   - 在浏览器中打开 `invite_register.html`
   - 按照页面提示输入邀请码并完成注册流程

## API 端点说明

### 管理接口 (需要 ADMIN_TOKEN 验证)

#### POST /invites/generate
- **功能**：生成单个或批量邀请码
- **请求体**：
  ```json
  {
    "count": 1,
    "uses_allowed": 1,
    "expires_at": "2023-12-31T23:59:59Z",
    "note": "测试邀请码",
    "role": "user"
  }
  ```
- **响应**：生成的邀请码列表

#### GET /invites/list
- **功能**：获取邀请码列表
- **查询参数**：
  - `limit`: 返回数量限制 (默认 10)
  - `offset`: 偏移量 (默认 0)
  - `status`: 状态过滤 (valid/expired/revoked)
- **响应**：邀请码列表及总数

#### POST /invites/revoke
- **功能**：撤销邀请码
- **请求体**：
  ```json
  {
    "code": "AGT-XXXX-XXXX"
  }
  ```
- **响应**：撤销结果

### 客户端接口

#### POST /invites/validate
- **功能**：验证邀请码是否有效
- **请求体**：
  ```json
  {
    "code": "AGT-XXXX-XXXX"
  }
  ```
- **响应**：验证结果和邀请码信息

## 邀请码格式

- 格式：`AGT-XXXX-XXXX`
- 字符集：大写字母 (A-Z) 和数字 (0-9)，避免使用易混淆字符 (I, L, O, 1, 0)
- 随机生成确保唯一性

## 安全说明

- ADMIN_TOKEN 应妥善保管，避免泄露
- 生产环境建议通过 HTTPS 访问 API
- 所有 API 调用都会记录审计日志
- 实现了基本的请求速率限制保护

## 注意事项

1. 确保在生产环境中使用强随机的 ADMIN_TOKEN
2. 根据实际需求调整 KV 存储的保留策略
3. 定期清理过期或已撤销的邀请码以优化存储
4. 大规模使用时注意 Cloudflare Workers 的请求限制

## 示例流程图

### 注册流程
1. 用户访问注册页面 `invite_register.html`
2. 输入邀请码进行验证
3. 验证通过后，填写注册信息
4. 提交注册，系统验证邀请码并创建账户
5. 注册成功，完成流程

### 管理流程
1. 管理员访问 `invite_admin.html`
2. 配置 API 连接信息
3. 生成新的邀请码或管理现有邀请码
4. 导出邀请码列表用于分发

## 故障排除

- **API 连接失败**：检查 Worker URL 和 ADMIN_TOKEN 是否正确
- **邀请码验证失败**：确认邀请码未过期且未被撤销
- **KV 访问错误**：确保 KV 命名空间绑定正确

如有其他问题，请检查 Cloudflare Worker 日志以获取详细错误信息。