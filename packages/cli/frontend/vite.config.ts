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

// Map `sireno-addon:<name>` to the addon's absolute frontend path so the
// React app can do `import('sireno-addon:date-time')` and Vite resolves
// it via its normal module pipeline (which works for in-root files but
// fails on /@fs/ or absolute paths in dynamic import()).
const addonAlias: Record<string, string> = {};
for (const entry of addonFrontendEntries) {
  const match = /builtin-addons\/([^/]+)\//.exec(entry);
  if (match) {
    addonAlias[`sireno-addon:${match[1]}`] = entry;
  }
}

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
      ...addonAlias,
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});