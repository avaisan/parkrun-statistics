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
        target: process.env.NODE_ENV === 'production' 
          ? 'https://mypspzz9o6.execute-api.eu-central-1.amazonaws.com'
          : 'http://api:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
