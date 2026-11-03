import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'web',
  envDir: '..',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  test: { root: '.', include: ['__tests__/**/*.test.ts'] },
})
