import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    minify: 'esbuild',
    sourcemap: false,
    assetsInlineLimit: 0, // 禁止把资源内联进 JS/HTML，全部走独立文件 + 浏览器缓存
    // three.js / 项目子页已按需懒加载，主包体积可控；放宽告警阈值避免误报
    chunkSizeWarningLimit: 1200,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      // 前端只调用同源 /api/chat，由 Vite 转发到本地后端代理，
      // 后端持有 LLM 密钥并调用智谱 BigModel。密钥不进前端。
      '/api/chat': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
