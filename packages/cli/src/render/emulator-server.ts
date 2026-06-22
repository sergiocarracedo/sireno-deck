import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Logger } from 'pino';
import { spawnViteServer, type ViteServerHandle } from './vite-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type EmulatorServerHandle = ViteServerHandle;

export interface SpawnEmulatorServerOptions {
  logger: Logger;
  viteEntry?: string;
  emulatorDir?: string;
  port?: number;
  /**
   * URLs injected into the emulator shell via Vite's `transformIndexHtml`
   * plugin (exposed on `window.__SIRENO__`). The page URL itself stays clean.
   */
  deckUrl: string;
  wsUrl: string;
  keyCount: number;
}

export function spawnEmulatorServer(
  opts: SpawnEmulatorServerOptions,
): Promise<EmulatorServerHandle> {
  const emulatorDir =
    opts.emulatorDir ?? path.resolve(__dirname, '../../frontend-emulator');
  const entry =
    opts.viteEntry ?? path.join(emulatorDir, 'vite-dev-entry.ts');
  const env: NodeJS.ProcessEnv = {
    SIRENO_DECK_URL: opts.deckUrl,
    SIRENO_WS_URL: opts.wsUrl,
    SIRENO_KEY_COUNT: String(opts.keyCount),
  };
  if (opts.port) env.SIRENO_VITE_PORT = String(opts.port);
  return spawnViteServer({
    logger: opts.logger,
    moduleName: 'emulator-server',
    entry,
    cwd: emulatorDir,
    env,
  });
}
