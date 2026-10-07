import { spawn as nodeSpawn } from "node:child_process"

import type { CommandExecutor } from "@/system/providers/shared"

type SpawnedProcess = ReturnType<typeof nodeSpawn>
type SpawnCommand = (
  command: string,
  args: string[],
  options: { stdio: ["pipe", "pipe", "pipe"] },
) => SpawnedProcess

export const createCommandExecutor = (
  spawnCommand: SpawnCommand = nodeSpawn,
): CommandExecutor => ({
  async run(command, args, execOptions) {
    const timeoutMs = execOptions?.timeoutMs
    return await new Promise((resolve) => {
      const proc = spawnCommand(command, [...args], {
        stdio: ["pipe", "pipe", "pipe"],
      })
      let stdout = ""
      let stderr = ""
      let timedOut = false
      let killTimer: ReturnType<typeof setTimeout> | undefined
      proc.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString()
      })
      proc.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString()
      })
      const onExit = (code: number | null): void => {
        if (timeoutMs !== undefined) return
        finish(code)
      }
      const finish = (code: number | null): void => {
        if (killTimer !== undefined) clearTimeout(killTimer)
        resolve({
          exitCode: timedOut ? -1 : (code ?? -1),
          stdout,
          stderr,
        })
      }
      proc.on("exit", onExit)
      if (timeoutMs !== undefined) proc.on("close", finish)
      proc.on("error", (err) => {
        if (killTimer !== undefined) clearTimeout(killTimer)
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr ? `${stderr}\n${err.message}` : err.message,
        })
      })
      if (timeoutMs !== undefined && timeoutMs > 0) {
        killTimer = setTimeout(() => {
          timedOut = true
          proc.kill("SIGKILL")
        }, timeoutMs)
      }
    })
  },
})
