import { exec } from "node:child_process";
import { homedir, platform } from "node:os";

import type pino from "pino";

import { registerBuiltins } from "@/builtin-addons";
import { AddonRegistry } from "@/addon/registry";
import { findConfigPath } from "@/config/discovery";
import { loadConfig } from "@/config/loader";
import { formatFullIssues, isFullValid, validateFull } from "@/config/validation";
import { createDeckRuntime, type Runtime, type RuntimeDeck } from "@/deck";
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
import { selectDevice, NoStreamDeckFoundError } from "@/system/device-selection";
import { loadDeviceConfig, saveDeviceConfig } from "@/util/device-config";
import { resolveActiveTheme } from "@/themes/loader.ts";
import {
  type ActiveAppProvider,
  type KeyMacroProvider,
  type MediaProvider,
  type SessionProvider,
} from "@/system/provider";

import { runRealMode } from "./real-mode";
import { runEmulatorMode, spawnFrontendVite, resolveFrontendCwd } from "./emulator-mode";
import { collectBuiltinAddonRegistry, discoverAddonPollers } from "./addon-registry.ts";
import { createActionExecutor } from "@/action/executor.ts";
import { getHostContext } from "@/deck/host-context.ts";
import { createBrightnessProvider } from "@/system/brightness";
import { createClipboardProvider, type ClipboardProvider } from "@/system/clipboard";
import { StatePublisher } from "@/render/state-publisher.ts";

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
  readonly theme: { name: string; apiVersion: number };
  readonly providers: {
    readonly activeApp: ActiveAppProvider;
    readonly session: SessionProvider;
    readonly keyMacro: KeyMacroProvider;
    readonly media: MediaProvider;
  };
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
        `  Also: $XDG_CONFIG_HOME/sireno-deck-2/config.yml (default: ~/.config/sireno-deck-2/config.yml)\n` +
        `  Fix: pass --config <path> or create one of the above.`,
    );
  }
  return found;
};

const resolveFrontendUrl = (options: RunOptions): string =>
  options.frontendUrl ?? `http://127.0.0.1:${options.port ?? 5173}`;

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

  const { theme } = resolveActiveTheme(registry, { theme: config.theme });
  process.env["SIRENO_THEME"] = JSON.stringify({
    name: theme.name,
    cssPath: theme.cssPath,
    frontendPath: theme.frontendPath,
  });
  process.env["SIRENO_THEME_NAME"] = theme.name;

  const devices = await listDevices();
  const savedDevice = loadDeviceConfig({ xdgConfigHome });
  let descriptor: DeviceDescriptor;
  let savedButStale = false;
  try {
    const selection = await selectDevice({ devices, current: savedDevice, logger });
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
          config: b,
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
  const { runtime, methods } = createDeckRuntime({ decks, logger });

  const { execa } = await import("execa");
  const executor = {
    async run(command: string, args: ReadonlyArray<string>, options?: { timeoutMs?: number }) {
      const proc = await execa(command, [...args], { reject: false, timeout: options?.timeoutMs });
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
    theme: { name: theme.name, apiVersion: theme.apiVersion },
    providers: { activeApp, session, keyMacro, media },
  };
};

export const runRealModePipeline = async (options: RunOptions): Promise<void> => {
  const { logger } = options;

  if (options.emulator === true) {
    await runEmulatorPipeline(options);
    return;
  }

  const { device, frontendUrl: configuredUrl, runtime, providers } = await preflight(options);

  let frontendUrl = configuredUrl;

  const registry = collectBuiltinAddonRegistry();
  if (process.env["SIRENO_ADDONS"] === undefined) {
    const addonSpecs = registry.scanned.map((s) => ({
      name: s.name,
      frontend: s.frontendEntry !== null ? { main: s.frontendEntry } : undefined,
      buttons: s.types.map((t) => ({ type: t })),
    }));
    process.env["SIRENO_ADDONS"] = JSON.stringify(addonSpecs);
  }

  let frontendVite: Awaited<ReturnType<typeof spawnFrontendVite>> | undefined;
  if (options.frontendUrl === undefined) {
    frontendVite = await spawnFrontendVite({
      port: options.port ?? 5173,
      cwd: resolveFrontendCwd(),
      pnpmCommand: "pnpm",
      readyTimeoutMs: 30_000,
      logger,
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
    frontendVite?.process.kill("SIGTERM");
    await handle.stop();
    await runtime.stopActiveAppPolling();
    await Promise.allSettled([
      providers.activeApp.stop(),
      providers.session.stop(),
      providers.keyMacro.stop(),
      providers.media.stop(),
    ]);
    logger.info("shutdown complete");
  }
};

export const runEmulatorPipeline = async (options: RunOptions): Promise<void> => {
  await runEmulatorLifecycle(options);
};

interface EmulatorDecks {
  runtime: Runtime;
  pubSub: { subscribe: (channel: string, handler: (payload: unknown) => void) => () => void };
  decks: ReadonlyArray<RuntimeDeck>;
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
  const runtimeDecks: RuntimeDeck[] = decks.map((d) => ({
    ...d,
    ...(mainId !== undefined && d.id === mainId ? { isMain: true } : {}),
  }));
  const { runtime, pubSub: emulatorPubSub } = createDeckRuntime({ decks: runtimeDecks, logger });
  return { runtime, pubSub: emulatorPubSub, decks: runtimeDecks };
};

const runEmulatorLifecycle = async (options: RunOptions): Promise<void> => {
  const { logger } = options;
  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const env = { ...process.env } as Readonly<Record<string, string>>;
  const platform = process.platform;
  const emulatorExecutor = createActionExecutor({ host: getHostContext() });
  const commandExecutor = {
    async run(command: string, args: ReadonlyArray<string>) {
      const fullCommand = args.length > 0 ? `${command} ${args.join(" ")}` : command;
      return emulatorExecutor.run(fullCommand);
    },
  };
  const emulatorMedia = await createMediaProvider({
    platform,
    executor: commandExecutor,
    env,
    logger,
  });
  let emulatorBrightness = null;
  try {
    emulatorBrightness = createBrightnessProvider({
      executor: commandExecutor,
      platform,
      env,
      logger,
    });
  } catch {
    emulatorBrightness = null;
  }

  const signals = options.signals ?? defaultSignals;
  const unregister = signals.onSignal(() => {
    logger.info("received signal, shutting down");
    resolveDone();
  });

  const emulatorDecks = buildEmulatorDecks(options);
  const runtime = emulatorDecks.runtime;
  const registry = collectBuiltinAddonRegistry();
  const statePublisher = new StatePublisher({ bridge: { broadcast: () => undefined }, logger });

  if (process.env["SIRENO_ADDONS"] === undefined) {
    const addonSpecs = registry.scanned.map((s) => ({
      name: s.name,
      frontend: s.frontendEntry !== null ? { main: s.frontendEntry } : undefined,
      buttons: s.types.map((t) => ({ type: t })),
    }));
    process.env["SIRENO_ADDONS"] = JSON.stringify(addonSpecs);
  }

  const handle = await runEmulatorMode({
    logger,
    activeTheme: { name: process.env["SIRENO_THEME_NAME"] ?? "default" },
    runtime,
    decks: emulatorDecks.decks,
    addonByType: registry.byType,
    onBridgeReady: async (bridge) => {
      const realPublisher = new StatePublisher({ bridge, logger });
      const pollers = await discoverAddonPollers(
        {
          executor: emulatorExecutor,
          mediaProvider: emulatorMedia,
          brightnessProvider: emulatorBrightness,
        },
        registry.scanned,
      );
      for (const poller of pollers) {
        for (const ch of poller.channels) {
          realPublisher.registerChannel({
            channel: ch.channel,
            addonName: poller.addonName,
            intervalMs: ch.intervalMs,
            poll: ch.poll,
          });
        }
      }
      const unsubscribeDeck = emulatorDecks.pubSub.subscribe(
        "runtime:activeDeck",
        (payload) => {
          const deckId =
            typeof payload === "object" && payload !== null && "deckId" in payload
              ? String((payload as { deckId: unknown }).deckId)
              : undefined;
          if (deckId === undefined) return;
          const deck = emulatorDecks.decks.find((d) => d.id === deckId);
          if (deck === undefined) return;
          const addonNames = new Set<string>();
          for (const button of deck.buttons) {
            const entry = registry.byType.get(button.type);
            if (entry !== undefined) addonNames.add(entry.name);
          }
          realPublisher.setActiveDeck({ addonNames: [...addonNames] });
        },
      );
      const initialDeck = emulatorDecks.decks.find((d) => d.isMain) ?? emulatorDecks.decks[0];
      if (initialDeck !== undefined) {
        const addonNames = new Set<string>();
        for (const button of initialDeck.buttons) {
          const entry = registry.byType.get(button.type);
          if (entry !== undefined) addonNames.add(entry.name);
        }
        realPublisher.setActiveDeck({ addonNames: [...addonNames] });
      }
      signals.onSignal(() => {
        unsubscribeDeck();
        realPublisher.stopAll();
      });
    },
  });

  if (options.onChildren !== undefined) {
    options.onChildren([...handle.childPids]);
  }

  logger.info(
    { emulatorUrl: handle.emulatorUrl, frontendUrl: handle.frontendUrl, wsUrl: handle.wsUrl },
    "emulator mode ready",
  );

  process.stdout.write(`\n  Emulator:  ${handle.emulatorUrl}\n  Frontend:  ${handle.frontendUrl}\n\n`);

  openBrowser(handle.emulatorUrl, logger);

  try {
    await done;
  } finally {
    unregister();
    statePublisher.stopAll();
    await handle.stop();
    logger.info("shutdown complete");
  }
};

export const run = runRealModePipeline;
