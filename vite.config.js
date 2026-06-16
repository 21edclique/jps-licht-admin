import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': { target: 'https://jps-licht-api-8cf7a7a0c996.herokuapp.com', changeOrigin: true },
      '/socket.io': { target: 'https://jps-licht-api-8cf7a7a0c996.herokuapp.com', ws: true },
    },
  },
})
