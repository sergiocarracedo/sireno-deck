import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const cliRoot = path.resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    host: '127.0.0.1',
    strictPort: false,
    cors: true,
    fs: {
      // Allow Vite to statically read addon frontend modules that live
      // outside the frontend root (packages/cli/src/builtin-addons/...).
      allow: [cliRoot],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});