import { exec } from "node:child_process"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, isAbsolute, join, resolve as resolvePath } from "node:path"

import type pino from "pino"

import { AddonRegistry } from "@/addon/registry"
import { registerBuiltins } from "@/builtin-addons"
import { registerSystemStatusAddon } from "@/builtin-addons/system-status"
import { findConfigPath } from "@/config/discovery"
import { loadConfig } from "@/config/loader"
import { decksChanged } from "@/config/config-diff"
import {
  formatFullIssues,
  isFullValid,
  validateFull,
  validatePerDeck,
} from "@/config/validation"
import {
  createDeckRuntime,
  injectSystemButtons,
  type Methods,
  type PubSub,
  type Runtime,
  type RuntimeDeck,
  type Store,
} from "@/deck"
import { paginateDeck } from "@/deck/paginate-deck"
import { positionButtons } from "@/deck/position-buttons"
import {
  createActiveAppProvider,
  type ActiveAppProvider,
} from "@/system/providers/active-app"
import { createKeyMacroProvider } from "@/system/providers/key-macro"
import {
  checkRequirements,
  formatCapabilityWarning,
} from "@/system/requirements"
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
  registerDeckIcon,
  registerIconForDeck,
} from "@/core/icon-asset-registry"
import { StatePublisher } from "@/render/state-publisher"
import { startWsBridge } from "@/render/ws-bridge"
import { ConfigWatcher } from "@/core/watcher"

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
  readonly bridge: Pick<
    ReturnType<typeof startWsBridge>,
    "broadcast" | "registerCacheablePoller"
  >
  readonly isCompact: boolean
  readonly initialDeck?: RuntimeDeck
  readonly signal: AbortSignal
  readonly store: Store
  readonly logger: pino.Logger
  // ponytail: type is inferred from buildResolverOptions — adding a named
  // type here would re-import a stale pre-existing module
  // (`@/render/icon-resolver`) that doesn't exist on disk.
  readonly resolverOptions: ReturnType<typeof buildResolverOptions>
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
    isCompact,
    initialDeck,
    signal,
    store,
    methods,
    logger,
    resolverOptions,
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
    store,
    methods,
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

  const unsubscribeBrightnessBridge = pubSub.subscribe<{
    value: number
  }>("sireno:settings:brightness", (payload) => {
    bridge.broadcast({
      type: "state",
      channels: { "sireno:settings:brightness": payload },
    })
  })

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
        resolverOptions,
        {
          navStackDepth: runtime.navStackDepth(),
          hasOverlayDeckAvailable: runtime.hasOverlayDeckAvailable(),
        },
        undefined,
        isCompact,
        (fullPath) => getAssetByPath(fullPath)?.id,
        runtime.getAvailableOverlayDeckIcon(),
      )
      bridge.broadcast(msg)
    },
  )

  const unsubscribeOverlayAvailableBroadcast = pubSub.subscribe(
    "runtime:overlay-available",
    () => {
      const activeDeck = runtime.getActiveDeck()
      if (activeDeck === undefined) return
      const msg = buildDeckConfigMessage(
        activeDeck,
        addonByType,
        resolverOptions,
        {
          navStackDepth: runtime.navStackDepth(),
          hasOverlayDeckAvailable: runtime.hasOverlayDeckAvailable(),
        },
        undefined,
        isCompact,
        (fullPath) => getAssetByPath(fullPath)?.id,
        runtime.getAvailableOverlayDeckIcon(),
      )
      logger.info(
        {
          deckId: msg.deckId,
          hasOverlayDeckAvailable: msg.hasOverlayDeckAvailable,
          overlayDeckIcon: msg.overlayDeckIcon,
        },
        "orchestrator: broadcasting overlay-available update",
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

  const unsubscribeButtonError = pubSub.subscribe(
    "runtime:buttonError",
    (payload: unknown) => {
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("deckId" in payload) ||
        !("position" in payload)
      ) {
        return
      }
      const deckId = String((payload as { deckId: unknown }).deckId)
      const position = Number((payload as { position: unknown }).position)
      const durationMs =
        "durationMs" in payload
          ? Number((payload as { durationMs: unknown }).durationMs)
          : 5000
      if (!Number.isFinite(position) || position < 0) return
      bridge.broadcast({
        type: "button-error",
        deckId,
        position,
        durationMs: Number.isFinite(durationMs) ? durationMs : 5000,
      })
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
      unsubscribeOverlayAvailableBroadcast()
      unsubscribeBrightnessBridge()
      unsubscribeNavigate()
      unsubscribeDispatch()
      unsubscribeButtonError()
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

interface LoadConfigResult {
  readonly configPath: string
  readonly config: ReturnType<typeof loadConfig>["config"]
  readonly registry: AddonRegistry
  readonly theme: ReturnType<typeof resolveActiveTheme>["theme"]
  readonly themeDir: string
}

const validateAndLoadConfig = (options: RunOptions): LoadConfigResult => {
  const configPath = resolveConfigPath(options)
  const { config } = loadConfig({ configPath })
  const registry = new AddonRegistry()
  registerBuiltins(registry)
  // Per-button config errors are non-fatal: each broken button is replaced
  // with a `core:temporary-error` cell at its position and logged in full
  // (the incorrect config + the schema issues) so the operator can see
  // exactly what went wrong without restarting the daemon. We only fail
  // startup on structural problems (missing main, duplicate positions,
  // unknown/invalid button types in non-config ways).
  const validation = validateFull(config, registry)
  const structuralErrors = validation.issues.filter(
    (i) => !i.path.includes(".config."),
  )
  if (structuralErrors.some((i) => i.level === "error")) {
    throw new Error(
      `Config validation failed:\n${formatFullIssues(structuralErrors)}`,
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
  return { configPath, config, registry, theme, themeDir }
}

const buildRuntime = (
  options: RunOptions,
  loaded: LoadConfigResult,
  keyCount: number,
): LoadConfigAndThemeResult => {
  const { logger } = options
  const { config, registry, theme, themeDir } = loaded

  const decks: RuntimeDeck[] = Object.entries(config.decks).flatMap(
    ([id, d]) => {
      const objectButtons = d.buttons.filter(
        (b): b is Exclude<(typeof d.buttons)[number], string> =>
          typeof b !== "string",
      )
      const runtimeButtons: RuntimeDeck["buttons"] = positionButtons(
        objectButtons,
        keyCount,
        logger,
      ).map((b, idx) => ({
        id: b.position?.toString() ?? `b${idx}`,
        type: b.type,
        ...(typeof b.config === "object" && b.config !== null
          ? { config: b.config }
          : {}),
        ...(b.actions !== undefined ? { actions: b.actions } : {}),
      }))
      const processNames =
        d.trigger?.process_name !== undefined
          ? Array.isArray(d.trigger.process_name)
            ? d.trigger.process_name
            : [d.trigger.process_name]
          : undefined
      const windowNames =
        d.trigger?.window_name !== undefined
          ? Array.isArray(d.trigger.window_name)
            ? d.trigger.window_name
            : [d.trigger.window_name]
          : undefined
      const sharedDeckFields = {
        isMain: id === "main",
        // ponytail: a trigger makes this deck an overlay-mode deck (the
        // runtime activates it via active-app matching, not via nav).
        // Mirror that on the materialized deck so `computeSystemButtonForSlotN1`
        // injects `core:overlay-toggle` instead of `core:back` at n-1.
        isOverlay:
          (processNames !== undefined && processNames.length > 0) ||
          (windowNames !== undefined && windowNames.length > 0),
        ...(processNames !== undefined ? { processNames } : {}),
        ...(windowNames !== undefined ? { windowNames } : {}),
        ...(d.autoShow === true ? { autoShow: true } : {}),
        ...(d.icon !== undefined ? { icon: d.icon } : {}),
      }
      if (d.paginated === true && runtimeButtons.length > 0) {
        const pages = paginateDeck({
          baseDeckId: id,
          buttons: runtimeButtons,
          keyCount,
        })
        return pages.map((p) => {
          const mappedButtons: RuntimeDeck["buttons"] = (
            p.deck.buttons ?? []
          ).map((b, i) => {
            const { position, type, config, ...rest } = b as {
              position?: number
              type: string
              config?: unknown
            }
            const mergedConfig = {
              ...(typeof config === "object" && config !== null
                ? (config as Record<string, unknown>)
                : {}),
              ...rest,
            }
            return {
              id: position !== undefined ? String(position) : String(i),
              type,
              ...(Object.keys(mergedConfig).length > 0
                ? { config: mergedConfig }
                : {}),
            }
          })
          return {
            id: p.deckId,
            name: d.name ?? id,
            buttons: mappedButtons,
            ...sharedDeckFields,
          }
        })
      }
      return [
        {
          id,
          name: d.name ?? id,
          buttons: runtimeButtons,
          ...sharedDeckFields,
        },
      ]
    },
  )
  const effectiveDecks: RuntimeDeck[] =
    decks.length > 0
      ? decks
      : [{ id: "main", name: "Main", isMain: true, buttons: [] }]
  const allDecsWithSystemButtons = injectSystemButtons(
    materializeAddonDecks(
      registry,
      effectiveDecks,
      logger,
      keyCount,
      config.lock?.buttons,
    ),
    keyCount,
  )
  const { decks: allDecks, errorsByDeck } = applyConfigErrorReplacements(
    allDecsWithSystemButtons,
    config,
    registry,
    logger,
  )
  const { runtime, methods, pubSub, store } = createDeckRuntime({
    decks: allDecks,
    logger,
  })

  return {
    configPath: loaded.configPath,
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

interface DeckButtonError {
  position: number
  buttonId?: string
  details: string
}

/**
 * Walks each runtime deck and replaces any button whose (deckId, position)
 * was flagged as a config error with a `core:temporary-error` cell. The
 * full incorrect config and the full zod issues are logged once per
 * broken button so the operator can fix the YAML without digging through
 * a stack trace.
 *
 * Returns the patched decks plus a per-deck error map for downstream
 * surfacing in `deck-config` messages.
 */
const applyConfigErrorReplacements = (
  decks: ReadonlyArray<RuntimeDeck>,
  config: import("@/config/schemas").RawConfig,
  registry: AddonRegistry,
  logger: pino.Logger,
): {
  decks: RuntimeDeck[]
  errorsByDeck: Map<string, DeckButtonError[]>
} => {
  const perDeck = validatePerDeck(config, registry).perButton
  const brokenByDeckPosition = new Map<
    string,
    Map<number, { buttonId?: string; details: string; button: unknown }>
  >()
  for (const entry of perDeck) {
    if (entry.issues.length === 0) continue
    if (entry.position === undefined) continue
    const details = entry.schemaIssues
      .map(
        (i) =>
          `${[...i.path].join(".") || "(root)"}: ${i.message}`,
      )
      .join("; ") || entry.issues.map((i) => i.message).join("; ")
    logger.error(
      {
        deckId: entry.deckId,
        position: entry.position,
        buttonId: entry.buttonId,
        path: entry.path,
        config: entry.button,
        schemaIssues: entry.schemaIssues,
      },
      `invalid button config at ${entry.path}: ${details}`,
    )
    let perDeckMap = brokenByDeckPosition.get(entry.deckId)
    if (perDeckMap === undefined) {
      perDeckMap = new Map()
      brokenByDeckPosition.set(entry.deckId, perDeckMap)
    }
    perDeckMap.set(entry.position, {
      ...(entry.buttonId !== undefined ? { buttonId: entry.buttonId } : {}),
      details,
      button: entry.button,
    })
  }

  const errorsByDeck = new Map<string, DeckButtonError[]>()
  const patched = decks.map((deck) => {
    const brokenMap = brokenByDeckPosition.get(deck.id)
    if (brokenMap === undefined || brokenMap.size === 0) return deck
    const errors: DeckButtonError[] = []
    const buttons = deck.buttons.map((btn) => {
      const parsed = Number.parseInt(btn.id, 10)
      const position = btn.position ?? (Number.isFinite(parsed) ? parsed : undefined)
      if (position === undefined) return btn
      const broken = brokenMap.get(position)
      if (broken === undefined) return btn
      errors.push({
        position,
        ...(broken.buttonId !== undefined ? { buttonId: broken.buttonId } : {}),
        details: broken.details,
      })
      return {
        id: String(position),
        type: "core:temporary-error" as const,
        position,
        config: { details: broken.details },
      }
    })
    errorsByDeck.set(deck.id, errors)
    return { ...deck, buttons, buttonErrors: errors }
  })
  return { decks: patched, errorsByDeck }
}

const loadConfigAndTheme = (
  options: RunOptions,
  keyCount: number = 15,
): LoadConfigAndThemeResult => {
  const loaded = validateAndLoadConfig(options)
  return buildRuntime(options, loaded, keyCount)
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
  const { spawn } = await import("node:child_process")
  const executor = {
    async run(
      command: string,
      args: ReadonlyArray<string>,
      execOptions?: { timeoutMs?: number },
    ) {
      // Uses 'exit' (not 'close') so tools that keep stdio fds open after their
      // main exits — notably wl-copy — don't hang the runtime. Streams are
      // drained via 'data' events until 'exit' fires; once the process exits,
      // no further writes are possible.
      const timeoutMs = execOptions?.timeoutMs
      const start = Date.now()
      return await new Promise((resolve) => {
        const proc = spawn(command, [...args], {
          stdio: ["pipe", "pipe", "pipe"],
        })
        let stdout = ""
        let stderr = ""
        let timedOut = false
        let killTimer: ReturnType<typeof setTimeout> | undefined
        proc.stdout.on("data", (chunk: Buffer) => {
          stdout += chunk.toString()
        })
        proc.stderr.on("data", (chunk: Buffer) => {
          stderr += chunk.toString()
        })
        const onExit = (code: number | null): void => {
          if (killTimer !== undefined) clearTimeout(killTimer)
          resolve({
            exitCode: timedOut ? -1 : (code ?? -1),
            stdout,
            stderr,
            elapsedMs: Date.now() - start,
          })
        }
        proc.on("error", (err) => {
          if (killTimer !== undefined) clearTimeout(killTimer)
          resolve({
            exitCode: -1,
            stdout,
            stderr: stderr ? `${stderr}\n${err.message}` : err.message,
            elapsedMs: Date.now() - start,
          })
        })
        proc.on("exit", onExit)
        if (timeoutMs !== undefined && timeoutMs > 0) {
          killTimer = setTimeout(() => {
            timedOut = true
            proc.kill("SIGKILL")
          }, timeoutMs)
        }
      })
    },
  }

  const env = { ...process.env } as Readonly<Record<string, string>>
  const platform = process.platform

  // ponytail: when the CLI is launched from a stripped-PATH environment
  // (systemd/launchd/IDE), `which ydotool` returns nothing even when the
  // binary exists at /usr/local/bin. Probe a few well-known install dirs
  // as a fallback so the requirements check doesn't false-negative.
  const wellKnownBinDirs = [
    "/usr/local/bin",
    "/usr/bin",
    `${homedir()}/.local/bin`,
    "/snap/bin",
    "/opt/homebrew/bin",
  ]
  const extraFsProbe = (command: string): boolean => {
    for (const dir of wellKnownBinDirs) {
      if (existsSync(join(dir, command))) return true
    }
    return false
  }

  const requirements = await checkRequirements({
    platform,
    executor,
    env,
    extraFsProbe,
  })
  methods.setRequirements(requirements)
  for (const [capability, status] of Object.entries(requirements)) {
    const warning = formatCapabilityWarning(
      capability as SystemCapability,
      status,
    )
    if (warning.length > 0) {
      logger.warn({ capability, status }, warning)
    }
  }

  const [activeApp, session, keyMacro] = await Promise.all([
    createActiveAppProvider({ platform, executor, logger }),
    createSessionProvider({ platform, logger }),
    createKeyMacroProvider({ platform, executor, env, logger, extraFsProbe }),
  ])

  runtime.setActiveAppProvider(activeApp)
  runtime.setSessionProvider(session)
  methods.setKeyMacroProvider(keyMacro)

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
  // Validate the config first so a broken YAML exits before we ever touch
  // hardware or spawn an emulator.
  validateAndLoadConfig(options)
  const outputClient = selectOutputClient({
    emulator: options.emulator === true,
    xdgConfigHome: resolveXdgConfigHome(options),
  })
  await outputClient.validateReady()
  void logger
}

export const runPipeline = async (options: RunOptions): Promise<void> => {
  const { logger } = options

  const xdgConfigHome = resolveXdgConfigHome(options)

  // Validate config first so a broken YAML exits without ever touching
  // hardware (or spawning an emulator).
  const loadedConfig = validateAndLoadConfig(options)

  const outputClient: OutputClient = selectOutputClient({
    emulator: options.emulator === true,
    xdgConfigHome,
  })
  const devices = await outputClient.listDevices()
  const savedDevice = loadDeviceConfig({ xdgConfigHome })
  const descriptor = await outputClient.selectDevice(
    devices,
    savedDevice?.serial ?? null,
    logger,
  )
  await outputClient.storeSelection(descriptor)

  const loaded = buildRuntime(options, loadedConfig, descriptor.keyCount)
  const { themeDir, decks, pubSub, runtime, methods, store } = loaded

  const providers = await startSystemProviders(options, runtime, methods)

  const isCompact = outputClient.kind === "real"

  const addonBundle = await buildAddonBundle()

  const bridge = await startWsBridge({ port: 52937 })
  const wsPort = bridge.port

  // ponytail: register external addon dirs (from config's `addons:` list) so
  // `addon://<name>/assets/icon.png` resolves for overlay deck icons. The
  // addonDirs built from addonBundle.addonByType only contains builtins.
  // Note: `loaded` here is the RUNTIME result from buildRuntime — it shadows
  // the config loader's `loaded`. Use `loadedConfig` (the LoadConfigResult) to
  // access the parsed config and configPath.
  const externalAddonDirs = new Map<string, string>()
  for (const entry of loadedConfig.config.addons ?? []) {
    const source = typeof entry === "string" ? entry : entry.source
    if (typeof source !== "string" || source.length === 0) continue
    const expanded = source.startsWith("~/")
      ? join(homedir(), source.slice(2))
      : source
    const abs = isAbsolute(expanded)
      ? expanded
      : resolvePath(dirname(loadedConfig.configPath), expanded)
    externalAddonDirs.set(basename(abs), abs)
  }

  const resolverOptions = buildResolverOptions(
    addonBundle.addonByType,
    [dirname(loadedConfig.configPath)],
    externalAddonDirs,
  )

  const bridgeSignal = new AbortController()
  const statePublisher = new StatePublisher({ bridge, logger })

  const addonRegistryForSystemStatus = new AddonRegistry()
  registerSystemStatusAddon(addonRegistryForSystemStatus, pubSub, bridgeSignal.signal)

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
    isCompact,
    resolverOptions,
    ...(mainDeck !== undefined ? { initialDeck: mainDeck } : {}),
    signal: bridgeSignal.signal,
    store,
    logger,
  })

  for (const deck of decks) {
    registerDeckIcon(deck, resolverOptions, logger)
    registerIconForDeck(deck.buttons, resolverOptions, logger)
  }

  bridge.onConnection((socket) => {
    // Send the full asset bundle to every new connection. The previous
    // dedupe-by-id approach caused the React frontend to render the
    // fallback icon after a hot-reload or page refresh: the FIRST
    // connection consumed the assets, every subsequent connection got
    // an empty list, and the new client started with an empty cache.
    // Assets are tiny (a 1.4KB chrome.svg), so re-sending them on
    // reconnect is cheaper than the bug.
    const allAssets = getUnsentAssets(new Set())
    if (allAssets.length > 0) {
      socket.send(
        JSON.stringify({
          type: "assets",
          deckId: mainDeck?.id ?? "",
          assets: allAssets.map((a) => ({
            id: a.id,
            filename: a.fullPath,
            src: a.src,
          })),
        }),
      )
    }
    const activeDeck = runtime.getActiveDeck()
    if (activeDeck !== undefined) {
      const msg = buildDeckConfigMessage(
        activeDeck,
        addonBundle.addonByType,
        resolverOptions,
        {
          navStackDepth: runtime.navStackDepth(),
          hasOverlayDeckAvailable: runtime.hasOverlayDeckAvailable(),
        },
        descriptor.keyCount,
        outputClient.kind === "real",
        (fullPath) => getAssetByPath(fullPath)?.id,
        runtime.getAvailableOverlayDeckIcon(),
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

  const onServiceLog = (entry: { level: string; msg: string; ts: number }) => {
    bridge.broadcast({
      type: "service-log",
      level: entry.level,
      msg: entry.msg,
      ts: entry.ts,
    })
  }
  process.on("sireno:log", onServiceLog)

  const outputHandle: OutputHandle = await outputClient.init({
    bridge,
    runtime,
    pubSub,
    store,
    decks,
    theme: { name: loaded.theme.name, apiVersion: loaded.theme.apiVersion },
    themeDir,
    logger,
    rebuildDecksForKeyCount: (keyCount: number) =>
      buildRuntime(options, loadedConfig, keyCount).decks,
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

  // Hot-reload: watch the YAML config for changes. Deck-only changes
  // rebuild the runtime deck set in-place and rebroadcast deck-config;
  // anything else (theme, addons, lock, logging) tears down Vite and
  // re-initialises the output client with the new theme.
  let currentOutputHandle: OutputHandle = outputHandle
  let currentLoadedConfig = loadedConfig
  const configWatcher = new ConfigWatcher([loadedConfig.configPath], {
    onChange: () => {
      void handleConfigChange()
    },
  })
  const handleConfigChange = async (): Promise<void> => {
    try {
      const nextLoaded = validateAndLoadConfig(options)
      const prevConfig = currentLoadedConfig.config
      const decksOnlyChange = decksChanged(prevConfig, nextLoaded.config)
      if (decksOnlyChange) {
        const rebuilt = buildRuntime(options, nextLoaded, descriptor.keyCount).decks
        const activeId = runtime.getActiveDeckId()
        runtime.setDecks(rebuilt)
        if (!Object.prototype.hasOwnProperty.call(nextLoaded.config.decks, activeId)) {
          const fallback =
            nextLoaded.config.decks["main"] !== undefined
              ? "main"
              : Object.keys(nextLoaded.config.decks)[0] ?? activeId
          runtime.navigateToDeck(fallback, { addToHistory: false })
        }
        const activeDeck = runtime.getActiveDeck()
        const msg = buildDeckConfigMessage(
          activeDeck,
          addonBundle.addonByType,
          resolverOptions,
          {
            navStackDepth: runtime.navStackDepth(),
            hasOverlayDeckAvailable: runtime.hasOverlayDeckAvailable(),
          },
          descriptor.keyCount,
          outputClient.kind === "real",
          (fullPath) => getAssetByPath(fullPath)?.id,
          runtime.getAvailableOverlayDeckIcon(),
        )
        bridge.broadcast(msg)
        currentLoadedConfig = nextLoaded
        logger.info(
          {
            deckId: msg.deckId,
            buttonCount: msg.surfaces[msg.deckId]?.buttons.length,
          },
          "config hot-reloaded (decks only)",
        )
        return
      }
      // Theme / addons / lock / logging changed — full Vite restart so the
      // frontend picks up new theme CSS + virtual modules.
      logger.info(
        { prevTheme: prevConfig.theme, nextTheme: nextLoaded.config.theme },
        "config change outside decks — restarting Vite",
      )
      await currentOutputHandle.stop()
      const nextHandle = await outputClient.init({
        bridge,
        runtime,
        pubSub,
        store,
        decks: buildRuntime(options, nextLoaded, descriptor.keyCount).decks,
        theme: {
          name: nextLoaded.theme.name,
          apiVersion: nextLoaded.theme.apiVersion,
        },
        themeDir: nextLoaded.themeDir,
        logger,
        rebuildDecksForKeyCount: (keyCount: number) =>
          buildRuntime(options, nextLoaded, keyCount).decks,
        ...(options.frontendUrl !== undefined
          ? { frontendUrl: options.frontendUrl }
          : {}),
        ...(options.port !== undefined ? { port: options.port } : {}),
        ...(options.intervalMs !== undefined
          ? { intervalMs: options.intervalMs }
          : {}),
      })
      currentOutputHandle = nextHandle
      currentLoadedConfig = nextLoaded
      if (options.onChildren !== undefined) {
        options.onChildren([...nextHandle.childPids])
      }
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        "config change failed; keeping previous config",
      )
    }
  }
  await configWatcher.start({ ignoreInitial: true })

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
    if (options.emulator !== true && typeof currentOutputHandle.pushBlackFrame === "function") {
      try {
        await currentOutputHandle.pushBlackFrame()
      } catch (err) {
        logger.warn({ err: (err as Error).message }, "pushBlackFrame failed")
      }
    }
    process.removeListener("sireno:log", onServiceLog)
    await configWatcher.close()
    await Promise.allSettled([
      currentOutputHandle.stop(),
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
