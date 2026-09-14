import { probeAll, type ProbeDeps, type SystemReport } from "."

let cached: { report: SystemReport; at: number; key: string } | null = null
const DEFAULT_TTL_MS = 5_000

// ponytail: the config path is the one dep that differs between two call sites
// in the same run — the banner probes the XDG default while the first-run gate
// probes the explicit --config. Keying on it stops the first probe's
// "Config: missing" from being replayed to the second.
const cacheKey = (deps: ProbeDeps): string =>
  `${deps.platform}\u0000${deps.xdgConfigHome}\u0000${deps.configPath ?? ""}`

// ponytail: single-slot TTL cache. probeAll runs subprocesses (which, sudo,
// lsusb, ...); the startup banner and runFirstRunCheckIfNeeded both probe the
// same machine within ms of each other — caching avoids paying for it twice.
// Single-slot because a CLI invocation probes one machine. Reset between runs
// via resetProbeCache() for tests.
export const probeAllCached = async (
  deps: ProbeDeps,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<SystemReport> => {
  const now = Date.now()
  const key = cacheKey(deps)
  if (cached !== null && cached.key === key && now - cached.at < ttlMs) {
    return cached.report
  }
  const report = await probeAll(deps)
  cached = { report, at: now, key }
  return report
}

export const resetProbeCache = (): void => {
  cached = null
}
