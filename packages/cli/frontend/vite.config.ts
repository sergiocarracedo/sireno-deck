import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sirenoDeck2 } from '../src/vite/index'

const __dirname = dirname(fileURLToPath(import.meta.url))

const wsUrl = process.env['SIRENO_WS_URL'] ?? 'ws://127.0.0.1:52937'

const addonsFromEnv = () => {
  const blob = process.env['SIRENO_ADDONS']
  if (blob === undefined || blob.length === 0) return undefined
  try {
    return JSON.parse(blob) as Array<{
      name: string
      frontend?: { main: string; styles?: string[] }
      buttons?: Array<{ type: string }>
      buttonTypes?: Record<string, string>
    }>
  } catch {
    return undefined
  }
}

const themeFromEnv = ():
  | { name: string; cssPath: string; frontendPath: string; manifestPath: string; assetsStyles: ReadonlyArray<string> }
  | undefined => {
  const blob = process.env['SIRENO_THEME']
  if (blob === undefined || blob.length === 0) return undefined
  try {
    const parsed = JSON.parse(blob) as {
      name?: unknown
      cssPath?: unknown
      frontendPath?: unknown
      manifestPath?: unknown
      assetsStyles?: unknown
    }
    if (
      typeof parsed.name === 'string' &&
      typeof parsed.cssPath === 'string' &&
      typeof parsed.frontendPath === 'string' &&
      typeof parsed.manifestPath === 'string' &&
      Array.isArray(parsed.assetsStyles)
    ) {
      return {
        name: parsed.name,
        cssPath: parsed.cssPath,
        frontendPath: parsed.frontendPath,
        manifestPath: parsed.manifestPath,
        assetsStyles: parsed.assetsStyles as ReadonlyArray<string>,
      }
    }
  } catch {
    /* ignore */
  }
  return undefined
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sirenoDeck2({
      token: process.env['SIRENO_TOKEN'] ?? '',
      ...(themeFromEnv() ? { theme: themeFromEnv()! } : {}),
      ...(addonsFromEnv() !== undefined ? { addons: addonsFromEnv()! } : {}),
    }),
  ],
  server: { host: '127.0.0.1', port: 5180, strictPort: true },
  resolve: {
    alias: [
      { find: /^@\//, replacement: resolve(__dirname, '../src') + '/' },
      {
        find: /^@sireno-deck\/cli$/,
        replacement: resolve(__dirname, '../src/index'),
      },
      {
        find: /^sireno-deck\/react$/,
        replacement: resolve(__dirname, '../src/api/react/index'),
      },
    ],
  },
  define: {
    'import.meta.env.VITE_WS_URL': JSON.stringify(wsUrl),
  },
  assetsInclude: ['**/*.html'],
})
