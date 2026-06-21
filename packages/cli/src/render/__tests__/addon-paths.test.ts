import { describe, it, expect } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  resolveAddonFrontendPath,
  AddonFrontendResolutionError,
} from '../addon-paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'addon-paths-test-'));
}

describe('resolveAddonFrontendPath', () => {
  it('resolves a built-in addon frontend relative to its package root', async () => {
    const addonRoot = path.resolve(__dirname, '../../builtin-addons/date-time');
    const result = resolveAddonFrontendPath({
      addonName: 'date-time',
      frontendEntry: './frontend',
      addonPackageRoot: addonRoot,
    });
    expect(result.addonName).toBe('date-time');
    expect(result.frontendEntry).toBe('./frontend');
    expect(result.absolutePath).toBe(path.join(addonRoot, 'frontend.tsx'));
    expect(result.absolutePath.endsWith('frontend.tsx')).toBe(true);
  });

  it('throws when the frontend file does not exist', async () => {
    const dir = await mkTmp();
    try {
      expect(() =>
        resolveAddonFrontendPath({
          addonName: 'missing',
          frontendEntry: './missing',
          addonPackageRoot: dir,
        }),
      ).toThrow(AddonFrontendResolutionError);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects paths that escape the addon package root', async () => {
    const dir = await mkTmp();
    try {
      expect(() =>
        resolveAddonFrontendPath({
          addonName: 'evil',
          frontendEntry: '../../etc/passwd',
          addonPackageRoot: dir,
        }),
      ).toThrow(/outside its package root/);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('falls back to .ts when .tsx is missing', async () => {
    const dir = await mkTmp();
    try {
      await fs.writeFile(path.join(dir, 'frontend.ts'), 'export default 1;', 'utf8');
      const result = resolveAddonFrontendPath({
        addonName: 'ts-only',
        frontendEntry: './frontend',
        addonPackageRoot: dir,
      });
      expect(result.absolutePath).toBe(path.join(dir, 'frontend.ts'));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('prefers explicit extension when provided', async () => {
    const dir = await mkTmp();
    try {
      await fs.writeFile(path.join(dir, 'frontend.tsx'), 'export default "tsx";', 'utf8');
      await fs.writeFile(path.join(dir, 'frontend.ts'), 'export default "ts";', 'utf8');
      const result = resolveAddonFrontendPath({
        addonName: 'both',
        frontendEntry: './frontend.ts',
        addonPackageRoot: dir,
      });
      expect(result.absolutePath).toBe(path.join(dir, 'frontend.ts'));
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});