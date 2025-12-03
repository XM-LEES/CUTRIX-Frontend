import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// 获取 API 代理目标
function getApiTarget() {
  // 在 Docker 环境中，使用服务名 backend（Docker Compose 网络中的服务名）
  // 检查 DOCKER_ENV 环境变量，如果为 'true' 则使用服务名
  if (process.env.DOCKER_ENV === 'true') {
    return 'http://backend:8080'
  }
  // 本地开发使用 localhost（127.0.0.1 避免 IPv6 问题）
  return process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 3000,
    host: '0.0.0.0', // 允许外部访问（Docker 需要）
    proxy: {
      '/api': {
        target: getApiTarget(),
        changeOrigin: true,
        secure: false,
        ws: true, // 支持 WebSocket
        // 添加日志以便调试
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})

