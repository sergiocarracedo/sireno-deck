import { execFile } from "node:child_process"
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
      stdio: ["ignore", "pipe", "pipe"],
    })
    return true
  } catch {
    return false
  }
}

export const runWithSudo = async (
  options: SudoRunOptions,
): Promise<SudoRunResult> => {
  const args = ["-S", "--", options.command, ...options.args]
  try {
    const result = await execFileAsync("sudo", args, {
      timeout: options.timeoutMs ?? 60_000,
      ...(options.stdinInput !== undefined
        ? { input: options.stdinInput }
        : {}),
    } as Parameters<typeof execFileAsync>[1])
    return {
      exitCode: 0,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      neededPassword: false,
      succeeded: true,
    }
  } catch (err) {
    const e = err as {
      code?: number | string
      stdout?: string
      stderr?: string
    }
    const exitCode = typeof e.code === "number" ? e.code : 1
    const stderr = e.stderr ?? ""
    const neededPassword = /password is required/i.test(stderr)
    options.logger?.warn(
      { exitCode, stderr: stderr.slice(0, 200) },
      "sudo run failed",
    )
    return {
      exitCode,
      stdout: e.stdout ?? "",
      stderr,
      neededPassword,
      succeeded: false,
    }
  }
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
