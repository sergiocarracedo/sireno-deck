import { existsSync, readFileSync } from "node:fs"
import { dirname, isAbsolute, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import yaml from "js-yaml"
import { z } from "zod"

import { ConfigValidationError } from "../core/schemas.js"

const ThemeTypographyRoleSchema = z
  .object({
    font_family: z.string().min(1),
    font_size: z.number().positive(),
    font_weight: z.number().int().positive(),
    letter_spacing: z.number().optional(),
  })
  .strict()

const ThemeSchema = z
  .object({
    name: z.string().min(1),
    background: z.string().min(1),
    foreground: z.string().min(1),
    primary: z.string().min(1),
    accent: z.string().min(1),
    success: z.string().min(1),
    danger: z.string().min(1),
    typography: z
      .object({
        main_text: ThemeTypographyRoleSchema,
        auxiliary_text: ThemeTypographyRoleSchema,
        monospace: ThemeTypographyRoleSchema,
      })
      .strict(),
  })
  .strict()

type ThemeSchemaOutput = z.infer<typeof ThemeSchema>

export type ThemeTypographyRole = z.infer<typeof ThemeTypographyRoleSchema>

export interface Theme extends Omit<ThemeSchemaOutput, "typography"> {
  typography?: ThemeSchemaOutput["typography"]
}

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url))

export interface ResolveThemeOptions {
  baseDirectory?: string
}

function getBuiltinThemePath(themeReference: string): string | undefined {
  let searchDirectory = MODULE_DIRECTORY

  while (true) {
    const candidatePath = resolve(searchDirectory, "themes", `${themeReference}.yml`)
    if (existsSync(candidatePath)) {
      return candidatePath
    }

    const parentDirectory = dirname(searchDirectory)
    if (parentDirectory === searchDirectory) {
      return undefined
    }

    searchDirectory = parentDirectory
  }
}

function getThemePath(themeReference: string, options: ResolveThemeOptions = {}): string {
  const builtinPath = getBuiltinThemePath(themeReference)
  if (builtinPath) {
    return builtinPath
  }

  const baseDirectory = options.baseDirectory ?? process.cwd()
  const resolvedPath = isAbsolute(themeReference) ? themeReference : resolve(baseDirectory, themeReference)
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

export function resolveTheme(themeReference: string, options: ResolveThemeOptions = {}): Theme {
  const themePath = getThemePath(themeReference, options)
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
