import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const cliRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    host: '127.0.0.1',
    strictPort: false,
    cors: true,
    fs: {
      // Allow serving addon/theme runtime files that live outside the
      // frontend root (e.g. packages/cli/src/builtin-addons/.../frontend.tsx
      // is referenced by absolute path from the CLI's WS bridge payload).
      allow: [cliRoot, repoRoot],
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