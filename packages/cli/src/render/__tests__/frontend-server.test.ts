import { describe, it, expect, vi, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { spawnFrontendServer } from '../frontend-server.js';

const FAKE_ENTRY_PREFIX = `#!/usr/bin/env node
`;

async function writeFakeEntry(
  body: string,
  tmpDir?: string,
): Promise<{ entry: string; cleanup: () => Promise<void> }> {
  const dir = tmpDir ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'vite-fake-')));
  const entry = path.join(dir, 'fake-vite-entry.mjs');
  await fs.writeFile(entry, FAKE_ENTRY_PREFIX + body, 'utf8');
  await fs.chmod(entry, 0o755);
  return {
    entry,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}

function silentLogger() {
  return {
    child: () => silentLogger(),
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    debug: () => {},
    trace: () => {},
  } as any;
}

describe('spawnFrontendServer', () => {
  let cleanups: Array<() => Promise<void>> = [];
  afterEach(async () => {
    for (const c of cleanups) await c();
    cleanups = [];
  });

  it('captures READY <port> from child stdout and resolves handle', async () => {
    const { entry, cleanup } = await writeFakeEntry(`
console.log('READY 5180');
setInterval(() => {}, 1000);
`);
    cleanups.push(cleanup);

    const handle = await spawnFrontendServer({
      logger: silentLogger() as any,
      viteEntry: entry,
    });
    expect(handle.port).toBe(5180);
    expect(handle.url).toBe('http://127.0.0.1:5180');
    await handle.close();
  }, 15_000);

  it('close() kills child cleanly', async () => {
    const { entry, cleanup } = await writeFakeEntry(`
console.log('READY 5190');
setInterval(() => {}, 1000);
`);
    cleanups.push(cleanup);

    const handle = await spawnFrontendServer({
      logger: silentLogger() as any,
      viteEntry: entry,
    });
    await handle.close();
  }, 15_000);
});