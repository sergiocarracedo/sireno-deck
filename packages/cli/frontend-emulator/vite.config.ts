import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const frontendSrc = path.resolve(__dirname, '../frontend/src');

function injectSirenoConfig(): Plugin {
  return {
    name: 'sireno:inject-config',
    transformIndexHtml() {
      const deckUrl = process.env.SIRENO_DECK_URL ?? '';
      const wsUrl = process.env.SIRENO_WS_URL ?? '';
      const keyCount = process.env.SIRENO_KEY_COUNT ?? '15';
      const payload = JSON.stringify({ deckUrl, wsUrl, keyCount: Number(keyCount) });
      return [
        {
          tag: 'script',
          injectTo: 'head',
          children: `window.__SIRENO__ = ${payload};`,
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), injectSirenoConfig()],
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
