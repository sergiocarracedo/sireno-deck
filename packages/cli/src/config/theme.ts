import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { basename, dirname, extname, join, isAbsolute, relative, resolve } from "node:path"
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
  assets: z.object({
    styles: z.array(z.string().min(1)).optional(),
  }).optional(),
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
  filePaths: string[]
  rootDir: string
  stylesheets: string[]
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

function uniquePaths(paths: readonly string[]): string[] {
  return Array.from(new Set(paths))
}

function findRuntimeSnapshotParent(rootDir: string): string {
  let currentDirectory = rootDir

  while (true) {
    if (existsSync(join(currentDirectory, "node_modules"))) {
      return currentDirectory
    }

    const parentDirectory = dirname(currentDirectory)
    if (parentDirectory === currentDirectory) {
      return process.cwd()
    }

    currentDirectory = parentDirectory
  }
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

  const snapshotParent = mkdtempSync(join(findRuntimeSnapshotParent(rootDir), `.sireno-theme-runtime-${basename(rootDir)}-`))
  const snapshotRoot = join(snapshotParent, basename(rootDir))

  try {
    cpSync(rootDir, snapshotRoot, { recursive: true })

    const importedEntryPath = resolve(snapshotRoot, relative(rootDir, entryPath))
    const importedModule = await import(pathToFileURL(importedEntryPath).href)
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
  } finally {
    rmSync(snapshotParent, { force: true, recursive: true })
  }
}

function rewriteThemeCssUrls(cssText: string, cssFilePath: string): { filePaths: string[]; rewrittenCss: string } {
  const filePaths = [cssFilePath]

  const rewrittenCss = cssText.replace(/url\(([^)]+)\)/g, (_match, rawValue: string) => {
    const trimmedValue = rawValue.trim()
    const unquotedValue = trimmedValue.replace(/^['"]|['"]$/g, "")

    if (
      unquotedValue.length === 0
      || unquotedValue.startsWith("data:")
      || unquotedValue.startsWith("http://")
      || unquotedValue.startsWith("https://")
      || unquotedValue.startsWith("file://")
      || unquotedValue.startsWith("/")
      || unquotedValue.startsWith("#")
    ) {
      return `url(${trimmedValue})`
    }

    const resolvedAssetPath = resolve(dirname(cssFilePath), unquotedValue)
    if (!existsSync(resolvedAssetPath)) {
      throw new ConfigValidationError(
        `Theme CSS asset '${unquotedValue}' was not found`,
        cssFilePath,
        undefined,
        `Check the asset path relative to '${basename(cssFilePath)}'.`,
        ["theme", "assets", "styles"],
      )
    }

    filePaths.push(resolvedAssetPath)
    return `url("${pathToFileURL(resolvedAssetPath).href}")`
  })

  return {
    filePaths: uniquePaths(filePaths),
    rewrittenCss,
  }
}

export function rewriteThemeStylesheetAssetUrls(
  cssText: string,
  rewriteAssetUrl: (filePath: string) => string,
): string {
  return cssText.replace(/url\(([^)]+)\)/g, (_match, rawValue: string) => {
    const trimmedValue = rawValue.trim()
    const unquotedValue = trimmedValue.replace(/^['"]|['"]$/g, "")

    if (!unquotedValue.startsWith("file://")) {
      return `url(${trimmedValue})`
    }

    return `url("${rewriteAssetUrl(fileURLToPath(unquotedValue))}")`
  })
}

function loadThemeStylesheets(
  manifest: ThemeManifest,
  manifestPath: string,
  rootDir: string,
): { filePaths: string[]; stylesheets: string[] } {
  const stylesheetPaths = manifest.assets?.styles ?? []
  const filePaths: string[] = []

  const stylesheets = stylesheetPaths.map((stylesheetPath) => {
    const resolvedStylesheetPath = resolve(rootDir, stylesheetPath)
    if (!existsSync(resolvedStylesheetPath)) {
      throw new ConfigValidationError(
        `Theme stylesheet '${stylesheetPath}' was not found`,
        manifestPath,
        undefined,
        `Check the value for 'assets.styles' in ${MANIFEST_FILENAME}.`,
        ["theme", "assets", "styles"],
      )
    }

    const cssText = readFileSync(resolvedStylesheetPath, "utf-8")
    const result = rewriteThemeCssUrls(cssText, resolvedStylesheetPath)
    filePaths.push(...result.filePaths)
    return result.rewrittenCss
  })

  return {
    filePaths: uniquePaths(filePaths),
    stylesheets,
  }
}

function resolveThemeRuntimeImportPath(modulePath: string, specifier: string): string | undefined {
  if (!(specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/"))) {
    return undefined
  }

  const directPath = resolve(dirname(modulePath), specifier)
  const candidatePaths = [
    directPath,
    `${directPath}.js`,
    `${directPath}.mjs`,
    `${directPath}.cjs`,
    `${directPath}.jsx`,
    `${directPath}.ts`,
    `${directPath}.tsx`,
    join(directPath, "index.js"),
    join(directPath, "index.mjs"),
    join(directPath, "index.cjs"),
  ]

  return candidatePaths.find((candidatePath) => existsSync(candidatePath))
}

function getThemeRuntimeImportSpecifiers(moduleSource: string): string[] {
  const specifiers = new Set<string>()
  const patterns = [
    /(?:import|export)\s+(?:[^"'`]+?\s+from\s+)?["'`]([^"'`]+)["'`]/g,
    /import\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
  ]

  for (const pattern of patterns) {
    for (const match of moduleSource.matchAll(pattern)) {
      const specifier = match[1]
      if (specifier) {
        specifiers.add(specifier)
      }
    }
  }

  return [...specifiers]
}

function collectThemeRuntimeFilePaths(entryPath: string): string[] {
  const visited = new Set<string>()
  const pendingPaths = [entryPath]

  while (pendingPaths.length > 0) {
    const currentPath = pendingPaths.pop()
    if (!currentPath || visited.has(currentPath) || !existsSync(currentPath)) {
      continue
    }

    visited.add(currentPath)
    const extension = extname(currentPath)
    if (![".js", ".mjs", ".cjs", ".jsx", ".ts", ".tsx"].includes(extension)) {
      continue
    }

    const source = readFileSync(currentPath, "utf-8")
    for (const specifier of getThemeRuntimeImportSpecifiers(source)) {
      const resolvedImportPath = resolveThemeRuntimeImportPath(currentPath, specifier)
      if (resolvedImportPath && !visited.has(resolvedImportPath)) {
        pendingPaths.push(resolvedImportPath)
      }
    }
  }

  return [...visited]
}

export async function resolveTheme(themeReference: string, options: ResolveThemeOptions = {}): Promise<Theme> {
  const target = resolveThemeTarget(themeReference, options)

  if (target.kind === "legacy_yaml") {
    const theme = parseThemeYaml(target.path, ThemeSchema, ["theme"])
    return {
      ...theme,
      buttonFrame: defaultButtonFrame,
      filePaths: [target.path],
      rootDir: target.rootDir,
      stylesheets: [],
    }
  }

  const manifest = parseThemeYaml(target.manifestPath, ThemeManifestSchema, ["theme"])
  const buttonFrame = await importThemeButtonFrame(manifest, target.manifestPath, target.rootDir)
  const runtimeFilePaths = collectThemeRuntimeFilePaths(resolve(target.rootDir, manifest.main))
  const stylesheetResult = loadThemeStylesheets(manifest, target.manifestPath, target.rootDir)

  return {
    accent: manifest.accent,
    background: manifest.background,
    buttonFrame,
    danger: manifest.danger,
    filePaths: uniquePaths([target.manifestPath, ...runtimeFilePaths, ...stylesheetResult.filePaths]),
    foreground: manifest.foreground,
    name: target.nameOverride ?? manifest.name,
    primary: manifest.primary,
    rootDir: target.rootDir,
    stylesheets: stylesheetResult.stylesheets,
    success: manifest.success,
    typography: manifest.typography,
  }
}
