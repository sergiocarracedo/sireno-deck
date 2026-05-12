import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import yaml from "js-yaml"

import {
  ConfigValidationError,
  type SirenoConfig,
  validateConfig,
} from "../core/schemas.js"

const CONFIG_FILENAME = "config.yml"

function findConfigPath(customPath?: string): string | undefined {
  if (customPath) {
    return customPath
  }

  const cwdConfig = join(process.cwd(), CONFIG_FILENAME)
  if (existsSync(cwdConfig)) {
    return cwdConfig
  }

  const xdgConfig = join(homedir(), ".config", "sireno-deck", CONFIG_FILENAME)
  if (existsSync(xdgConfig)) {
    return xdgConfig
  }

  return undefined
}

export function loadConfig(configPath?: string): SirenoConfig {
  const foundPath = findConfigPath(configPath)

  if (!foundPath) {
    throw new ConfigValidationError(
      "No config.yml found. Create one in the current directory or ~/.config/sireno-deck/config.yml",
    )
  }

  const raw = readFileSync(foundPath, "utf-8")

  let parsed: unknown
  try {
    parsed = yaml.load(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ConfigValidationError(`YAML parse error: ${message}`, foundPath)
  }

  return validateConfig(parsed)
}
