import path from 'node:path';
import fs from 'node:fs';

export interface ResolvedAddonFrontend {
  addonName: string;
  frontendEntry: string;
  absolutePath: string;
}

export class AddonFrontendResolutionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'entry_outside_root'
      | 'file_not_found'
      | 'unsupported_extension',
  ) {
    super(message);
    this.name = 'AddonFrontendResolutionError';
  }
}

const SUPPORTED_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs'];

function tryResolveWithExtensions(
  basePath: string,
): string | null {
  if (fs.existsSync(basePath)) {
    const stat = fs.statSync(basePath);
    if (stat.isFile()) return basePath;
  }
  for (const ext of SUPPORTED_EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return candidate;
    }
  }
  return null;
}

function isWithin(child: string, parent: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

export function resolveAddonFrontendPath(opts: {
  addonName: string;
  frontendEntry: string;
  addonPackageRoot: string;
}): ResolvedAddonFrontend {
  const basePath = path.resolve(opts.addonPackageRoot, opts.frontendEntry);
  if (!isWithin(basePath, opts.addonPackageRoot)) {
    throw new AddonFrontendResolutionError(
      `Addon '${opts.addonName}' frontend entry '${opts.frontendEntry}' resolves to a path outside its package root (security violation)`,
      'entry_outside_root',
    );
  }
  const resolved = tryResolveWithExtensions(basePath);
  if (!resolved) {
    throw new AddonFrontendResolutionError(
      `Addon '${opts.addonName}' frontend entry '${opts.frontendEntry}' not found in '${opts.addonPackageRoot}' (tried ${SUPPORTED_EXTENSIONS.join(', ')})`,
      'file_not_found',
    );
  }
  const ext = path.extname(resolved);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new AddonFrontendResolutionError(
      `Addon '${opts.addonName}' frontend entry '${opts.frontendEntry}' has unsupported extension '${ext}'`,
      'unsupported_extension',
    );
  }
  return {
    addonName: opts.addonName,
    frontendEntry: opts.frontendEntry,
    absolutePath: resolved,
  };
}