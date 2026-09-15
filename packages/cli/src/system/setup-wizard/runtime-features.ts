import { existsSync, readdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export interface RuntimeFeatureProbe {
  readonly available: boolean
  readonly reason?: string
}

// ponytail: lightweight runtime probes for the startup banner. Unlike the
// full system probe (`probeAll`) these don't run subprocesses for every
// capability — they just sanity-check that the resources exist. 2s budget
// per probe; failures fall back to ✗ with a short reason.

const REASON_MAX = 40

const truncate = (s: string): string =>
  s.length <= REASON_MAX ? s : `${s.slice(0, REASON_MAX - 1)}…`

// ponytail: chromium can legitimately live in either of two places. The
// first-run bootstrap pins PLAYWRIGHT_BROWSERS_PATH to
// ~/.cache/sirenodeck/playwright, but a `playwright install` run by hand — the
// documented fix, and what a dev checkout needs — puts it in Playwright's own
// per-OS default. Checking only the sirenodeck path reported "not installed"
// on a machine whose renderer was working fine.
const playwrightDefaultBrowsersDir = (): string => {
  switch (process.platform) {
    case "darwin":
      return join(homedir(), "Library", "Caches", "ms-playwright")
    case "win32":
      return join(process.env["LOCALAPPDATA"] ?? homedir(), "ms-playwright")
    default:
      return join(homedir(), ".cache", "ms-playwright")
  }
}

const hasChromium = (dir: string): boolean => {
  if (!existsSync(dir)) return false
  try {
    return readdirSync(dir).some((e) => e.startsWith("chromium"))
  } catch {
    return false
  }
}

export const probeMediaAccess = async (): Promise<RuntimeFeatureProbe> => {
  const explicit = process.env["PLAYWRIGHT_BROWSERS_PATH"]
  const candidates =
    explicit !== undefined && explicit !== ""
      ? [explicit]
      : [
          join(homedir(), ".cache", "sirenodeck", "playwright"),
          playwrightDefaultBrowsersDir(),
        ]
  if (candidates.some(hasChromium)) return { available: true }
  return { available: false, reason: truncate("chromium not installed") }
}

export const probeCommandExecution = async (): Promise<RuntimeFeatureProbe> => {
  const shell =
    process.platform === "win32"
      ? `${process.env["SystemRoot"] ?? "C:\\Windows"}\\System32\\cmd.exe`
      : "/bin/sh"
  if (!existsSync(shell)) {
    return { available: false, reason: truncate(`shell missing: ${shell}`) }
  }
  return { available: true }
}

export const probeInternetAccess = async (): Promise<RuntimeFeatureProbe> => {
  if (typeof fetch !== "function") {
    return { available: false, reason: "fetch unavailable" }
  }
  try {
    const res = await fetch("https://1.1.1.1/", {
      method: "HEAD",
      signal: AbortSignal.timeout(2_000),
    })
    return res.ok || (res.status >= 200 && res.status < 500)
      ? { available: true }
      : { available: false, reason: truncate(`HTTP ${res.status}`) }
  } catch (err) {
    return { available: false, reason: truncate(`unreachable: ${String(err)}`) }
  }
}
