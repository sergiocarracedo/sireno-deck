import { existsSync, unlinkSync } from "node:fs"
import { createServer, connect, type Server } from "node:net"

import type pino from "pino"

import { readPid, resolveDaemonPaths, resolveSocketPath } from "./daemon"
import type { DaemonPaths } from "./daemon"

/**
 * ponytail: the daemon's single-instance guarantee.
 *
 * Every check that used to stand between two daemons was advisory, and each
 * one failed in its own way:
 *
 * - the pid file is read-then-act. Two starts racing past the read both find
 *   no daemon and both proceed.
 * - `isRunning` reported a live daemon as dead, so `stopExisting` took the
 *   "stale pid file" branch: it deleted the file and returned WITHOUT killing
 *   anything, and start carried on into a second daemon.
 * - the control socket was unlinked unconditionally before binding, so a
 *   second daemon took it from the first instead of being refused.
 *
 * A listening socket has none of those problems. The bind is atomic and
 * arbitrated by the kernel, so of two simultaneous starts exactly one wins;
 * and the kernel drops the binding when the holder dies, however it dies, so
 * there is no stale state to time out or second-guess. SIGKILL, a panic and a
 * power cut all release it. That makes "is another daemon running?" a question
 * with an authoritative answer rather than an inference from a file.
 *
 * The lock is deliberately separate from the control socket: it has to be
 * taken at the very top of startup, before preflight kills anything that looks
 * like an orphan, whereas the control socket cannot exist until there is a
 * token to serve. A stale socket *file* left by a crash is not a held lock —
 * we probe it with a connect first and only clear it when nothing answers.
 */
const LOCK_BASENAME = ".lock"

const PROBE_TIMEOUT_MS = 1_000

export const instanceLockPath = (paths: DaemonPaths): string =>
  resolveSocketPath(paths.runtimeDir, LOCK_BASENAME)

export interface InstanceLock {
  readonly release: () => void
}

/**
 * Does THIS process hold the lock — i.e. is it the daemon that owns the ports,
 * the children and the pid file?
 *
 * The children file is shared by every process that can see the runtime dir,
 * so "terminate the tracked children" is only ever a safe thing for the daemon
 * that spawned them to say. A CLI whose start was refused used to run the same
 * cleanup on its way out and take a healthy daemon's frontend down with it —
 * the deck flickered because a start that changed nothing had just killed its
 * vite. Ownership, not mere presence in the process table, decides that.
 */
let held = false

export const holdsInstanceLock = (): boolean => held

export type AcquireInstanceResult =
  | { readonly kind: "acquired"; readonly lock: InstanceLock }
  | { readonly kind: "busy"; readonly holderPid: number | null }

/**
 * Does something answer on the lock socket? A successful connect proves a live
 * holder. ECONNREFUSED (or ENOENT) means the path is a leftover file from a
 * daemon that died without cleaning up, which is safe to remove and rebind.
 *
 * Anything else — a timeout, EACCES — is treated as "occupied", because the
 * one outcome worth avoiding is deleting a socket a live daemon is serving.
 */
export const isSocketLive = (socketPath: string): Promise<boolean> =>
  new Promise((resolve) => {
    if (process.platform !== "win32" && !existsSync(socketPath)) {
      resolve(false)
      return
    }
    const socket = connect(socketPath)
    let settled = false
    const finish = (live: boolean): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(live)
    }
    const timer = setTimeout(() => finish(true), PROBE_TIMEOUT_MS)
    socket.once("connect", () => {
      clearTimeout(timer)
      finish(true)
    })
    socket.once("error", (err) => {
      clearTimeout(timer)
      const code = (err as NodeJS.ErrnoException).code
      finish(
        code !== "ECONNREFUSED" && code !== "ENOENT" && code !== "ENOTSOCK",
      )
    })
  })

type ListenOutcome =
  | { readonly kind: "listening"; readonly server: Server }
  | { readonly kind: "in-use" }
  | { readonly kind: "failed" }

const tryListen = (socketPath: string): Promise<ListenOutcome> =>
  new Promise((resolve) => {
    const server = createServer((socket) => socket.destroy())
    const onError = (err: NodeJS.ErrnoException): void => {
      resolve(
        err.code === "EADDRINUSE" || err.code === "EEXIST"
          ? { kind: "in-use" }
          : { kind: "failed" },
      )
    }
    server.once("error", onError)
    server.listen(socketPath, () => {
      server.off("error", onError)
      // Never let the lock hold the event loop open by itself.
      server.unref()
      resolve({ kind: "listening", server })
    })
  })

const releaseServer = (server: Server, socketPath: string) => (): void => {
  held = false
  try {
    server.close()
  } catch {
    // already closed
  }
  try {
    if (process.platform !== "win32" && existsSync(socketPath))
      unlinkSync(socketPath)
  } catch {
    // best-effort: the kernel has already released the binding
  }
}

/**
 * Take the single-instance lock, or report who already holds it.
 *
 * Call this before any destructive startup work. A daemon that cannot take the
 * lock must not clean up ports, children or pid files: those belong to the
 * daemon that holds it.
 */
export const acquireInstanceLock = async (
  paths: DaemonPaths = resolveDaemonPaths(),
  logger?: pino.Logger,
): Promise<AcquireInstanceResult> => {
  const socketPath = instanceLockPath(paths)
  const holderPid = readPid(paths)

  // ponytail: bind FIRST, ask questions second. An earlier draft probed for a
  // live holder and then unlinked the path before binding, which loses a race
  // it was written to win: with several starts in flight, each one unlinks the
  // socket the winner has just bound and then binds its own, and they all
  // believe they hold the lock. Going straight for the bind keeps the kernel
  // as the only arbiter, and the destructive unlink happens only on the path
  // where the bind has already told us the address is taken.
  const first = await tryListen(socketPath)
  if (first.kind === "listening") {
    held = true
    logger?.debug({ socketPath }, "instance lock: acquired")
    return {
      kind: "acquired",
      lock: { release: releaseServer(first.server, socketPath) },
    }
  }
  if (first.kind === "failed") return { kind: "busy", holderPid }

  // The address is taken — but by a daemon, or by the socket file a dead one
  // left behind? Only a connect can tell.
  if (await isSocketLive(socketPath)) {
    logger?.debug(
      { socketPath, holderPid },
      "instance lock: held by a live daemon",
    )
    return { kind: "busy", holderPid }
  }

  try {
    if (process.platform !== "win32") unlinkSync(socketPath)
    logger?.debug({ socketPath }, "instance lock: cleared a stale socket")
  } catch {
    return { kind: "busy", holderPid }
  }

  const second = await tryListen(socketPath)
  if (second.kind !== "listening") return { kind: "busy", holderPid }

  held = true
  logger?.debug(
    { socketPath },
    "instance lock: acquired after clearing a stale socket",
  )
  return {
    kind: "acquired",
    lock: { release: releaseServer(second.server, socketPath) },
  }
}
