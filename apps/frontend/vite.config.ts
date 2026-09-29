import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Single .env at the monorepo root, shared with the backend
const envDir = path.resolve(__dirname, '../..')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // FRONTEND_PORT isn't a VITE_ var (it's not exposed to the browser), so load it explicitly.
  const env = loadEnv(mode, envDir, '')
  const port = env.FRONTEND_PORT ? Number(env.FRONTEND_PORT) : undefined

  return {
    plugins: [react()],
    envDir,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: { port, strictPort: Boolean(port) },
    preview: { port, strictPort: Boolean(port) },
  }
})
