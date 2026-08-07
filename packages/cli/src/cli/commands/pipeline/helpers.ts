import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { resolve as resolvePath } from "node:path"

import { findConfigPath } from "@/config/discovery"
import { getOriginalCwd } from "@/cli/cwd"

import type { RunOptions } from "../run"

export const resolveXdgConfigHome = (options: RunOptions): string =>
  options.xdgConfigHome ??
  process.env["XDG_CONFIG_HOME"] ??
  `${options.homeDir ?? homedir()}/.config`

export const resolveConfigPath = (options: RunOptions): string => {
  if (options.config !== undefined) {
    if (existsSync(options.config)) {
      return options.config
    }
    throw new Error(
      `Config file not found: ${options.config}\n` +
        `  Fix: pass a valid --config path, or remove --config to let sireno-deck auto-discover config.yml.`,
    )
  }
  const cwd = getOriginalCwd()
  const cwdConfig = resolvePath(cwd, "config.yml")
  if (existsSync(cwdConfig)) {
    return cwdConfig
  }
  const home = options.homeDir ?? homedir()
  const found = findConfigPath({
    homeDir: home,
    ...(options.xdgConfigHome !== undefined
      ? { xdgConfigHome: options.xdgConfigHome }
      : {}),
  })
  if (found === null) {
    throw new Error(
      `Could not find config.yml.\n` +
        `  Fix: pass --config <path> or create ./config.yml in the current directory.\n` +
        `  Also looked in: ~/.config/sireno-deck/config.yml (and walked up from ${cwd}).`,
    )
  }
  return found
}
