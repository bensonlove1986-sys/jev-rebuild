import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // 禁止使用绝对URL，防止URL被二次拼接
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    dedupe: [
      'react',
      'react-dom',
      'antd',
      '@ant-design/icons'
    ]
  },
  build: {
    // 输出到 ui-core/build 目录，符合项目结构要求
    outDir: path.resolve(__dirname, '../build'),
    // 添加 hash 配置，确保每次构建生成唯一的文件名
    rollupOptions: {
      output: {
        // 使用 hash 确保文件名唯一
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // 强制清空输出目录
    emptyOutDir: true
  },
  server: {
    port: 3000,
    strictPort: true,
    // 本地开发模式：添加代理配置，将/api请求代理到worker服务器
    proxy: {
      '/api': {
        target: 'http://localhost:8789',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})
