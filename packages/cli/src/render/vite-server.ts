import { ChildProcess, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { Logger } from 'pino';

export interface ViteServerHandle extends EventEmitter {
  port: number;
  url: string;
  restartCount: number;
  close(): Promise<void>;
}

export interface SpawnViteServerOptions {
  logger: Logger;
  moduleName: string;
  entry: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  maxRestarts?: number;
}

const MAX_RESTARTS = 3;
const READY_REGEX = /^READY\s+(\d+)/;

export function spawnViteServer(
  opts: SpawnViteServerOptions,
): Promise<ViteServerHandle> {
  const logger = opts.logger.child({ module: opts.moduleName });
  const maxRestarts = opts.maxRestarts ?? MAX_RESTARTS;

  const handle = new EventEmitter() as ViteServerHandle;
  handle.port = 0;
  handle.url = '';
  handle.restartCount = 0;

  let child: ChildProcess | null = null;
  let closed = false;
  let restartTimer: NodeJS.Timeout | null = null;
  let stdoutBuf = '';
  let resolveReady: ((value: ViteServerHandle) => void) | null = null;
  let rejectReady: ((err: Error) => void) | null = null;

  const handleLine = (line: string) => {
    const m = READY_REGEX.exec(line);
    if (m && handle.port === 0) {
      handle.port = parseInt(m[1]!, 10);
      handle.url = `http://127.0.0.1:${handle.port}`;
      logger.info({ port: handle.port, url: handle.url }, 'Vite ready');
      if (resolveReady) {
        const r = resolveReady;
        resolveReady = null;
        rejectReady = null;
        r(handle);
      }
      return;
    }
    if (line.startsWith('[error]') || line.startsWith('Error')) {
      logger.error({ line }, 'vite');
    } else if (line.startsWith('[warn]') || line.startsWith('warn')) {
      logger.warn({ line }, 'vite');
    } else if (line.trim().length > 0) {
      logger.info({ line }, 'vite');
    }
  };

  const spawnChild = () => {
    if (closed) return;
    logger.info(
      { entry: opts.entry, attempt: handle.restartCount },
      'spawning Vite child process',
    );
    const isTs = /\.(ts|tsx|cts|mts)$/.test(opts.entry);
    const nodeArgs = isTs ? ['--import', 'tsx/esm', opts.entry] : [opts.entry];
    child = spawn('node', nodeArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...opts.env },
      cwd: opts.cwd,
    });

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdoutBuf += chunk;
      let idx: number;
      while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, idx).trimEnd();
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (line) handleLine(line);
      }
    });

    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      logger.error({ stderr: chunk.trim() }, 'vite stderr');
    });

    child.on('exit', (code, signal) => {
      logger.warn({ code, signal, restartCount: handle.restartCount }, 'vite child exited');
      child = null;
      if (closed) return;
      if (handle.restartCount >= maxRestarts) {
        logger.fatal('Vite child crashed and exceeded max restarts; exiting CLI');
        if (rejectReady) {
          const r = rejectReady;
          rejectReady = null;
          resolveReady = null;
          r(new Error('Vite child crashed and exceeded max restarts'));
        }
        process.exit(1);
        return;
      }
      const backoffMs = 1000 << handle.restartCount;
      handle.restartCount += 1;
      logger.info({ backoffMs, nextAttempt: handle.restartCount }, 'scheduling Vite restart');
      restartTimer = setTimeout(spawnChild, backoffMs);
    });

    child.on('error', (err) => {
      logger.error({ err }, 'vite child error');
    });
  };

  handle.close = async () => {
    closed = true;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (!child) return;
    const c = child;
    return new Promise<void>((resolve) => {
      c.once('exit', () => resolve());
      try {
        c.kill('SIGTERM');
      } catch {
        resolve();
      }
      setTimeout(() => {
        try {
          c.kill('SIGKILL');
        } catch {}
        resolve();
      }, 2000).unref();
    });
  };

  return new Promise<ViteServerHandle>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (handle.port === 0 && !closed) {
        logger.fatal('Vite child did not become ready within 30s');
        closed = true;
        if (child) {
          try {
            child.kill('SIGKILL');
          } catch {}
        }
        reject(new Error('Vite child did not become ready within 30s'));
      }
    }, 30_000);
    resolveReady = (v) => {
      clearTimeout(timeout);
      resolve(v);
    };
    rejectReady = (err) => {
      clearTimeout(timeout);
      reject(err);
    };
    spawnChild();
  });
}