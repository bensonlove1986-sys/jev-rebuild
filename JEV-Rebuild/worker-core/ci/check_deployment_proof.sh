#!/bin/bash

# Cloudflare Worker 铁律三：上线证据律校验脚本

WORKER_CORE_DIR="$(dirname "$(dirname "$0")")"

echo "🔍 检查上线证据律..."

# 检查是否包含 BUILD ID 生成和日志
BUILD_ID_CHECK=$(grep -r -i "BUILD_ID\|WORKER_BUILD" "$WORKER_CORE_DIR" --include="*.js")

if [ -z "$BUILD_ID_CHECK" ]; then
  echo "❌ 错误：必须包含 BUILD ID 生成和日志输出"
  exit 1
fi

echo "✅ 包含 BUILD ID 生成和日志"

# 检查是否包含 ROUTE HIT 日志
ROUTE_HIT_CHECK=$(grep -r "FETCH_ENTRY\|ROUTE_HIT" "$WORKER_CORE_DIR" --include="*.js")

if [ -z "$ROUTE_HIT_CHECK" ]; then
  echo "❌ 错误：必须包含 ROUTE HIT 日志"
  exit 1
fi

echo "✅ 包含 ROUTE HIT 日志"

# 检查是否包含数据写入日志
DATA_WRITE_CHECK=$(grep -r "PROFILE_WRITE\|INBOX_WRITE_MSG\|MESSAGE_WRITE" "$WORKER_CORE_DIR" --include="*.js")

if [ -z "$DATA_WRITE_CHECK" ]; then
  echo "❌ 错误：必须包含数据写入日志"
  exit 1
fi

echo "✅ 包含数据写入日志"

# 检查健康检查端点是否返回 BUILD ID
HEALTH_CHECK=$(grep -r "build_id\|BUILD_ID" "$WORKER_CORE_DIR/routes/health.js")

if [ -z "$HEALTH_CHECK" ]; then
  echo "❌ 错误：健康检查端点必须返回 BUILD ID"
  exit 1
fi

echo "✅ 健康检查端点返回 BUILD ID"

echo "🎉 上线证据律检查通过！"
exit 0