# Rollback Instructions

## How to Rollback

### Using Cloudflare Workers Dashboard

1. **Go to Cloudflare Workers Dashboard**
   - Navigate to your Cloudflare account
   - Select Workers & Pages > Workers > jev-rebuild-worker

2. **View Deployment History**
   - Click on "Deployments" tab
   - Find the previous successful deployment (before 2025-12-19)
   - Click "Rollback" to revert to that version

### Using Wrangler CLI

If you have the previous version's code locally:

```bash
# Navigate to worker-core directory
cd D:/PDF转网页/JEV-Rebuild/worker-core

# Deploy previous version
wrangler deploy
```

## Previous Version Information

- **Last Deployment Before This Change**: [Previous version ID]
- **Rollback Window**: Immediate - no data loss expected
- **Impact of Rollback**: Reverts customer display_name prioritization logic

## Verification After Rollback

```bash
# Verify the rollback by checking customers API
curl https://jev-rebuild-worker.bensonlove1986.workers.dev/api/inbox/customers
```

## Troubleshooting

If rollback fails:

1. **Check Cloudflare Dashboard for Error Messages**
2. **Verify Wrangler Configuration**: Ensure wrangler.toml is correctly configured
3. **Contact Cloudflare Support**: If issues persist, open a support ticket

## Data Safety

- No permanent data changes were made during this deployment
- All changes are reversible
- Customer profiles remain intact