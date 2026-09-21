import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

export type PackageManager = "pnpm" | "npm" | "yarn"

const managers: PackageManager[] = ["pnpm", "npm", "yarn"]

/**
 * ponytail: every probe in this module runs a package manager we did not write,
 * found on `PATH`, purely to ask it a question. A broken one must not be able to
 * take the daemon down with it, so the probes are bounded on three axes:
 *
 * - `timeout` + `killSignal`, because a hung manager used to hang startup
 *   forever with no output at all. A corrupt pnpm shim that re-`exec`s itself
 *   made `pnpm root --global` never return; `execFileSync` has no timeout by
 *   default, so the daemon simply stopped there, before it bound a port or lit
 *   a single key. SIGTERM is not enough — a manager that is busy spawning does
 *   not get round to handling it — so the deadline is enforced with SIGKILL.
 * - `maxBuffer`, so a manager that writes without end fails the probe instead
 *   of growing the daemon's heap.
 * - no network. These probes only ask "are you there?" and "where do you keep
 *   global packages?". Corepack reads that as licence to go and fetch the
 *   manager first — probing for `yarn` downloaded Yarn 1.22.22 on a machine
 *   that had never asked for it. A read-only question installs nothing.
 */
const DEFAULT_PROBE_TIMEOUT_MS = 10_000
const PROBE_KILL_SIGNAL = "SIGKILL"

/**
 * `SIRENO_PACKAGE_MANAGER_TIMEOUT_MS` raises the deadline for a machine where a
 * cold Corepack legitimately needs longer than ten seconds to answer, and lets
 * the tests use a deadline they can wait for. Anything unparseable or
 * non-positive falls back to the default rather than disabling the bound.
 */
export const packageManagerProbeTimeoutMs = (): number => {
  const raw = process.env["SIRENO_PACKAGE_MANAGER_TIMEOUT_MS"]
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_PROBE_TIMEOUT_MS
}

const probeEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  COREPACK_ENABLE_NETWORK: "0",
  COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
})

const probeOptions = () =>
  ({
    timeout: packageManagerProbeTimeoutMs(),
    killSignal: PROBE_KILL_SIGNAL,
    maxBuffer: 1024 * 1024,
  }) as const

const hasCommand = (command: string): boolean => {
  try {
    execFileSync(command, ["--version"], {
      ...probeOptions(),
      stdio: "ignore",
      env: probeEnv(),
    })
    return true
  } catch {
    return false
  }
}

export const detectPackageManager = (projectDir: string): PackageManager => {
  const lockfile = managers.find((manager) =>
    existsSync(
      join(
        projectDir,
        manager === "pnpm"
          ? "pnpm-lock.yaml"
          : manager === "npm"
            ? "package-lock.json"
            : "yarn.lock",
      ),
    ),
  )
  if (lockfile !== undefined && hasCommand(lockfile)) return lockfile
  const available = managers.find(hasCommand)
  if (available === undefined)
    throw new Error(
      "Install pnpm, npm, or yarn before installing an addon or theme.",
    )
  return available
}

export const assertPackageManager = (manager: PackageManager): void => {
  if (!hasCommand(manager))
    throw new Error(`Package manager '${manager}' is not installed.`)
}

export const packageManagerArgs = (
  manager: PackageManager,
  specifier: string,
  global: boolean,
): string[] => {
  if (global) {
    return manager === "pnpm"
      ? ["add", "--global", specifier]
      : manager === "npm"
        ? ["install", "--global", specifier]
        : ["global", "add", specifier]
  }
  return manager === "pnpm"
    ? ["add", "--save-exact", specifier]
    : manager === "npm"
      ? ["install", "--save-exact", specifier]
      : ["add", "--exact", specifier]
}

type RootProbe =
  | { readonly kind: "root"; readonly root: string }
  | { readonly kind: "unavailable" }
  | { readonly kind: "timeout" }

/**
 * Only the deadline is worth reporting. A manager that is absent, that exits
 * non-zero, or that declines the question ("the global bin directory is not in
 * PATH", or Corepack refusing a manager this project does not pin) has answered
 * — it simply has no root to offer, which is the ordinary case on a machine
 * that uses one of the three. Warning about those would fire on every start.
 *
 * Being killed at the deadline is different: the manager never answered at all,
 * and before the deadline existed that is precisely what hung the daemon.
 */
const probeRoot = (manager: PackageManager): RootProbe => {
  try {
    const root = execFileSync(manager, ["root", "--global"], {
      ...probeOptions(),
      encoding: "utf8",
      env: probeEnv(),
    }).trim()
    return root.length > 0 ? { kind: "root", root } : { kind: "unavailable" }
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { signal?: string | null }
    // `execFileSync` reports the deadline as the signal it killed the child
    // with; `ETIMEDOUT` covers the platforms that surface it as an error code.
    return err.signal === PROBE_KILL_SIGNAL || err.code === "ETIMEDOUT"
      ? { kind: "timeout" }
      : { kind: "unavailable" }
  }
}

export const globalPackageRoot = (manager: PackageManager): string | null => {
  const probe = probeRoot(manager)
  return probe.kind === "root" ? probe.root : null
}

export interface GlobalPackageRootProbe {
  readonly roots: ReadonlyArray<string>
  readonly timedOut: ReadonlyArray<PackageManager>
  readonly timeoutMs: number
}

/**
 * Ask every package manager where it keeps its global packages, so an addon or
 * theme installed globally can be resolved from there. Managers that cannot
 * answer contribute nothing; the ones that ran out of time are named, because
 * a silent ten-second stall per manager needs explaining.
 */
export const probeGlobalPackageRoots = (): GlobalPackageRootProbe => {
  const roots: string[] = []
  const timedOut: PackageManager[] = []
  for (const manager of managers) {
    const probe = probeRoot(manager)
    if (probe.kind === "root") roots.push(probe.root)
    else if (probe.kind === "timeout") timedOut.push(manager)
  }
  return { roots, timedOut, timeoutMs: packageManagerProbeTimeoutMs() }
}
