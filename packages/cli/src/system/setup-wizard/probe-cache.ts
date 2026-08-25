import { probeAll, type ProbeDeps, type SystemReport } from "."

let cached: { report: SystemReport; at: number } | null = null
const DEFAULT_TTL_MS = 5_000

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
  if (cached !== null && now - cached.at < ttlMs) {
    return cached.report
  }
  const report = await probeAll(deps)
  cached = { report, at: now }
  return report
}

export const resetProbeCache = (): void => {
  cached = null
}
