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
        target: process.env.VITE_API_URL,
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rolldownOptions: {
      output: {
        // Separate long-lived vendor chunks: better caching and no chunk over the 500 kB warning limit
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
            { name: 'mui-vendor', test: /node_modules[\\/](@mui|@emotion)[\\/]/, priority: 15 },
            { name: 'vendor', test: /node_modules/, priority: 10 }
          ]
        }
      }
    }
  },
  assetsInclude: ['**/*.json'],
  json: {
    stringify: true
  }
})
