import { platform } from "node:process"
import { readFileSync } from "node:fs"

import type pino from "pino"

export const PROCESS_TITLE_MAX = 15

// ponytail: Vite/Node show as `MainThread` in `ps`/`top` by default. Setting
// `process.title` makes the daemon + wrappers recognisable in process lists
// so operators can correlate a held port / hung vite with the right role.
// The Linux `comm` field is 15 chars, so titles are truncated there. macOS
// and Windows have larger limits; we still cap at 15 to keep the column
// readable everywhere. Titles are diagnostic only — the kill identity gate
// still relies on `cmdlineMentionsCliRoot` + port + tracked PIDs.
export const setProcessTitle = (title: string): string => {
  const capped =
    platform === "linux" && title.length > PROCESS_TITLE_MAX
      ? title.slice(0, PROCESS_TITLE_MAX)
      : title
  process.title = capped
  return capped
}

export const DAEMON_TITLE = "sirenodeck:dm"
export const FOREGROUND_TITLE = "sirenodeck:cli"

// ponytail: read /proc/self/stat to learn our parent pid without spawning
// `ps`. Linux-only; returns null on every other platform. Used by the
// parent-death watchdog to detect when the dev wrapper (our wrapper) dies
// and reparent us to init. POSIX recycles pids quickly so the check tolerates
// a reparent-to-init (ppid === 1) plus a small grace window before triggering.
export const readParentPid = (): number | null => {
  if (platform !== "linux") return null
  try {
    const stat = readFileSync("/proc/self/stat", "utf8")
    const closeParen = stat.lastIndexOf(")")
    const tail = stat.slice(closeParen + 2)
    const ppid = Number.parseInt(tail.split(" ")[1] ?? "", 10)
    return Number.isFinite(ppid) && ppid > 0 ? ppid : null
  } catch {
    return null
  }
}

// ponytail: POSIX doesn't cascade signals — when the dev wrapper (tsx watcher
// or `bin/dev.js`) dies, the daemon keeps running, its vite descendants keep
// their ports, and the next `start` finds them as orphans. The recommended
// fix is for the kernel to notify us via SIGCHLD/SIGHUP, but child processes
// only get SIGCHLD on their OWN children's state changes. The pragmatic
// workaround is a 1s ppid poll: when our boot ppid disappears and we get
// reparented to init (ppid=1), we exit cleanly. False positive: a ppid
// collision after the original parent dies and another process reuses the
// pid before it's reaped. Tolerated via grace window (1 poll cycle ≈ 1s).
// This is Linux-only; on other platforms the watchdog is a no-op.
export const startParentDeathWatchdog = (deps: {
  readonly logger: pino.Logger
  readonly onOrphan: () => void
  readonly intervalMs?: number
  readonly bootPpid?: number
}): (() => void) | null => {
  if (platform !== "linux") return null
  const bootPpid = deps.bootPpid ?? readParentPid()
  if (bootPpid === null || bootPpid === 1) return null
  const intervalMs = deps.intervalMs ?? 1_000
  const timer = setInterval(() => {
    const current = readParentPid()
    if (current !== bootPpid) {
      deps.logger.warn(
        { bootPpid, currentPpid: current },
        "parent-death watchdog: parent disappeared, exiting",
      )
      clearInterval(timer)
      deps.onOrphan()
    }
  }, intervalMs)
  // unref so the watchdog never keeps the event loop alive on its own.
  timer.unref?.()
  return () => clearInterval(timer)
}
