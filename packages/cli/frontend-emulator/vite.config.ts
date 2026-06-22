import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const frontendSrc = path.resolve(__dirname, '../frontend/src');

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    host: '127.0.0.1',
    strictPort: false,
    cors: true,
    fs: {
      allow: [frontendSrc, path.resolve(__dirname)],
    },
  },
  resolve: {
    alias: {
      '@': frontendSrc,
    },
  },
});