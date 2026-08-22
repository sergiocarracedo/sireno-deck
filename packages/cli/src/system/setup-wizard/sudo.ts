import { execFile, spawn } from "node:child_process"
import { promisify } from "node:util"

import type pino from "pino"

const execFileAsync = promisify(execFile)

export interface SudoRunOptions {
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly logger?: pino.Logger
  readonly stdinInput?: string
  readonly timeoutMs?: number
}

export interface SudoRunResult {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  readonly neededPassword: boolean
  readonly succeeded: boolean
}

const PROBE_TIMEOUT_MS = 3_000

export const isSudoNopasswd = async (): Promise<boolean> => {
  try {
    await execFileAsync("sudo", ["-n", "true"], {
      timeout: PROBE_TIMEOUT_MS,
    })
    return true
  } catch {
    return false
  }
}

// ponytail: match the real-world sudo failure patterns. The last pattern
// catches the PAM-style prompt sudo emits when it has eaten the password
// from stdin and decides auth failed — `[sudo: authenticate] Password:` is
// what appears when -S doesn't read from a TTY and the user didn't type
// anything. Without this match the wizard reports a bare "exit 1" with no
// hint that the password was the cause.
const NEEDS_PASSWORD = [
  /password is required/i,
  /sorry,? try again/i,
  /incorrect password attempt/i,
  /authentication required but not attempted/i,
  /^\[sudo:?\s*\w*\]?\s*Password:?$/m,
]

const stderrNeedsPassword = (stderr: string): boolean =>
  NEEDS_PASSWORD.some((re) => re.test(stderr))

// ponytail: spawn (not execFile) so we control the stdin lifecycle. The
// previous execFile + `input` race lost the password to the pipe close —
// `child.stdin.write(input)` is queued, but sudo reads EOF before Node.js
// flushes it. spawn gives us an explicit write → drain → close sequence.
export const runWithSudo = async (
  options: SudoRunOptions,
): Promise<SudoRunResult> => {
  const args = ["-S", "--", options.command, ...options.args]
  const timeoutMs = options.timeoutMs ?? 60_000
  const logger = options.logger

  return new Promise((resolve) => {
    const child = spawn("sudo", args, { stdio: ["pipe", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    let settled = false

    const settle = (result: SudoRunResult): void => {
      if (settled) return
      settled = true
      resolve(result)
    }

    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString()
    })
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString()
    })
    child.stdin.on("error", () => {
      // ignore EPIPE if sudo exits before we finish writing
    })

    const timeout = setTimeout(() => {
      child.kill("SIGKILL")
      settle({
        exitCode: 124,
        stdout,
        stderr: stderr + "\n[sirenodeck] sudo timed out",
        neededPassword: stderrNeedsPassword(stderr),
        succeeded: false,
      })
    }, timeoutMs)

    child.on("error", (err) => {
      clearTimeout(timeout)
      settle({
        exitCode: 1,
        stdout,
        stderr: stderr + (stderr.length > 0 ? "\n" : "") + err.message,
        neededPassword: false,
        succeeded: false,
      })
    })

    child.on("close", (code) => {
      clearTimeout(timeout)
      const exitCode = code ?? 1
      const neededPassword = stderrNeedsPassword(stderr)
      if (exitCode !== 0) {
        logger?.warn(
          { exitCode, stderr: stderr.slice(0, 500) },
          "sudo run failed",
        )
      }
      settle({
        exitCode,
        stdout,
        stderr,
        neededPassword,
        succeeded: code === 0,
      })
    })

    if (options.stdinInput !== undefined && options.stdinInput.length > 0) {
      child.stdin.write(options.stdinInput, (err) => {
        if (err) return
        child.stdin.end()
      })
    } else {
      child.stdin.end()
    }
  })
}

export const capturePassword = (prompt: string): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("cannot read sudo password: no TTY"))
      return
    }
    const stdin = process.stdin
    const oldRaw = (stdin as { isRaw?: boolean }).isRaw
    stdin.setRawMode?.(true)
    stdin.resume()
    stdin.write("")
    let password = ""
    const onData = (chunk: Buffer | string): void => {
      const str = chunk.toString()
      for (const ch of str) {
        if (ch === "\n" || ch === "\r" || ch === "\u0004") {
          stdin.removeListener("data", onData)
          stdin.setRawMode?.(oldRaw ?? false)
          stdin.pause()
          process.stdout.write("\n")
          resolve(password)
          return
        }
        if (ch === "\u0003") {
          stdin.removeListener("data", onData)
          stdin.setRawMode?.(oldRaw ?? false)
          stdin.pause()
          reject(new Error("user cancelled password prompt"))
          return
        }
        if (ch === "\u007f" || ch === "\b") {
          password = password.slice(0, -1)
          continue
        }
        password += ch
      }
    }
    stdin.on("data", onData)
    process.stdout.write(prompt)
  })
