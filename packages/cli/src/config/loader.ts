import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import yaml from "js-yaml"

import { resolveHostContextPlaceholders } from "../action/executor.js"
import {
  type BootstrapSirenoConfig,
  ConfigValidationError,
  type SirenoConfig,
  validateBootstrapConfig,
  validateConfig,
} from "../core/schemas.js"
import { getBundledAddons } from "../addon/builtin.js"
import { createAddonRegistry, type AddonRegistry } from "../addon/registry.js"
import { UNKNOWN_HOST_CONTEXT, type HostContext } from "../system/host-context.js"

const CONFIG_FILENAME = "config.yml"
const COMMAND_FIELD_NAMES = new Set(["command", "display_command", "select_command", "status_command"])

export interface LoadedBootstrapConfig {
  config: BootstrapSirenoConfig
  cwd: string
  filePath: string
}

function getXdgConfigPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config")
  return join(configHome, "sireno-deck", CONFIG_FILENAME)
}

function getLineNumber(raw: string, pathSegments: readonly (string | number)[]): number | undefined {
  if (pathSegments.length === 0) {
    return undefined
  }

  const lines = raw.split(/\r?\n/)
  let searchStart = 0
  let currentLineIndex: number | undefined
  let currentIndent = -1

  for (const segment of pathSegments) {
    if (typeof segment === "string") {
      const matcher = new RegExp(`^(\\s*)${segment.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\s*:`)
      let foundIndex: number | undefined

      for (let index = searchStart; index < lines.length; index += 1) {
        const match = lines[index]?.match(matcher)
        if (!match) {
          continue
        }

        const indent = match[1]?.length ?? 0
        if (currentIndent >= 0 && indent <= currentIndent) {
          continue
        }

        foundIndex = index
        currentLineIndex = index
        currentIndent = indent
        searchStart = index + 1
        break
      }

      if (foundIndex === undefined) {
        return currentLineIndex !== undefined ? currentLineIndex + 1 : undefined
      }

      continue
    }

    if (currentLineIndex === undefined) {
      return undefined
    }

    let listItemCount = -1
    let foundIndex: number | undefined

    for (let index = searchStart; index < lines.length; index += 1) {
      const line = lines[index]
      const indent = line.match(/^\s*/)?.[0].length ?? 0

      if (currentIndent >= 0 && indent <= currentIndent && line.trim().length > 0) {
        break
      }

      if (!/^\s*-\s+/.test(line)) {
        continue
      }

      listItemCount += 1
      if (listItemCount !== segment) {
        continue
      }

      foundIndex = index
      currentLineIndex = index
      currentIndent = indent
      searchStart = index + 1
      break
    }

    if (foundIndex === undefined) {
      return currentLineIndex + 1
    }
  }

  return currentLineIndex !== undefined ? currentLineIndex + 1 : undefined
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

export function createBundledAddonRegistry(): AddonRegistry {
  const registry = createAddonRegistry()

  for (const addon of getBundledAddons()) {
    registry.registerAddon(addon)
  }

  return registry
}

function parseConfigFile(configPath?: string): {
  filePath: string
  raw: string
  parsed: unknown
} {
  const foundPath = findConfigPath(configPath)

  if (!foundPath) {
    throw new ConfigValidationError(
      "No config.yml found. Create one in the current directory or ~/.config/sireno-deck/config.yml",
    )
  }

  const raw = readFileSync(foundPath, "utf-8")

  try {
    return {
      filePath: foundPath,
      parsed: yaml.load(raw),
      raw,
    }
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
}

function interpolateHostContextTemplates(
  value: unknown,
  hostContext: HostContext,
  pathSegments: readonly (string | number)[] = [],
): unknown {
  if (typeof value === "string") {
    const lastSegment = pathSegments.at(-1)
    if (typeof lastSegment === "string" && COMMAND_FIELD_NAMES.has(lastSegment)) {
      return value
    }

    return resolveHostContextPlaceholders(value, hostContext)
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => interpolateHostContextTemplates(item, hostContext, [...pathSegments, index]))
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolateHostContextTemplates(item, hostContext, [...pathSegments, key])]),
    )
  }

  return value
}

export function loadBootstrapConfig(configPath?: string, hostContext: HostContext = UNKNOWN_HOST_CONTEXT): LoadedBootstrapConfig {
  const parsedConfig = parseConfigFile(configPath)
  const interpolatedConfig = interpolateHostContextTemplates(parsedConfig.parsed, hostContext)

  try {
    return {
      config: validateBootstrapConfig(interpolatedConfig),
      cwd: dirname(parsedConfig.filePath),
      filePath: parsedConfig.filePath,
    }
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw new ConfigValidationError(
        error.message,
        parsedConfig.filePath,
        error.lineNumber ?? getLineNumber(parsedConfig.raw, error.pathSegments),
        error.suggestion,
        error.pathSegments,
      )
    }

    throw error
  }
}

export function loadConfig(
  configPath?: string,
  registry = createBundledAddonRegistry(),
  hostContext: HostContext = UNKNOWN_HOST_CONTEXT,
): SirenoConfig {
  const parsedConfig = parseConfigFile(configPath)
  const interpolatedConfig = interpolateHostContextTemplates(parsedConfig.parsed, hostContext)

  try {
    // Phase 5 bootstrap validation: load the addon registry before full button validation.
    return validateConfig(interpolatedConfig, registry)
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw new ConfigValidationError(
        error.message,
        parsedConfig.filePath,
        error.lineNumber ?? getLineNumber(parsedConfig.raw, error.pathSegments),
        error.suggestion,
        error.pathSegments,
      )
    }

    throw error
  }
}
