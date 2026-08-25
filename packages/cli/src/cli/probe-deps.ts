import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"

import type { CommandExecutor } from "@/system/providers/shared"
import type { ProbeDeps } from "@/system/setup-wizard"

// ponytail: shared probe deps for the startup banner and the first-run check.
// Both call sites use these identical deps, so probeAllCached's single-slot
// TTL cache returns the same report to both — the banner's probe and the
// first-run probe don't double the subprocess cost.

export const wizardCommandExecutor: CommandExecutor = {
  async run(command, args, options) {
    const { execa } = await import("execa")
    const result = await execa(command, [...args], {
      reject: false,
      timeout: options?.timeoutMs ?? 5_000,
    })
    return {
      exitCode: result.exitCode ?? -1,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    }
  },
}

export const buildStandardProbeDeps = (): ProbeDeps => {
  const home = homedir()
  const xdgConfigHome = process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`
  return {
    platform: process.platform,
    homeDir: home,
    xdgConfigHome,
    env: process.env,
    executor: wizardCommandExecutor,
    fileExists: (p) => existsSync(p),
    readFile: (p) => {
      try {
        return readFileSync(p, "utf8")
      } catch {
        return null
      }
    },
  }
}
