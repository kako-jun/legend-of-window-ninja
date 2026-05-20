/// <reference types="vitest" />
import { defineConfig } from 'vite'

// vitest の設定もここに統合する (vitest は vite.config.ts を自動で読む)。
// 別途 vitest.config.ts を持たせず設定ファイルを 1 つに寄せる方針。
export default defineConfig({
  base: '/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
  },
})
