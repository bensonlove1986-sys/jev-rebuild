#!/bin/bash

# Cloudflare Worker 铁律一：入口唯一律校验脚本

WORKER_CORE_DIR="$(dirname "$(dirname "$0")")"

echo "🔍 检查入口唯一律..."

# 检查 wrangler.toml 中的 main 设置
MAIN_ENTRY=$(grep -E "^main\s*=" "$WORKER_CORE_DIR/wrangler.toml" | cut -d'"' -f2)
if [ "$MAIN_ENTRY" != "index.js" ]; then
  echo "❌ 错误：wrangler.toml 中 main 必须为 index.js，当前为 $MAIN_ENTRY"
  exit 1
fi

echo "✅ wrangler.toml main 设置正确：$MAIN_ENTRY"

# 检查 export default 的数量（排除 node_modules）
EXPORT_DEFAULT_COUNT=$(grep -r "export default" "$WORKER_CORE_DIR" --include="*.js" | grep -v "node_modules" | wc -l)

if [ "$EXPORT_DEFAULT_COUNT" -ne 1 ]; then
  echo "❌ 错误：worker-core 目录中 export default 的数量必须为 1，当前为 $EXPORT_DEFAULT_COUNT"
  echo "📋 详细列表："
  grep -r "export default" "$WORKER_CORE_DIR" --include="*.js" | grep -v "node_modules"
  exit 1
fi

echo "✅ export default 数量正确：$EXPORT_DEFAULT_COUNT"

echo "🎉 入口唯一律检查通过！"
exit 0