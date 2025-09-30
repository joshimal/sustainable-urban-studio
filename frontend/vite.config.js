import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080
  },
  css: {
    postcss: './postcss.config.cjs'
  },
  optimizeDeps: {
    exclude: ['leaflet']
  }
})
