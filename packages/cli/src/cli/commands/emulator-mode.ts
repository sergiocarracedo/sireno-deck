import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import type pino from "pino";

import type { ButtonActionMessage, DeckConfigMessage, WsMessage } from "@/api/protocol-internal";
import { computeSystemButtonForSlotN1, type Runtime, type RuntimeDeck } from "@/deck";
import { getAllAssets, registerIconForDeck } from "@/core/icon-asset-registry";
import { findConfigPath } from "@/config/discovery";
import { resolveIconPath, type ResolveIconPathOptions } from "@/render/icon-resolver";
import { startWsBridge, type WsBridge } from "@/render/ws-bridge";
import {
  BUILT_IN_THEMES,
  buildThemeCssFromManifest,
  readAndValidateManifest,
} from "@/themes/loader";

const DEFAULT_FRONTEND_PORT = 5180;
const DEFAULT_EMULATOR_PORT = 52938;
const DEFAULT_TIMEOUT_MS = 30_000;
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\u001b\[[0-9;]*m/g;
const READY_REGEX = /(?:Local|➜\s*Local|Network use --host)[^\n]*?https?:\/\/[^:\s]+(?::(\d+))?/;

export interface RunEmulatorModeOptions {
  readonly emulatorPort?: number;
  readonly emulatorCwd?: string;
  readonly pnpmCommand?: string;
  readonly readyTimeoutMs?: number;
  readonly activeTheme?: { name: string; version?: number };
  readonly runtime?: Runtime;
  readonly decks?: ReadonlyArray<RuntimeDeck>;
  readonly addonByType?: Map<string, AddonFrontendRef>;
  readonly config?: string;
  readonly onBridgeReady?: (bridge: WsBridge) => void | Promise<void>;
  readonly logger: pino.Logger;
}

export interface EmulatorModeHandle {
  readonly emulatorUrl: string;
  readonly frontendUrl: string;
  readonly wsUrl: string;
  readonly childPids: ReadonlyArray<number>;
  stop(): Promise<void>;
}

export const findWorkspaceRoot = (): string => {
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(resolvePath(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return here;
};

const resolveEmulatorCwd = (override?: string): string => {
  if (override !== undefined) return override;
  return resolvePath(findWorkspaceRoot(), "packages", "cli", "emulator");
};

export const resolveFrontendCwd = (): string =>
  resolvePath(findWorkspaceRoot(), "packages", "cli", "frontend");

export const spawnFrontendVite = (options: {
  port: number;
  cwd: string;
  pnpmCommand: string;
  readyTimeoutMs: number;
  logger: pino.Logger;
  wsUrl?: string;
  themeDir?: string;
}): Promise<{ process: ChildProcess; url: string }> => {
  const { port, cwd, pnpmCommand, readyTimeoutMs, logger, wsUrl, themeDir } = options;

  return new Promise((resolve, reject) => {
    if (!existsSync(cwd)) {
      reject(new Error(`frontend workspace not found at ${cwd}`));
      return;
    }
    const env: Record<string, string> = { ...process.env, FORCE_COLOR: "0" };
    if (wsUrl !== undefined) {
      env["SIRENO_WS_URL"] = wsUrl;
    }
    if (themeDir !== undefined) {
      env["SIRENO_THEME_DIR"] = themeDir;
    }
    const viteBin = findWorkspaceRoot() + "/node_modules/.bin/vite";
    const child = spawn(
      viteBin,
      ["--config", resolvePath(cwd, "vite.config.ts"), "--port", String(port)],
      {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    // Track whether the promise has settled (ready resolved or rejected).
    // Once settled, any subsequent `exit` event is unexpected: Vite crashed
    // or restarted after being usable. We log a fatal warning so operators
    // see the failure even though the spawn promise cannot reject anymore.
    let settled = false;
    let settledUrl: string | null = null;

    const formatOutput = (text: string, label: "stdout" | "stderr"): string => {
      const trimmed = text.trimEnd();
      if (trimmed.length === 0) return "";
      const lines = trimmed
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
      return `${label}:\n${lines}\n`;
    };

    const collectOutput = (text: string, label: "stdout" | "stderr"): void => {
      const formatted = formatOutput(text, label);
      if (formatted.length > 0) {
        if (label === "stdout") stdoutChunks.push(formatted);
        else stderrChunks.push(formatted);
        if (label === "stderr") logger.warn(formatted.trimEnd(), "frontend vite");
        else logger.info(formatted.trimEnd(), "frontend vite");
      }
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      const output = stdoutChunks.join("") + stderrChunks.join("");
      const detail = output.length > 0 ? `\n  output:\n${output}` : "";
      reject(new Error(`frontend did not become ready within ${readyTimeoutMs}ms${detail}`));
    }, readyTimeoutMs);

    const fallbackTimer = setTimeout(() => {
      const url = `http://127.0.0.1:${port}`;
      logger.warn({ url }, "frontend vite: regex did not match, using fallback port");
      clearTimeout(timer);
      settled = true;
      settledUrl = url;
      resolve({ process: child, url });
    }, readyTimeoutMs - 1000);

    const onData = (chunk: Buffer): void => {
      const text = chunk.toString();
      collectOutput(text, "stdout");
      const stripped = text.replace(ANSI_REGEX, "");
      const match = stripped.match(READY_REGEX);
      if (match && match[1]) {
        clearTimeout(timer);
        const url = `http://127.0.0.1:${match[1]}`;
        setTimeout(() => {
          settled = true;
          settledUrl = url;
          resolve({ process: child, url });
        }, 1000);
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", (chunk: Buffer) => {
      collectOutput(chunk.toString(), "stderr");
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (settled) {
        // The frontend was usable but is now gone — Vite likely crashed
        // during HMR. Surface this with a fatal log so the blank-page
        // detection downstream has company rather than going silent.
        logger.fatal(
          { code, url: settledUrl },
          "frontend vite exited after becoming ready — emulator will show a blank deck until the frontend is restarted",
        );
        return;
      }
      const output = stdoutChunks.join("") + stderrChunks.join("");
      const detail = output.length > 0 ? `\n  output:\n${output}` : "";
      reject(new Error(`frontend exited (code=${code}) before becoming ready${detail}`));
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
};

const spawnEmulatorVite = (options: {
  port: number;
  cwd: string;
  pnpmCommand: string;
  readyTimeoutMs: number;
  logger: pino.Logger;
  wsUrl?: string;
  frontendUrl?: string;
}): Promise<{ process: ChildProcess; url: string }> => {
  const { port, cwd, pnpmCommand, readyTimeoutMs, logger, wsUrl, frontendUrl } = options;

  return new Promise((resolve, reject) => {
    if (!existsSync(cwd)) {
      reject(new Error(`emulator workspace not found at ${cwd}`));
      return;
    }
    const env: Record<string, string> = { ...process.env, FORCE_COLOR: "0" };
    if (wsUrl !== undefined) {
      env["SIRENO_WS_URL"] = wsUrl;
    }
    if (frontendUrl !== undefined) {
      env["SIRENO_FRONTEND_URL"] = frontendUrl;
    }
    const viteBin = findWorkspaceRoot() + "/node_modules/.bin/vite";
    const child = spawn(
      viteBin,
      ["--config", resolvePath(cwd, "vite.config.ts"), "--port", String(port)],
      {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let settled = false;
    let settledUrl: string | null = null;

    const formatOutput = (text: string, label: "stdout" | "stderr"): string => {
      const trimmed = text.trimEnd();
      if (trimmed.length === 0) return "";
      const lines = trimmed
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n");
      return `${label}:\n${lines}\n`;
    };

    const collectOutput = (text: string, label: "stdout" | "stderr"): void => {
      const formatted = formatOutput(text, label);
      if (formatted.length > 0) {
        if (label === "stdout") stdoutChunks.push(formatted);
        else stderrChunks.push(formatted);
        if (label === "stderr") logger.warn(formatted.trimEnd(), "emulator vite");
        else logger.info(formatted.trimEnd(), "emulator vite");
      }
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      const output = stdoutChunks.join("") + stderrChunks.join("");
      const detail = output.length > 0 ? `\n  output:\n${output}` : "";
      reject(new Error(`emulator did not become ready within ${readyTimeoutMs}ms${detail}`));
    }, readyTimeoutMs);

    const onData = (chunk: Buffer): void => {
      const text = chunk.toString();
      collectOutput(text, "stdout");
      const stripped = text.replace(ANSI_REGEX, "");
      const match = stripped.match(READY_REGEX);
      if (match && match[1]) {
        clearTimeout(timer);
        const url = `http://127.0.0.1:${match[1]}`;
        settled = true;
        settledUrl = url;
        resolve({ process: child, url });
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", (chunk: Buffer) => {
      collectOutput(chunk.toString(), "stderr");
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (settled) {
        logger.fatal(
          { code, url: settledUrl },
          "emulator vite exited after becoming ready — commands from buttons will no longer be received",
        );
        return;
      }
      const output = stdoutChunks.join("") + stderrChunks.join("");
      const detail = output.length > 0 ? `\n  output:\n${output}` : "";
      reject(new Error(`emulator exited (code=${code}) before becoming ready${detail}`));
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
};

const killChild = (child: ChildProcess): Promise<void> =>
  new Promise<void>((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 2_000);
  });

const isButtonAction = (m: WsMessage): m is ButtonActionMessage => m.type === "button-action";

export interface AddonFrontendRef {
  readonly name: string;
  readonly frontendEntry: string | null;
}

const deriveLabel = (type: string, config: Record<string, unknown>): string | undefined => {
  switch (type) {
    case "core:action": {
      const cmd = config["command"];
      if (typeof cmd === "string" && cmd.length > 0) {
        return cmd.length > 14 ? `${cmd.slice(0, 13)}…` : cmd;
      }
      return undefined;
    }
    case "core:change-deck": {
      const deck = config["deck"];
      if (typeof deck === "string" && deck.length > 0) {
        return `→ ${deck}`;
      }
      return undefined;
    }
    default:
      return undefined;
  }
};

export const buildDeckConfigMessage = (
  deck: RuntimeDeck,
  addonByType: Map<string, AddonFrontendRef>,
  resolverOptions: ResolveIconPathOptions = {},
  navState?: { navStackDepth: number; hasOverlayDeckAvailable: boolean },
  keyCount?: number,
): DeckConfigMessage => {
  const effectiveKeyCount = keyCount ?? 15;
  const n1Position = effectiveKeyCount - 1;
  const buttons = deck.buttons.map((b) => {
    const position = Number.parseInt(b.id, 10);
    const addon = addonByType.get(b.type);
    const cfg = (b.config ?? {}) as Record<string, unknown>;
    const label = deriveLabel(b.type, cfg);
    const resolvedConfig = resolveConfigIcon(cfg, resolverOptions);
    return {
      id: b.id,
      type: b.type,
      config: resolvedConfig,
      ...(Number.isFinite(position) ? { position } : {}),
      ...(label !== undefined ? { label } : {}),
      ...(addon !== undefined ? { addonName: addon.name } : {}),
      ...(addon?.frontendEntry !== undefined && addon.frontendEntry !== null
        ? { frontendEntry: addon.frontendEntry }
        : {}),
    };
  });
  const systemButtonType = computeSystemButtonForSlotN1(
    deck,
    navState ?? { navStackDepth: 1, hasOverlayDeckAvailable: false },
  );
  if (systemButtonType !== null) {
    const alreadyHasN1 = buttons.some(
      (b) => Number.parseInt(b.id, 10) === n1Position || b.position === n1Position,
    );
    if (!alreadyHasN1) {
      buttons.push({ id: String(n1Position), type: systemButtonType, config: {} });
    }
  }
  return {
    type: "deck-config",
    deckId: deck.id,
    surfaces: {
      [deck.id]: {
        id: deck.id,
        name: deck.name ?? deck.id,
        buttons,
      },
    },
    navMode: "regular",
  };
};

const resolveConfigIcon = (
  cfg: Record<string, unknown>,
  resolverOptions: ResolveIconPathOptions,
): Record<string, unknown> => {
  const raw = cfg.icon;
  if (typeof raw !== "string") return cfg;
  const resolved = resolveIconPath(raw, resolverOptions);
  if (resolved === undefined || resolved === raw) return cfg;
  return { ...cfg, icon: resolved };
};

export const runEmulatorMode = async (
  options: RunEmulatorModeOptions,
): Promise<EmulatorModeHandle> => {
  const port = options.emulatorPort ?? DEFAULT_EMULATOR_PORT;
  const pnpmCommand = options.pnpmCommand ?? "pnpm";
  const emulatorCwd = resolveEmulatorCwd(options.emulatorCwd);
  const frontendCwd = resolveFrontendCwd();
  const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (process.env["SIRENO_THEME"] === undefined || process.env["SIRENO_THEME"].length === 0) {
    const defaultSpec = BUILT_IN_THEMES[0];
    if (defaultSpec !== undefined) {
      const manifestPath = resolvePath(defaultSpec.dir, "sirenodeck.json");
      process.env["SIRENO_THEME"] = JSON.stringify({
        name: defaultSpec.name,
        manifestPath,
        uiOverridesPath: null,
      });
      process.env["SIRENO_THEME_DIR"] = frontendCwd;
      const cssDir = join(frontendCwd, ".sireno-deck");
      if (!existsSync(cssDir)) mkdirSync(cssDir, { recursive: true });
      const manifest = readAndValidateManifest(manifestPath, defaultSpec.name);
      const cssContent = buildThemeCssFromManifest(manifest, defaultSpec.dir);
      writeFileSync(join(cssDir, "theme.css"), cssContent, "utf8");
    }
  }

  const bridge: WsBridge = await startWsBridge(
    options.activeTheme !== undefined ? { activeTheme: options.activeTheme } : {},
  );
  if (options.onBridgeReady !== undefined) {
    void Promise.resolve(options.onBridgeReady(bridge));
  }

  const { process: frontendVite, url: frontendUrl } = await spawnFrontendVite({
    port: DEFAULT_FRONTEND_PORT,
    cwd: frontendCwd,
    pnpmCommand,
    readyTimeoutMs,
    logger: options.logger,
    wsUrl: bridge.url,
    themeDir: process.env["SIRENO_THEME_DIR"],
  });

  const { process: emulatorVite, url: emulatorUrl } = await spawnEmulatorVite({
    port,
    cwd: emulatorCwd,
    pnpmCommand,
    readyTimeoutMs,
    logger: options.logger,
    wsUrl: bridge.url,
    frontendUrl,
  });

  bridge.onMessage((message) => {
    if (isButtonAction(message)) {
      options.logger.info(
        {
          deckId: message.deckId,
          position: message.position,
          gesture: message.gesture,
        },
        "emulator: button-action received",
      );
      if (options.runtime !== undefined) {
        const deck = options.decks?.find((d) => d.id === message.deckId);
        const button = deck?.buttons.find((b) => {
          const p = Number.parseInt(b.id, 10);
          return Number.isFinite(p) && p === message.position;
        });
        if (button === undefined) {
          options.logger.warn(
            { deckId: message.deckId, position: message.position },
            "emulator: button-action targets unknown button",
          );
          return;
        }
        console.log("[emulator] dispatching gesture", {
          buttonId: `${message.deckId}:${button.id}`,
          gesture: message.gesture,
        });
        void options.runtime.dispatchGesture(`${message.deckId}:${button.id}`, message.gesture);
      }
    }
  });

  if (options.runtime !== undefined && options.decks !== undefined && options.decks.length > 0) {
    const mainDeck = options.decks.find((d) => d.isMain) ?? options.decks[0]!;
    const addonByType = options.addonByType ?? new Map();
    const baseDirs: string[] = [];
    if (options.config !== undefined) {
      baseDirs.push(dirname(options.config));
    } else {
      const discovered = findConfigPath({ homeDir: homedir() });
      if (discovered !== null) {
        baseDirs.push(dirname(discovered));
      }
    }
    const resolverOptions: ResolveIconPathOptions = {
      addonDirs: new Map(
        Array.from(addonByType.values())
          .filter((ref) => ref.frontendEntry !== null)
          .map((ref) => [ref.name, dirname(ref.frontendEntry as string)] as const),
      ),
      baseDirs,
    };
    bridge.onConnection((socket) => {
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
      socket.send(
        JSON.stringify(
          buildDeckConfigMessage(
            mainDeck,
            addonByType,
            resolverOptions,
            { navStackDepth: 1, hasOverlayDeckAvailable: false },
            15,
          ),
        ),
      );
      options.logger.info(
        { deckId: mainDeck.id, buttons: mainDeck.buttons.length },
        "emulator: deck-config sent to new client",
      );
    });
  }

  return {
    emulatorUrl,
    frontendUrl,
    wsUrl: bridge.url,
    childPids: [frontendVite.pid ?? 0, emulatorVite.pid ?? 0].filter((p) => p > 0),
    async stop(): Promise<void> {
      try {
        await bridge.close();
      } finally {
        await killChild(frontendVite);
        await killChild(emulatorVite);
      }
    },
  };
};
