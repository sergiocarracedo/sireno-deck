import { readFileSync } from "node:fs"
import { dirname, isAbsolute, resolve as resolvePath } from "node:path"

import { parseDocument, YAMLParseError } from "yaml"

import { getOriginalCwd } from "@/cli/cwd"

import { IncludeResolutionError, resolveIncludes } from "./include-resolver"
import { RawConfigSchema, type RawConfig } from "./schemas"
import { expandButtonReferences } from "./reference-expander"

export interface LoadConfigOptions {
  configPath: string
}

export interface LoadConfigResult {
  config: RawConfig
  configDir: string
}

export interface LineLocation {
  line: number
  col: number
}

export interface ConfigError {
  message: string
  location?: LineLocation
  path?: string
}

export class ConfigLoadError extends Error {
  readonly issues: ConfigError[]

  constructor(message: string, issues: ConfigError[] = []) {
    super(message)
    this.name = "ConfigLoadError"
    this.issues = issues
  }
}

const formatLineCol = (loc: LineLocation): string =>
  `line ${loc.line + 1}, col ${loc.col + 1}`

const convertYamlErrors = (err: unknown): ConfigError[] => {
  if (err instanceof YAMLParseError) {
    const linePos = err.linePos?.[0]
    return [
      {
        message: err.message,
        ...(linePos
          ? { location: { line: linePos.line, col: linePos.col } }
          : {}),
      },
    ]
  }
  if (Array.isArray(err)) {
    return err.map((e) => {
      const linePos = e.linePos?.[0]
      return {
        message: e.message ?? String(e),
        ...(linePos
          ? { location: { line: linePos.line, col: linePos.col } }
          : {}),
      } satisfies ConfigError
    })
  }
  return [{ message: err instanceof Error ? err.message : String(err) }]
}

export const loadConfigFile = (configPath: string): unknown => {
  const absolutePath = isAbsolute(configPath)
    ? configPath
    : resolvePath(getOriginalCwd(), configPath)
  let raw: string
  try {
    raw = readFileSync(absolutePath, "utf8")
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ConfigLoadError(`Config file not found: ${absolutePath}`)
    }
    throw err
  }
  const doc = parseDocument(raw, { keepSourceTokens: true })
  const errors = doc.errors
  // ponytail: textual include inlining — pre-process before yaml parses so
  // included content participates in normal yaml merge semantics. Cycle
  // detection and missing-file errors are raised here, before schema validation.
  let inlinedRaw: string
  try {
    inlinedRaw = resolveIncludes(raw, absolutePath)
  } catch (err) {
    if (err instanceof IncludeResolutionError) {
      throw new ConfigLoadError(err.message, err.issues)
    }
    throw err
  }
  if (inlinedRaw !== raw) {
    const inlinedDoc = parseDocument(inlinedRaw, { keepSourceTokens: true })
    const inlinedErrors = inlinedDoc.errors
    if (inlinedErrors.length > 0) {
      throw new ConfigLoadError(
        `YAML parse errors in ${absolutePath} (after inlining includes):\n${inlinedErrors
          .map((e) => ` - ${e.message}`)
          .join("\n")}`,
        convertYamlErrors(inlinedErrors),
      )
    }
    return inlinedDoc.toJSON()
  }
  if (errors.length > 0) {
    throw new ConfigLoadError(
      `YAML parse errors in ${absolutePath}:\n${errors.map((e) => ` - ${e.message}`).join("\n")}`,
      convertYamlErrors(errors),
    )
  }
  return doc.toJSON()
}

const reportZodIssues = (issues: ConfigError[]): string =>
  issues
    .map((issue) => {
      const parts = [issue.message]
      if (issue.location) parts.push(`@ ${formatLineCol(issue.location)}`)
      if (issue.path) parts.push(`(at ${issue.path})`)
      return ` - ${parts.join(" ")}`
    })
    .join("\n")

export const loadConfig = ({
  configPath,
}: LoadConfigOptions): LoadConfigResult => {
  const configDir = dirname(configPath)
  const raw = loadConfigFile(configPath)
  const expanded = expandButtonReferences(raw, configDir)
  const result = RawConfigSchema.safeParse(expanded)
  if (!result.success) {
    const issues: ConfigError[] = result.error.issues.map((issue) => ({
      message: issue.message,
      path: issue.path.join("."),
    }))
    throw new ConfigLoadError(
      `Invalid config at ${configPath}:\n${reportZodIssues(issues)}`,
      issues,
    )
  }
  return { config: result.data, configDir }
}
