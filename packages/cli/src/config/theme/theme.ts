import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import yaml from 'js-yaml'
import { tsImport } from 'tsx/esm/api'
import { z } from 'zod'

import { ConfigValidationError } from '@/core/schemas'
import {
  colorTokens,
  Theme,
  ThemeButtonFrame,
  ThemeColorToken,
  ThemeManifest,
  ThemeManifestSchema,
  ThemeMediaPlayerSurface,
  ThemeUiPresentation,
} from './schemas'

const MODULE_DIRECTORY = dirname(fileURLToPath(import.meta.url))
const PACKAGE_TSCONFIG_PATH = resolve(MODULE_DIRECTORY, '../../../tsconfig.json')
const MANIFEST_FILENAME = 'manifest.yml'
const TRANSPILED_THEME_RUNTIME_EXTENSIONS = new Set(['.jsx', '.ts', '.tsx'])
const BUILTIN_THEME_ALIASES = {
  dark: 'default',
} as const

export interface ResolveThemeOptions {
  baseDirectory?: string
}

type ThemeResolutionTarget = {
  kind: 'package'
  manifestPath: string
  nameOverride?: string
  rootDir: string
}

interface ImportedThemeRuntime {
  buttonFrame: ThemeButtonFrame
  mediaPlayerSurface?: ThemeMediaPlayerSurface
  ui?: ThemeUiPresentation
}

function uniquePaths(paths: readonly string[]): string[] {
  return Array.from(new Set(paths))
}

function findPackageRoot(startDirectory: string): string {
  let currentDirectory = startDirectory

  while (true) {
    if (existsSync(join(currentDirectory, 'node_modules'))) {
      return currentDirectory
    }

    const parentDirectory = dirname(currentDirectory)
    if (parentDirectory === currentDirectory) {
      return process.cwd()
    }

    currentDirectory = parentDirectory
  }
}

function getThemeRuntimeCacheKey(runtimeFilePaths: readonly string[]): string {
  const hash = createHash('sha1')

  for (const filePath of [...runtimeFilePaths].sort()) {
    const fileStats = statSync(filePath)
    hash.update(filePath)
    hash.update(String(fileStats.mtimeMs))
    hash.update(String(fileStats.size))
  }

  return hash.digest('hex').slice(0, 12)
}

function getThemeLineNumber(
  raw: string,
  pathSegments: readonly (string | number)[],
): number | undefined {
  if (pathSegments.length === 0) {
    return undefined
  }

  const [segment] = pathSegments
  if (typeof segment !== 'string' || segment.length === 0) {
    return undefined
  }

  const lines = raw.split(/\r?\n/)
  const matcher = new RegExp(
    `^\\s*${segment.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*:`,
  )
  const index = lines.findIndex((line) => matcher.test(line))

  return index >= 0 ? index + 1 : undefined
}

function parseThemeYaml<TOutput, TInput>(
  filePath: string,
  schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
  pathSegments: readonly (string | number)[],
): TOutput {
  const raw = readFileSync(filePath, 'utf-8')

  let parsed: unknown
  try {
    parsed = yaml.load(raw)
  } catch (error) {
    const lineNumber =
      typeof error === 'object' && error !== null && 'mark' in error
        ? ((error as { mark?: { line?: number } }).mark?.line ?? undefined)
        : undefined
    const message = error instanceof Error ? error.message : String(error)

    throw new ConfigValidationError(
      `YAML parse error: ${message}`,
      filePath,
      lineNumber !== undefined ? lineNumber + 1 : undefined,
      'Fix the theme YAML syntax and try again.',
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
      `Check the theme value for '${issue.path.join('.') || 'theme'}'.`,
      pathSegments,
    )
  }

  return result.data
}

function getBuiltinThemeTarget(
  themeReference: string,
): ThemeResolutionTarget | undefined {
  const resolvedReference =
    BUILTIN_THEME_ALIASES[
      themeReference as keyof typeof BUILTIN_THEME_ALIASES
    ] ?? themeReference
  const nameOverride =
    resolvedReference === themeReference ? undefined : themeReference
  let searchDirectory = MODULE_DIRECTORY

  while (true) {
    const candidateRoot = resolve(searchDirectory, 'themes', resolvedReference)
    const candidateManifest = join(candidateRoot, MANIFEST_FILENAME)
    if (existsSync(candidateManifest)) {
      return {
        kind: 'package',
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

function getLocalThemeTarget(
  themeReference: string,
  options: ResolveThemeOptions = {},
): ThemeResolutionTarget | undefined {
  const baseDirectory = options.baseDirectory ?? process.cwd()
  const resolvedPath = isAbsolute(themeReference)
    ? themeReference
    : resolve(baseDirectory, themeReference)
  if (!existsSync(resolvedPath)) {
    return undefined
  }

  const pathStats = statSync(resolvedPath)
  if (pathStats.isDirectory()) {
    return {
      kind: 'package',
      manifestPath: join(resolvedPath, MANIFEST_FILENAME),
      rootDir: resolvedPath,
    }
  }

  if (basename(resolvedPath) === MANIFEST_FILENAME) {
    return {
      kind: 'package',
      manifestPath: resolvedPath,
      rootDir: dirname(resolvedPath),
    }
  }

  return undefined
}

function resolveThemeTarget(
  themeReference: string,
  options: ResolveThemeOptions = {},
): ThemeResolutionTarget {
  const builtinTheme = getBuiltinThemeTarget(themeReference)
  if (builtinTheme) {
    return builtinTheme
  }

  const localTheme = getLocalThemeTarget(themeReference, options)
  if (localTheme) {
    if (!existsSync(localTheme.manifestPath)) {
      throw new ConfigValidationError(
        `Theme package '${themeReference}' is missing ${MANIFEST_FILENAME}`,
        localTheme.rootDir,
        undefined,
        `Add ${MANIFEST_FILENAME} to '${localTheme.rootDir}' or point theme at an existing package root.`,
        ['theme'],
      )
    }

    return localTheme
  }

  throw new ConfigValidationError(
    `Theme '${themeReference}' could not be resolved`,
    undefined,
    undefined,
    "Use a built-in theme name like 'dark' or 'light', or point theme at an existing package directory.",
    ['theme'],
  )
}

function getThemeUiPresentation(
  candidateUi: unknown,
  manifest: ThemeManifest,
  manifestPath: string,
): ThemeUiPresentation | undefined {
  if (candidateUi === undefined) {
    return undefined
  }

  if (typeof candidateUi !== 'object' || candidateUi === null) {
    throw new ConfigValidationError(
      `Theme '${manifest.name}' exported an invalid ui presentation object`,
      manifestPath,
      undefined,
      `Export 'ui' as an object with optional 'icon', 'chip', and 'text' functions from '${manifest.main}'.`,
      ['theme', 'main'],
    )
  }

  const uiObject = candidateUi as Record<string, unknown>
  const ui: ThemeUiPresentation = {}

  for (const key of ['icon', 'chip', 'text'] as const) {
    const presenter = uiObject[key]
    if (presenter === undefined) {
      continue
    }

    if (typeof presenter !== 'function') {
      throw new ConfigValidationError(
        `Theme '${manifest.name}' exported an invalid ui.${key} presentation override`,
        manifestPath,
        undefined,
        `Export 'ui.${key}' as a function from '${manifest.main}'.`,
        ['theme', 'main'],
      )
    }

    ui[key] = presenter as NonNullable<ThemeUiPresentation[typeof key]>
  }

  return Object.keys(ui).length > 0 ? ui : undefined
}

async function importThemeMediaPlayerSurface(
  manifest: ThemeManifest,
  manifestPath: string,
  rootDir: string,
  runtimeCacheKey: string,
): Promise<ThemeMediaPlayerSurface | undefined> {
  const surfacePath = manifest.mediaPlayer?.surface
  if (!surfacePath) {
    return undefined
  }

  const resolvedSurfacePath = resolve(rootDir, surfacePath)
  if (!existsSync(resolvedSurfacePath)) {
    throw new ConfigValidationError(
      `Theme mediaPlayer surface '${surfacePath}' was not found`,
      manifestPath,
      undefined,
      `Check the value for 'mediaPlayer.surface' in ${MANIFEST_FILENAME}.`,
      ['theme', 'mediaPlayer', 'surface'],
    )
  }

  const importedSurfaceUrl = `${pathToFileURL(resolvedSurfacePath).href}?sireno-theme-runtime=${runtimeCacheKey}`

  try {
    const importedSurfaceModule = TRANSPILED_THEME_RUNTIME_EXTENSIONS.has(
      extname(resolvedSurfacePath),
    )
      ? await tsImport(importedSurfaceUrl, {
          parentURL: importedSurfaceUrl,
          tsconfig: PACKAGE_TSCONFIG_PATH,
        })
      : await import(importedSurfaceUrl)
    const candidateSurface =
      importedSurfaceModule.surface ??
      importedSurfaceModule.Surface ??
      importedSurfaceModule.default?.surface ??
      importedSurfaceModule.default?.Surface

    if (typeof candidateSurface !== 'function') {
      throw new ConfigValidationError(
        `Theme '${manifest.name}' did not export a valid mediaPlayer surface`,
        manifestPath,
        undefined,
        `Export a 'surface' function from '${surfacePath}'.`,
        ['theme', 'mediaPlayer', 'surface'],
      )
    }

    return candidateSurface as ThemeMediaPlayerSurface
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      throw error
    }

    const message = error instanceof Error ? error.message : String(error)
    throw new ConfigValidationError(
      `Failed to import theme mediaPlayer surface: ${message}`,
      manifestPath,
      undefined,
      `Check the surface entry at '${surfacePath}'.`,
      ['theme', 'mediaPlayer', 'surface'],
    )
  }
}

async function importThemeRuntime(
  manifest: ThemeManifest,
  manifestPath: string,
  rootDir: string,
  runtimeFilePaths: readonly string[],
): Promise<ImportedThemeRuntime> {
  const entryPath = resolve(rootDir, manifest.main)
  if (!existsSync(entryPath)) {
    throw new ConfigValidationError(
      `Theme runtime entry '${manifest.main}' was not found`,
      manifestPath,
      undefined,
      `Check the value for 'main' in ${MANIFEST_FILENAME}.`,
      ['theme', 'main'],
    )
  }

  const cacheKeyPaths = [
    ...runtimeFilePaths,
    ...(manifest.mediaPlayer?.surface
      ? [resolve(rootDir, manifest.mediaPlayer.surface)]
      : []),
  ]
  const runtimeCacheKey = getThemeRuntimeCacheKey(cacheKeyPaths)

  try {
    const importedEntryUrl = `${pathToFileURL(entryPath).href}?sireno-theme-runtime=${runtimeCacheKey}`
    const importedModule = TRANSPILED_THEME_RUNTIME_EXTENSIONS.has(
      extname(entryPath),
    )
      ? await tsImport(importedEntryUrl, {
          parentURL: importedEntryUrl,
          tsconfig: PACKAGE_TSCONFIG_PATH,
        })
      : await import(importedEntryUrl)
    const candidateFrame =
      importedModule.buttonFrame ??
      importedModule.ButtonFrame ??
      importedModule.default?.buttonFrame ??
      importedModule.default?.ButtonFrame

    if (typeof candidateFrame !== 'function') {
      throw new ConfigValidationError(
        `Theme '${manifest.name}' did not export a valid buttonFrame`,
        manifestPath,
        undefined,
        `Export 'buttonFrame' from '${manifest.main}'.`,
        ['theme', 'main'],
      )
    }

    const mediaPlayerSurface = await importThemeMediaPlayerSurface(
      manifest,
      manifestPath,
      rootDir,
      runtimeCacheKey,
    )

    return {
      buttonFrame: candidateFrame as ThemeButtonFrame,
      mediaPlayerSurface,
      ui: getThemeUiPresentation(
        importedModule.ui ?? importedModule.default?.ui,
        manifest,
        manifestPath,
      ),
    }
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
      ['theme', 'main'],
    )
  }
}

function rewriteThemeCssUrls(
  cssText: string,
  cssFilePath: string,
): { filePaths: string[]; rewrittenCss: string } {
  const filePaths = [cssFilePath]

  const rewrittenCss = cssText.replace(
    /url\(([^)]+)\)/g,
    (_match, rawValue: string) => {
      const trimmedValue = rawValue.trim()
      const unquotedValue = trimmedValue.replace(/^['"]|['"]$/g, '')

      if (
        unquotedValue.length === 0 ||
        unquotedValue.startsWith('data:') ||
        unquotedValue.startsWith('http://') ||
        unquotedValue.startsWith('https://') ||
        unquotedValue.startsWith('file://') ||
        unquotedValue.startsWith('/') ||
        unquotedValue.startsWith('#')
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
          ['theme', 'assets', 'styles'],
        )
      }

      filePaths.push(resolvedAssetPath)
      return `url("${pathToFileURL(resolvedAssetPath).href}")`
    },
  )

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
    const unquotedValue = trimmedValue.replace(/^['"]|['"]$/g, '')

    if (!unquotedValue.startsWith('file://')) {
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
        ['theme', 'assets', 'styles'],
      )
    }

    const cssText = readFileSync(resolvedStylesheetPath, 'utf-8')
    const result = rewriteThemeCssUrls(cssText, resolvedStylesheetPath)
    filePaths.push(...result.filePaths)
    return result.rewrittenCss
  })

  return {
    filePaths: uniquePaths(filePaths),
    stylesheets,
  }
}

function resolveThemeRuntimeImportPath(
  modulePath: string,
  specifier: string,
): string | undefined {
  if (
    !(
      specifier.startsWith('./') ||
      specifier.startsWith('../') ||
      specifier.startsWith('/')
    )
  ) {
    return undefined
  }

  const directPath = resolve(dirname(modulePath), specifier)
  const specifierExtension = extname(specifier)
  const extensionlessDirectPath =
    specifierExtension === '.js' ||
    specifierExtension === '.mjs' ||
    specifierExtension === '.cjs'
      ? directPath.slice(0, -specifierExtension.length)
      : directPath
  const candidatePaths = [
    directPath,
    `${extensionlessDirectPath}.ts`,
    `${extensionlessDirectPath}.tsx`,
    `${extensionlessDirectPath}.jsx`,
    `${directPath}.js`,
    `${directPath}.mjs`,
    `${directPath}.cjs`,
    `${directPath}.jsx`,
    `${directPath}.ts`,
    `${directPath}.tsx`,
    join(directPath, 'index.js'),
    join(directPath, 'index.mjs'),
    join(directPath, 'index.cjs'),
    join(directPath, 'index.jsx'),
    join(directPath, 'index.ts'),
    join(directPath, 'index.tsx'),
  ]

  return candidatePaths.find((candidatePath) => existsSync(candidatePath))
}

function isWithinThemeRoot(rootDir: string, candidatePath: string): boolean {
  const relativePath = relative(rootDir, candidatePath)
  const allowedUtilsPath = `..${sep}utils`

  return (
    relativePath === '' ||
    relativePath === allowedUtilsPath ||
    relativePath.startsWith(`${allowedUtilsPath}${sep}`) ||
    (!relativePath.startsWith('..') &&
      !relativePath.includes(`${sep}..${sep}`) &&
      relativePath !== '..')
  )
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

function collectThemeRuntimeFilePaths(
  entryPath: string,
  rootDir: string,
  manifest: ThemeManifest,
  manifestPath: string,
): string[] {
  const visited = new Set<string>()
  const pendingPaths = [entryPath]

  while (pendingPaths.length > 0) {
    const currentPath = pendingPaths.pop()
    if (!currentPath || visited.has(currentPath) || !existsSync(currentPath)) {
      continue
    }

    if (!isWithinThemeRoot(rootDir, currentPath)) {
      throw new ConfigValidationError(
        `Theme '${manifest.name}' runtime imports must stay inside the theme package root or ../utils`,
        manifestPath,
        undefined,
        `Keep relative imports from '${manifest.main}' inside the theme package directory or the sibling utils directory.`,
        ['theme', 'main'],
      )
    }

    visited.add(currentPath)
    const extension = extname(currentPath)
    if (!['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'].includes(extension)) {
      continue
    }

    const source = readFileSync(currentPath, 'utf-8')
    for (const specifier of getThemeRuntimeImportSpecifiers(source)) {
      const resolvedImportPath = resolveThemeRuntimeImportPath(
        currentPath,
        specifier,
      )
      if (!resolvedImportPath) {
        continue
      }

      if (!isWithinThemeRoot(rootDir, resolvedImportPath)) {
        throw new ConfigValidationError(
          `Theme '${manifest.name}' runtime imports must stay inside the theme package root or ../utils`,
          manifestPath,
          undefined,
          `Keep relative imports from '${manifest.main}' inside the theme package directory or the sibling utils directory.`,
          ['theme', 'main'],
        )
      }

      if (!visited.has(resolvedImportPath)) {
        pendingPaths.push(resolvedImportPath)
      }
    }
  }

  return [...visited]
}

export async function resolveTheme(
  themeReference: string,
  options: ResolveThemeOptions = {},
): Promise<Theme> {
  const target = resolveThemeTarget(themeReference, options)

  const manifest = parseThemeYaml(target.manifestPath, ThemeManifestSchema, [
    'theme',
  ])
  const runtimeEntryPath = resolve(target.rootDir, manifest.main)
  const runtimeFilePaths = collectThemeRuntimeFilePaths(
    runtimeEntryPath,
    target.rootDir,
    manifest,
    target.manifestPath,
  )
  const runtime = await importThemeRuntime(
    manifest,
    target.manifestPath,
    target.rootDir,
    runtimeFilePaths,
  )
  const stylesheetResult = loadThemeStylesheets(
    manifest,
    target.manifestPath,
    target.rootDir,
  )

  return {
    ...manifest.colorTokens,
    colorTokens: Object.fromEntries(
      colorTokens.map((token) => [
        token,
        manifest.colorTokens[token],
      ]),
    ) as Theme['colorTokens'],
    name: target.nameOverride ?? manifest.name,
    filePaths: uniquePaths([
      target.manifestPath,
      ...runtimeFilePaths,
      ...stylesheetResult.filePaths,
    ]),
    buttonFrame: runtime.buttonFrame,
    rootDir: target.rootDir,
    stylesheets: stylesheetResult.stylesheets,
    tailwindSafelist: manifest.tailwind?.safelist ?? [],
    typography: manifest.typography,
    ui: runtime.ui,
  }
}
