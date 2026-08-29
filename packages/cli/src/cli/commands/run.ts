import { exec } from "node:child_process"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { homedir, networkInterfaces } from "node:os"
import {
  basename,
  dirname,
  isAbsolute,
  join,
  resolve as resolvePath,
} from "node:path"

import type pino from "pino"

import { SIRENO_ADDON_API_VERSION } from "@/addon/api-types"
import { loadAddons } from "@/addon/loader"
import { AddonRegistry } from "@/addon/registry"
import { registerBuiltins } from "@/builtin-addons"
import { registerSystemStatusAddon } from "@/builtin-addons/system-status"
import { decksChanged } from "@/config/config-diff"
import { loadConfig } from "@/config/loader"
import { resolveConfigPath, resolveXdgConfigHome } from "./pipeline/helpers"
import {
  formatFullIssues,
  validateButton,
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
import { subscribeNavigateDeck } from "@/deck/runtime-subscriptions"
import {
  createActiveAppProvider,
  type ActiveAppProvider,
} from "@/system/providers/active-app"
import { createKeyMacroProvider } from "@/system/providers/key-macro"
import { createNotificationProvider } from "@/system/providers/notification"
import { createSessionProvider } from "@/system/providers/session"
import type { CommandExecutor } from "@/system/providers/shared"
import {
  checkRequirements,
  formatCapabilityWarning,
  type SystemCapability,
} from "@/system/requirements"
import { copyThemeAssets, resolveActiveTheme } from "@/themes/loader"
import { resolveAddonCacheDir } from "@/util/cache-paths"

import { createActionExecutor } from "@/action/executor"
import {
  getAssetByPath,
  getUnsentAssets,
  registerDeckIcon,
  registerIconForDeck,
} from "@/core/icon-asset-registry"
import { ConfigWatcher } from "@/core/watcher"
import { bridgeAddonServices } from "@/deck/addon-handler-bridge"
import {
  buildDeckConfigMessage,
  buildDeckTree,
  buildResolverOptions,
  type AddonFrontendRef,
} from "@/deck/deck-config"
import { getHostContext } from "@/deck/host-context"
import { StatePublisher } from "@/render/state-publisher"
import { startWsBridge, type WsBridge } from "@/render/ws-bridge"

import {
  selectOutputClient,
  type OutputClient,
  type OutputHandle,
} from "@/outputClient"
import type { AddonInventoryEntry } from "@/api/protocol-internal"
import { loadDeviceConfig } from "@/util/device-config"
import { readToken } from "@/util/daemon"
import { materializeAddonDecks } from "./addon-decks"
import {
  collectBuiltinAddonRegistry,
  type ScannedAddon,
  type ScannedButtonType,
  type ScannedDeck,
} from "./addon-registry"
import { resolveFrontendCwd } from "./emulator-mode"
import { selectLanAddresses } from "./network-bind"

export interface SignalProvider {
  onSignal(handler: () => void): () => void
  // ponytail: SIGUSR1 is the in-place-reload primitive (production's
  // systemctl reload-or-restart and the dev `pnpm dev reload` both send
  // it). Without a registered handler, Node's default action for SIGUSR1
  // is to terminate the process — meaning every `reload` call today is
  // a latent daemon crash. Wire the handler so SIGUSR1 triggers a
  // runtime.invalidate() (re-broadcast deck-config + nudge the
  // BrowserRenderer's screenshot tick). Tests construct their own
  // SignalProvider; update them to supply onReload too.
  onReload(handler: () => void): () => void
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
  onReload(handler: () => void): () => void {
    // ponytail: use `process.on` (not `process.once`) so the handler stays
    // registered across reloads. `process.once` would fire once and then the
    // second SIGUSR1 would fall through to Node's default (terminate).
    // The returned unregister calls `process.off`, which works the same
    // for either form — we just need the listener to persist.
    process.on("SIGUSR1", handler)
    return () => process.off("SIGUSR1", handler)
  },
}

export interface RunOptions {
  readonly config?: string
  readonly port?: number
  readonly emulator?: boolean
  readonly remote?: boolean
  readonly deviceModel?: string
  readonly frontendUrl?: string
  readonly intervalMs?: number
  readonly xdgConfigHome?: string
  readonly homeDir?: string
  readonly signals?: SignalProvider
  readonly onChildren?: (pids: ReadonlyArray<number>) => void
  readonly onAddonsUpdate?: (addons: ReadonlyArray<ScannedAddon>) => void
  readonly logger: pino.Logger
  token?: string
}

export interface SetupAddonServicesOptions {
  readonly runtime: Runtime
  readonly methods: Methods
  readonly decks: ReadonlyArray<RuntimeDeck>
  readonly pubSub: PubSub
  readonly scanned: ReadonlyArray<ScannedAddon>
  readonly externalAddons: ReadonlyArray<ScannedAddon>
  readonly addonByType: Map<string, AddonFrontendRef>
  readonly executor: ReturnType<typeof createActionExecutor>
  readonly statePublisher: Pick<
    StatePublisher,
    "registerChannel" | "setActiveDeck"
  >
  readonly bridge: Pick<WsBridge, "broadcast" | "registerCacheablePoller">
  readonly isCompact: boolean
  readonly initialDeck?: RuntimeDeck
  readonly signal: AbortSignal
  readonly store: Store
  readonly logger: pino.Logger
  // ponytail: type is inferred from buildResolverOptions — adding a named
  // type here would re-import a stale pre-existing module
  // (`@/render/icon-resolver`) that doesn't exist on disk.
  readonly resolverOptions: ReturnType<typeof buildResolverOptions>
  /** Optional host callback that re-materializes addon decks (dynamic decks). */
  readonly requestDeckRebuild?: () => void
}

export interface SetupAddonServicesResult {
  readonly dispose: () => void
}

const collectActiveDeckAddonNames = (
  deck: RuntimeDeck,
  addonByType: Map<string, AddonFrontendRef>,
): string[] => {
  const addonNames = new Set<string>()
  for (const button of deck.buttons ?? []) {
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
    externalAddons,
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
    requestDeckRebuild,
  } = options

  void bridgeAddonServices({
    runtime,
    decks,
    scanned,
    externalAddons,
    executor,
    pubSub,
    signal,
    logger,
    statePublisher,
    bridge,
    store,
    methods,
    ...(requestDeckRebuild !== undefined ? { requestDeckRebuild } : {}),
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
          inOverlayMode: runtime.getOverlay() !== null,
        },
        undefined,
        isCompact,
        (fullPath) => getAssetByPath(fullPath)?.id,
        runtime.getAvailableOverlayDeckIcon(),
        runtime.getAvailableOverlayDeckName(),
        { lockActive: runtime.isLockActive() },
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
          inOverlayMode: runtime.getOverlay() !== null,
        },
        undefined,
        isCompact,
        (fullPath) => getAssetByPath(fullPath)?.id,
        runtime.getAvailableOverlayDeckIcon(),
        runtime.getAvailableOverlayDeckName(),
        { lockActive: runtime.isLockActive() },
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

  // ponytail: periodic heartbeat — ensures the frontend's overlay state
  // stays in sync after a transient disconnect or missed event. Fires every
  // 2s, cheap (one deck-config per cycle), and idempotent on the frontend.
  // Skip the broadcast when nothing observable changed since the last tick:
  // an unconditional tick at 1s forced every client to re-render twice a
  // second even with identical state, which drowned the emulator shell and
  // starved the bridge's event loop during the 5s handshake window.
  let lastHeartbeatKey = ""
  const heartbeat = setInterval(() => {
    const activeDeck = runtime.getActiveDeck()
    if (activeDeck === undefined) return
    const key = [
      activeDeck.id,
      runtime.navStackDepth(),
      runtime.hasOverlayDeckAvailable(),
      runtime.getAvailableOverlayDeckIcon(),
      runtime.getAvailableOverlayDeckName(),
      isCompact,
      runtime.getOverlay() !== null,
    ].join("|")
    if (key === lastHeartbeatKey) return
    lastHeartbeatKey = key
    const msg = buildDeckConfigMessage(
      activeDeck,
      addonByType,
      resolverOptions,
      {
        navStackDepth: runtime.navStackDepth(),
        hasOverlayDeckAvailable: runtime.hasOverlayDeckAvailable(),
        inOverlayMode: runtime.getOverlay() !== null,
      },
      undefined,
      isCompact,
      (fullPath) => getAssetByPath(fullPath)?.id,
      runtime.getAvailableOverlayDeckIcon(),
      runtime.getAvailableOverlayDeckName(),
      { lockActive: runtime.isLockActive() },
    )
    bridge.broadcast(msg)
  }, 2000)
  signal.addEventListener("abort", () => clearInterval(heartbeat))

  const unsubscribeNavigate = subscribeNavigateDeck(pubSub, runtime)

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
      const details =
        "details" in payload &&
        typeof (payload as { details?: unknown }).details === "string"
          ? (payload as { details: string }).details
          : undefined
      if (!Number.isFinite(position) || position < 0) return
      bridge.broadcast({
        type: "button-error",
        deckId,
        position,
        durationMs: Number.isFinite(durationMs) ? durationMs : 5000,
        ...(details !== undefined ? { details } : {}),
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
  readonly sourceDecks: ReadonlyArray<RuntimeDeck>
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
  readonly addonSpecToName: ReadonlyMap<string, string>
  readonly addonEntryPaths: ReadonlyMap<string, string>
}

const loadExternalAddonsIntoRegistry = async (
  registry: AddonRegistry,
  config: ReturnType<typeof loadConfig>["config"],
  configDir: string,
  homeDir: string,
  logger: RunOptions["logger"],
): Promise<{
  specToName: Map<string, string>
  nameToEntryPath: Map<string, string>
}> => {
  // ponytail: returns specifier→manifest name for addons that successfully
  // registered. The override map in buildRuntime keys on manifest name (what
  // materializeAddonDecks looks up) — the user wrote `src:` (path), so we
  // resolve the two here. nameToEntryPath feeds buildExternalScannedAddons
  // so the bridge can import the entry file at runtime.
  const specToName = new Map<string, string>()
  const nameToEntryPath = new Map<string, string>()
  const entries = config.addons ?? []
  if (entries.length === 0) return { specToName, nameToEntryPath }
  const result = await loadAddons({
    entries,
    configDir,
    homeDir,
    currentApiVersion: SIRENO_ADDON_API_VERSION,
    cacheDir: resolveAddonCacheDir(),
  })
  for (const issue of result.issues) {
    const payload = { source: issue.source, message: issue.message }
    if (issue.level === "error") logger.error(payload, "addon load error")
    else if (issue.level === "warning")
      logger.warn(payload, "addon load warning")
    else logger.info(payload, "addon load info")
  }
  for (const loaded of result.addons) {
    try {
      registry.load(loaded.manifest)
      specToName.set(loaded.source.specifier, loaded.manifest.name)
      nameToEntryPath.set(loaded.manifest.name, loaded.entryPath)
      logger.info(
        { addon: loaded.manifest.name, source: loaded.source.specifier },
        "addon loaded",
      )
    } catch (err) {
      logger.error(
        { err, addon: loaded.manifest.name },
        "addon failed to register",
      )
    }
  }
  return { specToName, nameToEntryPath }
}

export const validateAndLoadConfig = async (
  options: RunOptions,
): Promise<LoadConfigResult> => {
  const resolved = resolveConfigPath(options)
  const configPath = resolved.path
  options.logger.info(
    { configPath, source: resolved.source },
    `start: using config ${configPath}`,
  )
  const { config } = loadConfig({ configPath })
  const registry = new AddonRegistry()
  registerBuiltins(registry)
  // ponytail: wire `config.addons[]` into the registry. Without this the
  // loader's only caller was the test suite, so chrome-overlay et al. were
  // never registered — builtins only. Load failures stay non-fatal (one bad
  // addon must not kill the daemon); issues are surfaced through the logger.
  const { specToName: addonSpecToName, nameToEntryPath: addonEntryPaths } =
    await loadExternalAddonsIntoRegistry(
      registry,
      config,
      dirname(configPath),
      options.homeDir ?? homedir(),
      options.logger,
    )
  // ponytail: dump every deck type the registry holds so the operator can
  // see at startup which addons registered and which got silently skipped.
  options.logger.info(
    {
      addonDecks: registry.listDeckTypes?.(),
      userDecks: Object.keys(config.decks),
      addonConfigEntries: (config.addons ?? []).map((a) =>
        typeof a === "string" ? a : a.src,
      ),
    },
    "registry: deck types loaded",
  )
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
    // ponytail: theme paths in config.yml are relative to the config file's
    // directory, not to process.cwd(). `loadThemeFromPath` resolves via
    // `path.resolve(themePath)`, which uses cwd — and the dev wrapper sets
    // cwd to packages/cli/. Pre-resolve here so `./packages/themes/...`
    // works regardless of where the daemon is launched from.
    theme:
      config.theme !== undefined &&
      (config.theme.startsWith("./") || config.theme.startsWith("../"))
        ? resolvePath(dirname(configPath), config.theme)
        : config.theme,
  })
  const themeDir: string = resolveFrontendCwd()
  const cssContent: string = getCss()
  if (cssContent.length > 0) {
    const cssDir = join(themeDir, ".sireno-deck")
    if (!existsSync(cssDir)) mkdirSync(cssDir, { recursive: true })
    writeFileSync(join(cssDir, "theme.css"), cssContent, "utf8")
    copyThemeAssets(dirname(theme.manifestPath), cssDir)
  }
  process.env["SIRENO_THEME_DIR"] = themeDir
  process.env["SIRENO_THEME"] = JSON.stringify({
    name: theme.name,
    manifestPath: theme.manifestPath,
    uiOverridesPath: theme.uiOverridesPath,
  })
  process.env["SIRENO_THEME_NAME"] = theme.name
  return {
    configPath,
    config,
    registry,
    theme,
    themeDir,
    addonSpecToName,
    addonEntryPaths,
  }
}

export const buildAddonConfigOverrides = (
  addonEntries: ReadonlyArray<unknown>,
  addonSpecToName: ReadonlyMap<string, string>,
  logger: pino.Logger,
): Map<
  string,
  {
    addonWideConfig: Record<string, unknown>
    perDeck: Map<string, import("@/cli/commands/addon-decks").AddonDeckOverride>
    defaults: { autoShow?: boolean } | undefined
  }
> => {
  const overrides = new Map<
    string,
    {
      addonWideConfig: Record<string, unknown>
      perDeck: Map<
        string,
        import("@/cli/commands/addon-decks").AddonDeckOverride
      >
      defaults: { autoShow?: boolean } | undefined
    }
  >()
  for (const entry of addonEntries) {
    // ponytail: `addons[]` entries are either a raw string spec or
    // `{src, enabled?, config?}`. The user wrote `src:` (or just a string
    // for the spec). Normalize here so we have a single source-of-truth key.
    const src =
      typeof entry === "string"
        ? entry
        : typeof entry === "object" &&
            entry !== null &&
            typeof (entry as { src?: unknown }).src === "string"
          ? (entry as { src: string }).src
          : null
    if (src === null) continue
    const cfg =
      typeof entry === "object" && entry !== null
        ? (entry as { config?: unknown }).config
        : undefined
    if (typeof cfg !== "object" || cfg === null) continue
    // ponytail: addonWideConfig is everything under `entry.config` EXCEPT
    // `decks` (which carries per-deck overrides) and `defaults` (which carries
    // addon-wide deck defaults). We accept unknown keys here because the
    // schema only constrains the `decks` sub-record.
    const {
      decks: perDeckRaw,
      defaults,
      ...rest
    } = cfg as {
      decks?: Record<
        string,
        import("@/cli/commands/addon-decks").AddonDeckOverride
      >
      defaults?: { autoShow?: boolean }
    } & Record<string, unknown>
    // ponytail: key on the loaded addon's manifest name — that's what
    // materializeAddonDecks looks up. The user wrote `src:` (path or npm
    // specifier); `addonSpecToName` resolves it post-load. If the addon
    // didn't load (path typo, missing module), warn and drop the override.
    const addonName = addonSpecToName.get(src)
    if (addonName === undefined) {
      logger.warn(
        { src },
        "addon config override targets an addon that failed to load; ignoring",
      )
      continue
    }
    overrides.set(addonName, {
      addonWideConfig: rest,
      perDeck: new Map(Object.entries(perDeckRaw ?? {})),
      defaults,
    })
  }
  return overrides
}

const buildRuntime = (
  options: RunOptions,
  loaded: LoadConfigResult,
  keyCount: number,
  lockActive: boolean = false,
): LoadConfigAndThemeResult => {
  const { logger } = options
  const { config, registry, theme, themeDir } = loaded

  const decks: RuntimeDeck[] = Object.entries(config.decks).flatMap(
    ([id, d]) => {
      const objectButtons = d.buttons.filter(
        (b): b is Exclude<(typeof d.buttons)[number], string> =>
          typeof b !== "string",
      )
      // ponytail: recompute from snapshot every keyCount change — prior state
      // is stale the moment keyCount differs. positionButtons is the
      // authoritative assignment for the current device.
      const runtimeButtons: RuntimeDeck["buttons"] = positionButtons(
        objectButtons,
        keyCount,
        logger,
      ).map((b) => ({
        id: `${b.position}-${id}-0`,
        type: b.type,
        ...(b.position !== undefined ? { position: b.position } : {}),
        ...(typeof b.config === "object" && b.config !== null
          ? { config: b.config }
          : {}),
        ...(b.actions !== undefined ? { actions: b.actions } : {}),
        ...(b.variant !== undefined && b.variant.length > 0
          ? { variant: b.variant }
          : {}),
        ...(b.buttonColor !== undefined ? { buttonColor: b.buttonColor } : {}),
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
        ...(processNames !== undefined ? { processNames } : {}),
        ...(windowNames !== undefined ? { windowNames } : {}),
        ...(d.autoShow === true ? { autoShow: true } : {}),
        ...(d.icon !== undefined ? { icon: d.icon } : {}),
      }
      if (runtimeButtons.length > keyCount - 1) {
        const pages = paginateDeck({
          baseDeckId: id,
          buttons: runtimeButtons,
          keyCount,
        })
        return pages.map((p) => {
          const mappedButtons: RuntimeDeck["buttons"] = (
            p.deck.buttons ?? []
          ).map((b, i) => {
            const {
              position,
              type,
              config,
              buttonColor,
              id: _btnId,
              ...rest
            } = b as {
              position?: number
              type: string
              config?: unknown
              buttonColor?:
                | "blue"
                | "green"
                | "purple"
                | "cyan"
                | "magenta"
                | "amber"
                | "lime"
              id?: string
            }
            const mergedConfig = {
              ...(typeof config === "object" && config !== null
                ? (config as Record<string, unknown>)
                : {}),
              ...rest,
            }
            return {
              id: `${position}-${id}-${p.pageIndex}`,
              type,
              ...(position !== undefined ? { position } : {}),
              ...(buttonColor !== undefined ? { buttonColor } : {}),
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

  // ponytail: phase 11 — collect per-addon overrides from
  // `addons[i].config.decks.<deckId>` into a single map keyed by addon
  // name. addonWideConfig carries opaque keys (the addon reads them in
  // createDeck(s)); perDeck is keyed by addon-deck-id.
  const addonConfigOverrides = buildAddonConfigOverrides(
    config.addons ?? [],
    loaded.addonSpecToName,
    logger,
  )

  const effectiveDecks: RuntimeDeck[] =
    decks.length > 0
      ? decks
      : [{ id: "main", name: "Main", isMain: true, buttons: [] }]
  const sourceDecks = materializeAddonDecks(
    registry,
    effectiveDecks,
    logger,
    keyCount,
    config.lock?.buttons,
    addonConfigOverrides,
  )
  const allDecsWithSystemButtons = injectSystemButtons(sourceDecks, keyCount, {
    lockActive,
  })
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
    sourceDecks,
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
 * ponytail: invalid buttons keep their assigned slot — the user sees exactly
 * which slot is broken. Validation uses the runtime button's assigned
 * position (from positionButtons), not the optional config-defined position.
 *
 * Returns the patched decks plus a per-deck error map for downstream
 * surfacing in `deck-config` messages.
 */
export const applyConfigErrorReplacements = (
  decks: ReadonlyArray<RuntimeDeck>,
  config: import("@/config/schemas").RawConfig,
  registry: AddonRegistry,
  logger: pino.Logger,
): {
  decks: RuntimeDeck[]
  errorsByDeck: Map<string, DeckButtonError[]>
} => {
  const brokenByDeckPosition = new Map<
    string,
    Map<number, { details: string; button: unknown }>
  >()

  for (const deck of decks) {
    for (const btn of deck.buttons ?? []) {
      // ponytail: skip addon-injected decks — their buttons have semantic ids
      // (e.g. brightness-down, app-info, back) and `internal:true` services;
      // re-validating them via the user-config schema always fails.
      const isAddonInjectedDeck = deck.id.startsWith("internal-settings:")
      if (isAddonInjectedDeck) continue
      const position = btn.position
      if (position === undefined) continue
      // ponytail: skip system buttons — they are injected, not user-configured
      if (btn.type.startsWith("core:")) continue

      const path = `decks.${deck.id}.buttons[@position:${position}]`
      const { issues, schemaIssues } = validateButton(
        btn as unknown as import("@/config/schemas").RawButtonDef,
        registry,
        path,
        deck.id,
        position,
      )
      if (issues.length === 0) continue

      const details =
        schemaIssues
          .map((i) => `${[...i.path].join(".") || "(root)"}: ${i.message}`)
          .join("; ") || issues.map((i) => i.message).join("; ")
      logger.warn(
        {
          deckId: deck.id,
          position,
          buttonId: btn.id,
          path,
          config: btn,
          schemaIssues,
        },
        `invalid button at ${deck.id}:${position}: ${details}`,
      )
      let perDeckMap = brokenByDeckPosition.get(deck.id)
      if (perDeckMap === undefined) {
        perDeckMap = new Map()
        brokenByDeckPosition.set(deck.id, perDeckMap)
      }
      perDeckMap.set(position, { details, button: btn })
    }
  }

  const errorsByDeck = new Map<string, DeckButtonError[]>()
  const patched = decks.map((deck) => {
    const brokenMap = brokenByDeckPosition.get(deck.id)
    if (brokenMap === undefined || brokenMap.size === 0) return deck
    const errors: DeckButtonError[] = []
    const buttons = deck.buttons.map((btn) => {
      const position = btn.position
      if (position === undefined) return btn
      const broken = brokenMap.get(position)
      if (broken === undefined) return btn
      errors.push({ position, details: broken.details })
      return {
        id: `${position}-${deck.id}-0`,
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

const loadConfigAndTheme = async (
  options: RunOptions,
  keyCount: number = 15,
): Promise<LoadConfigAndThemeResult> => {
  const loaded = await validateAndLoadConfig(options)
  return buildRuntime(options, loaded, keyCount)
}

interface SystemProviders {
  readonly activeApp: ActiveAppProvider
  readonly session: import("@/system/providers/session").SessionProvider
  readonly keyMacro: import("@/system/providers/key-macro").KeyMacroProvider
  readonly notification: import("@/system/providers/notification").NotificationProvider
}

const startSystemProviders = async (
  options: RunOptions,
  runtime: Runtime,
  methods: Methods,
): Promise<SystemProviders> => {
  const { logger } = options
  const { spawn } = await import("node:child_process")
  const executor: CommandExecutor = {
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
          })
        }
        proc.on("error", (err) => {
          if (killTimer !== undefined) clearTimeout(killTimer)
          resolve({
            exitCode: -1,
            stdout,
            stderr: stderr ? `${stderr}\n${err.message}` : err.message,
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

  const [activeApp, session, keyMacro, notification] = await Promise.all([
    createActiveAppProvider({ platform, executor, logger }),
    createSessionProvider({
      platform,
      executor,
      logger,
    }),
    createKeyMacroProvider({ platform, executor, env, logger, extraFsProbe }),
    createNotificationProvider({
      platform,
      executor,
      env,
      logger,
      extraFsProbe,
    }),
  ])

  runtime.setActiveAppProvider(activeApp)
  runtime.setSessionProvider(session)
  methods.setKeyMacroProvider(keyMacro)
  methods.setNotificationProvider(notification)

  return { activeApp, session, keyMacro, notification }
}

interface AddonRegistryBundle {
  readonly scanned: ReadonlyArray<ScannedAddon>
  readonly addonByType: Map<string, AddonFrontendRef>
}

// ponytail: shape a ScannedAddon into the addon-spec the frontend vite
// plugin expects (see packages/cli/src/vite/virtual-modules.ts). Both
// builtins and third-party addons share the same shape — only the source
// of `frontendEntry` differs. Reused by the runPipeline pass that merges
// externalScanned into SIRENO_ADDONS after both scanned arrays exist.
// ponytail: vite serves the ADDON SOURCE, not the bundled dist. The dist
// bundle aliases host-UI imports (e.g. '@/ui/primitives/Label') to an
// inert stub so plain Node can import it for manifest/globalService —
// serving that artifact to the browser amputates every core-UI label.
// Source restores vite's real host-alias resolution, so addons get the
// full core kit (any @sirenodeck/cli/ui component). Falls back to the
// dist entry when src/index.ts doesn't exist (npm-cached third-party
// addons ship compiled output only).
const browserFrontendMain = (entry: string): string => {
  const dir = dirname(entry)
  // Entry lives in <pkg>/dist (JSON-manifest addons, compiled) or directly
  // in <pkg> (regex-scanned builtins' index.ts). Normalize to pkg root.
  const pkgRoot = basename(dir) === "dist" ? dirname(dir) : dir
  const src = resolvePath(pkgRoot, "src", "index.ts")
  return existsSync(src) ? src : entry
}

export const addonSpecFromScanned = (s: ScannedAddon) => ({
  name: s.name,
  frontend:
    s.frontendEntry !== null
      ? { main: browserFrontendMain(s.frontendEntry) }
      : undefined,
  buttons: s.types.map((t) => ({ type: t })),
  buttonTypes: Object.fromEntries(
    Object.entries(s.buttonTypes).map(([type, info]) => [
      type,
      info.exportName,
    ]),
  ),
  defaultButton: s.defaultButton,
})

// ponytail: shape a ScannedAddon into the AddonsPage inventory entry the
// emulator renders. Mirrors the AddonsPage TypeScript shape so the WS
// message can flow straight into a prop without further mapping.
export const addonInventoryFromScanned = (
  s: ScannedAddon,
): AddonInventoryEntry => ({
  name: s.name,
  ...(s.path !== undefined ? { path: s.path } : {}),
  internal: s.internal === true,
  source: s.source,
  buttonTypes: Object.entries(s.buttonTypes).map(([type, info]) => ({
    type,
    internal: info.internal,
  })),
  defaultButton: s.defaultButton ?? null,
  decks: s.decks.map((d) => ({
    id: d.id,
    isOverlay: false,
    paginated: d.hasTrigger,
    buttons: d.buttons,
    internal: d.internal,
  })),
})

const buildAddonBundle = async (): Promise<AddonRegistryBundle> => {
  const registry = await collectBuiltinAddonRegistry()

  return { scanned: registry.scanned, addonByType: registry.byType }
}

// ponytail: previously SIRENO_ADDONS was populated inside buildAddonBundle
// from builtins only, so third-party addons (e.g. addon-pomodoro) never
// reached the frontend vite plugin's addonRegistry — ButtonSurface hit
// the `registryEntry === undefined` branch and rendered an empty
// ButtonFrame. External addons are registered via buildExternalScannedAddons
// after validateAndLoadConfig, so the merged env-var write has to happen
// here in runPipeline, after both scanned arrays exist.
export const publishSIRENO_ADDONS = (
  scanned: ReadonlyArray<ScannedAddon>,
  externalScanned: ReadonlyArray<ScannedAddon>,
): void => {
  if (process.env["SIRENO_ADDONS"] !== undefined) return
  process.env["SIRENO_ADDONS"] = JSON.stringify(
    [...scanned, ...externalScanned].map(addonSpecFromScanned),
  )
}

// ponytail: merge registry-loaded third-party addons into the bridge
// inventory. The bridge only receives the builtin `scanned` array; without
// this pass, AddonsPage shows builtins only and hides e.g. chrome-overlay.
export const buildExternalScannedAddons = (
  registry: AddonRegistry,
  builtinScanned: ReadonlyArray<ScannedAddon>,
  externalAddonDirs: ReadonlyMap<string, string>,
  externalEntryPaths: ReadonlyMap<string, string>,
): ReadonlyArray<ScannedAddon> => {
  const builtinNames = new Set(builtinScanned.map((a) => a.name))
  const out: ScannedAddon[] = []
  for (const manifest of registry.listAddons()) {
    if (builtinNames.has(manifest.name)) continue
    const types = Object.keys(manifest.buttonTypes)
    if (types.length === 0 && (manifest.decks ?? []).length === 0) continue
    const path = externalAddonDirs.get(manifest.name) ?? ""
    const entryPath = externalEntryPaths.get(manifest.name) ?? ""
    const buttonTypes: Record<string, ScannedButtonType> = {}
    for (const [type, def] of Object.entries(manifest.buttonTypes)) {
      buttonTypes[type] = {
        exportName: def.name ?? type,
        internal: def.service?.internal === true || def.internal === true,
      }
    }
    const decks: ScannedDeck[] = []
    for (const entry of manifest.decks ?? []) {
      if (typeof entry.createDecks === "function") {
        decks.push({
          id: `${manifest.name}:__multi__`,
          hasTrigger: false,
          paginated: false,
          buttons: -1,
          internal: entry.internal ?? false,
        })
      } else if (typeof entry.createDeck === "function") {
        const trigger = (entry as { trigger?: unknown }).trigger as
          | Record<string, unknown>
          | undefined
        const hasTrigger =
          trigger !== undefined &&
          (trigger["process_name"] !== undefined ||
            trigger["window_name"] !== undefined)
        decks.push({
          id: entry.id,
          hasTrigger,
          paginated: hasTrigger,
          buttons: -1,
          internal: entry.internal ?? false,
        })
      } else {
        const trigger = (entry as { trigger?: unknown }).trigger as
          | Record<string, unknown>
          | undefined
        const hasTrigger =
          trigger !== undefined &&
          (trigger["process_name"] !== undefined ||
            trigger["window_name"] !== undefined)
        decks.push({
          id: entry.id,
          hasTrigger,
          paginated: hasTrigger,
          buttons: Array.isArray(entry.buttons) ? entry.buttons.length : 0,
          internal: entry.internal ?? false,
        })
      }
    }
    const hasButtonTypes = types.length > 0
    const hasGlobalService = manifest.globalService !== undefined
    // ponytail: both slots point to the same entry file because one module
    // exports both `manifest.buttonTypes` and `manifest.globalService`. A
    // third-party addon that supplies only decks gets `null` for both and
    // the bridge skips its frontend/global service wiring (today's behavior).
    const frontendEntry = hasButtonTypes && entryPath !== "" ? entryPath : null
    const globalServiceEntry =
      hasGlobalService && entryPath !== "" ? entryPath : null
    out.push({
      name: manifest.name,
      types,
      frontendEntry,
      publishIntervalMs: manifest.publishIntervalMs ?? null,
      pollerEntry: null,
      buttonTypes,
      deckTypes: {},
      source: "json",
      globalServiceEntry,
      path,
      internal: false,
      decks,
    })
  }
  return out
}

const mergeAddonByType = (
  baseByType: Map<string, AddonFrontendRef>,
  externalScanned: ReadonlyArray<ScannedAddon>,
): Map<string, AddonFrontendRef> => {
  const merged = new Map(baseByType)
  for (const addon of externalScanned) {
    for (const type of addon.types) {
      if (!merged.has(type)) {
        merged.set(type, {
          name: addon.name,
          frontendEntry: addon.frontendEntry,
        })
      }
      if (type === `${addon.name}:${addon.name}` && !merged.has(addon.name)) {
        merged.set(addon.name, {
          name: addon.name,
          frontendEntry: addon.frontendEntry,
        })
      }
    }
  }
  return merged
}

// ponytail: extracted so tests can exercise the addon-spec-to-dir mapping
// without spinning up the full pipeline (WS bridge, output client, etc.).
// Reads `addons[]` from the parsed config — entries are either a raw string
// spec or `{src, enabled?, config?}`. The basename of the resolved path
// becomes the addon key for icon resolution; e.g. `{src: /p/chrome-overlay}`
// maps `addon://chrome-overlay/assets/foo.svg` to `/p/chrome-overlay/assets/foo.svg`.
export const buildExternalAddonDirs = (
  addonEntries: ReadonlyArray<unknown>,
  configPath: string,
): Map<string, string> => {
  const result = new Map<string, string>()
  for (const entry of addonEntries) {
    const source =
      typeof entry === "string"
        ? entry
        : typeof entry === "object" &&
            entry !== null &&
            typeof (entry as { src?: unknown }).src === "string"
          ? (entry as { src: string }).src
          : null
    if (source === null) continue
    const expanded = source.startsWith("~/")
      ? join(homedir(), source.slice(2))
      : source
    const abs = isAbsolute(expanded)
      ? expanded
      : resolvePath(dirname(configPath), expanded)
    // ponytail: addon:// asset resolution joins this dir + the icon's
    // subpath. Addons ship assets in <pkg>/dist/assets (post-build copy),
    // so prefer dist when present — also prevents this map from
    // clobbering the correct dirname(frontendEntry) registration in
    // buildResolverOptions. Source-only addons keep their root.
    const base = existsSync(join(abs, "dist")) ? join(abs, "dist") : abs
    result.set(basename(abs), base)
  }
  return result
}

export const runPipeline = async (options: RunOptions): Promise<void> => {
  const { logger } = options

  const xdgConfigHome = resolveXdgConfigHome(options)

  // ponytail: hoist every long-lived resource so the unconditional cleanup
  // block below runs even when outputClient.init() throws (e.g. Vite can't
  // bind the frontend port). Without this, the heartbeat setInterval, the
  // WS bridge, providers, and onConnection listeners all stay alive after
  // the rejection — the daemon process never exits and the user reports
  // "the app gets stuck and the service never starts".
  let loadedConfig: Awaited<ReturnType<typeof validateAndLoadConfig>> | null =
    null
  let outputClient: OutputClient | null = null
  let providers: Awaited<ReturnType<typeof startSystemProviders>> | null = null
  let addonBundle: Awaited<ReturnType<typeof buildAddonBundle>> | null = null
  let bridge: Awaited<ReturnType<typeof startWsBridge>> | null = null
  let addonServices: ReturnType<typeof setupAddonServices> | null = null
  let runtime: ReturnType<typeof buildRuntime>["runtime"] | null = null
  let methods: ReturnType<typeof buildRuntime>["methods"] | null = null
  let decks: ReadonlyArray<RuntimeDeck> | null = null
  let themeDir: string | null = null
  let pubSub: PubSub | null = null
  let store: Store | null = null
  let descriptor: Awaited<ReturnType<OutputClient["selectDevice"]>> | null =
    null
  let addonServicesDispose: (() => void) | null = null
  let bridgeSignal: AbortController | null = null
  let statePublisher: StatePublisher | null = null
  let configWatcher: ConfigWatcher | null = null
  let outputHandle: OutputHandle | null = null
  let currentOutputHandle: OutputHandle | null = null
  let unregisterSignal: (() => void) | null = null
  let unregisterReload: (() => void) | null = null
  let unsubscribeLockMode: (() => void) | null = null
  let removeServiceLogListener: (() => void) | null = null

  try {
    // Validate config first so a broken YAML exits before we ever touch
    // hardware or spawn an emulator.
    loadedConfig = await validateAndLoadConfig(options)

    outputClient = selectOutputClient({
      emulator: options.emulator === true,
      xdgConfigHome,
    })
    const devices = await outputClient.listDevices()
    const savedDevice = loadDeviceConfig({ xdgConfigHome })
    descriptor = await outputClient.selectDevice(
      devices,
      savedDevice?.serial ?? null,
      logger,
    )
    await outputClient.storeSelection(descriptor)

    const loaded = buildRuntime(options, loadedConfig, descriptor.keyCount)
    themeDir = loaded.themeDir
    decks = loaded.decks
    pubSub = loaded.pubSub
    runtime = loaded.runtime
    methods = loaded.methods
    store = loaded.store

    providers = await startSystemProviders(options, runtime, methods)

    const isCompact = outputClient.kind === "real"

    addonBundle = await buildAddonBundle()

    const remote = options.remote === true
    const lanAddresses = remote
      ? selectLanAddresses({ networkInterfaces: networkInterfaces })
      : []
    const lanHost = remote ? lanAddresses[0]?.address : undefined
    const bridgeHost: "127.0.0.1" | "0.0.0.0" = remote ? "0.0.0.0" : "127.0.0.1"

    bridge = await startWsBridge({
      port: 52937,
      host: bridgeHost,
      ...(lanHost !== undefined ? { lanHost } : {}),
      expectedToken: readToken() ?? "",
    })

    // ponytail: register external addon dirs (from config's `addons:` list) so
    // `addon://<name>/assets/icon.png` resolves for overlay deck icons. The
    // addonDirs built from addonBundle.addonByType only contains builtins.
    const externalAddonDirs = buildExternalAddonDirs(
      loadedConfig.config.addons ?? [],
      loadedConfig.configPath,
    )

    const resolverOptions = buildResolverOptions(
      addonBundle.addonByType,
      [dirname(loadedConfig.configPath)],
      externalAddonDirs,
    )

    // ponytail: gate the n-1 system button on the session's lock state from
    // the first frame. The startup injection in buildRuntime ran before the
    // session provider existed; if the OS is locked at boot, re-inject
    // without the n-1 so the deck structure is honest. Re-inject on every
    // subsequent lock transition so the source stays correct.
    const reInjectedDecks = (isLocked: boolean): ReadonlyArray<RuntimeDeck> =>
      injectSystemButtons(loaded.sourceDecks, descriptor!.keyCount, {
        lockActive: isLocked,
      })
    const broadcastActiveDeck = (): void => {
      const activeDeck = runtime!.getActiveDeck()
      if (activeDeck === undefined) return
      const msg = buildDeckConfigMessage(
        activeDeck,
        addonBundle!.addonByType,
        resolverOptions,
        {
          navStackDepth: runtime!.navStackDepth(),
          hasOverlayDeckAvailable: runtime!.hasOverlayDeckAvailable(),
          inOverlayMode: runtime!.getOverlay() !== null,
        },
        descriptor!.keyCount,
        outputClient!.kind === "real",
        (fullPath) => getAssetByPath(fullPath)?.id,
        runtime!.getAvailableOverlayDeckIcon(),
        runtime!.getAvailableOverlayDeckName(),
        { lockActive: runtime!.isLockActive() },
      )
      bridge!.broadcast(msg)
    }
    if (providers.session.getState() === "locked") {
      const reInjected = reInjectedDecks(true)
      runtime.setDecks(reInjected)
      decks = reInjected
      broadcastActiveDeck()
    }
    unsubscribeLockMode = pubSub.subscribe("runtime:lock-mode", (payload) => {
      const isLocked =
        typeof payload === "object" &&
        payload !== null &&
        (payload as { active?: unknown }).active === true
      const reInjected = reInjectedDecks(isLocked)
      runtime!.setDecks(reInjected)
      decks = reInjected
      // ponytail: runtime:setDecks publishes runtime:activeDeck, but the
      // deck-id-equality dedup in the bridge subscriber skips the
      // re-broadcast when the active deck id is unchanged. Force a fresh
      // broadcast so the wire filter sees the lock state on the new decks.
      broadcastActiveDeck()
    })

    bridgeSignal = new AbortController()
    statePublisher = new StatePublisher({ bridge, logger })

    const addonRegistryForSystemStatus = new AddonRegistry()
    registerSystemStatusAddon(addonRegistryForSystemStatus)

    const mainDeck = runtime.getActiveDeck()
    const externalScanned = buildExternalScannedAddons(
      loadedConfig.registry,
      addonBundle.scanned,
      externalAddonDirs,
      loadedConfig.addonEntryPaths,
    )
    publishSIRENO_ADDONS(addonBundle.scanned, externalScanned)
    options.onAddonsUpdate?.([...addonBundle.scanned, ...externalScanned])
    // ponytail: ship the merged inventory to the bridge so the emulator's
    // Addons tab can render it on connect. Builtins are bundled; third-party
    // addons (from config.yml `addons:`) join here. --emulator mode never
    // binds the start-mode HTTP API on 3939, so this is the only path.
    bridge.setAddonInventory(
      [...addonBundle.scanned, ...externalScanned].map(
        addonInventoryFromScanned,
      ),
    )

    const mainDeckId = mainDeck?.id ?? "main"
    bridge.setDeckTree(buildDeckTree(decks, mainDeckId))

    // ponytail: addon-triggered deck rebuild (dynamic decks). Mirrors the
    // config hot-reload decks-only branch: rebuild the runtime deck set,
    // fall back if the active deck vanished (e.g. a page count shrank), and
    // rebroadcast deck-config so the frontend sees the new pages.
    const requestDeckRebuild = (): void => {
      if (
        runtime === null ||
        descriptor === null ||
        outputClient === null ||
        bridge === null ||
        addonBundle === null ||
        loadedConfig === null ||
        providers === null
      ) {
        return
      }
      const rebuilt = buildRuntime(
        options,
        loadedConfig,
        descriptor.keyCount,
        providers.session.getState() === "locked",
      ).decks
      decks = rebuilt
      runtime.setDecks(rebuilt)
      const activeId = runtime.getActiveDeckId()
      if (!rebuilt.some((d) => d.id === activeId)) {
        const fallback = rebuilt.some((d) => d.id === "main")
          ? "main"
          : (rebuilt[0]?.id ?? activeId)
        runtime.navigateToDeck(fallback, { addToHistory: false })
      }
      for (const deck of rebuilt) {
        registerDeckIcon(deck, resolverOptions, logger)
        registerIconForDeck(deck.buttons ?? [], resolverOptions, logger)
      }
      bridge.setDeckTree(buildDeckTree(rebuilt, runtime.getActiveDeckId()))
      const activeDeck = runtime.getActiveDeck()
      const msg = buildDeckConfigMessage(
        activeDeck,
        addonBundle.addonByType,
        resolverOptions,
        {
          navStackDepth: runtime.navStackDepth(),
          hasOverlayDeckAvailable: runtime.hasOverlayDeckAvailable(),
          inOverlayMode: runtime.getOverlay() !== null,
        },
        descriptor.keyCount,
        outputClient.kind === "real",
        (fullPath) => getAssetByPath(fullPath)?.id,
        runtime.getAvailableOverlayDeckIcon(),
        runtime.getAvailableOverlayDeckName(),
        { lockActive: runtime.isLockActive() },
      )
      bridge.broadcast(msg)
      logger.info(
        {
          deckId: msg.deckId,
          buttonCount: (
            msg.surfaces[msg.deckId] as { buttons?: unknown[] } | undefined
          )?.buttons?.length,
        },
        "addon requested deck rebuild",
      )
    }
    methods?.setDeckRebuilder(requestDeckRebuild)

    addonServices = setupAddonServices({
      runtime,
      methods,
      decks,
      pubSub,
      scanned: addonBundle.scanned,
      externalAddons: externalScanned,
      // ponytail: addonBundle.addonByType only has builtins — merge in
      // third-party addons so collectActiveDeckAddonNames can resolve their
      // types and the state publisher starts their pollers.
      addonByType: mergeAddonByType(addonBundle.addonByType, externalScanned),
      executor: createActionExecutor({ host: getHostContext() }),
      statePublisher,
      bridge,
      isCompact,
      resolverOptions,
      requestDeckRebuild,
      ...(mainDeck !== undefined ? { initialDeck: mainDeck } : {}),
      signal: bridgeSignal.signal,
      store,
      logger,
    })
    addonServicesDispose = () => addonServices?.dispose()

    for (const deck of decks) {
      registerDeckIcon(deck, resolverOptions, logger)
      registerIconForDeck(deck.buttons ?? [], resolverOptions, logger)
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
      const activeDeck = runtime!.getActiveDeck()
      if (activeDeck !== undefined) {
        const msg = buildDeckConfigMessage(
          activeDeck,
          addonBundle!.addonByType,
          resolverOptions,
          {
            navStackDepth: runtime!.navStackDepth(),
            hasOverlayDeckAvailable: runtime!.hasOverlayDeckAvailable(),
            inOverlayMode: runtime!.getOverlay() !== null,
          },
          descriptor!.keyCount,
          outputClient!.kind === "real",
          (fullPath) => getAssetByPath(fullPath)?.id,
          runtime!.getAvailableOverlayDeckIcon(),
          runtime!.getAvailableOverlayDeckName(),
          { lockActive: runtime!.isLockActive() },
        )
        logger.info(
          {
            deckId: msg.deckId,
            buttonCount: (
              msg.surfaces[msg.deckId] as { buttons?: unknown[] } | undefined
            )?.buttons?.length,
          },
          "orchestrator: sending deck-config",
        )
        socket.send(JSON.stringify(msg))
      }
    })

    const onServiceLog = (entry: {
      level: string
      msg: string
      ts: number
      component?: string
      deckId?: string
      position?: number
      addonName?: string
      gesture?: "tap" | "dbl-tap" | "hold"
      keyIndex?: number
    }) => {
      bridge!.broadcast({
        type: "service-log",
        level: entry.level as
          | "debug"
          | "error"
          | "fatal"
          | "info"
          | "trace"
          | "warn",
        msg: entry.msg,
        ts: entry.ts,
        ...(entry.component !== undefined
          ? { component: entry.component }
          : {}),
        ...(entry.deckId !== undefined ? { deckId: entry.deckId } : {}),
        ...(entry.position !== undefined ? { position: entry.position } : {}),
        ...(entry.addonName !== undefined
          ? { addonName: entry.addonName }
          : {}),
        ...(entry.gesture !== undefined ? { gesture: entry.gesture } : {}),
        ...(entry.keyIndex !== undefined ? { keyIndex: entry.keyIndex } : {}),
      })
    }
    process.on("sireno:log", onServiceLog)
    removeServiceLogListener = () =>
      process.removeListener("sireno:log", onServiceLog)

    const trackedPids = new Set<number>()

    outputHandle = await outputClient.init({
      bridge,
      runtime,
      pubSub,
      store,
      decks,
      theme: {
        name: loaded.theme.name,
        apiVersion: loaded.theme.apiVersion,
      },
      themeDir,
      logger,
      rebuildDecksForKeyCount: (keyCount: number) =>
        buildRuntime(
          options,
          loadedConfig!,
          keyCount,
          providers?.session.getState() === "locked",
        ).decks,
      onChildPid: (pid) => {
        if (trackedPids.has(pid)) return
        trackedPids.add(pid)
        options.onChildren?.([...trackedPids])
      },
      onChildCrash: () => {
        logger.fatal(
          "supervised vite child exhausted its retry budget, shutting down",
        )
        resolveDoneForCrash()
      },
      ...(options.frontendUrl !== undefined
        ? { frontendUrl: options.frontendUrl }
        : {}),
      ...(options.port !== undefined ? { port: options.port } : {}),
      ...(options.intervalMs !== undefined
        ? { intervalMs: options.intervalMs }
        : {}),
      remote: options.remote === true,
      lanHost,
      lanAddresses: lanAddresses.map((a) => a.address),
    })

    currentOutputHandle = outputHandle
    let currentLoadedConfig = loadedConfig

    // Note: do NOT overwrite the accumulated `trackedPids` Set with the initial
    // `outputHandle.childPids` snapshot — that erased the respawned-PID entries
    // and orphaned the live vite after the supervisor's respawn. The
    // `onChildPid` callback above already added every spawned PID (initial +
    // respawns) into `trackedPids` and reported it via `options.onChildren`,
    // so the children file stays complete without this second write.

    // Hot-reload: watch the YAML config for changes. Deck-only changes
    // rebuild the runtime deck set in-place and rebroadcast deck-config;
    // anything else (theme, addons, lock, logging) tears down Vite and
    // re-initialises the output client with the new theme.
    configWatcher = new ConfigWatcher([loadedConfig.configPath], {
      onChange: () => {
        void handleConfigChange()
      },
      // ponytail: chokidar emits "unlink" when the watched file
      // disappears — e.g. the worktree holding the config was removed
      // out from under the daemon. Without this hook the daemon keeps
      // running with stale state and the next config-touch throws a
      // confusing `Config file not found`. Shut down cleanly so the
      // operator gets one obvious message instead of a flood.
      onUnlink: (path) => {
        logger.fatal(
          { configPath: path },
          "config file was deleted (worktree removed?) — shutting down daemon; restart with a valid config",
        )
        resolveDoneForCrash()
      },
    })
    const handleConfigChange = async (): Promise<void> => {
      try {
        const nextLoaded = await validateAndLoadConfig(options)
        const prevConfig = currentLoadedConfig.config
        const decksOnlyChange = decksChanged(prevConfig, nextLoaded.config)
        if (decksOnlyChange) {
          const rebuilt = buildRuntime(
            options,
            nextLoaded,
            descriptor!.keyCount,
            providers?.session.getState() === "locked",
          ).decks
          const activeId = runtime!.getActiveDeckId()
          runtime!.setDecks(rebuilt)
          if (
            !Object.prototype.hasOwnProperty.call(
              nextLoaded.config.decks,
              activeId,
            )
          ) {
            const fallback =
              nextLoaded.config.decks["main"] !== undefined
                ? "main"
                : (Object.keys(nextLoaded.config.decks)[0] ?? activeId)
            runtime!.navigateToDeck(fallback, { addToHistory: false })
          }
          const activeDeck = runtime!.getActiveDeck()
          const msg = buildDeckConfigMessage(
            activeDeck,
            addonBundle!.addonByType,
            resolverOptions,
            {
              navStackDepth: runtime!.navStackDepth(),
              hasOverlayDeckAvailable: runtime!.hasOverlayDeckAvailable(),
              inOverlayMode: runtime!.getOverlay() !== null,
            },
            descriptor!.keyCount,
            outputClient!.kind === "real",
            (fullPath) => getAssetByPath(fullPath)?.id,
            runtime!.getAvailableOverlayDeckIcon(),
            runtime!.getAvailableOverlayDeckName(),
            { lockActive: runtime!.isLockActive() },
          )
          bridge!.broadcast(msg)
          currentLoadedConfig = nextLoaded
          logger.info(
            {
              deckId: msg.deckId,
              buttonCount: (
                msg.surfaces[msg.deckId] as { buttons?: unknown[] } | undefined
              )?.buttons?.length,
            },
            "config hot-reloaded (decks only)",
          )
          return
        }
        // Theme / addons / lock / logging changed — Vite's HMR re-reads
        // SIRENO_THEME / SIRENO_ADDONS from process.env on rebuild, so we
        // just nudge the emulator SPA to reload the iframe. No Vite restart,
        // no deck-config resend (the runtime's in-memory decks are unaffected
        // because the theme change only touches CSS / virtual modules).
        logger.info(
          { prevTheme: prevConfig.theme, nextTheme: nextLoaded.config.theme },
          "config change outside decks — broadcasting iframe-reload",
        )
        currentLoadedConfig = nextLoaded
        bridge!.broadcast({ type: "iframe-reload" })
      } catch (err) {
        logger.warn(
          { err: (err as Error).message },
          "config change failed; keeping previous config",
        )
      }
    }
    await configWatcher.start({ ignoreInitial: true })

    let resolveDone: () => void = () => undefined
    let resolveDoneForCrash: () => void = () => undefined
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve
      resolveDoneForCrash = resolve
    })

    const signals = options.signals ?? defaultSignals
    unregisterSignal = signals.onSignal(() => {
      logger.info("received signal, shutting down")
      resolveDone()
    })
    // ponytail: SIGUSR1 is the in-place-reload signal. The reload command
    // (CLI side) and `systemctl reload-or-restart` both send it. The
    // handler triggers runtime.invalidate() which publishes
    // `runtime:invalidate` on the pubsub — the BrowserRenderer subscribes
    // to that and triggers a screenshot tick, so connected frontends
    // re-render on demand without a full preflight re-run.
    unregisterReload = signals.onReload(() => {
      logger.info("runtime: reloaded via SIGUSR1")
      // runtime is non-null here: buildRuntime assigned it at line ~1379,
      // and the reload handler only fires after this point.
      if (runtime !== null) runtime.invalidate()
    })

    await done
  } finally {
    if (unregisterSignal !== null) unregisterSignal()
    if (unregisterReload !== null) unregisterReload()
    if (bridgeSignal !== null) bridgeSignal.abort()
    if (addonServicesDispose !== null) addonServicesDispose()
    if (unsubscribeLockMode !== null) unsubscribeLockMode()
    if (statePublisher !== null) statePublisher.stopAll()
    if (
      options.emulator !== true &&
      currentOutputHandle !== null &&
      typeof currentOutputHandle.pushBlackFrame === "function"
    ) {
      try {
        await currentOutputHandle.pushBlackFrame()
      } catch (err) {
        logger.warn({ err: (err as Error).message }, "pushBlackFrame failed")
      }
    }
    if (removeServiceLogListener !== null) removeServiceLogListener()
    if (configWatcher !== null) {
      try {
        await configWatcher.close()
      } catch {
        // already closed or failed during init — ignore
      }
    }
    await Promise.allSettled([
      currentOutputHandle !== null
        ? currentOutputHandle.stop()
        : Promise.resolve(),
      runtime !== null ? runtime.stopActiveAppPolling() : Promise.resolve(),
      providers !== null ? providers.activeApp.stop() : Promise.resolve(),
      providers !== null ? providers.session.stop() : Promise.resolve(),
      providers !== null ? providers.keyMacro.stop() : Promise.resolve(),
      bridge !== null ? bridge.close() : Promise.resolve(),
    ])
    logger.info("shutdown complete")
  }
}

void resolveXdgConfigHome
void exec

export const run = runPipeline
