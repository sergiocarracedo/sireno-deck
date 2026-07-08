import { exec } from "node:child_process";
import { homedir, platform } from "node:os";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve as resolvePath, join } from "node:path";

import type { ResolveIconPathOptions } from "@/render/icon-resolver";
import type pino from "pino";

import { registerBuiltins } from "@/builtin-addons";
import { AddonRegistry } from "@/addon/registry";
import { findConfigPath } from "@/config/discovery";
import { loadConfig } from "@/config/loader";
import { formatFullIssues, isFullValid, validateFull } from "@/config/validation";
import { createDeckRuntime, type Runtime, type RuntimeDeck, type PubSub, type Store } from "@/deck";
import { materializeAddonDecks } from "./addon-decks";
import { createGestureDetector } from "@/core/gesture-state";
import { getAllAssets, registerIconForDeck } from "@/core/icon-asset-registry";
import { createActiveAppProvider } from "@/system/active-app";
import { createKeyMacroProvider } from "@/system/key-macro";
import { createMediaProvider } from "@/system/media";
import { createSessionProvider } from "@/system/session-monitor";
import {
  connectStreamDeck,
  type StreamDeckDevice,
  StreamDeckSelectionError,
} from "@/device/stream-deck";
import { listDevices, type DeviceDescriptor } from "@/device/registry";
import { resolveKeyCount } from "@/device/models";
import { selectDevice, NoStreamDeckFoundError } from "@/system/device-selection";
import { loadDeviceConfig, saveDeviceConfig } from "@/util/device-config";
import { resolveActiveTheme } from "@/themes/loader";
import {
  type ActiveAppProvider,
  type KeyMacroProvider,
  type MediaProvider,
  type SessionProvider,
} from "@/system/provider";

import { runRealMode } from "./real-mode";
import {
  runEmulatorMode,
  spawnFrontendVite,
  resolveFrontendCwd,
  buildDeckConfigMessage,
  findWorkspaceRoot,
} from "./emulator-mode";
import {
  type AddonFrontendRef,
  type ScannedAddon,
  collectBuiltinAddonRegistry,
} from "./addon-registry";
import { createActionExecutor } from "@/action/executor";
import { getHostContext } from "@/deck/host-context";
import { bridgeAddonServices } from "@/deck/addon-handler-bridge";
import { createClipboardProvider, type ClipboardProvider } from "@/system/clipboard";
import { StatePublisher } from "@/render/state-publisher";
import { startWsBridge, type WsBridge } from "@/render/ws-bridge";

export interface SignalProvider {
  onSignal(handler: () => void): () => void;
}

export const defaultSignals: SignalProvider = {
  onSignal(handler: () => void): () => void {
    process.once("SIGINT", handler);
    process.once("SIGTERM", handler);
    return () => {
      process.off("SIGINT", handler);
      process.off("SIGTERM", handler);
    };
  },
};

export interface RunOptions {
  readonly config?: string;
  readonly port?: number;
  readonly emulator?: boolean;
  readonly dev?: boolean;
  readonly deviceModel?: string;
  readonly frontendUrl?: string;
  readonly intervalMs?: number;
  readonly xdgConfigHome?: string;
  readonly homeDir?: string;
  readonly signals?: SignalProvider;
  readonly onChildren?: (pids: ReadonlyArray<number>) => void;
  readonly logger: pino.Logger;
}

export interface PreflightResult {
  readonly device: StreamDeckDevice;
  readonly descriptor: DeviceDescriptor;
  readonly xdgConfigHome: string;
  readonly frontendUrl: string;
  readonly runtime: Runtime;
  readonly pubSub: PubSub;
  readonly store: Store;
  readonly decks: ReadonlyArray<RuntimeDeck>;
  readonly theme: { name: string; apiVersion: number };
  readonly themeDir: string;
  readonly providers: {
    readonly activeApp: ActiveAppProvider;
    readonly session: SessionProvider;
    readonly keyMacro: KeyMacroProvider;
    readonly media: MediaProvider;
  };
  readonly setClipboardProvider: (provider: ClipboardProvider) => void;
}

const openBrowser = (url: string, logger: pino.Logger): void => {
  const os = platform();
  const cmd = os === "win32" ? "cmd" : os === "darwin" ? "open" : "xdg-open";
  const args = os === "win32" ? ["/c", "start", "", url] : [url];
  exec(cmd, args, (err) => {
    if (err !== null) {
      logger.debug({ err: err.message }, "browser auto-open unavailable, open the URL manually");
    }
  });
};

const resolveXdgConfigHome = (options: RunOptions): string =>
  options.xdgConfigHome ??
  process.env["XDG_CONFIG_HOME"] ??
  `${options.homeDir ?? homedir()}/.config`;

const resolveConfigPath = (options: RunOptions): string => {
  if (options.config !== undefined) {
    return options.config;
  }
  const home = options.homeDir ?? homedir();
  const found = findConfigPath({
    homeDir: home,
    ...(options.xdgConfigHome !== undefined ? { xdgConfigHome: options.xdgConfigHome } : {}),
  });
  if (found === null) {
    const cwd = process.cwd();
    throw new Error(
      `Could not find config.yml.\n` +
        `  Looked in: ${cwd}/config.yml (and walked up 10 parent directories)\n` +
        `  Also: $XDG_CONFIG_HOME/sireno-deck/config.yml (default: ~/.config/sireno-deck/config.yml)\n` +
        `  Fix: pass --config <path> or create one of the above.`,
    );
  }
  return found;
};

const resolveFrontendUrl = (options: RunOptions): string =>
  options.frontendUrl ?? `http://127.0.0.1:${options.port ?? 5173}`;

const buildIconResolverOptions = (
  addonByType: Map<string, AddonFrontendRef>,
  configPath: string | undefined,
): ResolveIconPathOptions => {
  const addonDirs = new Map<string, string>();
  for (const ref of addonByType.values()) {
    if (ref.frontendEntry !== null) {
      addonDirs.set(ref.name, dirname(ref.frontendEntry));
    }
  }
  const baseDirs: string[] = [];
  if (configPath !== undefined) {
    baseDirs.push(dirname(configPath));
  } else {
    const discovered = findConfigPath({ homeDir: homedir() });
    if (discovered !== null) {
      baseDirs.push(dirname(discovered));
    }
  }
  return { addonDirs, baseDirs };
};

export interface SetupAddonServicesOptions {
  readonly runtime: Runtime;
  readonly decks: ReadonlyArray<RuntimeDeck>;
  readonly pubSub: PubSub;
  readonly scanned: ReadonlyArray<ScannedAddon>;
  readonly addonByType: Map<string, AddonFrontendRef>;
  readonly executor: ReturnType<typeof createActionExecutor>;
  readonly statePublisher: Pick<StatePublisher, "registerChannel" | "setActiveDeck">;
  readonly bridge: Pick<WsBridge, "broadcast" | "registerCacheablePoller">;
  readonly initialDeck?: RuntimeDeck;
  readonly signal: AbortSignal;
  readonly setClipboardProvider: (provider: unknown) => void;
  readonly store: Store;
}

export interface SetupAddonServicesResult {
  readonly dispose: () => void;
}

const collectActiveDeckAddonNames = (
  deck: RuntimeDeck,
  addonByType: Map<string, AddonFrontendRef>,
): string[] => {
  const addonNames = new Set<string>();
  for (const button of deck.buttons) {
    const entry = addonByType.get(button.type);
    if (entry !== undefined) addonNames.add(entry.name);
  }
  return [...addonNames];
};

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
  } = options;

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
  });

  const unsubscribeDeck = pubSub.subscribe("runtime:activeDeck", (payload: unknown) => {
    const deckId =
      typeof payload === "object" && payload !== null && "deckId" in payload
        ? String((payload as { deckId: unknown }).deckId)
        : undefined;
    if (deckId === undefined) return;
    const deck = decks.find((d) => d.id === deckId);
    if (deck === undefined) return;
    statePublisher.setActiveDeck({
      addonNames: collectActiveDeckAddonNames(deck, addonByType),
    });
  });

  const unsubscribeNavigate = pubSub.subscribe("runtime:navigate-deck", (payload: unknown) => {
    if (typeof payload !== "object" || payload === null || !("deckId" in payload)) {
      return;
    }
    const deckId = String((payload as { deckId: unknown }).deckId);
    const addToHistory =
      "addToHistory" in payload
        ? Boolean((payload as { addToHistory: unknown }).addToHistory)
        : true;
    runtime.navigateToDeck(deckId, { addToHistory });
  });

  if (initialDeck !== undefined) {
    statePublisher.setActiveDeck({
      addonNames: collectActiveDeckAddonNames(initialDeck, addonByType),
    });
  }

  return {
    dispose: () => {
      unsubscribeDeck();
      unsubscribeNavigate();
    },
  };
};

export const preflight = async (options: RunOptions): Promise<PreflightResult> => {
  const { logger } = options;
  const xdgConfigHome = resolveXdgConfigHome(options);
  const configPath = resolveConfigPath(options);

  const { config } = loadConfig({ configPath });

  const registry = new AddonRegistry();
  registerBuiltins(registry);
  const validation = validateFull(config, registry);
  if (!isFullValid(validation)) {
    throw new Error(`Config validation failed:\n${formatFullIssues(validation.issues)}`);
  }

  const { theme, getCss } = resolveActiveTheme(registry, { theme: config.theme });
  const themeDir: string = resolvePath(findWorkspaceRoot(), "packages", "cli", "frontend");
  const cssContent: string = getCss();
  if (cssContent.length > 0) {
    const cssDir = join(themeDir, ".sireno-deck");
    if (!existsSync(cssDir)) mkdirSync(cssDir, { recursive: true });
    writeFileSync(join(cssDir, "theme.css"), cssContent, "utf8");
  }
  process.env["SIRENO_THEME_DIR"] = themeDir;
  process.env["SIRENO_THEME"] = JSON.stringify({
    name: theme.name,
    manifestPath: theme.manifestPath,
    uiOverridesPath: theme.uiOverridesPath,
  });
  process.env["SIRENO_THEME_NAME"] = theme.name;

  const devices = await listDevices();
  const savedDevice = loadDeviceConfig({ xdgConfigHome });
  let descriptor: DeviceDescriptor;
  let savedButStale = false;
  try {
    const selection = await selectDevice({
      devices,
      current: savedDevice,
      logger,
    });
    descriptor = selection.descriptor;
    savedButStale = selection.savedButStale;
  } catch (err) {
    if (err instanceof NoStreamDeckFoundError) {
      throw new Error(
        "No Stream Deck devices found. Connect a device and try again. On Linux, udev rules may be required — see sireno install-udev.",
      );
    }
    throw err;
  }

  saveDeviceConfig({
    xdgConfigHome,
    config: {
      serial: descriptor.serial,
      path: descriptor.path,
      model: descriptor.model,
    },
  });

  let device: StreamDeckDevice;
  try {
    device = await connectStreamDeck({ serial: descriptor.serial });
  } catch (err) {
    if (err instanceof StreamDeckSelectionError) {
      throw new Error(
        `Saved device ${descriptor.serial} is no longer connected (${savedButStale ? "stale" : "removed"}). Re-run with --config to pick another.`,
      );
    }
    throw err;
  }

  const decks = Object.entries(config.decks).map(([id, d]) => ({
    id,
    name: d.name ?? id,
    buttons: d.buttons.flatMap((b, idx) => {
      if (typeof b === "string") return [];
      return [
        {
          id: b.position?.toString() ?? `b${idx}`,
          type: b.type,
          ...(typeof b.config === "object" && b.config !== null ? { config: b.config } : {}),
        },
      ];
    }),
    processNames:
      d.trigger?.process_name !== undefined
        ? Array.isArray(d.trigger.process_name)
          ? d.trigger.process_name
          : [d.trigger.process_name]
        : undefined,
  }));
  const effectiveDecks: RuntimeDeck[] =
    decks.length > 0 ? decks : [{ id: "main", name: "Main", isMain: true, buttons: [] }];
  const allDecks = materializeAddonDecks(registry, effectiveDecks, logger);
  const { runtime, methods, pubSub, store } = createDeckRuntime({ decks: allDecks, logger });

  const { execa } = await import("execa");
  const executor = {
    async run(command: string, args: ReadonlyArray<string>, options?: { timeoutMs?: number }) {
      const proc = await execa(command, [...args], {
        reject: false,
        timeout: options?.timeoutMs,
      });
      return {
        exitCode: proc.exitCode ?? -1,
        stdout: proc.stdout ?? "",
        stderr: proc.stderr ?? "",
      };
    },
  };

  const env = { ...process.env } as Readonly<Record<string, string>>;
  const platform = process.platform;

  const [activeApp, session, keyMacro, media] = await Promise.all([
    createActiveAppProvider({ platform, executor, logger }),
    createSessionProvider({ platform, logger }),
    createKeyMacroProvider({ platform, executor, env, logger }),
    createMediaProvider({ platform, executor, logger }),
  ]);

  runtime.setActiveAppProvider(activeApp);
  methods.setKeyMacroProvider(keyMacro);
  let clipboard: ClipboardProvider | null = null;
  try {
    clipboard = createClipboardProvider({ executor, platform, env, logger });
  } catch {
    clipboard = null;
  }
  if (clipboard !== null) methods.setClipboardProvider(clipboard);

  return {
    device,
    descriptor,
    xdgConfigHome,
    frontendUrl: resolveFrontendUrl(options),
    runtime,
    pubSub,
    store,
    decks: allDecks,
    theme: { name: theme.name, apiVersion: theme.apiVersion },
    themeDir,
    providers: { activeApp, session, keyMacro, media },
    setClipboardProvider: methods.setClipboardProvider,
  };
};

export const runRealModePipeline = async (options: RunOptions): Promise<void> => {
  const { logger } = options;

  if (options.emulator === true) {
    await runEmulatorPipeline(options);
    return;
  }

  const {
    device,
    descriptor,
    frontendUrl: configuredUrl,
    runtime,
    pubSub,
    store,
    decks,
    providers,
    themeDir,
    setClipboardProvider,
  } = await preflight(options);

  let frontendUrl = configuredUrl;

  const registry = await collectBuiltinAddonRegistry();
  const bridgeExecutor = createActionExecutor({ host: getHostContext() });

  if (process.env["SIRENO_ADDONS"] === undefined) {
    const addonSpecs = registry.scanned.map((s) => ({
      name: s.name,
      frontend: s.frontendEntry !== null ? { main: s.frontendEntry } : undefined,
      buttons: s.types.map((t) => ({ type: t })),
      buttonTypes: s.buttonTypes,
      defaultButton: s.defaultButton,
    }));
    process.env["SIRENO_ADDONS"] = JSON.stringify(addonSpecs);
  }

  const addonByType = new Map<string, { name: string; frontendEntry: string | null }>();
  for (const s of registry.scanned) {
    for (const t of s.types) {
      addonByType.set(t, { name: s.name, frontendEntry: s.frontendEntry });
    }
  }

  const bridge = await startWsBridge({ port: 52937, keyCount: resolveKeyCount(descriptor.model) });
  const wsPort = bridge.port;

  const mainDeck = runtime.getActiveDeck();
  logger.info(
    {
      wsPort,
      deckCount: decks.length,
      mainDeckId: mainDeck?.id,
      mainDeckButtonCount: mainDeck?.buttons.length,
    },
    "real mode: ws bridge + main deck ready",
  );

  const bridgeSignal = new AbortController();
  const statePublisher = new StatePublisher({ bridge, logger });
  const addonServices = setupAddonServices({
    runtime,
    decks,
    pubSub,
    scanned: registry.scanned,
    addonByType,
    executor: bridgeExecutor,
    statePublisher,
    bridge,
    ...(mainDeck !== undefined ? { initialDeck: mainDeck } : {}),
    signal: bridgeSignal.signal,
    setClipboardProvider,
    store,
  });

  bridge.onConnection((socket) => {
    if (mainDeck) {
      const resolverOptions = buildIconResolverOptions(addonByType, options.config);
      registerIconForDeck(mainDeck.buttons, resolverOptions);
      const assets = getAllAssets();
      if (assets.length > 0) {
        const assetsMsg = {
          type: "assets" as const,
          deckId: mainDeck.id,
          assets: assets.map((a) => ({
            id: a.id,
            filename: a.filename,
            data: a.data,
          })),
        };
        socket.send(JSON.stringify(assetsMsg));
      }
      const msg = buildDeckConfigMessage(
        mainDeck,
        addonByType,
        resolverOptions,
        { navStackDepth: runtime.navStackDepth(), hasOverlayDeckAvailable: false },
        resolveKeyCount(descriptor.model),
      );
      logger.info(
        {
          deckId: msg.deckId,
          buttonCount: msg.surfaces[msg.deckId]?.buttons.length,
        },
        "real mode: sending deck-config",
      );
      socket.send(JSON.stringify(msg));
    } else {
      logger.warn("real mode: no main deck available to send");
    }
  });

  const keyIndexToButtonId = new Map<number, string>();
  if (mainDeck) {
    for (const button of mainDeck.buttons) {
      const index = Number.parseInt(button.id, 10);
      if (Number.isFinite(index)) {
        keyIndexToButtonId.set(index, button.id);
      }
    }
  }
  logger.info(
    { mappedKeys: Array.from(keyIndexToButtonId.entries()) },
    "real mode: keyIndex -> buttonId mapping",
  );

  const gestureDetector = createGestureDetector({
    onGesture: (result) => {
      const buttonId = keyIndexToButtonId.get(result.keyIndex ?? -1);
      if (buttonId === undefined) return;
      logger.info(
        { buttonId, gesture: result.kind, keyIndex: result.keyIndex },
        "real mode: gesture detected, dispatching",
      );
      void runtime.dispatchGesture(buttonId, result.kind);
    },
  });

  const gestureUnsubscribe = device.onKeyEvent((event) => {
    logger.info({ keyIndex: event.keyIndex, type: event.type }, "real mode: key event received");
    const buttonId = keyIndexToButtonId.get(event.keyIndex);
    if (buttonId === undefined) {
      logger.warn({ keyIndex: event.keyIndex }, "real mode: keyIndex not mapped to any button");
      return;
    }
    gestureDetector.detect({
      type: event.type,
      timestamp: event.timestamp,
      keyIndex: event.keyIndex,
    });
  });

  let frontendVite: Awaited<ReturnType<typeof spawnFrontendVite>> | undefined;
  if (options.frontendUrl === undefined) {
    frontendVite = await spawnFrontendVite({
      port: options.port ?? 5173,
      cwd: resolveFrontendCwd(),
      pnpmCommand: "pnpm",
      readyTimeoutMs: 30_000,
      wsUrl: `ws://127.0.0.1:${wsPort}`,
      logger,
      themeDir,
    });
    frontendUrl = frontendVite.url;
  }

  logger.info({ frontendUrl }, "real mode: frontend URL");

  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const signals = options.signals ?? defaultSignals;
  const unregister = signals.onSignal(() => {
    logger.info("received signal, shutting down");
    resolveDone();
  });

  const handle = await runRealMode({
    frontendUrl,
    device,
    logger,
    ...(options.intervalMs !== undefined ? { intervalMs: options.intervalMs } : {}),
  });

  try {
    await done;
  } finally {
    unregister();
    gestureUnsubscribe();
    frontendVite?.process.kill("SIGTERM");
    bridgeSignal.abort();
    addonServices.dispose();
    statePublisher.stopAll();
    await Promise.allSettled([
      handle.stop(),
      runtime.stopActiveAppPolling(),
      providers.activeApp.stop(),
      providers.session.stop(),
      providers.keyMacro.stop(),
      providers.media.stop(),
      bridge.close(),
    ]);
    logger.info("shutdown complete");
  }
};

export const runEmulatorPipeline = async (options: RunOptions): Promise<void> => {
  await runEmulatorLifecycle(options);
};

interface EmulatorDecks {
  runtime: Runtime;
  pubSub: PubSub;
  decks: ReadonlyArray<RuntimeDeck>;
  store: Store;
}

const buildEmulatorDecks = (options: RunOptions): EmulatorDecks => {
  const { logger } = options;
  const configPath = resolveConfigPath(options);
  const { config } = loadConfig({ configPath });
  const registry = new AddonRegistry();
  registerBuiltins(registry);
  const validation = validateFull(config, registry);
  if (!isFullValid(validation)) {
    throw new Error(`Config validation failed:\n${formatFullIssues(validation.issues)}`);
  }
  const decks: RuntimeDeck[] = Object.entries(config.decks).map(([id, d]) => ({
    id,
    name: d.name ?? id,
    buttons: d.buttons.flatMap((b, idx) => {
      if (typeof b === "string") return [];
      return [
        {
          id: b.position?.toString() ?? `b${idx}`,
          type: b.type,
          ...(typeof b.config === "object" && b.config !== null ? { config: b.config } : {}),
        },
      ];
    }),
    ...(d.trigger?.process_name !== undefined
      ? {
          processNames: Array.isArray(d.trigger.process_name)
            ? d.trigger.process_name
            : [d.trigger.process_name],
        }
      : {}),
    ...(d.autoShow !== undefined ? { autoShow: d.autoShow } : {}),
  }));
  const mainId = decks[0]?.id;
  const runtimeDecks: RuntimeDeck[] =
    decks.length > 0
      ? decks.map((d) => ({
          ...d,
          ...(mainId !== undefined && d.id === mainId ? { isMain: true } : {}),
        }))
      : [{ id: "main", name: "Main", isMain: true, buttons: [] }];
  const allDecks = materializeAddonDecks(registry, runtimeDecks, logger);
  const {
    runtime,
    pubSub: emulatorPubSub,
    store,
  } = createDeckRuntime({
    decks: allDecks,
    logger,
  });
  return { runtime, pubSub: emulatorPubSub, decks: allDecks, store };
};

const runEmulatorLifecycle = async (options: RunOptions): Promise<void> => {
  const { logger } = options;
  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const emulatorExecutor = createActionExecutor({ host: getHostContext() });

  const signals = options.signals ?? defaultSignals;
  const unregister = signals.onSignal(() => {
    logger.info("received signal, shutting down");
    resolveDone();
  });

  const emulatorDecks = buildEmulatorDecks(options);
  const runtime = emulatorDecks.runtime;
  const registry = await collectBuiltinAddonRegistry();
  const bridgeSignal = new AbortController();

  if (process.env["SIRENO_ADDONS"] === undefined) {
    const addonSpecs = registry.scanned.map((s) => ({
      name: s.name,
      frontend: s.frontendEntry !== null ? { main: s.frontendEntry } : undefined,
      buttons: s.types.map((t) => ({ type: t })),
      buttonTypes: s.buttonTypes,
      defaultButton: s.defaultButton,
    }));
    process.env["SIRENO_ADDONS"] = JSON.stringify(addonSpecs);
  }

  const publisherTeardown: { fn: () => void } = { fn: () => undefined };

  const handle = await runEmulatorMode({
    logger,
    activeTheme: { name: process.env["SIRENO_THEME_NAME"] ?? "default" },
    runtime,
    decks: emulatorDecks.decks,
    addonByType: registry.byType,
    ...(options.config !== undefined ? { config: options.config } : {}),
    onBridgeReady: async (bridge) => {
      const statePublisher = new StatePublisher({ bridge, logger });
      const initialDeck = emulatorDecks.decks.find((d) => d.isMain) ?? emulatorDecks.decks[0];
      const addonServices = setupAddonServices({
        runtime,
        decks: emulatorDecks.decks,
        pubSub: emulatorDecks.pubSub,
        scanned: registry.scanned,
        addonByType: registry.byType,
        executor: emulatorExecutor,
        statePublisher,
        bridge,
        ...(initialDeck !== undefined ? { initialDeck } : {}),
        signal: bridgeSignal.signal,
        setClipboardProvider: () => {},
        store: emulatorDecks.store,
      });
      publisherTeardown.fn = () => {
        bridgeSignal.abort();
        addonServices.dispose();
        statePublisher.stopAll();
      };
    },
  });

  if (options.onChildren !== undefined) {
    options.onChildren([...handle.childPids]);
  }

  logger.info(
    {
      emulatorUrl: handle.emulatorUrl,
      frontendUrl: handle.frontendUrl,
      wsUrl: handle.wsUrl,
    },
    "emulator mode ready",
  );

  process.stdout.write(
    `\n  Emulator:  ${handle.emulatorUrl}\n  Frontend:  ${handle.frontendUrl}\n\n`,
  );

  openBrowser(handle.emulatorUrl, logger);

  try {
    await done;
  } finally {
    unregister();
    publisherTeardown.fn();
    await handle.stop();
    logger.info("shutdown complete");
  }
};

export const run = runRealModePipeline;
