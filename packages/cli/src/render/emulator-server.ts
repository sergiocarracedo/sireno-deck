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
  frontendDir?: string;
  /**
   * Query string appended to the emulator URL so the emulator chrome
   * can find the WS bridge and the deck iframe URL.
   */
  queryString?: string;
}

export function spawnEmulatorServer(
  opts: SpawnEmulatorServerOptions,
): Promise<EmulatorServerHandle> {
  const frontendDir =
    opts.frontendDir ?? path.resolve(__dirname, '../../frontend');
  const entry =
    opts.viteEntry ?? path.join(frontendDir, 'vite-emulator-entry.ts');
  return spawnViteServer({
    logger: opts.logger,
    moduleName: 'emulator-server',
    entry,
    cwd: frontendDir,
    env: opts.queryString
      ? { SIRENO_EMULATOR_QUERY: opts.queryString }
      : undefined,
  }).then((handle) => {
    if (opts.queryString) {
      handle.url = `${handle.url}${opts.queryString}`;
    }
    return handle;
  });
}