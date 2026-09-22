import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"

/**
 * ponytail: every identity check in this module used to read /proc, which does
 * not exist on macOS. The result was not a graceful degradation but a silent
 * inversion: `readProcCmdline` returned null, so `isOurViteChild` was false for
 * every process, `isOurDaemon` returned false before it even looked, and
 * `isOrphan` bailed out as "can't tell". A Mac therefore reported the daemon's
 * OWN vite as "a process that is NOT a sirenodeck child — leaving it alone",
 * never reaped a stale daemon holding the WS port, and left the orphans that
 * blocked the next start. `ps` answers the same questions everywhere POSIX
 * does, so ask it when /proc is absent.
 */
const psField = (
  pid: number,
  field: "command" | "comm" | "ppid",
): string | null => {
  try {
    const out = execFileSync("ps", ["-p", String(pid), "-o", `${field}=`], {
      encoding: "utf8",
      timeout: 2_000,
      maxBuffer: 1024 * 1024,
    }).trim()
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}

export const readProcCmdline = (pid: number): string | null => {
  try {
    const buf = readFileSync(`/proc/${String(pid)}/cmdline`, "utf8")
    // cmdline is NUL-separated; replace with spaces for matching.
    return buf.replace(/\u0000+/g, " ").trim()
  } catch {
    // No /proc (macOS, BSD): `ps -o command=` is the portable equivalent.
    return psField(pid, "command")
  }
}

const readProcComm = (pid: number): string | null => {
  try {
    // ponytail: /proc/<pid>/comm is NUL-terminated. `String.trim()` only
    // strips whitespace (per ECMA-262), and U+0000 isn't classified as
    // whitespace — so a raw `.trim()` leaves the NUL in place. Strip NULs
    // explicitly so comm === "sirenodeck:dm" matches.
    return readFileSync(`/proc/${String(pid)}/comm`, "utf8")
      .replace(/\u0000+$/, "")
      .trim()
  } catch {
    // macOS truncates `comm` to the executable name but reflects
    // `process.title`, which is exactly the daemon marker we set.
    return psField(pid, "comm")
  }
}

// ponytail: identify a previous-session daemon by Linux process title. The
// daemon calls `setProcessTitle("sirenodeck:dm")` in main.ts:23, which sets
// `/proc/<pid>/comm`. Reading `comm` is cheaper than `cmdline` and works
// even when the original argv is replaced.
//
// Two checks — title match plus a cmdline fingerprint — so a non-daemon
// binary that happens to be named "sirenodeck:dm" by its supervisor still
// gets left alone. The cmdline fingerprint is intentionally loose (any
// "sireno[-_]?deck" segment) because the daemon's argv can move across
// versions, worktrees, and binaries (node, tsx, bin/sirenodeck.js).
export const isOurDaemon = (pid: number): boolean => {
  const comm = readProcComm(pid)
  if (comm === null) return false
  // The daemon titles itself `sirenodeck:dm`; the foreground CLI that hosts an
  // in-process daemon titles itself `sirenodeck:cli`. Both own the ports, so
  // both must be recognisable — a Mac only ever sees the latter, which is why
  // matching the daemon title alone left live daemons unrecognised there.
  if (comm !== "sirenodeck:dm" && comm !== "sirenodeck:cli") return false
  const cmdline = readProcCmdline(pid) ?? comm
  return /sireno[-_]?deck/i.test(cmdline)
}

export const readProcPpid = (pid: number): number | null => {
  try {
    const stat = readFileSync(`/proc/${String(pid)}/stat`, "utf8")
    const closeParen = stat.lastIndexOf(")")
    const tail = stat.slice(closeParen + 2)
    const ppid = Number.parseInt(tail.split(" ")[1] ?? "", 10)
    return Number.isFinite(ppid) && ppid > 0 ? ppid : null
  } catch {
    const raw = psField(pid, "ppid")
    const ppid = raw === null ? Number.NaN : Number.parseInt(raw, 10)
    return Number.isFinite(ppid) && ppid > 0 ? ppid : null
  }
}

// ponytail: identity gate. Before sending SIGTERM to ANY process holding
// one of the daemon's ports, verify it's actually one of ours. Otherwise
// we could kill a Discord, a browser, an IDE, or a `vite dev` the user
// deliberately started for a different project. Two checks:
//
//   1. cmdline (`/proc/<pid>/cmdline`) must reference a sirenodeck vite
//      config — the frontend (packages/cli/frontend/vite.config.ts) or the
//      config UI (packages/cli/config-ui/vite.config.ts). The host string
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
  // config-ui/vite.config.ts AND contains `vite` (the executable). The
  // (?:^|\s) anchor catches the bin path's `/tsx/dist/cli.mjs` which
  // may pass the config as a separate arg.
  return /vite(?:[^\s]*)?\s+(?:[^\s]*\s+)?[^\s]*\/(frontend|emulator)\/vite\.config\.ts/.test(
    cmdline,
  )
}

export const cmdlineMentionsCliRoot = (cmdline: string): boolean => {
  // Be a bit safer than just "vite.config.ts": the path must trace back
  // to a sirenodeck checkout. We recognize the canonical
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
  const ppid = readProcPpid(pid)
  if (ppid === null) return false // can't tell — be safe
  if (daemonPid !== null && ppid === daemonPid) return false // live child
  return true // ppid is 1, systemd, kthread, or anything-but-our-daemon
}
