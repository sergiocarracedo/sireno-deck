import { existsSync, readFileSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"

import yaml from "js-yaml"
import { z } from "zod"

import { ConfigValidationError } from "../core/schemas.js"

const ThemeSchema = z
  .object({
    name: z.string().min(1),
    background: z.string().min(1),
    foreground: z.string().min(1),
    primary: z.string().min(1),
    accent: z.string().min(1),
    success: z.string().min(1),
    danger: z.string().min(1),
  })
  .strict()

export type Theme = z.infer<typeof ThemeSchema>

const BUILTIN_THEME_DIRECTORY = resolve(process.cwd(), "themes")

function getThemePath(themeReference: string): string {
  const builtinPath = resolve(BUILTIN_THEME_DIRECTORY, `${themeReference}.yml`)
  if (existsSync(builtinPath)) {
    return builtinPath
  }

  const resolvedPath = isAbsolute(themeReference) ? themeReference : resolve(process.cwd(), themeReference)
  if (existsSync(resolvedPath)) {
    return resolvedPath
  }

  throw new ConfigValidationError(
    `Theme '${themeReference}' could not be resolved`,
    undefined,
    undefined,
    "Use a built-in theme name like 'dark' or point theme at an existing YAML file.",
    ["theme"],
  )
}

function getThemeLineNumber(raw: string, pathSegments: readonly (string | number)[]): number | undefined {
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

export function resolveTheme(themeReference: string): Theme {
  const themePath = getThemePath(themeReference)
  const raw = readFileSync(themePath, "utf-8")

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
      themePath,
      lineNumber !== undefined ? lineNumber + 1 : undefined,
      "Fix the theme YAML syntax and try again.",
      ["theme"],
    )
  }

  const result = ThemeSchema.safeParse(parsed)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new ConfigValidationError(
      issue.message,
      themePath,
      getThemeLineNumber(raw, issue.path),
      `Check the theme value for '${issue.path.join(".") || "theme"}'.`,
      issue.path,
    )
  }

  return result.data
}
