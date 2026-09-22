import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs"

import { formatHuman } from "./logger"

export interface TailFileOptions {
  readonly logPath: string
  readonly lines?: number
  readonly follow?: boolean
  readonly pollMs?: number
  /** Prefix each line with when it was logged. On by default here. */
  readonly timestamps?: boolean
}

export interface TailHandle {
  stop: () => void
  promise: Promise<void>
}

// ponytail: tail the last N lines, then poll for appended bytes. Simpler than
// fs.watch + inode tracking, and survives rotation (new size from 0).
export const tailFile = (opts: TailFileOptions): TailHandle => {
  const {
    logPath,
    lines = 50,
    follow = true,
    pollMs = 250,
    // ponytail: reading a log after the fact, "when did this happen" is the
    // first question — unlike live startup output, which is read as it
    // happens. Opposite default to the console formatter, deliberately.
    timestamps = true,
  } = opts
  let stopped = false
  let resolveDone!: () => void
  const promise = new Promise<void>((resolve) => {
    resolveDone = resolve
  })

  const emit = (line: string): void => {
    const formatted = formatHuman(line, { timestamps })
    const out = formatted !== null ? formatted : line
    process.stdout.write(`${out}\n`)
  }

  const readRange = (start: number, end: number): string => {
    const fd = openSync(logPath, "r")
    try {
      const buf = Buffer.alloc(end - start)
      readSync(fd, buf, 0, buf.length, start)
      return buf.toString("utf8")
    } finally {
      closeSync(fd)
    }
  }

  const emitLast = (): number => {
    if (!existsSync(logPath)) return 0
    const text = readRange(0, statSync(logPath).size)
    const all = text.split("\n").filter((l) => l.length > 0)
    for (const line of all.slice(-lines)) emit(line)
    return statSync(logPath).size
  }

  const stop = (): void => {
    if (stopped) return
    stopped = true
    resolveDone()
  }

  let lastSize = emitLast()

  if (follow) {
    const interval = setInterval(() => {
      if (stopped) {
        clearInterval(interval)
        return
      }
      if (!existsSync(logPath)) {
        lastSize = 0
        return
      }
      const currentSize = statSync(logPath).size
      if (currentSize < lastSize) lastSize = 0 // rotation
      if (currentSize === lastSize) return
      const text = readRange(lastSize, currentSize)
      for (const line of text.split("\n").filter((l) => l.length > 0))
        emit(line)
      lastSize = currentSize
    }, pollMs)
    process.once("SIGINT", () => {
      clearInterval(interval)
      process.stdout.write("\n")
      stop()
    })
  } else {
    stop()
  }

  return { stop, promise }
}

export const tailLogs = async (opts: TailFileOptions): Promise<void> => {
  await tailFile(opts).promise
}
