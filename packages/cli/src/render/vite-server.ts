import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

export interface ViteServerOptions {
  command: string;
  args: ReadonlyArray<string>;
  cwd: string;
  env?: Readonly<Record<string, string>>;
  readyMatcher?: RegExp;
  maxRestarts?: number;
  restartBackoffMs?: ReadonlyArray<number>;
}

export interface ViteServerHandle {
  readonly emitter: EventEmitter;
  readonly port: number | null;
  readonly pid: number | null;
  stop(): Promise<void>;
}

export const spawnViteServer = (options: ViteServerOptions): Promise<ViteServerHandle> => {
  const {
    command,
    args,
    cwd,
    env,
    readyMatcher = /READY\s+(\d+)/,
    maxRestarts = 3,
    restartBackoffMs = [500, 1000, 2000],
  } = options;

  return new Promise((resolve, reject) => {
    const emitter = new EventEmitter();
    let current: ChildProcess | null = null;
    let port: number | null = null;
    let pid: number | null = null;
    let restartCount = 0;
    let stopped = false;

    const killCurrent = (): Promise<void> =>
      new Promise<void>((res) => {
        if (current === null) {
          res();
          return;
        }
        const proc = current;
        proc.once("exit", () => res());
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!proc.killed) proc.kill("SIGKILL");
        }, 2000);
      });

    const start = (): void => {
      if (stopped) return;
      current = spawn(command, [...args], {
        cwd,
        env: env !== undefined ? { ...process.env, ...env } : process.env,
      });
      pid = current.pid ?? null;

      const onReady = (matchedPort: number): void => {
        port = matchedPort;
        emitter.emit("ready", matchedPort);
        resolve(handle);
      };

      const buffer: string[] = [];
      current.stdout?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        buffer.push(text);
        if (port === null) {
          const match = text.match(readyMatcher) ?? buffer.join("").match(readyMatcher);
          if (match && match[1]) onReady(Number.parseInt(match[1], 10));
        }
        emitter.emit("stdout", text);
      });

      current.stderr?.on("data", (chunk: Buffer) => {
        emitter.emit("stderr", chunk.toString());
      });

      current.on("exit", (code) => {
        if (stopped) return;
        if (port === null) {
          reject(new Error(`vite spawn: process exited with code ${code} before READY`));
          return;
        }
        if (restartCount >= maxRestarts) {
          emitter.emit("crash", code);
          return;
        }
        const backoff =
          restartBackoffMs[Math.min(restartCount, restartBackoffMs.length - 1)] ?? 1000;
        restartCount += 1;
        emitter.emit("restart", restartCount, backoff);
        setTimeout(start, backoff);
      });
    };

    const handle: ViteServerHandle = {
      emitter,
      get port() {
        return port;
      },
      get pid() {
        return pid;
      },
      stop: async () => {
        stopped = true;
        await killCurrent();
      },
    };

    start();
  });
};
