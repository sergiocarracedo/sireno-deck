import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Logger } from 'pino';
import { spawnViteServer, type ViteServerHandle } from './vite-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type FrontendServerHandle = ViteServerHandle;

export interface SpawnFrontendServerOptions {
  logger: Logger;
  viteEntry?: string;
  frontendDir?: string;
  env?: NodeJS.ProcessEnv;
}

export function spawnFrontendServer(
  opts: SpawnFrontendServerOptions,
): Promise<FrontendServerHandle> {
  const frontendDir =
    opts.frontendDir ?? path.resolve(__dirname, '../../frontend');
  const entry = opts.viteEntry ?? path.join(frontendDir, 'vite-dev-entry.ts');
  return spawnViteServer({
    logger: opts.logger,
    moduleName: 'frontend-server',
    entry,
    cwd: frontendDir,
    env: opts.env,
  });
}