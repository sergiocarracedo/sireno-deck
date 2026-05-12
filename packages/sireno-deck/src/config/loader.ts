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

function getXdgConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config")
  return join(configHome, "sireno-deck", CONFIG_FILENAME)
}

function getLineNumber(raw: string, pathSegments: readonly (string | number)[]): number | undefined {
  if (pathSegments.length === 0) {
    return undefined
  }

  const [segment] = pathSegments
  if (typeof segment !== "string" || segment.length === 0) {
    return undefined
  }

  const lines = raw.split(/\r?\n/)
  const matcher = new RegExp(`^\\s*${segment.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*:`)

  const index = lines.findIndex((line) => matcher.test(line))
  return index >= 0 ? index + 1 : undefined
}

function findConfigPath(customPath?: string): string | undefined {
  if (customPath) {
    return customPath
  }

  const cwdConfig = join(process.cwd(), CONFIG_FILENAME)
  if (existsSync(cwdConfig)) {
    return cwdConfig
  }

  const xdgConfig = getXdgConfigPath()
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
    const lineNumber =
      typeof error === "object" && error !== null && "mark" in error
        ? ((error as { mark?: { line?: number } }).mark?.line ?? undefined)
        : undefined
    const message = error instanceof Error ? error.message : String(error)
    throw new ConfigValidationError(
      `YAML parse error: ${message}`,
      foundPath,
      lineNumber !== undefined ? lineNumber + 1 : undefined,
      "Fix the YAML syntax and try again.",
    )
  }

  try {
    return validateConfig(parsed)
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw new ConfigValidationError(
        error.message,
        foundPath,
        error.lineNumber ?? getLineNumber(raw, error.pathSegments),
        error.suggestion,
        error.pathSegments,
      )
    }

    throw error
  }
}
