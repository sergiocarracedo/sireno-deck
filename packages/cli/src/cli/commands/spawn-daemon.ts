import { spawn, type ChildProcess } from "node:child_process"
import { createWriteStream, existsSync, openSync, readFileSync } from "node:fs"

import { resolveDaemonPaths } from "@/util/daemon"
import { formatHuman } from "@/util/logger"
import { readParentPid } from "@/util/process-title"

export const isOrphanedToInit = (): boolean => {
  const ppid = readParentPid()
  if (ppid === null) return false
  // ppid === 1 covers system services and true orphans; a systemd --user
  // unit's parent is the user manager itself (not pid 1). Interactive
  // shells never have systemd as their DIRECT parent, so a shell that
  // inherited INVOCATION_ID from a unit-launched terminal still lands here
  // as false. Must stay in lockstep with isOrphanedToInit in util/logger.ts.
  if (ppid === 1) return true
  try {
    return readFileSync(`/proc/${ppid}/comm`, "utf8").trim() === "systemd"
  } catch {
    return false
  }
}

export interface UnderServiceManagerDeps {
  readonly isOrphaned: () => boolean
}

export const createIsUnderServiceManager =
  (deps: UnderServiceManagerDeps) => (): boolean => {
    if (process.env["SIRENO_DAEMON_CHILD"]) return true
    if (process.env["LAUNCH_JOB_NAME"]) return deps.isOrphaned()
    // INVOCATION_ID is systemd-scoped; isOrphaned() requires a direct
    // systemd parent, so interactive shells (which can inherit
    // INVOCATION_ID from a unit-launched terminal) stay false. See the
    // twin comment in util/logger.ts createIsServiceMode — these two
    // predicates must stay in lockstep.
    if (process.env["INVOCATION_ID"] && deps.isOrphaned()) return true
    return false
  }
export const isUnderServiceManager = createIsUnderServiceManager({
  isOrphaned: isOrphanedToInit,
})

export interface SpawnDetachedOptions {
  readonly binPath: string
  readonly args: ReadonlyArray<string>
  readonly logPath?: string
  readonly env?: Readonly<Record<string, string>>
  readonly remote?: boolean
}

export interface SpawnDetachedResult {
  readonly pid: number
  readonly child: ChildProcess
}

interface Interpreter {
  readonly cmd: string
  readonly prefixArgs: ReadonlyArray<string>
  readonly cwd?: string
  readonly env?: Readonly<Record<string, string>>
}

// ponytail: dev mode (pnpm dev) spawns the daemon via `bin/sirenodeck.js`,
// the same entry point the systemd-installed daemon uses. Plain `node`
// resolves `@/` aliases through the bundled tsx (configured inside
// bin/sirenodeck.js), so no interpreter shim is needed here.
const resolveInterpreter = (): Interpreter => ({
  cmd: process.execPath,
  prefixArgs: [],
})

export const spawnDetached = (
  options: SpawnDetachedOptions,
): SpawnDetachedResult => {
  const { binPath, args, logPath, env, remote = false } = options
  const paths = resolveDaemonPaths()
  const log = logPath ?? `${paths.runtimeDir}/service.log`

  // ponytail: in dev mode, pipe child stdout/stderr through a tee that
  // appends each line to the log file (raw ndjson, for fast-fail dumps and
  // the `logs` command) AND emits the line, formatted through formatHuman, to
  // the parent's terminal so the operator sees it in realtime. In service
  // mode the parent's tty is usually absent (systemd / launchd) and the
  // supervisor's journal owns the output stream — keep the fds pointing at
  // the log file and skip the formatter entirely.
  let stdio: ["ignore", number | "pipe" | "ignore", number | "pipe" | "ignore"]
  if (remote) {
    stdio = ["ignore", "pipe", "pipe"]
  } else {
    let outFd: number | null = null
    let errFd: number | null = null
    try {
      outFd = openSync(log, "a")
      errFd = outFd
    } catch {
      outFd = null
      errFd = null
    }
    stdio =
      outFd !== null
        ? ["ignore", outFd, errFd ?? outFd]
        : ["ignore", "ignore", "ignore"]
  }

  const { cmd, prefixArgs, cwd, env: interpEnv } = resolveInterpreter()
  const child = spawn(cmd, [...prefixArgs, binPath, ...args], {
    detached: true,
    stdio,
    ...(cwd !== undefined ? { cwd } : {}),
    env: {
      ...process.env,
      ...(interpEnv ?? {}),
      ...(env ?? {}),
      SIRENO_DAEMON_CHILD: "1",
      SIRENO_REMOTE: remote ? "1" : "0",
    },
  })
  child.unref()

  if (remote) {
    let stream: ReturnType<typeof createWriteStream> | null = null
    const writeQueue: string[] = []
    let draining = false
    const drain = async (): Promise<void> => {
      if (draining) return
      draining = true
      try {
        while (writeQueue.length > 0) {
          const line = writeQueue.shift() ?? ""
          if (line.length === 0) continue
          if (stream !== null) {
            await new Promise<void>((resolve) => {
              stream!.write(`${line}\n`, () => resolve())
            })
          }
        }
      } finally {
        draining = false
      }
    }
    try {
      stream = createWriteStream(log, { flags: "a", highWaterMark: 64 * 1024 })
    } catch {
      stream = null
    }
    const tee = (chunk: Buffer | string): void => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8")
      for (const rawLine of text.split("\n")) {
        if (rawLine.length === 0) continue
        writeQueue.push(rawLine)
        const formatted = formatHuman(rawLine)
        process.stdout.write(`${formatted ?? rawLine}\n`)
      }
      void drain()
    }
    child.stdout?.on("data", tee)
    child.stderr?.on("data", (chunk: Buffer | string): void => {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8")
      for (const rawLine of text.split("\n")) {
        if (rawLine.length === 0) continue
        writeQueue.push(rawLine)
        process.stderr.write(`${rawLine}\n`)
      }
      void drain()
    })
    child.on("exit", () => {
      void (async (): Promise<void> => {
        await drain()
        await new Promise<void>((resolve) => {
          if (stream === null) return resolve()
          stream.end(() => resolve())
        })
      })()
    })
  }

  return {
    pid: child.pid ?? -1,
    child,
  }
}

// ponytail: when the forked daemon exits within the grace window, surface the
// cause to the caller's stderr so `start` doesn't look like a silent success.
// The child writes its traceback to runtimeDir/service.log; tail the last few
// lines and render through the human formatter.
export const watchFastFail = async (
  child: ChildProcess,
  logPath: string,
  graceMs = 1500,
): Promise<void> => {
  let timer: NodeJS.Timeout | null = null
  const exitPromise = new Promise<number | null>((resolve) => {
    child.once("exit", (code) => {
      if (timer !== null) clearTimeout(timer)
      resolve(code)
    })
  })
  const timerPromise = new Promise<number>((resolve) => {
    timer = setTimeout(() => resolve(-1), graceMs)
  })
  const result = await Promise.race([exitPromise, timerPromise])
  if (result === -1) return
  process.stderr.write(
    `\ndaemon exited immediately (code ${String(result)}); tail of ${logPath}:\n`,
  )
  try {
    const { statSync } = await import("node:fs")
    if (!existsSync(logPath)) {
      process.stderr.write("(log file does not exist)\n")
      return
    }
    const { openSync, closeSync, readSync } = await import("node:fs")
    const size = statSync(logPath).size
    const fd = openSync(logPath, "r")
    try {
      const buf = Buffer.alloc(size)
      readSync(fd, buf, 0, size, 0)
      const lines = buf
        .toString("utf8")
        .split("\n")
        .filter((l) => l.length > 0)
        .slice(-30)
      for (const line of lines) {
        const formatted = formatHuman(line)
        process.stderr.write(`${formatted ?? line}\n`)
      }
    } finally {
      closeSync(fd)
    }
  } catch {
    process.stderr.write("(could not read log)\n")
  }
}
