import { watch } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo } from 'node:net'
import { basename, dirname, extname, join, resolve as pathResolve } from 'node:path'

import type pino from 'pino'

import {
  resolveTheme,
  rewriteThemeStylesheetAssetUrls,
  type Theme,
} from '@/config/theme'
import { setDomAssetPathResolver } from '@/addon/api'
import { loadConfiguredAddons } from '@/addon/loader'
import { AddonManifestError } from '@/addon/manifest'
import type { AddonRegistry } from '@/addon/registry'
import {
  createBundledAddonRegistry,
  loadBootstrapConfig,
  loadConfigWithSources,
} from '@/config/loader'
import { ConfigValidationError } from '@/core/schemas'
import type { RuntimeRenderButton } from '@/deck/runtime'
import { createDeckRuntime } from '@/deck/runtime'
import { formatLinuxUdevAccessError } from '@/device/linux-udev'
import {
  createStreamDeckLifecycle,
  createVirtualStreamDeckLifecycle,
  replayLastRenderedBuffers,
  StreamDeckSelectionError,
  writeKeyBuffer,
} from '@/device/stream-deck'
import {
  createBrowserRenderer,
  getVirtualDeckDevices,
} from '@/render/browser-renderer'
import { renderDomDeck } from '@/render/dom-host'
import { getShrinkFitBrowserScript } from '@/render/shrink-fit-browser-script'
import { createStartupPlaceholderBuffers } from '@/render/startup-placeholder'
import { spawnFrontendServer, type FrontendServerHandle } from '@/render/frontend-server'
import { createWsBridge, type WsBridgeHandle } from '@/render/ws-bridge'
import {
  PROTOCOL_VERSION,
  type DeckConfigMessage,
  type ButtonActionMessage,
  type Message,
} from '@/render/protocol'

import { getActiveAppProvider } from '@/system/active-app'
import { resolveHostContext } from '@/system/host-context'
import { createSessionMonitor } from '@/system/session-monitor'
import {
  isRunning,
  readPid,
  removePidFile,
  setupSignalHandlers,
  writePid,
} from '@/util/daemon'
import { formatConfigError } from '@/util/errors'
import { ensureChromium } from '@/util/chromium-detect'

import type { BrowserRenderer } from '@/render/browser-renderer'
import type { BrowserRendererFrame, BrowserRendererFrameHandler } from '@/render/browser-renderer'

export interface StartOptions {
  config?: string
  logger: pino.Logger
  skipBrowserInstall?: boolean
}

export interface EmulatorStartOptions extends StartOptions {
  keyCount?: number
  port?: number
}

export interface EmulatorSession {
  close: () => Promise<void>
  port: number
  url: string
}

interface EmulatorSurfaceState {
  activeDeckId: string
  availableDevices: Array<{ keyCount: number; label: string }>
  error: { code: string; detail: string } | null
  html: string
  requestedKeyCount: number
  selectedKeyCount: number
  status: 'error' | 'ready' | 'restarting' | 'starting'
  updatedAt: string | null
  version: number
}

interface EmulatorManagedSession {
  close: () => Promise<void>
  lifecycle: ReturnType<typeof createVirtualStreamDeckLifecycle>
  runtime: ReturnType<typeof createDeckRuntime>
}

const CONFIG_RELOAD_DEBOUNCE_MS = 75

export async function loadRuntimeConfig(options: StartOptions) {
  const sessionMonitor = await createSessionMonitor()

  try {
    const hostContext = await resolveHostContext(
      undefined,
      sessionMonitor.getSnapshot(),
    )
    const bootstrap = loadBootstrapConfig(options.config, hostContext)
    const registry = createBundledAddonRegistry()
    const addonLoadResult = await loadConfiguredAddons({
      addons: bootstrap.config.addons,
      cwd: bootstrap.cwd,
      registry,
    })

    for (const warning of addonLoadResult.warnings) {
      options.logger.warn(
        { addonName: warning.addonName, reason: warning.reason },
        'skipping addon after startup warning',
      )
    }

    if (sessionMonitor.getSnapshot().capability === 'unsupported') {
      options.logger.warn(
        { platform: process.platform },
        'session lock monitoring unavailable on this host; continuing without lock-aware deck switching',
      )
    }

    const loadedConfig = loadConfigWithSources(
      bootstrap.filePath,
      registry,
      hostContext,
    )
    const theme = await resolveTheme(loadedConfig.config.theme, {
      baseDirectory: dirname(loadedConfig.filePath),
    })
    const filePaths = Array.from(
      new Set([...loadedConfig.filePaths, ...theme.filePaths]),
    )

    return {
      config: loadedConfig.config,
      configDirectory: dirname(loadedConfig.filePath),
      cwd: bootstrap.cwd,
      filePaths,
      hostContext,
      registry,
      sessionMonitor,
      theme,
    }
  } catch (error) {
    await sessionMonitor.stop()
    throw error
  }
}

export function watchConfigFiles(
  filePaths: readonly string[],
  onChange: () => void,
): () => void {
  const uniqueFilePaths = Array.from(new Set(filePaths))
  const watchers = uniqueFilePaths.map((filePath) =>
    watch(filePath, { persistent: false }, () => {
      scheduleReload()
    }),
  )
  let reloadTimer: NodeJS.Timeout | undefined

  function scheduleReload(): void {
    if (reloadTimer) {
      clearTimeout(reloadTimer)
    }

    reloadTimer = setTimeout(() => {
      reloadTimer = undefined
      onChange()
    }, CONFIG_RELOAD_DEBOUNCE_MS)
  }

  return () => {
    if (reloadTimer) {
      clearTimeout(reloadTimer)
      reloadTimer = undefined
    }

    for (const watcher of watchers) {
      watcher.close()
    }
  }
}

const ADDON_RELOAD_DEBOUNCE_MS = 100

export function watchAddonSources(
  rootDirs: readonly string[],
  runtime: NonNullable<ReturnType<typeof createDeckRuntime>>,
  registry: AddonRegistry,
  onStylesheetChange: () => void,
): () => void {
  let addonReloadTimer: NodeJS.Timeout | undefined

  function scheduleAddonReload(): void {
    if (addonReloadTimer) {
      clearTimeout(addonReloadTimer)
    }

    addonReloadTimer = setTimeout(() => {
      addonReloadTimer = undefined
      runtime.updateAddonRegistry(registry)
    }, ADDON_RELOAD_DEBOUNCE_MS)
  }

  const watchers = rootDirs.map((rootDir) =>
    watch(rootDir, { persistent: false, recursive: true }, (event, filename) => {
      if (filename && /\.(css)$/i.test(filename)) {
        onStylesheetChange()
        return
      }
      scheduleAddonReload()
    }),
  )

  return () => {
    if (addonReloadTimer) {
      clearTimeout(addonReloadTimer)
      addonReloadTimer = undefined
    }
    for (const watcher of watchers) {
      watcher.close()
    }
  }
}

export async function restoreReloadNavigation(
  runtime: ReturnType<typeof createDeckRuntime>,
  previousStack: readonly string[],
  previousActiveDeckId: string,
  mainDeckId: string,
): Promise<void> {
  const candidateStacks: string[][] = []

  if (previousStack.length > 0) {
    candidateStacks.push([...previousStack])
  }

  candidateStacks.push([previousActiveDeckId])

  if (previousActiveDeckId !== mainDeckId) {
    candidateStacks.push([mainDeckId])
  }

  for (const candidateStack of candidateStacks) {
    try {
      await runtime.restoreStack(candidateStack)
      return
    } catch {
      continue
    }
  }
}

export function createTemporaryConfigErrorLines(
  error: ConfigValidationError,
): string[] {
  const location = error.filePath
    ? `${basename(error.filePath)}${error.lineNumber !== undefined ? `:${error.lineNumber}` : ''}`
    : 'config.yml'

  return [
    location,
    error.message,
    error.suggestion ?? 'Fix the config and save again.',
  ]
}

export function isDomRenderButton(
  button: RuntimeRenderButton,
): button is RuntimeRenderButton & {
  content: NonNullable<RuntimeRenderButton['content']>
} {
  return button.content !== undefined
}

function createDeckHtml(
  keyCount: number,
  deckButtons: Array<
    RuntimeRenderButton & {
      content: NonNullable<RuntimeRenderButton['content']>
    }
  >,
  theme?: Theme,
  inlineWarning?: {
    detail: string
    title: string
  },
  emulatorMode = false,
): string {
  return renderDomDeck(
    deckButtons.map((button) => ({
      content: button.content,
      ...(button.frame_state !== undefined
        ? { frame_state: button.frame_state }
        : {}),
      ...(button.full !== undefined
        ? { full: button.full }
        : {}),
      keyIndex: button.keyIndex,
      ...(button.sample_interval_ms !== undefined
        ? { sample_interval_ms: button.sample_interval_ms }
        : {}),
    })),
    {
      emulatorMode,
      inlineWarning,
      keyCount,
      theme,
    },
  )
}

export async function ensureBrowserRenderer(
  browserRenderer: BrowserRenderer | null,
  keyCount: number,
  options: {
    frameHandler?: BrowserRendererFrameHandler
    liveHardwareMode?: boolean
  } = {},
): Promise<BrowserRenderer> {
  if (browserRenderer?.keyCount === keyCount) {
    if (options.frameHandler) browserRenderer.setFrameHandler(options.frameHandler)
    return browserRenderer
  }

  if (browserRenderer) {
    await browserRenderer.close().catch(() => {})
  }

  const nextBrowserRenderer = createBrowserRenderer({
    ...(options.frameHandler ? { frameHandler: options.frameHandler } : {}),
    keyCount,
    ...(options.liveHardwareMode ? { liveHardwareMode: true } : {}),
  })
  if (options.frameHandler) nextBrowserRenderer.setFrameHandler(options.frameHandler)
  try {
    await nextBrowserRenderer.start()
    return nextBrowserRenderer
  } catch (error) {
    await nextBrowserRenderer.close().catch(() => {})
    throw error
  }
}

async function renderDomDeckSurface(
  connection: NonNullable<
    ReturnType<ReturnType<typeof createStreamDeckLifecycle>['getConnection']>
  >,
  deckButtons: Array<
    RuntimeRenderButton & {
      content: NonNullable<RuntimeRenderButton['content']>
    }
  >,
  browserRenderer: BrowserRenderer,
  logger: pino.Logger,
  theme?: Theme,
): Promise<void> {
  await browserRenderer.updateDeck(
    createDeckHtml(
      connection.info.keyCount,
      deckButtons,
      theme,
      undefined,
      false,
    ),
  )

  const buffersByKey = await browserRenderer.captureKeyBuffers()
  for (const [keyIndex, buffer] of buffersByKey.entries()) {
    await writeKeyBuffer(connection, keyIndex, buffer)
  }

  const minKey = buffersByKey.size === 0 ? 0 : Math.min(...buffersByKey.keys())
  const maxKey = buffersByKey.size === 0 ? 0 : Math.max(...buffersByKey.keys())

  logger.debug(
    `rendered browser-backed main deck (${buffersByKey.size} keys: ${minKey}-${maxKey})`,
  )
}

async function writeBrowserRendererFrame(
  connection: NonNullable<
    ReturnType<ReturnType<typeof createStreamDeckLifecycle>['getConnection']>
  >,
  frame: BrowserRendererFrame,
): Promise<void> {
  for (const [keyIndex, buffer] of frame.buffers.entries()) {
    await writeKeyBuffer(connection, keyIndex, buffer)
  }
}

async function writePlaceholderDeckSurface(
  connection: NonNullable<
    ReturnType<ReturnType<typeof createStreamDeckLifecycle>['getConnection']>
  >,
): Promise<void> {
  const buffersByKey = await createStartupPlaceholderBuffers(
    connection.info.keyCount,
  )

  for (const [keyIndex, buffer] of buffersByKey.entries()) {
    await writeKeyBuffer(connection, keyIndex, buffer)
  }
}

export interface ViteDeckRenderer {
  frontend: FrontendServerHandle
  wsBridge: WsBridgeHandle
  browser: BrowserRenderer
  pageUrl: string
  captureKeyBuffers: () => Promise<Map<number, Buffer>>
  sendDeckConfig: (deckConfig: Omit<DeckConfigMessage, 'protocolVersion' | 'type'>) => void
  onButtonAction: (handler: (msg: ButtonActionMessage) => void) => () => void
  close: () => Promise<void>
}

export async function startViteDeckRenderer(opts: {
  logger: pino.Logger
  skipBrowserInstall?: boolean
  keyCount: number
}): Promise<ViteDeckRenderer> {
  if (opts.skipBrowserInstall) {
    process.env.SIRENO_SKIP_BROWSER_INSTALL = '1'
  }
  const frontend = await spawnFrontendServer({ logger: opts.logger })
  const wsBridge = await createWsBridge({ logger: opts.logger })
  const wsUrl = `ws://127.0.0.1:${wsBridge.port}`
  const pageUrl = `${frontend.url}?ws=${encodeURIComponent(wsUrl)}`
  opts.logger.info({ wsUrl, pageUrl }, 'WS bridge ready')

  let cachedDeckConfig: DeckConfigMessage | null = null
  wsBridge.onConnection((connected) => {
    if (connected && cachedDeckConfig) {
      opts.logger.debug(
        'renderer connected; broadcasting cached deck-config',
      )
      wsBridge.broadcast(cachedDeckConfig)
    }
  })

  const browser = createBrowserRenderer({
    keyCount: opts.keyCount,
    liveHardwareMode: true,
  })
  await browser.start()
  await browser.gotoUrl(pageUrl)
  return {
    frontend,
    wsBridge,
    browser,
    pageUrl,
    captureKeyBuffers: () => browser.captureKeyBuffers(),
    sendDeckConfig: (deckConfig) => {
      cachedDeckConfig = {
        protocolVersion: PROTOCOL_VERSION,
        type: 'deck-config',
        ...deckConfig,
      }
      const sent = wsBridge.send(cachedDeckConfig)
      if (!sent) {
        opts.logger.debug(
          'no WS client connected; cached deck-config will be sent on connect',
        )
      }
    },
    onButtonAction: (handler) => {
      return wsBridge.onMessage((msg: Message) => {
        if (msg.type === 'button-action') handler(msg)
      })
    },
    close: async () => {
      await browser.close().catch(() => {})
      await wsBridge.close().catch(() => {})
      await frontend.close().catch(() => {})
    },
  }
}

export async function renderRuntimeDeckSurface(
  connection: NonNullable<
    ReturnType<ReturnType<typeof createStreamDeckLifecycle>['getConnection']>
  >,
  buttons: RuntimeRenderButton[],
  browserRenderer: BrowserRenderer,
  logger: pino.Logger,
  theme?: Theme,
): Promise<void> {
  if (buttons.length > 0 && !buttons.every(isDomRenderButton)) {
    throw new Error(
      'Runtime deck rendering must provide DOM-backed button content',
    )
  }

  await renderDomDeckSurface(
    connection,
    buttons.filter(isDomRenderButton),
    browserRenderer,
    logger,
    theme,
  )
}

function renderEmulatorShellHtml(): string {
  const shrinkFitScript = getShrinkFitBrowserScript()

  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Sireno Deck Emulator</title>',
    '<style>',
    ":root{color-scheme:dark;font-family:'IBM Plex Sans', 'Aptos', sans-serif;background:#121418;color:#eef2f7}",
    'body{margin:0;min-height:100vh;background:radial-gradient(circle at top,#1f2530 0,#121418 55%);color:inherit}',
    '.shell{display:grid;gap:24px;grid-template-columns:minmax(280px,360px) minmax(320px,1fr);padding:24px}',
    '.panel{background:rgba(11,15,21,.84);border:1px solid rgba(125,211,252,.18);border-radius:18px;box-shadow:0 18px 40px rgba(0,0,0,.28);padding:20px}',
    ".eyebrow{color:#7dd3fc;font-family:'IBM Plex Mono','Cascadia Code',monospace;font-size:12px;letter-spacing:.18em;text-transform:uppercase}",
    'h1{font-size:32px;line-height:1.05;margin:10px 0 12px}',
    'p{color:#b7c0cf;line-height:1.5;margin:0 0 18px}',
    '.stats{display:grid;gap:10px}',
    '.stat{align-items:center;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;padding-top:10px}',
    ".label{color:#8b97aa;font-family:'IBM Plex Mono','Cascadia Code',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase}",
    '.value{font-size:14px;font-weight:600;text-align:right}',
    '.viewport{display:grid;place-items:center;min-height:70vh}',
    '.deck-shell{align-items:center;background:#05070a;border:1px solid rgba(255,255,255,.08);border-radius:28px;box-shadow:0 26px 50px rgba(0,0,0,.36);display:grid;justify-items:center;min-height:min(80vh,720px);padding:24px;width:100%}',
    '#deck-mount{display:contents}',
    '@media (max-width: 900px){.shell{grid-template-columns:1fr;padding:16px}.viewport{min-height:auto}.deck-shell{min-height:70vh;padding:16px}}',
    '</style></head><body>',
    '<main class="shell">',
    '<section class="panel">',
    '<div class="eyebrow">Local Emulator</div>',
    '<h1>Browser Deck Emulator</h1>',
    '<p>The iframe below renders the current deck through the same browser HTML path used by the runtime. This first slice is intentionally local, single-user, and hardware-free.</p>',
    '<div class="stats">',
    '<div class="stat"><span class="label">Mode</span><span class="value" id="mode">emulator</span></div>',
    '<div class="stat"><span class="label">Device</span><span class="value" id="device">starting</span></div>',
    '<div class="stat"><span class="label">Active Deck</span><span class="value" id="deck">starting</span></div>',
    '<div class="stat"><span class="label">Render Status</span><span class="value" id="status">starting</span></div>',
    '<div class="stat"><span class="label">Emulator Error</span><span class="value" id="error">none</span></div>',
    '<div class="stat"><span class="label">Render Version</span><span class="value" id="version">0</span></div>',
    '<label class="label" for="device-select" style="display:block;margin-top:20px">Virtual Device</label>',
    '<select id="device-select" style="background:#171c24;border:1px solid rgba(255,255,255,.12);border-radius:12px;color:#eef2f7;font:inherit;margin-top:8px;padding:10px 12px;width:100%"></select>',
    '</div>',
    '</section>',
    '<section class="viewport"><div class="deck-shell"><div id="deck-mount">Waiting for first render...</div></div></section>',
    '</main>',
    '<script>',
    "const mount = document.getElementById('deck-mount');",
    "const device = document.getElementById('device');",
    "const deck = document.getElementById('deck');",
    "const error = document.getElementById('error');",
    "const status = document.getElementById('status');",
    "const deviceSelect = document.getElementById('device-select');",
    "const version = document.getElementById('version');",
    'let currentVersion = -1;',
    shrinkFitScript,
    'function attachDeckInteractions(){',
    "  mount.querySelectorAll('[data-sireno-key]').forEach((element) => {",
    "    const keyIndex = Number(element.getAttribute('data-sireno-key'));",
    '    if (Number.isNaN(keyIndex)) { return; }',
    "    element.onmousedown = async () => { await fetch(`/__sireno/input`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keyIndex, type: 'down' }) }); };",
    "    element.onmouseup = async () => { await fetch(`/__sireno/input`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keyIndex, type: 'up' }) }); };",
    "    element.onmouseleave = async (event) => { if (event.buttons === 1) { await fetch(`/__sireno/input`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keyIndex, type: 'up' }) }); } };",
    '  });',
    '}',
    'function patchThemeStyles(nextDocument){',
    "  ['data-sireno-tailwind','data-sireno-runtime','data-sireno-theme-assets'].forEach((attributeName) => {",
    '    const selector = `style[${attributeName}="true"]`;',
    '    const currentStyle = document.head.querySelector(selector);',
    '    const nextStyle = nextDocument.head.querySelector(selector);',
    '    if (!nextStyle) { currentStyle?.remove(); return; }',
    '    if (!currentStyle) { document.head.appendChild(nextStyle.cloneNode(true)); return; }',
    '    if (currentStyle.textContent !== nextStyle.textContent) { currentStyle.textContent = nextStyle.textContent; }',
    '  });',
    '}',
    'function patchDeckRoot(nextDeckRoot){',
    "  if (!nextDeckRoot) { mount.textContent = 'Waiting for first render...'; return; }",
    "  const currentDeckRoot = mount.querySelector('#deck-root');",
    '  if (!currentDeckRoot) { mount.replaceChildren(nextDeckRoot); attachDeckInteractions(); window.__sirenoApplyShrinkFit?.(mount); return; }',
    '  Array.from(currentDeckRoot.getAttributeNames()).forEach((name) => { if (!nextDeckRoot.hasAttribute(name)) { currentDeckRoot.removeAttribute(name); } });',
    "  Array.from(nextDeckRoot.getAttributeNames()).forEach((name) => { currentDeckRoot.setAttribute(name, nextDeckRoot.getAttribute(name) ?? ''); });",
    '  const currentChildren = Array.from(currentDeckRoot.children);',
    '  const nextChildren = Array.from(nextDeckRoot.children);',
    '  nextChildren.forEach((nextChild, index) => {',
    '    const currentChild = currentChildren[index];',
    '    if (!currentChild) { currentDeckRoot.appendChild(nextChild); return; }',
    "    const currentKey = currentChild.getAttribute('data-sireno-key');",
    "    const nextKey = nextChild.getAttribute('data-sireno-key');",
    '    const canPatchKey = currentKey !== null && currentKey === nextKey;',
    '    if (canPatchKey && currentChild.outerHTML === nextChild.outerHTML) { return; }',
    '    if (!canPatchKey && currentChild.outerHTML === nextChild.outerHTML) { return; }',
    '    currentChild.replaceWith(nextChild);',
    '  });',
    '  currentChildren.slice(nextChildren.length).forEach((staleChild) => { staleChild.remove(); });',
    '  attachDeckInteractions();',
    '  window.__sirenoApplyShrinkFit?.(mount);',
    '}',
    'async function refresh(){',
    "  const response = await fetch('/__sireno/state', { cache: 'no-store' });",
    '  const state = await response.json();',
    '  device.textContent = state.device;',
    '  deck.textContent = state.activeDeckId;',
    "  error.textContent = state.error ? state.error.detail : 'none';",
    '  status.textContent = state.status;',
    '  version.textContent = String(state.version);',
    "  deviceSelect.innerHTML = '';",
    '  state.availableDevices.forEach((entry) => {',
    "    const option = document.createElement('option');",
    '    option.value = String(entry.keyCount);',
    '    option.textContent = entry.label;',
    '    option.selected = entry.keyCount === state.selectedKeyCount;',
    '    deviceSelect.appendChild(option);',
    '  });',
    '  if (state.version > 0 && state.version !== currentVersion) {',
    '    currentVersion = state.version;',
    "    const deckResponse = await fetch(`/__sireno/deck?v=${state.version}`, { cache: 'no-store' });",
    '    const deckHtml = await deckResponse.text();',
    "    const nextDocument = new DOMParser().parseFromString(deckHtml, 'text/html');",
    '    patchThemeStyles(nextDocument);',
    "    patchDeckRoot(nextDocument.querySelector('#deck-root'));",
    '  }',
    '}',
    'deviceSelect.onchange = async () => {',
    "  await fetch('/__sireno/device', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ keyCount: Number(deviceSelect.value) }) });",
    '  currentVersion = -1;',
    '};',
    'refresh().catch((error) => { status.textContent = String(error); });',
    'setInterval(() => { void refresh().catch((error) => { status.textContent = String(error); }); }, 500);',
    '</script></body></html>',
  ].join('')
}

function createEmulatorFileAssetUrl(filePath: string): string {
  return `/__sireno/assets?path=${encodeURIComponent(filePath)}`
}

function rewriteEmulatorDeckHtml(html: string): string {
  return html.replace(
    /<style data-sireno-theme-assets="true">([\s\S]*?)<\/style>/,
    (_match, cssText: string) =>
      `<style data-sireno-theme-assets="true">${rewriteThemeStylesheetAssetUrls(cssText, createEmulatorFileAssetUrl)}</style>`,
  )
}

function writeHttpResponse(
  response: ServerResponse,
  statusCode: number,
  body: string,
  contentType: string,
): void {
  response.statusCode = statusCode
  response.setHeader('content-type', contentType)
  response.end(body)
}

function getAssetContentType(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case '.avif':
      return 'image/avif'
    case '.gif':
      return 'image/gif'
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.svg':
      return 'image/svg+xml'
    case '.ttf':
      return 'font/ttf'
    case '.otf':
      return 'font/otf'
    case '.webp':
      return 'image/webp'
    case '.woff':
      return 'font/woff'
    case '.woff2':
      return 'font/woff2'
    default:
      return 'application/octet-stream'
  }
}

function createEmulatorAssetUrl(
  baseUrl: string,
  assetReference: string,
): string {
  return `${baseUrl}/__sireno/assets?ref=${encodeURIComponent(assetReference)}`
}

function createEmulatorServer(options: {
  restartWithKeyCount: (keyCount: number) => Promise<void>
  emitKeyEvent: (event: { keyIndex: number; type: 'down' | 'up' }) => void
  themeAssetPaths: ReadonlySet<string>
  resolveAssetPath: (assetReference: string) => string | undefined
  surfaceState: EmulatorSurfaceState
}): Server {
  return createServer((request: IncomingMessage, response: ServerResponse) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')

    if (url.pathname === '/' || url.pathname === '/index.html') {
      writeHttpResponse(
        response,
        200,
        renderEmulatorShellHtml(),
        'text/html; charset=utf-8',
      )
      return
    }

    if (url.pathname === '/__sireno/deck') {
      writeHttpResponse(
        response,
        options.surfaceState.version > 0 ? 200 : 503,
        options.surfaceState.version > 0
          ? rewriteEmulatorDeckHtml(options.surfaceState.html)
          : '<div style="color:#eef2f7;font-family:sans-serif;display:grid;place-items:center;min-height:240px;">Waiting for first render...</div>',
        'text/html; charset=utf-8',
      )
      return
    }

    if (url.pathname === '/__sireno/assets') {
      const assetReference = url.searchParams.get('ref')
      const assetPathFromQuery = url.searchParams.get('path')
      const assetPath = assetReference
        ? options.resolveAssetPath(assetReference)
        : assetPathFromQuery && options.themeAssetPaths.has(assetPathFromQuery)
          ? assetPathFromQuery
          : undefined

      if (!assetPath) {
        writeHttpResponse(
          response,
          404,
          'Asset not found',
          'text/plain; charset=utf-8',
        )
        return
      }

      void readFile(assetPath)
        .then((buffer) => {
          response.statusCode = 200
          response.setHeader('content-type', getAssetContentType(assetPath))
          response.end(buffer)
        })
        .catch(() => {
          writeHttpResponse(
            response,
            404,
            'Asset not found',
            'text/plain; charset=utf-8',
          )
        })
      return
    }

    if (url.pathname === '/__sireno/input' && request.method === 'POST') {
      const chunks: Buffer[] = []
      request.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      request.on('end', () => {
        try {
          const payload = JSON.parse(
            Buffer.concat(chunks).toString('utf8'),
          ) as { keyIndex?: number; type?: 'down' | 'up' }
          if (
            typeof payload.keyIndex !== 'number' ||
            (payload.type !== 'down' && payload.type !== 'up')
          ) {
            writeHttpResponse(
              response,
              400,
              'Invalid input event',
              'text/plain; charset=utf-8',
            )
            return
          }

          options.emitKeyEvent({
            keyIndex: payload.keyIndex,
            type: payload.type,
          })
          writeHttpResponse(response, 204, '', 'text/plain; charset=utf-8')
        } catch {
          writeHttpResponse(
            response,
            400,
            'Invalid input event',
            'text/plain; charset=utf-8',
          )
        }
      })
      return
    }

    if (url.pathname === '/__sireno/device' && request.method === 'POST') {
      const chunks: Buffer[] = []
      request.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      })
      request.on('end', () => {
        try {
          const payload = JSON.parse(
            Buffer.concat(chunks).toString('utf8'),
          ) as { keyCount?: number }
          if (typeof payload.keyCount !== 'number') {
            writeHttpResponse(
              response,
              400,
              'Invalid device request',
              'text/plain; charset=utf-8',
            )
            return
          }

          void options.restartWithKeyCount(payload.keyCount)
          writeHttpResponse(response, 202, '', 'text/plain; charset=utf-8')
        } catch {
          writeHttpResponse(
            response,
            400,
            'Invalid device request',
            'text/plain; charset=utf-8',
          )
        }
      })
      return
    }

    if (url.pathname === '/__sireno/state') {
      writeHttpResponse(
        response,
        200,
        JSON.stringify({
          activeDeckId: options.surfaceState.activeDeckId,
          availableDevices: options.surfaceState.availableDevices,
          device:
            options.surfaceState.availableDevices.find(
              (entry) =>
                entry.keyCount === options.surfaceState.selectedKeyCount,
            )?.label ??
            `Virtual Stream Deck ${options.surfaceState.selectedKeyCount}`,
          error: options.surfaceState.error,
          selectedKeyCount: options.surfaceState.selectedKeyCount,
          status: options.surfaceState.status,
          updatedAt: options.surfaceState.updatedAt,
          version: options.surfaceState.version,
        }),
        'application/json; charset=utf-8',
      )
      return
    }

    writeHttpResponse(response, 404, 'Not Found', 'text/plain; charset=utf-8')
  })
}

async function listenServer(server: Server, port: number): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address() as AddressInfo | null
  if (!address) {
    throw new Error('Failed to resolve emulator server address')
  }

  return address.port
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

export async function startEmulatorSession(
  options: EmulatorStartOptions,
): Promise<EmulatorSession> {
  const loadedConfig = await loadRuntimeConfig(options)
  const requestedKeyCount = options.keyCount ?? 15
  const availableDevices = getVirtualDeckDevices()
  const surfaceState: EmulatorSurfaceState = {
    activeDeckId: loadedConfig.config.main_deck,
    availableDevices,
    error: null,
    html: '',
    requestedKeyCount,
    selectedKeyCount: requestedKeyCount,
    status: 'starting',
    updatedAt: null,
    version: 0,
  }
  let browserRenderer: BrowserRenderer | null = null
  let managedSession: EmulatorManagedSession | null = null

  async function closeManagedSession(): Promise<void> {
    if (!managedSession) {
      return
    }

    managedSession.runtime.stop()
    await managedSession.lifecycle.close().catch(() => {})
    managedSession = null
  }

  function getConfiguredDeckKeyRequirement(): number {
    return Math.max(
      0,
      ...Object.values(loadedConfig.config.decks).flatMap((deck) =>
        deck.buttons.map((button) => button.position + 1),
      ),
    )
  }

  async function startManagedSession(keyCount: number): Promise<void> {
    surfaceState.selectedKeyCount = keyCount
    surfaceState.status = surfaceState.version === 0 ? 'starting' : 'restarting'
    surfaceState.error = null

    await closeManagedSession()

    const requiredKeyCount = getConfiguredDeckKeyRequirement()
    if (keyCount < requiredKeyCount) {
      const mismatchDetail = `Selected virtual device exposes ${keyCount} keys but the configured deck needs ${requiredKeyCount}.`
      surfaceState.activeDeckId = loadedConfig.config.main_deck
      surfaceState.error = {
        code: 'emulator_layout_mismatch',
        detail: mismatchDetail,
      }
      surfaceState.html = createDeckHtml(
        keyCount,
        [],
        loadedConfig.theme,
        {
          detail: mismatchDetail,
          title: 'Layout mismatch',
        },
        true,
      )
      surfaceState.updatedAt = new Date().toISOString()
      surfaceState.version += 1
      surfaceState.status = 'ready'
      browserRenderer = await ensureBrowserRenderer(browserRenderer, keyCount)
      await browserRenderer.updateDeck(surfaceState.html)
      return
    }

    const lifecycle = createVirtualStreamDeckLifecycle({
      keyCount,
      model:
        availableDevices.find((entry) => entry.keyCount === keyCount)?.label ??
        `Virtual Stream Deck ${keyCount}`,
    })
    const connection = await lifecycle.start()
    browserRenderer = await ensureBrowserRenderer(
      browserRenderer,
      connection.info.keyCount,
    )
    const activeAppProvider = await getActiveAppProvider({
      logger: options.logger,
    })
    if (activeAppProvider.supportsActiveApp) {
      options.logger.info(
        { platform: process.platform },
        'active-app overlay enabled',
      )
    } else {
      options.logger.info(
        { platform: process.platform },
        'active-app overlay unsupported on this platform',
      )
    }
    const runtime = createDeckRuntime({
      activeAppProvider,
      addonRegistry: loadedConfig.registry,
      deck: loadedConfig.config.decks[loadedConfig.config.main_deck]!,
      decks: loadedConfig.config.decks,
      hostContext: loadedConfig.hostContext,
      keyCount: connection.info.keyCount,
      lockedDeckId: loadedConfig.config.session?.locked_deck,
      logger: options.logger,
      onRenderDeck: async (buttons) => {
        if (buttons.length > 0 && !buttons.every(isDomRenderButton)) {
          throw new Error(
            'Runtime deck rendering must provide DOM-backed button content',
          )
        }

        const html = createDeckHtml(
          connection.info.keyCount,
          buttons.filter(isDomRenderButton),
          loadedConfig.theme,
          undefined,
          true,
        )
        surfaceState.activeDeckId = runtime.getActiveDeck().id
        surfaceState.error = null
        surfaceState.html = html
        surfaceState.updatedAt = new Date().toISOString()
        surfaceState.version += 1
        surfaceState.status = 'ready'
        await browserRenderer.updateDeck(html)
      },
      sessionMonitor: loadedConfig.sessionMonitor,
      subscribeKeyEvents: lifecycle.subscribeKeyEvents,
      theme: loadedConfig.theme,
    })

    managedSession = { close: closeManagedSession, lifecycle, runtime }
    runtime.start()
  }

  const server = createEmulatorServer({
    emitKeyEvent: (event) => {
      managedSession?.lifecycle.emitKeyEvent(event)
    },
    restartWithKeyCount: async (keyCount) => {
      await startManagedSession(keyCount)
    },
    resolveAssetPath: (assetReference) =>
      loadedConfig.registry.resolveAssetPath(assetReference),
    surfaceState,
    themeAssetPaths: new Set(loadedConfig.theme.filePaths),
  })

  try {
    const port = await listenServer(server, options.port ?? 0)
    const url = `http://127.0.0.1:${port}`
    setDomAssetPathResolver((assetReference) =>
      loadedConfig.registry.resolveAssetPath(assetReference)
        ? createEmulatorAssetUrl(url, assetReference)
        : undefined,
    )
    await startManagedSession(requestedKeyCount)

    return {
      async close() {
        setDomAssetPathResolver()
        await closeManagedSession()
        await browserRenderer?.close().catch(() => {})
        await Promise.resolve(loadedConfig.sessionMonitor.stop()).catch(
          () => {},
        )
        await closeServer(server).catch(() => {})
      },
      port,
      url,
    }
  } catch (error) {
    setDomAssetPathResolver()
    await closeManagedSession()
    await browserRenderer?.close().catch(() => {})
    await Promise.resolve(loadedConfig.sessionMonitor.stop()).catch(() => {})
    await closeServer(server).catch(() => {})
    throw error
  }
}

export async function startEmulator(
  options: EmulatorStartOptions,
): Promise<void> {
  if (options.skipBrowserInstall) {
    process.env.SIRENO_SKIP_BROWSER_INSTALL = '1'
  }
  await ensureChromium()
  const session = await startEmulatorSession(options)
  let cleanupSignals = () => {}

  cleanupSignals = setupSignalHandlers(options.logger, async () => {
    await session.close()
  })

  options.logger.info({ url: session.url }, 'browser deck emulator started')
  options.logger.info('open the local emulator page in your browser')
  options.logger.info('press Ctrl+C to stop')

  try {
    await new Promise(() => {
      setInterval(() => {}, 1000)
    })
  } finally {
    cleanupSignals()
  }
}

export async function startDaemon(options: StartOptions): Promise<void> {
  const { logger, skipBrowserInstall } = options
  if (skipBrowserInstall) {
    process.env.SIRENO_SKIP_BROWSER_INSTALL = '1'
  }

  logger.info('booting Vite-served React frontend (Phase 75.1-02 WS bridge)')
  const viteRenderer = await startViteDeckRenderer({
    logger,
    skipBrowserInstall,
    keyCount: 15,
  })
  logger.info(
    {
      url: viteRenderer.frontend.url,
      wsUrl: `ws://127.0.0.1:${viteRenderer.wsBridge.port}`,
      keyCount: 15,
    },
    'Vite frontend + WS bridge ready; press Ctrl+C to exit',
  )

  const dateTimeFrontendAbsolute = pathResolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../src/builtin-addons/date-time/frontend.tsx',
  )
  viteRenderer.sendDeckConfig({
    deckId: 'placeholder-date-time',
    surfaces: {
      'key-0': {
        addonName: 'date-time',
        buttonType: 'date-time',
        frontendEntry: dateTimeFrontendAbsolute,
        config: { format: 'HH:mm' },
      },
    },
    navMode: 'push',
  })
  viteRenderer.onButtonAction((msg) => {
    logger.info(
      { keyIndex: msg.keyIndex, action: msg.action, at: msg.at },
      'button-action received via WS bridge',
    )
  })

  await new Promise<void>((resolve) => {
    process.once('SIGINT', () => resolve())
    process.once('SIGTERM', () => resolve())
  })
  await viteRenderer.close()
  return
  const existingPid = readPid()
  let cleanupSignals = () => {}
  let runtime: ReturnType<typeof createDeckRuntime> | null = null
  let sessionMonitor:
    | Awaited<ReturnType<typeof loadRuntimeConfig>>['sessionMonitor']
    | null = null
  let browserRenderer: BrowserRenderer | null = null
  let stopWatchingConfig = () => {}
  let stopWatchingAddons = () => {}
  let lifecycle: ReturnType<typeof createStreamDeckLifecycle> | null = null
  let connection: NonNullable<
    ReturnType<ReturnType<typeof createStreamDeckLifecycle>['getConnection']>
  > | null = null
  let startupPlaceholderPending = false

  if (existingPid !== null && isRunning(existingPid)) {
    logger.error({ pid: existingPid }, 'daemon already running')
    process.exitCode = 1
    return
  }

  if (existingPid !== null) {
    logger.warn(
      { pid: existingPid },
      'stale PID file found; removing it before start',
    )
    removePidFile()
  }

  try {
    const initialLoad = await loadRuntimeConfig(options)
    sessionMonitor = initialLoad.sessionMonitor
    let reloadInFlight = false
    let reloadQueued = false
    let resolveFirstRender: (() => void) | null = null
    let rejectFirstRender: ((error: unknown) => void) | null = null
    const firstRenderReady = new Promise<void>((resolve, reject) => {
      resolveFirstRender = resolve
      rejectFirstRender = reject
    })
    lifecycle = createStreamDeckLifecycle({
      logger,
      onReconnect: async (connection) => {
        if (!runtime) {
          await replayLastRenderedBuffers(connection)
          return
        }

        await runtime.activateCurrentDeck()
      },
      selector: { serial: initialLoad.config.device?.serial },
    })

    connection = await lifecycle.start()
    const activeLifecycle = lifecycle
    const activeConnection = connection
    const renderHardwareFrame: BrowserRendererFrameHandler = async (frame) => {
      const currentConnection = activeLifecycle.getConnection()
      if (!currentConnection) {
        return
      }

      try {
        await writeBrowserRendererFrame(currentConnection, frame)
      } catch (error) {
        logger.error({ error, reason: frame.reason }, "failed to deliver live hardware frame")
      }
    }
    startupPlaceholderPending = true
    await writePlaceholderDeckSurface(activeConnection)
    browserRenderer = await ensureBrowserRenderer(
      browserRenderer,
      activeConnection.info.keyCount,
      {
        frameHandler: renderHardwareFrame,
        liveHardwareMode: true,
      },
    )

    setDomAssetPathResolver((assetReference) =>
      initialLoad.registry.resolveAssetPath(assetReference),
    )

    const createRuntime = async (
      loadedConfig: Awaited<ReturnType<typeof loadRuntimeConfig>>,
    ) => {
      const activeAppProvider = await getActiveAppProvider({
        logger: options.logger,
      })
      if (activeAppProvider.supportsActiveApp) {
        options.logger.info(
          { platform: process.platform },
          'active-app overlay enabled',
        )
      } else {
        options.logger.info(
          { platform: process.platform },
          'active-app overlay unsupported on this platform',
        )
      }
      return createDeckRuntime({
        activeAppProvider,
        addonRegistry: loadedConfig.registry,
        deck: loadedConfig.config.decks[loadedConfig.config.main_deck]!,
        decks: loadedConfig.config.decks,
        hostContext: loadedConfig.hostContext,
        keyCount: activeConnection.info.keyCount,
        lockedDeckId: loadedConfig.config.session?.locked_deck,
        logger: options.logger,
        theme: loadedConfig.theme,
        onRenderDeck: async (buttons) => {
          const currentConnection = activeLifecycle.getConnection()
          if (!currentConnection || !browserRenderer) {
            return
          }

          try {
            await renderRuntimeDeckSurface(
              currentConnection,
              buttons,
              browserRenderer,
              logger,
              loadedConfig.theme,
            )

            if (startupPlaceholderPending) {
              startupPlaceholderPending = false
              resolveFirstRender?.()
              resolveFirstRender = null
              rejectFirstRender = null
            }
          } catch (error) {
            if (startupPlaceholderPending) {
              rejectFirstRender?.(error)
              resolveFirstRender = null
              rejectFirstRender = null
            }

            throw error
          }
        },
        sessionMonitor: loadedConfig.sessionMonitor,
        subscribeKeyEvents: activeLifecycle.subscribeKeyEvents,
      })
    }

    const applyReloadedRuntime = async (
      loadedConfig: Awaited<ReturnType<typeof loadRuntimeConfig>>,
      nextRuntime: ReturnType<typeof createDeckRuntime>,
    ): Promise<void> => {
      const previousRuntime = runtime
      const previousSessionMonitor = sessionMonitor
      const previousStack = previousRuntime.getStackSnapshot()
      const previousActiveDeckId = previousRuntime.getActiveDeck().id

      sessionMonitor = loadedConfig.sessionMonitor
      runtime = nextRuntime
      setDomAssetPathResolver((assetReference) =>
        loadedConfig.registry.resolveAssetPath(assetReference),
      )

      previousRuntime.stop()
      await previousSessionMonitor.stop()

      nextRuntime.start()
      await restoreReloadNavigation(
        nextRuntime,
        previousStack,
        previousActiveDeckId,
        loadedConfig.config.main_deck,
      )

      stopWatchingConfig()
      stopWatchingAddons()
      stopWatchingConfig = watchConfigFiles(loadedConfig.filePaths, () => {
        void reloadRuntime().catch((error) => {
          logger.error({ error }, 'config reload failed')
        })
      })
      stopWatchingAddons = watchAddonSources(
        [loadedConfig.cwd, join(loadedConfig.cwd, "packages", "cli", "src", "builtin-addons")],
        runtime,
        loadedConfig.registry,
        () => {
          runtime.reloadStylesheet()
        },
      )
      logger.info(
        { filePaths: loadedConfig.filePaths },
        'reloaded config after file change',
      )
    }

    runtime = await createRuntime(initialLoad)

    async function reloadRuntime(): Promise<void> {
      if (!runtime) {
        return
      }

      if (reloadInFlight) {
        reloadQueued = true
        return
      }

      reloadInFlight = true

      do {
        reloadQueued = false
        let loadedConfig: Awaited<ReturnType<typeof loadRuntimeConfig>> | null =
          null

        try {
          loadedConfig = await loadRuntimeConfig(options)
          const nextRuntime = await createRuntime(loadedConfig)
          await applyReloadedRuntime(loadedConfig, nextRuntime)
        } catch (error) {
          if (loadedConfig) {
            await loadedConfig.sessionMonitor.stop()
          }

          if (error instanceof ConfigValidationError) {
            console.error(formatConfigError(error))
            await runtime.showTemporaryErrorDeck(
              createTemporaryConfigErrorLines(error),
            )
          } else {
            logger.error({ error }, 'config reload failed')
          }
        }
      } while (reloadQueued)

      reloadInFlight = false
    }

    runtime.start()
    await firstRenderReady
    stopWatchingConfig = watchConfigFiles(initialLoad.filePaths, () => {
      void reloadRuntime().catch((error) => {
        logger.error({ error }, 'config reload failed')
      })
    })
    stopWatchingAddons = watchAddonSources(
      [initialLoad.cwd, join(initialLoad.cwd, "packages", "cli", "src", "builtin-addons")],
      runtime,
      initialLoad.registry,
      () => {
        runtime.reloadStylesheet()
      },
    )
    runtime.requestFullReload = () => {
      void reloadRuntime().catch((error) => {
        logger.error({ error }, 'addon structural reload failed')
      })
    }

    logger.info({ config: initialLoad.config }, 'config loaded successfully')
    logger.info(
      {
        keyCount: activeConnection.info.keyCount,
        model: activeConnection.info.model,
        serialNumber: activeConnection.info.serialNumber,
      },
      'connected to Stream Deck',
    )

    writePid()
    cleanupSignals = setupSignalHandlers(logger, async () => {
      stopWatchingConfig()
      stopWatchingAddons()
      runtime?.stop()
      await browserRenderer?.close()
      await sessionMonitor?.stop()
      await lifecycle?.close()
    })
  } catch (error) {
    if (startupPlaceholderPending && connection) {
      await connection.device.clearPanel().catch(() => {})
      startupPlaceholderPending = false
    }

    cleanupSignals()
    stopWatchingConfig()
    stopWatchingAddons()
    runtime?.stop()
    await browserRenderer?.close().catch(() => {})
    await Promise.resolve(sessionMonitor?.stop()).catch(() => {})
    await lifecycle?.close().catch(() => {})

    if (
      error instanceof AddonManifestError &&
      error.code === 'api_version_mismatch'
    ) {
      console.error(`Addon apiVersion error: ${error.message}`)
      process.exitCode = 1
      return
    }

    if (error instanceof ConfigValidationError) {
      console.error(formatConfigError(error))
      process.exitCode = 1
      return
    }

    if (error instanceof StreamDeckSelectionError) {
      console.error(error.message)
      process.exitCode = 1
      return
    }

    const linuxUdevMessage = formatLinuxUdevAccessError(error)
    if (linuxUdevMessage) {
      console.error(linuxUdevMessage)
      process.exitCode = 1
      return
    }

    throw error
  }

  logger.info({ pid: process.pid }, 'sireno-deck daemon started')
  logger.info(
    'started config-driven main deck runtime with addon-hosted buttons',
  )
  logger.info('press Ctrl+C to stop')

  try {
    await new Promise(() => {
      setInterval(() => {}, 1000)
    })
  } finally {
    cleanupSignals()
  }
}
