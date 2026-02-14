#!/bin/bash

# 部署参数
ACCOUNT_ID="156ce03fffc59592e2b3b04dbc22aa6c"
API_TOKEN="kCJ4yXElwA8x9aytKldiRGPZ1qJcEPzZ82qvEuFr"
WORKER_NAME="jev-rebuild-worker"

# 清理旧的bundle文件
rm -f bundle.js

# 使用esbuild打包worker代码
echo "📦 Bundling worker code..."
npx esbuild index.js --bundle --format=esm --outfile=bundle.js

# 检查打包是否成功
if [ ! -f bundle.js ]; then
    echo "❌ Bundling failed"
    exit 1
fi

# 读取打包后的代码
BUNDLED_CODE=$(cat bundle.js)

# 准备部署数据
DEPLOY_DATA=$(cat <<EOF
{
  "name": "$WORKER_NAME",
  "metadata": {
    "main_module": "bundle.js"
  },
  "script": "$BUNDLED_CODE",
  "bindings": []
}
EOF
)

# 部署到Cloudflare API
echo "📤 Deploying to Cloudflare API..."
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$WORKER_NAME" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$DEPLOY_DATA"

# 检查部署结果
if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed"
    exit 1
fi
