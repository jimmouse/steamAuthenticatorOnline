import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 8081,
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'es2015', // 支持更低版本的浏览器
    cssTarget: 'chrome61', // CSS兼容性
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true
      }
    }
  },
  esbuild: {
    target: 'es2015'
  }
})
