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

// ponytail: zod 4's z.union() surfaces a top-level "Invalid input"
// with the per-variant reasons buried under `errors: Array<Array<issue>>`.
// We flatten those variant arrays into the top-level issue list so users
// see the actual cause (e.g. "Unrecognized key: \"src\"") instead of a
// useless top-level generic.
type RawZodIssue = {
  message: string
  path?: Array<string | number>
  errors?: ReadonlyArray<ReadonlyArray<RawZodIssue>>
}

const flattenZodIssues = (
  rawIssues: ReadonlyArray<RawZodIssue>,
  basePath: ReadonlyArray<string | number> = [],
): ConfigError[] => {
  const out: ConfigError[] = []
  for (const issue of rawIssues) {
    const path = [...basePath, ...(issue.path ?? [])]
    if (issue.errors !== undefined && issue.errors.length > 0) {
      // ponytail: union variant issues — flatten ALL variants' issues so
      // the user sees every possible mismatch. Filter out empty arrays
      // (variants that matched nothing).
      for (const variant of issue.errors) {
        if (variant.length > 0) {
          out.push(...flattenZodIssues(variant, path))
        }
      }
      continue
    }
    out.push({
      message: issue.message,
      ...(path.length > 0 ? { path: path.join(".") } : {}),
    })
  }
  return out
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
    // ponytail: recurse into unionErrors so the user sees the actual
    // discriminator failure (e.g. "Unrecognized key 'src'") instead of
    // a useless top-level "Invalid input".
    const issues = flattenZodIssues(
      result.error.issues as ReadonlyArray<RawZodIssue>,
    )
    throw new ConfigLoadError(
      `Invalid config at ${configPath}:\n${reportZodIssues(issues)}`,
      issues,
    )
  }
  return { config: result.data, configDir }
}
