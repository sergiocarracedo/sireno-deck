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

export const probeMediaAccess = async (): Promise<RuntimeFeatureProbe> => {
  const cached =
    process.env["PLAYWRIGHT_BROWSERS_PATH"] ??
    join(homedir(), ".cache", "sirenodeck", "playwright")
  if (!existsSync(cached)) {
    return { available: false, reason: truncate("chromium not installed") }
  }
  try {
    const ok = readdirSync(cached).some((e) => e.startsWith("chromium"))
    return ok
      ? { available: true }
      : { available: false, reason: truncate("chromium not installed") }
  } catch (err) {
    return {
      available: false,
      reason: truncate(`browsers dir unreadable: ${String(err)}`),
    }
  }
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
