# ============================================================
# 多阶段构建：前端（Vite/React）构建 + Node 后端运行
# - 构建期：安装全部依赖，执行 vite build 产出 dist/
# - 运行期：仅拷贝 dist/ 与 server/，后端用 Node 原生模块，零运行时依赖
# 镜像同时托管「静态站点 + /api/* + /stats」，前端走同源相对路径。
# ============================================================

# ---------- 构建阶段 ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# ---------- 运行阶段 ----------
FROM node:20-alpine
WORKDIR /app
# 后端 server/ 仅依赖 Node 内置模块，无需 node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

EXPOSE 8787
ENV PORT=8787
# 持久卷挂载点（平台挂卷到此处即可持久化访客数据）；本地运行时默认 server/data
ENV ANALYTICS_DIR=/app/server/data

# 平台直接 `docker run -p 8787:8787 <image>` 或连到 GitHub 自动部署
CMD ["node", "server/index.js"]
