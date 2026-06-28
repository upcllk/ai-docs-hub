import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src/viewer',
  // 项目根目录作为静态目录：/docs/ 和 /annotations/ 均可访问
  publicDir: resolve(__dirname),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  envDir: resolve(__dirname),
})
