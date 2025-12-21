# Manual Deployment Guide

## Prerequisites

1. Node.js installed (v18+ recommended)
2. Wrangler CLI installed globally: `npm install -g wrangler`
3. Cloudflare Workers account with API token
4. API token configured in Wrangler: `wrangler login`

## Deployment Steps

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd JEV-Rebuild/worker-core
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Verify wrangler.toml configuration**:
   ```bash
   cat wrangler.toml
   ```
   Ensure it contains:
   ```toml
   name = "jev-rebuild-worker"
   workers_dev = true
   compatibility_date = "2024-12-01"
   
   [[kv_namespaces]]
   binding = "MESSAGES_KV"
   id = "8de063433e924133a4a4f71a5f31a089"
   
   [[kv_namespaces]]
   binding = "CUSTOMER_PROFILE_KV"
   id = "8de063433e924133a4a4f71a5f31a089"
   ```

4. **Deploy to Cloudflare Workers**:
   ```bash
   wrangler deploy --env production
   ```
   
   Expected output:
   ```
   ✅ Successfully published your script to https://jev-rebuild-worker.bensonlove1986.workers.dev
   ```

## Verification Steps

### Step 1: Send Test Inbound Message

```bash
curl -X POST "https://jev-rebuild-worker.bensonlove1986.workers.dev/api/inbound/daojie" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"test_customer_123","customer_name":"张三","company":"测试公司","text":"这是一条测试消息，用于验证部署","type":"inbound-message"}'
```

Expected response:
```json
{"success":true,"message_id":"<uuid>","trace_id":"<trace-id>"}
```

### Step 2: Check Cloudflare Logs

1. Go to Cloudflare Dashboard → Workers & Pages → jev-rebuild-worker → Logs
2. Filter logs by "INBOX_MSG_WRITE"
3. You should see a log entry similar to:
   ```
   [INBOX_MSG_WRITE] customer_id=test_customer_123 text_length=32
   ```

### Step 3: Verify Message Retrieval

```bash
curl "https://jev-rebuild-worker.bensonlove1986.workers.dev/api/inbox/pull?customer_id=test_customer_123"
```

Expected response should include `messages` array with at least 1 message:
```json
{
  "messages": [
    {
      "id": "<uuid>",
      "customer_id": "test_customer_123",
      "text": "这是一条测试消息，用于验证部署",
      "source": "daojie",
      "timestamp": <timestamp>,
      "display_name": "张三",
      "contact": {
        "id": "test_customer_123",
        "display_name": "张三"
      }
    }
  ],
  "cursor": <cursor>,
  "hasMore": false
}
```

## Rollback Plan

If verification fails, rollback using:

```bash
wrangler deploy --env production --previous
```

Or restore from a specific deployment:

```bash
wrangler deploy --env production --commit <commit-hash>
```

## Troubleshooting

### Common Issues

1. **Deployment fails with "Invalid URL protocol"**
   - Check proxy settings: `echo $http_proxy` and `echo $https_proxy`
   - Temporarily unset proxies: `unset http_proxy https_proxy`
   - Try deploying with `--no-proxy` flag if supported

2. **Missing KV bindings**
   - Verify KV namespace IDs in wrangler.toml match Cloudflare Dashboard
   - Create KV namespaces if not exists: `wrangler kv:namespace create MESSAGES_KV`

3. **Logs not showing up**
   - Enable debug logging in Cloudflare Dashboard
   - Check if log retention is enabled
   - Verify KV bindings are correctly configured

### Verification Checklist

- [ ] Successfully deployed to workers.dev
- [ ] Test message sent successfully
- [ ] `[INBOX_MSG_WRITE]` log appears in Cloudflare Logs
- [ ] `/api/inbox/pull` returns messages.length > 0
- [ ] Message content matches test payload
- [ ] display_name is correctly set to "张三"

## Code Changes Summary

### 1. Added [INBOX_MSG_WRITE] Logging
```javascript
// 输出 [INBOX_MSG_WRITE] 日志，用于验证
console.log(`[INBOX_MSG_WRITE] customer_id=${customerId} text_length=${text.length}`);
```

### 2. Updated /api/inbox/pull Logic
- Added support for reading messages from both KV and memory store
- Implemented proper message merging and sorting
- Ensured consistent message format

### 3. Enhanced Message Storage
- Added proper KV indexing for fast retrieval
- Implemented customer profile persistence
- Ensured display_name is correctly stored and retrieved

## Contact Information

For deployment assistance, contact the Cloudflare Workers team or the project maintainers.

---

**Deployment Status**: Ready for deployment
**Verification Status**: Pending manual verification
**Last Updated**: 2025-12-20