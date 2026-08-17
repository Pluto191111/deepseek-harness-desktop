import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  root: resolve(import.meta.dirname, 'src/renderer'),
  build: {
    emptyOutDir: true,
    outDir: resolve(import.meta.dirname, 'dist/renderer'),
  },
})
