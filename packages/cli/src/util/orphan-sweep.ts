import { existsSync, readdirSync, rmSync, statSync } from "node:fs"
import { platform, tmpdir } from "node:os"
import { join } from "node:path"

export interface OrphanSweepPattern {
  maxAgeMs?: number
  prefix: string
}

export interface OrphanSweepResult {
  pattern: string
  removed: string[]
  scanned: number
  skipped: number
}

export interface OrphanSweepOptions {
  roots?: string[]
}

const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000

export function resolveSweepRoots(): string[] {
  if (platform() === "win32") {
    return [tmpdir()]
  }

  return [tmpdir(), "/tmp", "/var/tmp"].filter(
    (root, index, roots) => existsSync(root) && roots.indexOf(root) === index,
  )
}

function listMatchingDirs(root: string, prefix: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(root)
  } catch {
    return []
  }

  return entries
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => join(root, entry))
    .filter((path) => {
      try {
        return statSync(path).isDirectory()
      } catch {
        return false
      }
    })
}

export function sweepOrphanedTempDirs(
  patterns: readonly OrphanSweepPattern[],
  now: number = Date.now(),
  options: OrphanSweepOptions = {},
): OrphanSweepResult[] {
  if (patterns.length === 0) {
    return []
  }

  const roots = options.roots ?? resolveSweepRoots()
  const results: OrphanSweepResult[] = patterns.map((pattern) => ({
    pattern: pattern.prefix,
    removed: [],
    scanned: 0,
    skipped: 0,
  }))

  for (const root of roots) {
    for (let index = 0; index < patterns.length; index += 1) {
      const pattern = patterns[index]
      const result = results[index]
      if (!pattern || !result) continue

      const maxAgeMs = pattern.maxAgeMs ?? DEFAULT_MAX_AGE_MS
      const candidates = listMatchingDirs(root, pattern.prefix)
      for (const candidate of candidates) {
        result.scanned += 1
        let ageMs: number
        try {
          ageMs = now - statSync(candidate).mtimeMs
        } catch {
          result.skipped += 1
          continue
        }

        if (ageMs < maxAgeMs) {
          result.skipped += 1
          continue
        }

        try {
          rmSync(candidate, { force: true, recursive: true })
          result.removed.push(candidate)
        } catch {
          result.skipped += 1
        }
      }
    }
  }

  return results
}