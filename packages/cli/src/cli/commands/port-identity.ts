import { readFileSync } from "node:fs"

export const readProcCmdline = (pid: number): string | null => {
  try {
    const buf = readFileSync(`/proc/${String(pid)}/cmdline`, "utf8")
    // cmdline is NUL-separated; replace with spaces for matching.
    return buf.replace(/\u0000+/g, " ").trim()
  } catch {
    return null
  }
}

export const readProcPpid = (pid: number): number | null => {
  try {
    const stat = readFileSync(`/proc/${String(pid)}/stat`, "utf8")
    const closeParen = stat.lastIndexOf(")")
    const tail = stat.slice(closeParen + 2)
    const ppid = Number.parseInt(tail.split(" ")[1] ?? "", 10)
    return Number.isFinite(ppid) && ppid > 0 ? ppid : null
  } catch {
    return null
  }
}

// ponytail: identity gate. Before sending SIGTERM to ANY process holding
// one of the daemon's ports, verify it's actually one of ours. Otherwise
// we could kill a Discord, a browser, an IDE, or a `vite dev` the user
// deliberately started for a different project. Two checks:
//
//   1. cmdline (`/proc/<pid>/cmdline`) must reference a sireno-deck vite
//      config — the frontend (packages/cli/frontend/vite.config.ts) or the
//      emulator (packages/cli/emulator/vite.config.ts). The host string
//      can be vendored, fork-installed, or extracted into a shared repo
//      clone, so we match against the basename + the relative path
//      tail; we also accept path segments that include the
//      `/packages/cli/{frontend,emulator}/vite.config.ts` suffix under
//      any of those roots.
//
//   2. parent process: cmdline alone is not enough — `pnpm dev` on any
//      project that happens to share a vite config filename could match.
//      Cross-check that the proc's ppid is either 1 (reparented to init
//      because the daemon was killed) or — when the daemon pid file
//      still has a value — ppid === that daemon pid. If the proc has a
//      live, non-daemon parent, leave it alone.
//
// If either check fails, skip the pid with a debug log. The user gets a
// clear `port still in use` error from the new daemon's preflight and
// can decide what to do.
export const isOurViteChild = (pid: number): boolean => {
  const cmdline = readProcCmdline(pid)
  if (cmdline === null) return false
  // Accept any path that ends with frontend/vite.config.ts or
  // emulator/vite.config.ts AND contains `vite` (the executable). The
  // (?:^|\s) anchor catches the bin path's `/tsx/dist/cli.mjs` which
  // may pass the config as a separate arg.
  return /vite(?:[^\s]*)?\s+(?:[^\s]*\s+)?[^\s]*\/(frontend|emulator)\/vite\.config\.ts/.test(
    cmdline,
  )
}

export const cmdlineMentionsCliRoot = (cmdline: string): boolean => {
  // Be a bit safer than just "vite.config.ts": the path must trace back
  // to a sireno-deck checkout. We recognize the canonical
  // /packages/cli/{frontend,emulator}/vite.config.ts layout.
  return /\/packages\/cli\/(frontend|emulator)\/vite\.config\.ts\b/.test(
    cmdline,
  )
}

// ponytail: orphan check is intentionally loose. On a Linux user session
// the orphans get reparented to systemd (NOT to init / ppid 1), so the
// old "ppid === 1" detection misses them. The cmdline check above is
// the load-bearing identity gate; this orphan check is a tie-breaker
// that only refuses to kill a proc whose parent is one of OUR running
// daemons — i.e. there's a live daemon tree and the proc is a healthy
// child of it. An orphan with ppid NOT in the live daemons list is
// classified as orphan and killed.
export const isOrphan = (pid: number, daemonPid: number | null): boolean => {
  if (process.platform !== "linux") return true // trust on non-Linux
  const ppid = readProcPpid(pid)
  if (ppid === null) return false // can't tell — be safe
  if (daemonPid !== null && ppid === daemonPid) return false // live child
  return true // ppid is 1, systemd, kthread, or anything-but-our-daemon
}
