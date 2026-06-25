import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import type pino from "pino";

import type {
  ButtonActionMessage,
  DeckConfigMessage,
  WsMessage,
} from "@/api/protocol-internal";
import type { Runtime, RuntimeDeck } from "@/deck";
import { startWsBridge, type WsBridge } from "@/render/ws-bridge";

const EMULATOR_PACKAGE = "@sireno-deck-2/frontend-emulator";
const DEFAULT_EMULATOR_PORT = 52938;
const DEFAULT_TIMEOUT_MS = 30_000;
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\u001b\[[0-9;]*m/g;
const READY_REGEX = /Local:[^\n]*?https?:\/\/127\.0\.0\.1:(\d+)/;

export interface RunEmulatorModeOptions {
  readonly emulatorPort?: number;
  readonly emulatorCwd?: string;
  readonly pnpmCommand?: string;
  readonly readyTimeoutMs?: number;
  readonly activeTheme?: { name: string; version?: number };
  readonly runtime?: Runtime;
  readonly decks?: ReadonlyArray<RuntimeDeck>;
  readonly logger: pino.Logger;
}

export interface EmulatorModeHandle {
  readonly frontendUrl: string;
  readonly wsUrl: string;
  stop(): Promise<void>;
}

const findWorkspaceRoot = (): string => {
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
  return resolvePath(findWorkspaceRoot(), "packages", "cli", "frontend-emulator");
};

const spawnEmulatorVite = (options: {
  port: number;
  cwd: string;
  pnpmCommand: string;
  readyTimeoutMs: number;
  logger: pino.Logger;
  wsUrl?: string;
}): Promise<{ process: ChildProcess; url: string }> => {
  const { port, cwd, pnpmCommand, readyTimeoutMs, logger, wsUrl } = options;

  return new Promise((resolve, reject) => {
    if (!existsSync(cwd)) {
      reject(new Error(`frontend-emulator workspace not found at ${cwd}`));
      return;
    }
    const env: Record<string, string> = { ...process.env, FORCE_COLOR: "0" };
    if (wsUrl !== undefined) {
      env["SIRENO_WS_URL"] = wsUrl;
    }
    const child = spawn(
      pnpmCommand,
      ["--filter", EMULATOR_PACKAGE, "run", "dev", "--", "--port", String(port)],
      {
        cwd: findWorkspaceRoot(),
        env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`frontend-emulator did not become ready within ${readyTimeoutMs}ms`));
    }, readyTimeoutMs);

    const onData = (chunk: Buffer): void => {
      const text = chunk.toString();
      logger.debug({ chunk: text }, "emulator vite stdout");
      const stripped = text.replace(ANSI_REGEX, "");
      const match = stripped.match(READY_REGEX);
      if (match && match[1]) {
        clearTimeout(timer);
        const url = `http://127.0.0.1:${match[1]}`;
        resolve({ process: child, url });
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", (chunk: Buffer) => {
      logger.debug({ chunk: chunk.toString() }, "emulator vite stderr");
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`frontend-emulator exited (code=${code}) before becoming ready`));
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

const buildDeckConfigMessage = (deck: RuntimeDeck): DeckConfigMessage => ({
  type: "deck-config",
  deckId: deck.id,
  surfaces: {
    [deck.id]: {
      id: deck.id,
      name: deck.name ?? deck.id,
      buttons: deck.buttons.map((b) => ({
        id: b.id,
        type: b.type,
        config: (b.config ?? {}) as Record<string, unknown>,
      })),
    },
  },
  navMode: "regular",
});

export const runEmulatorMode = async (
  options: RunEmulatorModeOptions,
): Promise<EmulatorModeHandle> => {
  const port = options.emulatorPort ?? DEFAULT_EMULATOR_PORT;
  const pnpmCommand = options.pnpmCommand ?? "pnpm";
  const cwd = resolveEmulatorCwd(options.emulatorCwd);
  const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_TIMEOUT_MS;

  const bridge: WsBridge = await startWsBridge(
    options.activeTheme !== undefined ? { activeTheme: options.activeTheme } : {},
  );

  const { process: vite, url: frontendUrl } = await spawnEmulatorVite({
    port,
    cwd,
    pnpmCommand,
    readyTimeoutMs,
    logger: options.logger,
    wsUrl: bridge.url,
  });

  bridge.onMessage((message) => {
    if (isButtonAction(message)) {
      options.logger.info(
        { deckId: message.deckId, position: message.position, gesture: message.gesture },
        "emulator: button-action received",
      );
      if (options.runtime !== undefined) {
        const deck = options.decks?.find((d) => d.id === message.deckId);
        const button = deck?.buttons[message.position];
        if (button === undefined) {
          options.logger.warn(
            { deckId: message.deckId, position: message.position },
            "emulator: button-action targets unknown button",
          );
          return;
        }
        void options.runtime.dispatchGesture(button.id, message.gesture);
      }
    }
  });

  if (options.runtime !== undefined && options.decks !== undefined && options.decks.length > 0) {
    const mainDeck = options.decks.find((d) => d.isMain) ?? options.decks[0]!;
    bridge.onConnection((socket) => {
      socket.send(JSON.stringify(buildDeckConfigMessage(mainDeck)));
      options.logger.info(
        { deckId: mainDeck.id, buttons: mainDeck.buttons.length },
        "emulator: deck-config sent to new client",
      );
    });
  }

  return {
    frontendUrl,
    wsUrl: bridge.url,
    async stop(): Promise<void> {
      try {
        await bridge.close();
      } finally {
        await killChild(vite);
      }
    },
  };
};
