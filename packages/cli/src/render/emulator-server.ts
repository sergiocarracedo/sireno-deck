import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface EmulatorServerOptions {
  readonly port: number;
  readonly frontendEmulatorDir: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly logger?: (msg: string) => void;
}

export interface EmulatorServerHandle {
  readonly child: ChildProcess;
  readonly port: number;
  readonly url: string;
  close(): Promise<void>;
}

const READY_PREFIX = "READY ";

export const parseReadyLine = (line: string): number | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith(READY_PREFIX)) return null;
  const portStr = trimmed.slice(READY_PREFIX.length).trim();
  const port = Number.parseInt(portStr, 10);
  return Number.isFinite(port) ? port : null;
};

export const startEmulatorServer = async (
  options: EmulatorServerOptions,
): Promise<EmulatorServerHandle> => {
  const { port, frontendEmulatorDir } = options;
  const log = options.logger ?? ((): void => {});
  const viteBin = resolve(frontendEmulatorDir, "node_modules", ".bin", "vite");
  const cliEntry = resolve(frontendEmulatorDir, "src", "main");

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    ...options.env,
    SIRENO_EMULATOR_PORT: String(port),
  };

  const child = spawn("node", ["--import", "tsx/esm", viteBin, "--port", String(port), cliEntry], {
    cwd: frontendEmulatorDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  return await new Promise<EmulatorServerHandle>((resolvePromise, reject) => {
    let settled = false;
    const onData = (chunk: Buffer): void => {
      const text = chunk.toString("utf8");
      log(text);
      for (const line of text.split("\n")) {
        if (line.startsWith(READY_PREFIX)) {
          const actualPort = Number.parseInt(line.slice(READY_PREFIX.length).trim(), 10);
          if (!Number.isFinite(actualPort)) {
            return;
          }
          if (settled) return;
          settled = true;
          child.stdout?.off("data", onData);
          child.stderr?.off("data", onErr);
          resolvePromise({
            child,
            port: actualPort,
            url: `http://127.0.0.1:${actualPort}`,
            close: () => closeEmulator(child),
          });
        }
      }
    };
    const onErr = (chunk: Buffer): void => {
      log(`[emulator stderr] ${chunk.toString("utf8")}`);
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onErr);
    child.once("error", (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    child.once("exit", (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`emulator child exited early with code ${code}`));
      }
    });
  });
};

const closeEmulator = (child: ChildProcess): Promise<void> =>
  new Promise<void>((resolveClose) => {
    if (child.exitCode !== null) {
      resolveClose();
      return;
    }
    child.once("exit", () => resolveClose());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 2000).unref();
  });

export const emulatorServerEntryExists = (frontendEmulatorDir: string): boolean => {
  const main = resolve(frontendEmulatorDir, "src", "main");
  const pkg = resolve(frontendEmulatorDir, "package.json");
  return existsSync(main) && existsSync(pkg);
};

export const __test_internals = {
  resolveEntry: (frontendEmulatorDir: string): string =>
    resolve(frontendEmulatorDir, "src", "main"),
};

const _internalDirname = dirname(fileURLToPath(import.meta.url));
void _internalDirname;
