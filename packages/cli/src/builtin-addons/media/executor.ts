import { execFile } from "node:child_process"

import type { CommandExecutor } from "@/system/providers/shared"

const execFileAsync = (
  command: string,
  args: ReadonlyArray<string>,
  timeoutMs: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    execFile(
      command,
      [...args],
      { timeout: timeoutMs },
      (err, stdout, stderr) => {
        const stdoutStr = typeof stdout === "string" ? stdout : ""
        const stderrStr = typeof stderr === "string" ? stderr : ""
        if (err !== null) {
          const code = (err as NodeJS.ErrnoException).code
          resolve({
            exitCode: code === "ENOENT" ? 127 : 1,
            stdout: stdoutStr,
            stderr: stderrStr || err.message,
          })
          return
        }
        resolve({ exitCode: 0, stdout: stdoutStr, stderr: stderrStr })
      },
    )
  })

export const createChildProcessExecutor = (): CommandExecutor => ({
  async run(command, args, options) {
    return execFileAsync(command, args, options?.timeoutMs ?? 2_000)
  },
})
