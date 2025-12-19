import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',            // 强制 UI 根目录
  base: '/',             // 关键：否则 localhost:3000 必 404
  server: {
    port: 3000,
    strictPort: true,
    open: false
  },
  build: {
    outDir: 'dist'
  }
})
