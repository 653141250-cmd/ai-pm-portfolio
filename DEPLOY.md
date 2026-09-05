# 部署上线指南（保留后端：访客追踪 + 微信推送 + /stats）

> ⚠️ **最重要前提**：本项目的访客埋点、微信推送（Server酱）、`/stats` 统计页、AI 答疑
> 都依赖一个 **Node 后端服务**（`server/index.js`）。这个服务同时托管前端静态文件、
> `/api/*` 接口与 `/stats` 页面，全部同源。
>
> **GitHub Pages 只能托管静态文件，跑不了这个后端** —— 如果只推到 Pages，
> 访客追踪 / 微信推送 / 统计页会全部失效。
> 正确做法：代码推到 GitHub 后，再连到能运行 Node 容器并挂**持久盘**的平台
> （推荐 **Fly.io**，或 Render / Railway），由该平台的容器运行 `Dockerfile`。

---

## 一、架构回顾（为什么这样部署）

```
访客浏览器
   │  同源相对路径：/  /api/chat  /api/track  /stats?token=
   ▼
Node 服务（Docker 容器内，单端口 8787）
   ├─ 托管 dist/ 静态站点（前端 React 产物）
   ├─ POST /api/chat   → 调用智谱 LLM（密钥仅在服务端）
   ├─ POST /api/track  → 写入 server/data/events.jsonl（访客行为）
   ├─ GET  /stats      → 统计后台（需 token）
   └─ 事件触发 → Server酱推送到你微信
```

数据落盘在 `server/data/`（可用 `ANALYTICS_DIR` 指向持久卷）。**必须挂持久卷**，
否则容器重启/重新部署后访客数据清空。

---

## 二、本地自测（可选，验证改动无误）

```bash
cd portfolio
npm install
npm run build
cp .env.example .env        # 填入真实 ZHIPU_API_KEY / SERVERCHAN_KEY / ADMIN_TOKEN
node server/index.js
# 打开 http://localhost:8787          看站点
# 打开 http://localhost:8787/stats?token=<你的ADMIN_TOKEN>  看统计
```

---

## 三、推送到 GitHub

本仓库已 `git init` 并完成首次提交（`.env`、`server/data/`、`dist/`、`node_modules/`
均被 `.gitignore` 忽略，密钥与访客数据不会入库）。

```bash
cd portfolio
# 1) 在 GitHub 网页新建一个空仓库（不要勾选 README/.gitignore）
# 2) 关联远程并推送：
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

---

## 四、部署到能跑 Node 的平台

### 方案 A：Fly.io（推荐 —— 免费额度含 3GB 持久卷，功能完整保留）

```bash
brew install flyctl                              # 或 curl -L https://fly.io/install.sh | sh
fly auth login
fly launch --no-deploy                           # 选 region（如 hkg / nrt / sin）
fly volumes create portfolio_data --region <上一步region> --size 1
fly secrets set ZHIPU_API_KEY=xxx SERVERCHAN_KEY=xxx ADMIN_TOKEN=xxx
fly deploy
```

- 访问：`https://<app>.fly.dev`
- 统计页：`https://<app>.fly.dev/stats?token=<ADMIN_TOKEN>`
- 每次 `git push` 后重新 `fly deploy` 即可上线新版（或接 GitHub Actions 自动部署）。

### 方案 B：Render（GitHub 一键，但持久盘需付费 plan）

1. Render 控制台 → New → Blueprint → 关联本 GitHub 仓库（自动读取 `render.yaml`）。
2. 在环境变量面板填入真实值：`ZHIPU_API_KEY` / `SERVERCHAN_KEY` / `ADMIN_TOKEN`。
3. plan 选 **Starter 及以上**（持久磁盘仅在付费 plan 提供；free 不含 disk，数据不持久）。

- 访问：`https://<service>.onrender.com`
- 统计页：`https://<service>.onrender.com/stats?token=<ADMIN_TOKEN>`

### 方案 C：Railway（GitHub 连接，试用后付费，支持卷）

1. Railway 控制台 → New Project → Deploy from GitHub repo。
2. 用本仓库的 `railway.json`（已配置 Dockerfile + 健康检查）。
3. 在 Variables 填 `ZHIPU_API_KEY` / `SERVERCHAN_KEY` / `ADMIN_TOKEN`，
   并添加一个 Volume 挂载到 `/app/server/data`。

---

## 五、必须设置的环境变量（平台环境变量面板 / `fly secrets`）

| 变量 | 说明 | 是否密钥 |
|------|------|----------|
| `ZHIPU_API_KEY` | 智谱 BigModel Key，AI 答疑用 | ✅ 密钥 |
| `ZHIPU_MODEL` | 默认 `glm-4-flash` | 否 |
| `ZHIPU_BASE` | 默认 `https://open.bigmodel.cn/api/paas/v4` | 否 |
| `SERVERCHAN_KEY` | Server酱 SendKey，配置后才推微信 | ✅ 密钥 |
| `ADMIN_TOKEN` | `/stats` 访问密码，**强烈建议设置** | ✅ 密钥 |
| `PORT` | 平台一般自动注入（默认 8787） | 否 |
| `ANALYTICS_DIR` | 持久卷挂载点（默认 `/app/server/data`） | 否 |
| `VISIT_PUSH_COOLDOWN_MIN` | 微信推送去重冷却（默认 30） | 否 |

> 切勿把 `.env` 提交进仓库（已被 `.gitignore` 忽略）。云端一律用平台环境变量注入。

---

## 六、微信推送确认

`SERVERCHAN_KEY` 配置正确后：
- 新访客到访 → 微信收到「新访客」提醒（含脱敏地区/IP）。
- 访客在 AI 答疑提问 → 微信收到提问内容提醒。
推送去重冷却由 `VISIT_PUSH_COOLDOWN_MIN` 控制，避免刷新刷屏。

---

## 七、自定义域名（可选）

各平台都支持绑定自己的域名（在平台控制台添加 Custom Domain，按提示加 DNS CNAME）。
绑定后访客用你的域名访问，功能完全一致；`/stats` 仍走 `你的域名/stats?token=...`。

---

## 八、上线后验证清单

- [ ] 打开站点首页，无报错、动效正常
- [ ] 打开 `/stats?token=<ADMIN_TOKEN>`，能看到实时访客数据
- [ ] 自己访问一次站点，微信很快收到「新访客」提醒
- [ ] AI 答疑能正常回答（验证 `ZHIPU_API_KEY` 生效）
- [ ] 在平台控制台确认持久卷已挂载（否则数据重启后丢失）

---

## 九、GitHub Actions 自动部署（推荐）

仓库已内置 `.github/workflows/deploy.yml`：每次 `git push` 到 `main` 即自动 `fly deploy`，
无需手动跑命令。

### 一次性配置
1. 安装 Fly CLI 并登录、创建应用与持久卷（见方案 A），并用
   `fly secrets set ZHIPU_API_KEY=… SERVERCHAN_KEY=… ADMIN_TOKEN=…` 写入应用密钥。
2. 生成本机令牌并添加到 GitHub：
   ```bash
   fly auth token          # 复制输出的字符串
   ```
   打开 `https://github.com/<用户名>/<仓库>/settings/secrets/actions`
   → New repository secret → Name 填 `FLY_API_TOKEN`，Value 粘贴上面的令牌。
3. 在 Fly 控制台把应用的 `Auto deploy` 关掉（避免与 Actions 重复触发），保留 Actions 接管。

### 之后
只需 `git push origin main`，GitHub Actions 会自动构建镜像并部署；
访问 `https://<app>.fly.dev` 即为最新版。应用级密钥已存于 Fly 平台，部署自动沿用。

> 此工作流仅需要 `FLY_API_TOKEN` 一个密钥；`ZHIPU_API_KEY` / `SERVERCHAN_KEY` /
> `ADMIN_TOKEN` 等不进 GitHub，只在 Fly 平台侧设置，更安全。
