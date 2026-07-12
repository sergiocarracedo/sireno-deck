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
  type Methods,
  type PubSub,
  type Runtime,
  type RuntimeDeck,
  type Store,
} from "@/deck"
import {
  createActiveAppProvider,
  type ActiveAppProvider,
} from "@/system/providers/active-app"
import {
  createClipboardProvider,
  type ClipboardProvider,
} from "@/system/providers/clipboard"
import { createKeyMacroProvider } from "@/system/providers/key-macro"
import { createSessionProvider } from "@/system/providers/session"
import { resolveActiveTheme } from "@/themes/loader"

import { createActionExecutor } from "@/action/executor"
import { bridgeAddonServices } from "@/deck/addon-handler-bridge"
import {
  buildDeckConfigMessage,
  buildResolverOptions,
  type AddonFrontendRef,
} from "@/deck/deck-config"
import { getHostContext } from "@/deck/host-context"
import {
  getAssetByPath,
  getUnsentAssets,
  registerIconForDeck,
} from "@/core/icon-asset-registry"
import { StatePublisher } from "@/render/state-publisher"
import { startWsBridge } from "@/render/ws-bridge"

import { materializeAddonDecks } from "./addon-decks"
import {
  collectBuiltinAddonRegistry,
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
  readonly methods: Methods
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
  readonly logger: pino.Logger
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
    methods,
    logger,
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

  let lastBroadcastedDeckId: string | undefined
  const unsubscribeDeckBroadcast = pubSub.subscribe(
    "runtime:activeDeck",
    (payload: unknown) => {
      const deckId =
        typeof payload === "object" && payload !== null && "deckId" in payload
          ? String((payload as { deckId: unknown }).deckId)
          : undefined
      if (deckId === undefined) return
      if (deckId === lastBroadcastedDeckId) return
      lastBroadcastedDeckId = deckId
      const deck = decks.find((d) => d.id === deckId)
      if (deck === undefined) return
      const msg = buildDeckConfigMessage(
        deck,
        addonByType,
        {},
        {
          navStackDepth: runtime.navStackDepth(),
          hasOverlayDeckAvailable: runtime.hasOverlayDeckAvailable(),
        },
        undefined,
        undefined,
        (fullPath) => getAssetByPath(fullPath)?.id,
      )
      bridge.broadcast(msg)
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

  const unsubscribeDispatch = pubSub.subscribe(
    "runtime:dispatch",
    async (payload: unknown) => {
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("value" in payload)
      ) {
        return
      }
      const value = String((payload as { value: unknown }).value)
      if (value.length === 0) return
      try {
        await methods.dispatch(value)
      } catch (err) {
        logger.error({ err }, "[runtime:dispatch] addon dispatch failed")
      }
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
      unsubscribeDeckBroadcast()
      unsubscribeNavigate()
      unsubscribeDispatch()
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
  readonly methods: Methods
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
            ...(b.actions !== undefined ? { actions: b.actions } : {}),
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
    methods,
    store,
  }
}

interface SystemProviders {
  readonly activeApp: ActiveAppProvider
  readonly session: import("@/system/providers/session").SessionProvider
  readonly keyMacro: import("@/system/providers/key-macro").KeyMacroProvider
}

const startSystemProviders = async (
  options: RunOptions,
  runtime: Runtime,
  methods: Methods,
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

  const [activeApp, session, keyMacro] = await Promise.all([
    createActiveAppProvider({ platform, executor, logger }),
    createSessionProvider({ platform, logger }),
    createKeyMacroProvider({ platform, executor, env, logger }),
  ])

  runtime.setActiveAppProvider(activeApp)
  methods.setKeyMacroProvider(keyMacro)

  try {
    const clipboard = createClipboardProvider({
      executor,
      platform,
      env,
      logger,
    })
    methods.setClipboardProvider(clipboard)
  } catch {
    // clipboard is optional on unsupported platforms
  }

  return { activeApp, session, keyMacro }
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
  await startSystemProviders(options, loaded.runtime, loaded.methods)

  const xdgConfigHome = resolveXdgConfigHome(options)
  const outputClient = selectOutputClient({
    emulator: options.emulator === true,
    xdgConfigHome,
  })

  await outputClient.validateReady()
  void logger
}

export const runPipeline = async (options: RunOptions): Promise<void> => {
  const { logger } = options

  const loaded = loadConfigAndTheme(options)
  const { themeDir, decks, pubSub, runtime, methods, store } =
    loaded

  const providers = await startSystemProviders(options, runtime, methods)

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
    methods,
    decks,
    pubSub,
    scanned: addonBundle.scanned,
    addonByType: addonBundle.addonByType,
    executor: createActionExecutor({ host: getHostContext() }),
    statePublisher,
    bridge,
    ...(mainDeck !== undefined ? { initialDeck: mainDeck } : {}),
    signal: bridgeSignal.signal,
    setClipboardProvider: (p) =>
      methods.setClipboardProvider(p as ClipboardProvider),
    store,
    logger,
  })

  const devices = await outputClient.listDevices()
  const savedDevice = loadDeviceConfig({ xdgConfigHome })
  const descriptor = await outputClient.selectDevice(
    devices,
    savedDevice?.serial ?? null,
    logger,
  )
  await outputClient.storeSelection(descriptor)

  const resolverOptions = buildResolverOptions(
    addonBundle.addonByType,
    [dirname(loaded.configPath)],
  )
  for (const deck of decks) {
    registerIconForDeck(deck.buttons, resolverOptions, logger)
  }

  const sentAssetIds = new Set<string>()
  bridge.onConnection((socket) => {
    const unsent = getUnsentAssets(sentAssetIds)
    if (unsent.length > 0) {
      socket.send(
        JSON.stringify({
          type: "assets",
          deckId: mainDeck?.id ?? "",
          assets: unsent.map((a) => ({
            id: a.id,
            filename: a.fullPath,
            src: a.src,
          })),
        }),
      )
      for (const a of unsent) sentAssetIds.add(a.id)
    }
    if (mainDeck !== undefined) {
      const msg = buildDeckConfigMessage(
        mainDeck,
        addonBundle.addonByType,
        resolverOptions,
        {
          navStackDepth: runtime.navStackDepth(),
          hasOverlayDeckAvailable: runtime.hasOverlayDeckAvailable(),
        },
        descriptor.keyCount,
        outputClient.kind === "real",
        (fullPath) => getAssetByPath(fullPath)?.id,
      )
      logger.info(
        {
          deckId: msg.deckId,
          buttonCount: msg.surfaces[msg.deckId]?.buttons.length,
        },
        "orchestrator: sending deck-config",
      )
      socket.send(JSON.stringify(msg))
    }
  })

  const outputHandle: OutputHandle = await outputClient.init({
    bridge,
    runtime,
    pubSub,
    store,
    decks,
    theme: { name: loaded.theme.name, apiVersion: loaded.theme.apiVersion },
    themeDir,
    logger,
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