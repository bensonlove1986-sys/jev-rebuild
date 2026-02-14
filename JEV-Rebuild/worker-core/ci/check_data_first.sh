#!/bin/bash

# Cloudflare Worker 铁律二：数据先行律校验脚本

WORKER_CORE_DIR="$(dirname "$(dirname "$0")")"

echo "🔍 检查数据先行律..."

# 检查 Profile Key 格式是否统一
PROFILE_KEY_VIOLATIONS=$(grep -r "profile:" "$WORKER_CORE_DIR" --include="*.js" | grep -v "profile:\$\{customerId\}" | grep -v "profile:\$\{customer_id\}")

if [ -n "$PROFILE_KEY_VIOLATIONS" ]; then
  echo "❌ 错误：Profile Key 格式必须为 profile:${customerId}，发现违规："
  echo "$PROFILE_KEY_VIOLATIONS"
  exit 1
fi

echo "✅ Profile Key 格式统一：profile:${customerId}"

# 检查是否有在 pull 时补 profile 的逻辑
PULL_AUTO_CREATE=$(grep -r -i "pull.*auto_heal\|pull.*auto_create\|pull.*fallback\|pull.*put.*profile" "$WORKER_CORE_DIR" --include="*.js")

if [ -n "$PULL_AUTO_CREATE" ]; then
  echo "❌ 错误：禁止在 pull 时补 profile，发现违规："
  echo "$PULL_AUTO_CREATE"
  exit 1
fi

echo "✅ 没有在 pull 时补 profile 的逻辑"

# 检查 inbound 路由是否先写 profile 再写 message
INBOUND_ROUTES=$(find "$WORKER_CORE_DIR/routes" -name "*inbound*.js" -o -name "*outbound*.js")

for route in $INBOUND_ROUTES; do
  # 检查是否包含 profile 写入和 message 写入
  if grep -q "PROFILE_WRITE" "$route" && grep -q "INBOX_WRITE_MSG\|MESSAGE_WRITE" "$route"; then
    # 检查 profile 写入是否在 message 写入之前
    PROFILE_LINE=$(grep -n "PROFILE_WRITE" "$route" | head -n 1 | cut -d: -f1)
    MESSAGE_LINE=$(grep -n "INBOX_WRITE_MSG\|MESSAGE_WRITE" "$route" | head -n 1 | cut -d: -f1)
    
    if [ "$PROFILE_LINE" -lt "$MESSAGE_LINE" ]; then
      echo "✅ $route: profile 写入在 message 写入之前"
    else
      echo "❌ $route: profile 写入必须在 message 写入之前"
      exit 1
    fi
  fi
done

echo "🎉 数据先行律检查通过！"
exit 0