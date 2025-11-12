# Cloudflare Workers 生产密钥迁移指引（非交互说明）

目标：把敏感值从 `wrangler.toml` 移出，改用 Cloudflare 的 `Secrets` 存储，以防密钥泄露。

## 需要迁移为 Secrets 的键
- `GOOGLE_VISION_API_KEY`
- `LEADCONNECTOR_API_KEY`
- `WEBHOOK_SHARED_SECRET`
- `WEBHOOK_SECRET`
- `DAOIJE_WABA_TOKEN`
- `DAOIJE_COOKIE`

（以下两项为常量/非敏感，可继续保留在 `wrangler.toml` → `[vars]`）
- `DAOIJE_WABA_BASE_URL`
- `DAOIJE_APP_URL`

## 操作步骤（生产环境）
1. 在 PowerShell 进入项目目录：
   - `cd d:\PDF转网页`
2. 逐个设置 Secrets（命令将提示你粘贴值）：
   - `npx wrangler secret put GOOGLE_VISION_API_KEY`
   - `npx wrangler secret put LEADCONNECTOR_API_KEY`
   - `npx wrangler secret put WEBHOOK_SHARED_SECRET`
   - `npx wrangler secret put WEBHOOK_SECRET`
   - `npx wrangler secret put DAOIJE_WABA_TOKEN`
   - `npx wrangler secret put DAOIJE_COOKIE`
3. 验证：
   - `npx wrangler secret list`（应能看到以上键名）
4. 部署：
   - `npx wrangler deploy`

## 本地开发
- 本地可以继续使用 `.dev.vars` 或临时环境变量；不要把真实密钥写入仓库。
- 示例：在 PowerShell 会话中设置临时变量（仅当前终端有效）：
  - `Set-Item Env:GOOGLE_VISION_API_KEY "<你的Key>"`
  - `Set-Item Env:LEADCONNECTOR_API_KEY "<你的Key>"`

## 迁移完成后
- 我会删除 `wrangler.toml` 中的敏感值，仅保留非敏感配置（如 `DAOIJE_WABA_BASE_URL`、`DAOIJE_APP_URL`）。
- 你只需保留 `CLOUDFLARE_API_TOKEN` 环境变量即可继续部署。

如需我代为执行删除与重新部署，请在你完成以上 `secret put` 后回复“已迁移”。