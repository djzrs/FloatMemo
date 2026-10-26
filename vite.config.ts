import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5273,
    strictPort: true,
    host: '127.0.0.1',
  },
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Markdown 渲染链独立成块，避免撑大主包（桌面端本地加载，体积不敏感）
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
})
