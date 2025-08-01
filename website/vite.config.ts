import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    sourcemap: true
  },
  server: {
    port: Number(process.env.PORT) || 3000
  },
  plugins: []
})
