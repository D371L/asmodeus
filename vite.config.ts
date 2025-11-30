
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for deploying to GitHub Pages subdirectories
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
