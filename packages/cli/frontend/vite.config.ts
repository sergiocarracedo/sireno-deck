import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const addonFrontendEntries = (() => {
  const raw = process.env.SIRENO_ADDON_FRONTENDS;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((p) => typeof p === 'string')
      : [];
  } catch {
    return [];
  }
})();

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
      // Allow Vite to read addon/theme runtime files outside the
      // frontend root (e.g. packages/cli/src/builtin-addons/.../frontend.tsx
      // referenced by absolute path from the CLI's WS bridge payload).
      allow: [cliRoot, repoRoot],
    },
  },
  optimizeDeps: {
    // Pre-bundle addon frontend modules so dynamic import() from the
    // React app goes through Vite's optimized deps cache instead of the
    // import-analysis plugin (which 500s on files outside the root).
    include: addonFrontendEntries,
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