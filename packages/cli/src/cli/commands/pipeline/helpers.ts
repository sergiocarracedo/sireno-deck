import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { resolve as resolvePath } from "node:path"

import { findConfigPath, XDG_CONFIG_SUBDIR } from "@/config/discovery"
import { getOriginalCwd } from "@/cli/cwd"

import type { RunOptions } from "../run"

export const resolveXdgConfigHome = (options: RunOptions): string =>
  options.xdgConfigHome ??
  process.env["XDG_CONFIG_HOME"] ??
  `${options.homeDir ?? homedir()}/.config`

export const resolveXdgConfigPath = (options: RunOptions): string =>
  resolvePath(resolveXdgConfigHome(options), XDG_CONFIG_SUBDIR, "config.yml")

export const resolveRunFolderConfigPath = (): string =>
  resolvePath(getOriginalCwd(), "config.yml")

export type ConfigSource = "cli" | "xdg" | "run-folder"

export interface ResolveConfigPathResult {
  readonly path: string
  readonly source: ConfigSource
}

// ponytail: precedence is cli arg → ~/.config/sirenodeck/config.yml →
// ./config.yml (run folder). The cli arg is validated eagerly so the
// failure mode is obvious at startup; the other two come from
// findConfigPath which walks XDG first, then the run folder.
export const resolveConfigPath = (
  options: RunOptions,
): ResolveConfigPathResult => {
  if (options.config !== undefined) {
    if (!existsSync(options.config)) {
      throw new Error(
        `Config file not found: ${options.config}\n` +
          `  Fix: pass a valid --config path, or remove --config to let sirenodeck auto-discover config.yml.`,
      )
    }
    return { path: options.config, source: "cli" }
  }
  const cwd = getOriginalCwd()
  const home = options.homeDir ?? homedir()
  const xdgPath = resolveXdgConfigPath(options)
  if (existsSync(xdgPath)) {
    return { path: xdgPath, source: "xdg" }
  }
  const cwdPath = resolvePath(cwd, "config.yml")
  if (existsSync(cwdPath)) {
    return { path: cwdPath, source: "run-folder" }
  }
  // ponytail: re-use findConfigPath to keep the search algorithm in one
  // place — this branch is hit when neither the XDG nor the cwd file
  // exists but a discovery-side option (envVar) is set or the user has
  // a non-default xdgConfigHome. The result is the same XDG-first lookup.
  const found = findConfigPath({
    cwd,
    homeDir: home,
    ...(options.xdgConfigHome !== undefined
      ? { xdgConfigHome: options.xdgConfigHome }
      : {}),
  })
  if (found === null) {
    throw new Error(
      `Could not find config.yml.\n` +
        `  Fix: pass --config <path>, create ./config.yml in the current directory, or create ~/.config/sirenodeck/config.yml.\n` +
        `  Looked in: ${xdgPath} and ${cwdPath}.`,
    )
  }
  const source: ConfigSource = found === xdgPath ? "xdg" : "run-folder"
  return { path: found, source }
}
