import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  base: '/vite-project/',
  root: 'src',
  build: {
    outDir: '../dist',
  },
  plugins: [
    legacy(),
  ],
});
