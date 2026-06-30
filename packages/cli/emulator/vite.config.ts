import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { sirenoDeck2 } from '../src/vite/index'

const wsUrl = process.env['SIRENO_WS_URL'] ?? 'ws://127.0.0.1:52937'
const frontendUrl =
  process.env['SIRENO_FRONTEND_URL'] ?? 'http://127.0.0.1:5173'

const parseThemeFromEnv = ():
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

const defaultTheme = {
  name: 'default',
  cssPath: resolve(__dirname, '../src/themes/default/theme.generated.css'),
  frontendPath: resolve(__dirname, '../src/themes/default/index'),
  manifestPath: resolve(__dirname, '../src/themes/default/sirenodeck.json'),
  assetsStyles: [
    resolve(__dirname, '../src/themes/default/tokens.css'),
    resolve(__dirname, '../src/themes/default/components.css'),
  ] as ReadonlyArray<string>,
}

const theme = parseThemeFromEnv() ?? defaultTheme

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

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sirenoDeck2({
      token: process.env['SIRENO_TOKEN'] ?? '',
      theme,
      ...(addonsFromEnv() !== undefined ? { addons: addonsFromEnv()! } : {}),
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^@sireno-deck\/cli$/,
        replacement: resolve(__dirname, '../src/index'),
      },
      { find: /^@\//, replacement: resolve(__dirname, '../src') + '/' },
    ],
  },
  define: {
    'import.meta.env.VITE_WS_URL': JSON.stringify(wsUrl),
    'import.meta.env.VITE_FRONTEND_URL': JSON.stringify(frontendUrl),
  },
  server: {
    port: Number(process.env.SIRENO_EMULATOR_PORT ?? 52938),
    strictPort: false,
    host: '127.0.0.1',
  },
  assetsInclude: ['**/*.html'],
})
