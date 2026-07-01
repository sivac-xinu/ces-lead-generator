import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/ces-lead-generator/',
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.html'),
        ces: resolve(__dirname, 'src/CES_Lead_Generator.html'),
      },
    },
  },
  server: {
    open: true,
  },
});
