import { existsSync } from "node:fs"
import { join } from "node:path"

import type pino from "pino"

import { readConfigPath, writeConfigPath } from "@/util/daemon"

import { reload } from "./reload"
import { restart } from "./restart"

export interface UpdateConfigOptions {
  readonly config: string
  readonly homeDir?: string
  readonly xdgConfigHome?: string
  readonly reload?: boolean
  readonly logs?: boolean
  readonly logger: pino.Logger
}

const resolveConfigPath = (options: UpdateConfigOptions): string => {
  if (existsSync(options.config)) return options.config
  return join(
    options.xdgConfigHome ??
      process.env["XDG_CONFIG_HOME"] ??
      `${options.homeDir ?? process.env["HOME"] ?? ""}/.config`,
    "sireno-deck",
    options.config,
  )
}

export const updateConfig = async (
  options: UpdateConfigOptions,
): Promise<void> => {
  const { logger } = options
  const resolved = resolveConfigPath(options)

  if (!existsSync(resolved)) {
    logger.error({ config: resolved }, "update-config: file not found")
    process.exitCode = 1
    return
  }

  const previous = readConfigPath()
  writeConfigPath(resolved)
  logger.info(
    { config: resolved, previous },
    "update-config: config path updated",
  )

  if (options.reload === true) {
    await reload({ logger, ...(options.logs === true ? { logs: true } : {}) })
    return
  }
  await restart({ logger, ...(options.logs === true ? { logs: true } : {}) })
}
