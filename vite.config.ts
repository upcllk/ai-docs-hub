import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src/viewer',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  envDir: '../../',
})
