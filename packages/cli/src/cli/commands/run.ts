import { exec } from "node:child_process"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve as resolvePath } from "node:path"

import type pino from "pino"

import { AddonRegistry } from "@/addon/registry"
import { registerBuiltins } from "@/builtin-addons"
import { findConfigPath } from "@/config/discovery"
import { loadConfig } from "@/config/loader"
import {
  formatFullIssues,
  isFullValid,
  validateFull,
} from "@/config/validation"
import {
  createDeckRuntime,
  type PubSub,
  type Runtime,
  type RuntimeDeck,
  type Store,
} from "@/deck"
import { createActiveAppProvider } from "@/system/active-app"
import { createKeyMacroProvider } from "@/system/key-macro"
import { createMediaProvider } from "@/system/media"
import {
  type ActiveAppProvider,
  type KeyMacroProvider,
  type MediaProvider,
  type SessionProvider,
} from "@/system/provider"
import { createSessionProvider } from "@/system/session-monitor"
import { resolveActiveTheme } from "@/themes/loader"

import { createActionExecutor } from "@/action/executor"
import { bridgeAddonServices } from "@/deck/addon-handler-bridge"
import { getHostContext } from "@/deck/host-context"
import { StatePublisher } from "@/render/state-publisher"
import { startWsBridge } from "@/render/ws-bridge"
import {
  createClipboardProvider,
  type ClipboardProvider,
} from "@/system/clipboard"

import { materializeAddonDecks } from "./addon-decks"
import {
  collectBuiltinAddonRegistry,
  type AddonFrontendRef,
  type ScannedAddon,
} from "./addon-registry"
import {
  selectOutputClient,
  type OutputClient,
  type OutputHandle,
} from "@/outputClient"
import { loadDeviceConfig } from "@/util/device-config"
import { findWorkspaceRoot } from "./emulator-mode"

export interface SignalProvider {
  onSignal(handler: () => void): () => void
}

export const defaultSignals: SignalProvider = {
  onSignal(handler: () => void): () => void {
    process.once("SIGINT", handler)
    process.once("SIGTERM", handler)
    return () => {
      process.off("SIGINT", handler)
      process.off("SIGTERM", handler)
    }
  },
}

export interface RunOptions {
  readonly config?: string
  readonly port?: number
  readonly emulator?: boolean
  readonly dev?: boolean
  readonly deviceModel?: string
  readonly frontendUrl?: string
  readonly intervalMs?: number
  readonly xdgConfigHome?: string
  readonly homeDir?: string
  readonly signals?: SignalProvider
  readonly onChildren?: (pids: ReadonlyArray<number>) => void
  readonly logger: pino.Logger
}

export interface SetupAddonServicesOptions {
  readonly runtime: Runtime
  readonly decks: ReadonlyArray<RuntimeDeck>
  readonly pubSub: PubSub
  readonly scanned: ReadonlyArray<ScannedAddon>
  readonly addonByType: Map<string, AddonFrontendRef>
  readonly executor: ReturnType<typeof createActionExecutor>
  readonly statePublisher: Pick<
    StatePublisher,
    "registerChannel" | "setActiveDeck"
  >
  readonly bridge: Pick<ReturnType<typeof startWsBridge>, "broadcast" | "registerCacheablePoller">
  readonly initialDeck?: RuntimeDeck
  readonly signal: AbortSignal
  readonly setClipboardProvider: (provider: unknown) => void
  readonly store: Store
}

export interface SetupAddonServicesResult {
  readonly dispose: () => void
}

const collectActiveDeckAddonNames = (
  deck: RuntimeDeck,
  addonByType: Map<string, AddonFrontendRef>,
): string[] => {
  const addonNames = new Set<string>()
  for (const button of deck.buttons) {
    const entry = addonByType.get(button.type)
    if (entry !== undefined) addonNames.add(entry.name)
  }
  return [...addonNames]
}

export const setupAddonServices = (
  options: SetupAddonServicesOptions,
): SetupAddonServicesResult => {
  const {
    runtime,
    decks,
    pubSub,
    scanned,
    addonByType,
    executor,
    statePublisher,
    bridge,
    initialDeck,
    signal,
    setClipboardProvider,
    store,
  } = options

  void bridgeAddonServices({
    runtime,
    decks,
    scanned,
    executor,
    pubSub,
    signal,
    statePublisher,
    bridge,
    setClipboardProvider,
    store,
  })

  const unsubscribeDeck = pubSub.subscribe(
    "runtime:activeDeck",
    (payload: unknown) => {
      const deckId =
        typeof payload === "object" && payload !== null && "deckId" in payload
          ? String((payload as { deckId: unknown }).deckId)
          : undefined
      if (deckId === undefined) return
      const deck = decks.find((d) => d.id === deckId)
      if (deck === undefined) return
      statePublisher.setActiveDeck({
        addonNames: collectActiveDeckAddonNames(deck, addonByType),
      })
    },
  )

  const unsubscribeNavigate = pubSub.subscribe(
    "runtime:navigate-deck",
    (payload: unknown) => {
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("deckId" in payload)
      ) {
        return
      }
      const deckId = String((payload as { deckId: unknown }).deckId)
      const addToHistory =
        "addToHistory" in payload
          ? Boolean((payload as { addToHistory: unknown }).addToHistory)
          : true
      runtime.navigateToDeck(deckId, { addToHistory })
    },
  )

  if (initialDeck !== undefined) {
    statePublisher.setActiveDeck({
      addonNames: collectActiveDeckAddonNames(initialDeck, addonByType),
    })
  }

  return {
    dispose: () => {
      unsubscribeDeck()
      unsubscribeNavigate()
    },
  }
}

interface LoadConfigAndThemeResult {
  readonly configPath: string
  readonly theme: {
    name: string
    apiVersion: number
    manifestPath: string
    uiOverridesPath: string | null
  }
  readonly themeDir: string
  readonly decks: ReadonlyArray<RuntimeDeck>
  readonly pubSub: PubSub
  readonly runtime: Runtime
  readonly store: Store
}

const loadConfigAndTheme = (options: RunOptions): LoadConfigAndThemeResult => {
  const { logger } = options
  const configPath = resolveConfigPath(options)

  const { config } = loadConfig({ configPath })

  const registry = new AddonRegistry()
  registerBuiltins(registry)
  const validation = validateFull(config, registry)
  if (!isFullValid(validation)) {
    throw new Error(
      `Config validation failed:\n${formatFullIssues(validation.issues)}`,
    )
  }

  const { theme, getCss } = resolveActiveTheme(registry, {
    theme: config.theme,
  })
  const themeDir: string = resolvePath(
    findWorkspaceRoot(),
    "packages",
    "cli",
    "frontend",
  )
  const cssContent: string = getCss()
  if (cssContent.length > 0) {
    const cssDir = join(themeDir, ".sireno-deck")
    if (!existsSync(cssDir)) mkdirSync(cssDir, { recursive: true })
    writeFileSync(join(cssDir, "theme.css"), cssContent, "utf8")
  }
  process.env["SIRENO_THEME_DIR"] = themeDir
  process.env["SIRENO_THEME"] = JSON.stringify({
    name: theme.name,
    manifestPath: theme.manifestPath,
    uiOverridesPath: theme.uiOverridesPath,
  })
  process.env["SIRENO_THEME_NAME"] = theme.name

  const decks: RuntimeDeck[] = Object.entries(config.decks).map(([id, d]) => ({
    id,
    name: d.name ?? id,
    buttons: d.buttons.flatMap((b, idx) => {
      if (typeof b === "string") return []
      return [
        {
          id: b.position?.toString() ?? `b${idx}`,
          type: b.type,
          ...(typeof b.config === "object" && b.config !== null
            ? { config: b.config }
            : {}),
        },
      ]
    }),
    processNames:
      d.trigger?.process_name !== undefined
        ? Array.isArray(d.trigger.process_name)
          ? d.trigger.process_name
          : [d.trigger.process_name]
        : undefined,
  }))
  const effectiveDecks: RuntimeDeck[] =
    decks.length > 0
      ? decks
      : [{ id: "main", name: "Main", isMain: true, buttons: [] }]
  const allDecks = materializeAddonDecks(registry, effectiveDecks, logger)
  const { runtime, methods, pubSub, store } = createDeckRuntime({
    decks: allDecks,
    logger,
  })

  void methods

  return {
    configPath,
    theme: {
      name: theme.name,
      apiVersion: theme.apiVersion,
      manifestPath: theme.manifestPath,
      uiOverridesPath: theme.uiOverridesPath,
    },
    themeDir,
    decks: allDecks,
    pubSub,
    runtime,
    store,
  }
}

interface SystemProviders {
  readonly activeApp: ActiveAppProvider
  readonly session: SessionProvider
  readonly keyMacro: KeyMacroProvider
  readonly media: MediaProvider
  readonly setClipboardProvider: (provider: ClipboardProvider) => void
}

const startSystemProviders = async (
  options: RunOptions,
  runtime: Runtime,
): Promise<SystemProviders> => {
  const { logger } = options
  const { execa } = await import("execa")
  const executor = {
    async run(
      command: string,
      args: ReadonlyArray<string>,
      execOptions?: { timeoutMs?: number },
    ) {
      const proc = await execa(command, [...args], {
        reject: false,
        timeout: execOptions?.timeoutMs,
      })
      return {
        exitCode: proc.exitCode ?? -1,
        stdout: proc.stdout ?? "",
        stderr: proc.stderr ?? "",
      }
    },
  }

  const env = { ...process.env } as Readonly<Record<string, string>>
  const platform = process.platform

  const [activeApp, session, keyMacro, media] = await Promise.all([
    createActiveAppProvider({ platform, executor, logger }),
    createSessionProvider({ platform, logger }),
    createKeyMacroProvider({ platform, executor, env, logger }),
    createMediaProvider({ platform, executor, logger }),
  ])

  runtime.setActiveAppProvider(activeApp)

  let clipboard: ClipboardProvider | null = null
  try {
    clipboard = createClipboardProvider({ executor, platform, env, logger })
  } catch {
    clipboard = null
  }

  const setClipboardProvider = (provider: ClipboardProvider): void => {
    if (provider === null) return
    runtime.setClipboardProvider(provider)
  }
  if (clipboard !== null) runtime.setClipboardProvider(clipboard)

  return { activeApp, session, keyMacro, media, setClipboardProvider }
}

interface AddonRegistryBundle {
  readonly scanned: ReadonlyArray<ScannedAddon>
  readonly addonByType: Map<string, AddonFrontendRef>
}

const buildAddonBundle = async (): Promise<AddonRegistryBundle> => {
  const registry = await collectBuiltinAddonRegistry()

  if (process.env["SIRENO_ADDONS"] === undefined) {
    const addonSpecs = registry.scanned.map((s) => ({
      name: s.name,
      frontend:
        s.frontendEntry !== null ? { main: s.frontendEntry } : undefined,
      buttons: s.types.map((t) => ({ type: t })),
      buttonTypes: s.buttonTypes,
      defaultButton: s.defaultButton,
    }))
    process.env["SIRENO_ADDONS"] = JSON.stringify(addonSpecs)
  }

  const addonByType = new Map<string, AddonFrontendRef>()
  for (const s of registry.scanned) {
    for (const t of s.types) {
      addonByType.set(t, { name: s.name, frontendEntry: s.frontendEntry })
    }
  }

  return { scanned: registry.scanned, addonByType }
}

export const preflight = async (options: RunOptions): Promise<void> => {
  const { logger } = options
  const loaded = loadConfigAndTheme(options)
  await startSystemProviders(options, loaded.runtime)

  const xdgConfigHome = resolveXdgConfigHome(options)
  const outputClient = selectOutputClient({
    emulator: options.emulator === true,
    xdgConfigHome,
  })

  if (outputClient.kind === "real") {
    const devices = await outputClient.listDevices()
    if (devices.length === 0) {
      throw new Error(
        "No Stream Deck devices found. Connect a device and try again. On Linux, udev rules may be required — see sireno install-udev.",
      )
    }
  }
  void logger
}

export const runPipeline = async (options: RunOptions): Promise<void> => {
  const { logger } = options

  const loaded = loadConfigAndTheme(options)
  const { configPath, themeDir, decks, pubSub, runtime, store } = loaded

  const providers = await startSystemProviders(options, runtime)

  const xdgConfigHome = resolveXdgConfigHome(options)
  const outputClient: OutputClient = selectOutputClient({
    emulator: options.emulator === true,
    xdgConfigHome,
  })

  const addonBundle = await buildAddonBundle()

  const bridge = await startWsBridge({ port: 52937 })
  const wsPort = bridge.port

  const bridgeSignal = new AbortController()
  const statePublisher = new StatePublisher({ bridge, logger })
  const mainDeck = runtime.getActiveDeck()
  const addonServices = setupAddonServices({
    runtime,
    decks,
    pubSub,
    scanned: addonBundle.scanned,
    addonByType: addonBundle.addonByType,
    executor: createActionExecutor({ host: getHostContext() }),
    statePublisher,
    bridge,
    ...(mainDeck !== undefined ? { initialDeck: mainDeck } : {}),
    signal: bridgeSignal.signal,
    setClipboardProvider: providers.setClipboardProvider as (
      p: unknown,
    ) => void,
    store,
  })

  const devices = await outputClient.listDevices()
  const savedDevice = loadDeviceConfig({ xdgConfigHome })
  const descriptor = await outputClient.selectDevice(
    devices,
    savedDevice?.serial ?? null,
    logger,
  )
  await outputClient.storeSelection(descriptor)

  const outputHandle: OutputHandle = await outputClient.init({
    bridge,
    runtime,
    pubSub,
    store,
    decks,
    theme: { name: loaded.theme.name, apiVersion: loaded.theme.apiVersion },
    themeDir,
    logger,
    addonByType: addonBundle.addonByType,
    ...(configPath !== undefined ? { configPath } : {}),
    ...(options.frontendUrl !== undefined
      ? { frontendUrl: options.frontendUrl }
      : {}),
    ...(options.port !== undefined ? { port: options.port } : {}),
    ...(options.intervalMs !== undefined
      ? { intervalMs: options.intervalMs }
      : {}),
  })

  if (options.onChildren !== undefined) {
    options.onChildren([...outputHandle.childPids])
  }

  let resolveDone: () => void = () => undefined
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })

  const signals = options.signals ?? defaultSignals
  const unregister = signals.onSignal(() => {
    logger.info("received signal, shutting down")
    resolveDone()
  })

  try {
    await done
  } finally {
    unregister()
    bridgeSignal.abort()
    addonServices.dispose()
    statePublisher.stopAll()
    await Promise.allSettled([
      outputHandle.stop(),
      runtime.stopActiveAppPolling(),
      providers.activeApp.stop(),
      providers.session.stop(),
      providers.keyMacro.stop(),
      providers.media.stop(),
      bridge.close(),
    ])
    logger.info("shutdown complete")
  }
  void wsPort
}

const resolveXdgConfigHome = (options: RunOptions): string =>
  options.xdgConfigHome ??
  process.env["XDG_CONFIG_HOME"] ??
  `${options.homeDir ?? homedir()}/.config`

const resolveConfigPath = (options: RunOptions): string => {
  if (options.config !== undefined) {
    return options.config
  }
  const home = options.homeDir ?? homedir()
  const found = findConfigPath({
    homeDir: home,
    ...(options.xdgConfigHome !== undefined
      ? { xdgConfigHome: options.xdgConfigHome }
      : {}),
  })
  if (found === null) {
    const cwd = process.cwd()
    throw new Error(
      `Could not find config.yml.\n` +
        `  Looked in: ${cwd}/config.yml (and walked up 10 parent directories)\n` +
        `  Also: $XDG_CONFIG_HOME/sireno-deck/config.yml (default: ~/.config/sireno-deck/config.yml)\n` +
        `  Fix: pass --config <path> or create one of the above.`,
    )
  }
  return found
}

void exec

export const run = runPipeline