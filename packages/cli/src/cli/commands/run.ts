import { homedir } from "node:os";

import type pino from "pino";

import { registerBuiltins } from "@/builtin-addons";
import { AddonRegistry } from "@/addon/registry";
import { findConfigPath } from "@/config/discovery";
import { loadConfig } from "@/config/loader";
import { formatFullIssues, isFullValid, validateFull } from "@/config/validation";
import {
  connectStreamDeck,
  type StreamDeckDevice,
  StreamDeckSelectionError,
} from "@/device/stream-deck";
import { listDevices, type DeviceDescriptor } from "@/device/registry";
import { selectDevice, NoStreamDeckFoundError } from "@/system/device-selection";
import { loadDeviceConfig, saveDeviceConfig } from "@/util/device-config";

import { runRealMode } from "./real-mode";

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
  readonly logger: pino.Logger;
}

export interface PreflightResult {
  readonly device: StreamDeckDevice;
  readonly descriptor: DeviceDescriptor;
  readonly xdgConfigHome: string;
  readonly frontendUrl: string;
}

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
    throw new Error(
      "Could not find config.yml. Pass --config <path> or set SIRENO_CONFIG. Searched cwd, $XDG_CONFIG_HOME/sireno-deck-2/config.yml.",
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

  return {
    device,
    descriptor,
    xdgConfigHome,
    frontendUrl: resolveFrontendUrl(options),
  };
};

export const runRealModePipeline = async (options: RunOptions): Promise<void> => {
  const { logger } = options;
  const { device, frontendUrl } = await preflight(options);

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
    await handle.stop();
    logger.info("shutdown complete");
  }
};

export const run = runRealModePipeline;
