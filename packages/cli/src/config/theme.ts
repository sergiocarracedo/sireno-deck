import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, join, isAbsolute, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import yaml from "js-yaml"
import { z } from "zod"

import { ConfigValidationError } from "../core/schemas.js"
import { buttonFrame as defaultButtonFrame } from "../render/button-frame.js"

import type { ReactElement, ReactNode } from "react"

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

const ThemeManifestSchema = ThemeSchema.extend({
  main: z.string().min(1),
}).passthrough()

type ThemeSchemaOutput = z.infer<typeof ThemeSchema>
type ThemeManifest = z.infer<typeof ThemeManifestSchema>

export type ThemeTypographyRole = z.infer<typeof ThemeTypographyRoleSchema>
export type ThemeFrameState = "idle" | "tap" | "hold"

export interface ThemeButtonFrameProps {
  children: ReactNode
  state: ThemeFrameState
}

export type ThemeButtonFrame = (props: ThemeButtonFrameProps) => ReactElement

export interface Theme extends Omit<ThemeSchemaOutput, "typography"> {
  buttonFrame: ThemeButtonFrame
  rootDir: string
  typography?: ThemeSchemaOutput["typography"]
}

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const MANIFEST_FILENAME = "manifest.yml"
const BUILTIN_THEME_ALIASES = {
  dark: "default",
} as const

export interface ResolveThemeOptions {
  baseDirectory?: string
}

type ThemeResolutionTarget =
  | {
      kind: "legacy_yaml"
      path: string
      rootDir: string
    }
  | {
      kind: "package"
      manifestPath: string
      nameOverride?: string
      rootDir: string
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

function parseThemeYaml<TOutput>(
  filePath: string,
  schema: z.ZodType<TOutput>,
  pathSegments: readonly (string | number)[],
): TOutput {
  const raw = readFileSync(filePath, "utf-8")

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
      filePath,
      lineNumber !== undefined ? lineNumber + 1 : undefined,
      "Fix the theme YAML syntax and try again.",
      pathSegments,
    )
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new ConfigValidationError(
      issue.message,
      filePath,
      getThemeLineNumber(raw, issue.path),
      `Check the theme value for '${issue.path.join(".") || "theme"}'.`,
      pathSegments,
    )
  }

  return result.data
}

function getBuiltinThemeTarget(themeReference: string): ThemeResolutionTarget | undefined {
  const resolvedReference = BUILTIN_THEME_ALIASES[themeReference as keyof typeof BUILTIN_THEME_ALIASES] ?? themeReference
  const nameOverride = resolvedReference === themeReference ? undefined : themeReference
  let searchDirectory = MODULE_DIRECTORY

  while (true) {
    const candidateRoot = resolve(searchDirectory, "themes", resolvedReference)
    const candidateManifest = join(candidateRoot, MANIFEST_FILENAME)
    if (existsSync(candidateManifest)) {
      return {
        kind: "package",
        manifestPath: candidateManifest,
        ...(nameOverride !== undefined ? { nameOverride } : {}),
        rootDir: candidateRoot,
      }
    }

    const parentDirectory = dirname(searchDirectory)
    if (parentDirectory === searchDirectory) {
      return undefined
    }

    searchDirectory = parentDirectory
  }
}

function getLocalThemeTarget(themeReference: string, options: ResolveThemeOptions = {}): ThemeResolutionTarget | undefined {
  const baseDirectory = options.baseDirectory ?? process.cwd()
  const resolvedPath = isAbsolute(themeReference) ? themeReference : resolve(baseDirectory, themeReference)
  if (!existsSync(resolvedPath)) {
    return undefined
  }

  const pathStats = statSync(resolvedPath)
  if (pathStats.isDirectory()) {
    return {
      kind: "package",
      manifestPath: join(resolvedPath, MANIFEST_FILENAME),
      rootDir: resolvedPath,
    }
  }

  if (basename(resolvedPath) === MANIFEST_FILENAME) {
    return {
      kind: "package",
      manifestPath: resolvedPath,
      rootDir: dirname(resolvedPath),
    }
  }

  return {
    kind: "legacy_yaml",
    path: resolvedPath,
    rootDir: dirname(resolvedPath),
  }
}

function resolveThemeTarget(themeReference: string, options: ResolveThemeOptions = {}): ThemeResolutionTarget {
  const builtinTheme = getBuiltinThemeTarget(themeReference)
  if (builtinTheme) {
    return builtinTheme
  }

  const localTheme = getLocalThemeTarget(themeReference, options)
  if (localTheme) {
    if (localTheme.kind === "package" && !existsSync(localTheme.manifestPath)) {
      throw new ConfigValidationError(
        `Theme package '${themeReference}' is missing ${MANIFEST_FILENAME}`,
        localTheme.rootDir,
        undefined,
        `Add ${MANIFEST_FILENAME} to '${localTheme.rootDir}' or point theme at an existing package root or YAML file.`,
        ["theme"],
      )
    }

    return localTheme
  }

  throw new ConfigValidationError(
    `Theme '${themeReference}' could not be resolved`,
    undefined,
    undefined,
    "Use a built-in theme name like 'dark' or 'light', point theme at an existing package directory, or point theme at an existing YAML file.",
    ["theme"],
  )
}

async function importThemeButtonFrame(manifest: ThemeManifest, manifestPath: string, rootDir: string): Promise<ThemeButtonFrame> {
  const entryPath = resolve(rootDir, manifest.main)
  if (!existsSync(entryPath)) {
    throw new ConfigValidationError(
      `Theme runtime entry '${manifest.main}' was not found`,
      manifestPath,
      undefined,
      `Check the value for 'main' in ${MANIFEST_FILENAME}.`,
      ["theme", "main"],
    )
  }

  try {
    const importedModule = await import(pathToFileURL(entryPath).href)
    const candidateFrame = importedModule.buttonFrame
      ?? importedModule.ButtonFrame
      ?? importedModule.default?.buttonFrame
      ?? importedModule.default?.ButtonFrame

    if (typeof candidateFrame !== "function") {
      throw new ConfigValidationError(
        `Theme '${manifest.name}' did not export a valid buttonFrame`,
        manifestPath,
        undefined,
        `Export 'buttonFrame' from '${manifest.main}'.`,
        ["theme", "main"],
      )
    }

    return candidateFrame as ThemeButtonFrame
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error
    }

    const message = error instanceof Error ? error.message : String(error)
    throw new ConfigValidationError(
      `Failed to import theme runtime: ${message}`,
      manifestPath,
      undefined,
      `Check the runtime entry at '${manifest.main}'.`,
      ["theme", "main"],
    )
  }
}

export async function resolveTheme(themeReference: string, options: ResolveThemeOptions = {}): Promise<Theme> {
  const target = resolveThemeTarget(themeReference, options)

  if (target.kind === "legacy_yaml") {
    const theme = parseThemeYaml(target.path, ThemeSchema, ["theme"])
    return {
      ...theme,
      buttonFrame: defaultButtonFrame,
      rootDir: target.rootDir,
    }
  }

  const manifest = parseThemeYaml(target.manifestPath, ThemeManifestSchema, ["theme"])
  const buttonFrame = await importThemeButtonFrame(manifest, target.manifestPath, target.rootDir)

  return {
    accent: manifest.accent,
    background: manifest.background,
    buttonFrame,
    danger: manifest.danger,
    foreground: manifest.foreground,
    name: target.nameOverride ?? manifest.name,
    primary: manifest.primary,
    rootDir: target.rootDir,
    success: manifest.success,
    typography: manifest.typography,
  }
}
