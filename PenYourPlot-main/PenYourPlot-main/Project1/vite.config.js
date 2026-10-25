import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const { PORT = '5000' } = loadEnv(mode, process.cwd(), 'PORT')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': `http://localhost:${PORT}`,
      },
    },
  }
})
