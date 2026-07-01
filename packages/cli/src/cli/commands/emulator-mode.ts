import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'

import type pino from 'pino'

import type {
  ButtonActionMessage,
  DeckConfigMessage,
  WsMessage,
} from '@/api/protocol-internal'
import type { Runtime, RuntimeDeck } from '@/deck'
import { startWsBridge, type WsBridge } from '@/render/ws-bridge'
import { BUILT_IN_THEMES } from '@/themes/loader'

const DEFAULT_FRONTEND_PORT = 5180
const DEFAULT_EMULATOR_PORT = 52938
const DEFAULT_TIMEOUT_MS = 30_000
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\u001b\[[0-9;]*m/g
const READY_REGEX =
  /(?:Local|➜\s*Local|Network use --host)[^\n]*?https?:\/\/[^:\s]+(?::(\d+))?/

export interface RunEmulatorModeOptions {
  readonly emulatorPort?: number
  readonly emulatorCwd?: string
  readonly pnpmCommand?: string
  readonly readyTimeoutMs?: number
  readonly activeTheme?: { name: string; version?: number }
  readonly runtime?: Runtime
  readonly decks?: ReadonlyArray<RuntimeDeck>
  readonly addonByType?: Map<string, AddonFrontendRef>
  readonly onBridgeReady?: (bridge: WsBridge) => void | Promise<void>
  readonly logger: pino.Logger
}

export interface EmulatorModeHandle {
  readonly emulatorUrl: string
  readonly frontendUrl: string
  readonly wsUrl: string
  readonly childPids: ReadonlyArray<number>
  stop(): Promise<void>
}

export const findWorkspaceRoot = (): string => {
  const here = dirname(fileURLToPath(import.meta.url))
  let dir = here
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(resolvePath(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return here
}

const resolveEmulatorCwd = (override?: string): string => {
  if (override !== undefined) return override
  return resolvePath(findWorkspaceRoot(), 'packages', 'cli', 'emulator')
}

export const resolveFrontendCwd = (): string =>
  resolvePath(findWorkspaceRoot(), 'packages', 'cli', 'frontend')

export const spawnFrontendVite = (options: {
  port: number
  cwd: string
  pnpmCommand: string
  readyTimeoutMs: number
  logger: pino.Logger
  wsUrl?: string
  themeDir?: string
}): Promise<{ process: ChildProcess; url: string }> => {
  const { port, cwd, pnpmCommand, readyTimeoutMs, logger, wsUrl, themeDir } = options

  return new Promise((resolve, reject) => {
    if (!existsSync(cwd)) {
      reject(new Error(`frontend workspace not found at ${cwd}`))
      return
    }
    const env: Record<string, string> = { ...process.env, FORCE_COLOR: '0' }
    if (wsUrl !== undefined) {
      env['SIRENO_WS_URL'] = wsUrl
    }
    if (themeDir !== undefined) {
      env['SIRENO_THEME_DIR'] = themeDir
    }
    const viteBin = findWorkspaceRoot() + '/node_modules/.bin/vite'
    const child = spawn(
      viteBin,
      [
        '--config',
        resolvePath(cwd, 'vite.config.ts'),
        '--port',
        String(port),
      ],
      {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    const formatOutput = (text: string, label: 'stdout' | 'stderr'): string => {
      const trimmed = text.trimEnd()
      if (trimmed.length === 0) return ''
      const lines = trimmed
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')
      return `${label}:\n${lines}\n`
    }

    const collectOutput = (text: string, label: 'stdout' | 'stderr'): void => {
      const formatted = formatOutput(text, label)
      if (formatted.length > 0) {
        if (label === 'stdout') stdoutChunks.push(formatted)
        else stderrChunks.push(formatted)
        if (label === 'stderr')
          logger.warn(formatted.trimEnd(), 'frontend vite')
        else logger.info(formatted.trimEnd(), 'frontend vite')
      }
    }

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      const output = stdoutChunks.join('') + stderrChunks.join('')
      const detail = output.length > 0 ? `\n  output:\n${output}` : ''
      reject(
        new Error(
          `frontend did not become ready within ${readyTimeoutMs}ms${detail}`,
        ),
      )
    }, readyTimeoutMs)

    const fallbackTimer = setTimeout(() => {
      const url = `http://127.0.0.1:${port}`
      logger.warn(
        { url },
        'frontend vite: regex did not match, using fallback port',
      )
      clearTimeout(timer)
      resolve({ process: child, url })
    }, readyTimeoutMs - 1000)

    const onData = (chunk: Buffer): void => {
      const text = chunk.toString()
      collectOutput(text, 'stdout')
      const stripped = text.replace(ANSI_REGEX, '')
      const match = stripped.match(READY_REGEX)
      if (match && match[1]) {
        clearTimeout(timer)
        const url = `http://127.0.0.1:${match[1]}`
        setTimeout(() => resolve({ process: child, url }), 1000)
      }
    }

    child.stdout?.on('data', onData)
    child.stderr?.on('data', (chunk: Buffer) => {
      collectOutput(chunk.toString(), 'stderr')
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      const output = stdoutChunks.join('') + stderrChunks.join('')
      const detail = output.length > 0 ? `\n  output:\n${output}` : ''
      reject(
        new Error(
          `frontend exited (code=${code}) before becoming ready${detail}`,
        ),
      )
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

const spawnEmulatorVite = (options: {
  port: number
  cwd: string
  pnpmCommand: string
  readyTimeoutMs: number
  logger: pino.Logger
  wsUrl?: string
  frontendUrl?: string
}): Promise<{ process: ChildProcess; url: string }> => {
  const { port, cwd, pnpmCommand, readyTimeoutMs, logger, wsUrl, frontendUrl } =
    options

  return new Promise((resolve, reject) => {
    if (!existsSync(cwd)) {
      reject(new Error(`emulator workspace not found at ${cwd}`))
      return
    }
    const env: Record<string, string> = { ...process.env, FORCE_COLOR: '0' }
    if (wsUrl !== undefined) {
      env['SIRENO_WS_URL'] = wsUrl
    }
    if (frontendUrl !== undefined) {
      env['SIRENO_FRONTEND_URL'] = frontendUrl
    }
    const viteBin = findWorkspaceRoot() + '/node_modules/.bin/vite'
    const child = spawn(
      viteBin,
      [
        '--config',
        resolvePath(cwd, 'vite.config.ts'),
        '--port',
        String(port),
      ],
      {
        cwd,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    const formatOutput = (text: string, label: 'stdout' | 'stderr'): string => {
      const trimmed = text.trimEnd()
      if (trimmed.length === 0) return ''
      const lines = trimmed
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')
      return `${label}:\n${lines}\n`
    }

    const collectOutput = (text: string, label: 'stdout' | 'stderr'): void => {
      const formatted = formatOutput(text, label)
      if (formatted.length > 0) {
        if (label === 'stdout') stdoutChunks.push(formatted)
        else stderrChunks.push(formatted)
        if (label === 'stderr')
          logger.warn(formatted.trimEnd(), 'emulator vite')
        else logger.info(formatted.trimEnd(), 'emulator vite')
      }
    }

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      const output = stdoutChunks.join('') + stderrChunks.join('')
      const detail = output.length > 0 ? `\n  output:\n${output}` : ''
      reject(
        new Error(
          `emulator did not become ready within ${readyTimeoutMs}ms${detail}`,
        ),
      )
    }, readyTimeoutMs)

    const onData = (chunk: Buffer): void => {
      const text = chunk.toString()
      collectOutput(text, 'stdout')
      const stripped = text.replace(ANSI_REGEX, '')
      const match = stripped.match(READY_REGEX)
      if (match && match[1]) {
        clearTimeout(timer)
        const url = `http://127.0.0.1:${match[1]}`
        resolve({ process: child, url })
      }
    }

    child.stdout?.on('data', onData)
    child.stderr?.on('data', (chunk: Buffer) => {
      collectOutput(chunk.toString(), 'stderr')
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      const output = stdoutChunks.join('') + stderrChunks.join('')
      const detail = output.length > 0 ? `\n  output:\n${output}` : ''
      reject(
        new Error(
          `emulator exited (code=${code}) before becoming ready${detail}`,
        ),
      )
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

const killChild = (child: ChildProcess): Promise<void> =>
  new Promise<void>((resolve) => {
    if (child.exitCode !== null) {
      resolve()
      return
    }
    child.once('exit', () => resolve())
    child.kill('SIGTERM')
    setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL')
    }, 2_000)
  })

const isButtonAction = (m: WsMessage): m is ButtonActionMessage =>
  m.type === 'button-action'

export interface AddonFrontendRef {
  readonly name: string
  readonly frontendEntry: string | null
}

const deriveLabel = (
  type: string,
  config: Record<string, unknown>,
): string | undefined => {
  switch (type) {
    case 'core:action': {
      const cmd = config['command']
      if (typeof cmd === 'string' && cmd.length > 0) {
        return cmd.length > 14 ? `${cmd.slice(0, 13)}…` : cmd
      }
      return undefined
    }
    case 'core:change-deck': {
      const deck = config['deck']
      if (typeof deck === 'string' && deck.length > 0) {
        return `→ ${deck}`
      }
      return undefined
    }
    default:
      return undefined
  }
}

export const buildDeckConfigMessage = (
  deck: RuntimeDeck,
  addonByType: Map<string, AddonFrontendRef>,
): DeckConfigMessage => ({
  type: 'deck-config',
  deckId: deck.id,
  surfaces: {
    [deck.id]: {
      id: deck.id,
      name: deck.name ?? deck.id,
      buttons: deck.buttons.map((b) => {
        const position = Number.parseInt(b.id, 10)
        const addon = addonByType.get(b.type)
        const cfg = (b.config ?? {}) as Record<string, unknown>
        const label = deriveLabel(b.type, cfg)
        return {
          id: b.id,
          type: b.type,
          config: cfg,
          ...(Number.isFinite(position) ? { position } : {}),
          ...(label !== undefined ? { label } : {}),
          ...(addon !== undefined ? { addonName: addon.name } : {}),
          ...(addon?.frontendEntry !== undefined && addon.frontendEntry !== null
            ? { frontendEntry: addon.frontendEntry }
            : {}),
        }
      }),
    },
  },
  navMode: 'regular',
})

export const runEmulatorMode = async (
  options: RunEmulatorModeOptions,
): Promise<EmulatorModeHandle> => {
  const port = options.emulatorPort ?? DEFAULT_EMULATOR_PORT
  const pnpmCommand = options.pnpmCommand ?? 'pnpm'
  const emulatorCwd = resolveEmulatorCwd(options.emulatorCwd)
  const frontendCwd = resolveFrontendCwd()
  const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_TIMEOUT_MS

  if (
    process.env['SIRENO_THEME'] === undefined ||
    process.env['SIRENO_THEME'].length === 0
  ) {
    const defaultSpec = BUILT_IN_THEMES[0]
    if (defaultSpec !== undefined) {
      process.env['SIRENO_THEME'] = JSON.stringify({
        name: defaultSpec.name,
        manifestPath: resolvePath(defaultSpec.dir, 'sirenodeck.json'),
        uiOverridesPath: null,
      })
      process.env['SIRENO_THEME_DIR'] = defaultSpec.dir
    }
  }

  const bridge: WsBridge = await startWsBridge(
    options.activeTheme !== undefined
      ? { activeTheme: options.activeTheme }
      : {},
  )
  if (options.onBridgeReady !== undefined) {
    void Promise.resolve(options.onBridgeReady(bridge))
  }

  const { process: frontendVite, url: frontendUrl } = await spawnFrontendVite({
    port: DEFAULT_FRONTEND_PORT,
    cwd: frontendCwd,
    pnpmCommand,
    readyTimeoutMs,
    logger: options.logger,
    wsUrl: bridge.url,
    themeDir: process.env['SIRENO_THEME_DIR'],
  })

  const { process: emulatorVite, url: emulatorUrl } = await spawnEmulatorVite({
    port,
    cwd: emulatorCwd,
    pnpmCommand,
    readyTimeoutMs,
    logger: options.logger,
    wsUrl: bridge.url,
    frontendUrl,
  })

  bridge.onMessage((message) => {
    if (isButtonAction(message)) {
      options.logger.info(
        {
          deckId: message.deckId,
          position: message.position,
          gesture: message.gesture,
        },
        'emulator: button-action received',
      )
      if (options.runtime !== undefined) {
        const deck = options.decks?.find((d) => d.id === message.deckId)
        const button = deck?.buttons.find((b) => {
          const p = Number.parseInt(b.id, 10)
          return Number.isFinite(p) && p === message.position
        })
        if (button === undefined) {
          options.logger.warn(
            { deckId: message.deckId, position: message.position },
            'emulator: button-action targets unknown button',
          )
          return
        }
        void options.runtime.dispatchGesture(button.id, message.gesture)
      }
    }
  })

  if (
    options.runtime !== undefined &&
    options.decks !== undefined &&
    options.decks.length > 0
  ) {
    const mainDeck = options.decks.find((d) => d.isMain) ?? options.decks[0]!
    const addonByType = options.addonByType ?? new Map()
    bridge.onConnection((socket) => {
      socket.send(JSON.stringify(buildDeckConfigMessage(mainDeck, addonByType)))
      options.logger.info(
        { deckId: mainDeck.id, buttons: mainDeck.buttons.length },
        'emulator: deck-config sent to new client',
      )
    })
  }

  return {
    emulatorUrl,
    frontendUrl,
    wsUrl: bridge.url,
    childPids: [frontendVite.pid ?? 0, emulatorVite.pid ?? 0].filter(
      (p) => p > 0,
    ),
    async stop(): Promise<void> {
      try {
        await bridge.close()
      } finally {
        await killChild(frontendVite)
        await killChild(emulatorVite)
      }
    },
  }
}
