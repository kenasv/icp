import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Конфигурация Vite: прокси /api на Go-бэкенд (для локальной разработки).
// Цель прокси переопределяется переменной API_TARGET (по умолчанию localhost:8080).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
