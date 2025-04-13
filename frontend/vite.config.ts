import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: 'http://api:3001',
        changeOrigin: true,
        secure: false
      },
      '/stats': {
        target: 'http://api:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
