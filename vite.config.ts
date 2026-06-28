import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src/viewer',
  publicDir: resolve(__dirname, 'docs'),  // 将 docs/ 作为静态资源目录
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  envDir: resolve(__dirname),
})
