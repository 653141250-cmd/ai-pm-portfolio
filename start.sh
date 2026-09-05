#!/usr/bin/env bash
# ============================================================
# 一键启动作品集后端，并自动打开统计页
# 用法：
#   bash start.sh        或  ./start.sh  或  npm run stats
# 行为：
#   1. 切到脚本所在目录
#   2. 若 dist/ 不存在则先 npm run build
#   3. 从 .env 读取 ADMIN_TOKEN（仅用于拼链接，服务端自己也会读）
#   4. 启动 Node 后端（同时托管站点 + /stats + 微信推送）
#   5. 1.5s 后自动用默认浏览器打开统计页
# 停止：Ctrl+C
# ============================================================
set -e
cd "$(dirname "$0")"

# 未构建则先构建
if [ ! -d dist ]; then
  echo "未检测到 dist/，先执行 npm run build ..."
  npm run build
fi

# 从 .env 读取 ADMIN_TOKEN（服务端也会自行读取，这里仅用于打印/打开链接）
TOKEN=""
if [ -f .env ]; then
  TOKEN="$(grep -E '^ADMIN_TOKEN=' .env | head -n1 | cut -d= -f2-)"
fi

PORT="${PORT:-8787}"
STATS_URL="http://localhost:${PORT}/stats?token=${TOKEN}"

echo "=================================================="
echo " 作品集后端启动中（托管站点 + /stats + 微信推送）"
echo " 站点:   http://localhost:${PORT}/"
echo " 统计页: ${STATS_URL}"
echo " 按 Ctrl+C 停止服务"
echo "=================================================="

# 启动后端后，自动打开统计页（macOS 用 open，Linux 用 xdg-open）
( sleep 1.5
  if command -v open >/dev/null 2>&1; then
    open "${STATS_URL}"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "${STATS_URL}"
  fi
) >/dev/null 2>&1 &

node server/index.js
