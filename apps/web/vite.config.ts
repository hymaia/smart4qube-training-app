/// <reference types="vitest" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Repository root: the web app reads RocketNouilles sources from <root>/rocketnouilles/.
const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/issues': { target: 'http://localhost:3001', changeOrigin: true } },
    fs: { allow: [repoRoot] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
