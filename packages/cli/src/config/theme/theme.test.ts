import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ConfigValidationError } from '@/core/schemas'

const loadThemeModule = async () => import('./theme')
const packageRoot = resolve(import.meta.dirname, '../..')
const phase25FixtureRoot = resolve(
  import.meta.dirname,
  '../../../fixtures/phase-25',
)
const phase39FixtureRoot = resolve(
  import.meta.dirname,
  '../../../fixtures/phase-39',
)

function listThemeRuntimeSnapshots(): string[] {
  return readdirSync(tmpdir()).filter((entry) =>
    entry.startsWith('.sireno-theme-runtime-'),
  )
}

const typographyBlock = [
  'typography:',
  '  main-text:',
  '    fontFamily: "IBM Plex Sans"',
  '    fontSize: 12',
  '    fontWeight: 700',
  '  auxiliary-text:',
  '    fontFamily: "IBM Plex Sans"',
  '    fontSize: 8',
  '    fontWeight: 600',
  '    letterSpacing: 1.2',
  '  monospace:',
  '    fontFamily: "IBM Plex Mono"',
  '    fontSize: 10',
  '    fontWeight: 700',
  '    letterSpacing: 0.4',
]

const colorTokensBlock = [
  'colorTokens:',
  '  background: "#20252d"',
  '  frame: "#111827"',
  '  foreground: "#f5f7fa"',
  '  foreground-contrast: "#1c1c1c"',
  '  primary: "#8b5cf6"',
  '  accent: "#14b8a6"',
  '  success: "#22c55e"',
  '  danger: "#ef4444"',
]

describe('resolveTheme', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'sireno-theme-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('loads a built-in theme by name', async () => {
    const { resolveTheme } = await loadThemeModule()
    const snapshotsBefore = listThemeRuntimeSnapshots()
    const theme = await resolveTheme('dark')
    const snapshotsAfter = listThemeRuntimeSnapshots()
    const frame = theme.buttonFrame({ children: null, state: 'idle' })
    const themedText = theme.ui?.text?.({
      align: 'center',
      children: createElement('span', { 'data-proof': 'text' }),
      fit: 'ellipsis',
      tone: 'primary',
      typography: 'main',
    })

    expect(theme.name).toBe('dark')
    expect(theme.foreground).toBe('#eef2f7')
    expect(theme.foregroundContrast).toBe('#1c1c1c')
    expect(theme.typography?.mainText.fontFamily).toBe('IBM Plex Sans')
    expect(theme.buttonFrame).toBeTypeOf('function')
    expect(frame.props['data-sireno-button-frame']).toBe('true')
    expect(
      theme.filePaths.some((filePath) =>
        filePath.endsWith('themes/default/manifest.yml'),
      ),
    ).toBe(true)
    expect(theme.filePaths).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/themes\/default\/index\.ts$/),
        expect.stringMatching(/themes\/default\/ButtonFrame\.tsx$/),
      ]),
    )
    expect(theme.stylesheets).toHaveLength(1)
    expect(theme.stylesheets[0]).toContain('@font-face')
    expect(theme.stylesheets[0]).toContain('font-family: "IBM Plex Sans"')
    expect(theme.stylesheets[0]).toContain('font-family: "IBM Plex Mono"')
    expect(theme.stylesheets[0]).toContain('file://')
    expect(snapshotsAfter).toEqual(snapshotsBefore)
    expect(theme.ui?.icon).toBeTypeOf('function')
    expect(theme.ui?.chip).toBeTypeOf('function')
    expect(theme.ui?.text).toBeTypeOf('function')
    expect(renderToStaticMarkup(themedText ?? createElement('span'))).toContain(
      'sireno-default-text',
    )
  })

  it('loads optional theme ui presentation overrides from a custom theme package', async () => {
    const configDir = join(tempDir, 'config')
    const customThemePath = join(configDir, 'custom-theme')
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, 'manifest.yml'),
      [
        'name: custom',
        'main: "./index.js"',
        ...colorTokensBlock,
        ...typographyBlock,
      ].join('\n'),
    )
    writeFileSync(
      join(customThemePath, 'index.js'),
      [
        'export function buttonFrame(props) {',
        '  return props.children',
        '}',
        'function withProp(node, key, value) {',
        '  return { ...node, props: { ...(node.props ?? {}), [key]: value } }',
        '}',
        'export const ui = {',
        '  chip(props) {',
        '    return withProp(props.children, "data-custom-chip", props.tone)',
        '  },',
        '  icon(props) {',
        '    return withProp(props.children, "data-custom-icon", props.source)',
        '  },',
        '  text(props) {',
        '    return withProp(props.children, "data-custom-text", props.fit)',
        '  },',
        '}',
        'export default { buttonFrame, ui }',
      ].join('\n'),
    )

    const { resolveTheme } = await loadThemeModule()
    const theme = await resolveTheme('./custom-theme', {
      baseDirectory: configDir,
    })

    expect(
      theme.ui?.chip?.({
        children: createElement('span', null, 'chip'),
        tone: 'accent',
      }).props['data-custom-chip'],
    ).toBe('accent')
    expect(
      theme.ui?.icon?.({
        children: createElement('span', null, 'icon'),
        decorative: true,
        source: 'brand',
      }).props['data-custom-icon'],
    ).toBe('brand')
    expect(
      theme.ui?.text?.({
        align: 'center',
        children: createElement('span', null, 'text'),
        fit: 'ellipsis',
        tone: 'foreground',
        typography: 'aux',
      }).props['data-custom-text'],
    ).toBe('ellipsis')
  })

  it('loads a custom theme package from a filesystem path', async () => {
    const configDir = join(tempDir, 'config')
    const customThemePath = join(configDir, 'custom-theme')
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, 'manifest.yml'),
      [
        'name: custom',
        'main: "./index.js"',
        ...colorTokensBlock,
        ...typographyBlock,
      ].join('\n'),
    )
    writeFileSync(
      join(customThemePath, 'index.js'),
      [
        'export function buttonFrame(props) {',
        '  return props.children',
        '}',
        'export default { buttonFrame }',
      ].join('\n'),
    )

    const { resolveTheme } = await loadThemeModule()
    const theme = await resolveTheme('./custom-theme', {
      baseDirectory: configDir,
    })

    expect(theme.name).toBe('custom')
    expect(theme.accent).toBe('#14b8a6')
    expect(theme.frame).toBe('#111827')
    expect(theme.typography?.monospace.fontFamily).toBe('IBM Plex Mono')
    expect(theme.buttonFrame).toBeTypeOf('function')
    expect(theme.filePaths).toEqual(
      expect.arrayContaining([
        join(customThemePath, 'manifest.yml'),
        join(customThemePath, 'index.js'),
      ]),
    )
    expect(theme.stylesheets).toEqual([])
  })

  it('reloads updated theme runtime exports instead of returning a cached buttonFrame', async () => {
    const configDir = join(tempDir, 'config')
    const customThemePath = join(configDir, 'custom-theme')
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, 'manifest.yml'),
      [
        'name: custom',
        'main: "./index.js"',
        ...colorTokensBlock,
        ...typographyBlock,
      ].join('\n'),
    )
    writeFileSync(
      join(customThemePath, 'index.js'),
      [
        'export function buttonFrame(props) {',
        '  return { props: { "data-marker": "one", children: props.children } }',
        '}',
        'export default { buttonFrame }',
      ].join('\n'),
    )

    const { resolveTheme } = await loadThemeModule()
    const firstTheme = await resolveTheme('./custom-theme', {
      baseDirectory: configDir,
    })

    writeFileSync(
      join(customThemePath, 'index.js'),
      [
        'export function buttonFrame(props) {',
        '  return { props: { "data-marker": "two", children: props.children } }',
        '}',
        'export default { buttonFrame }',
      ].join('\n'),
    )

    const secondTheme = await resolveTheme('./custom-theme', {
      baseDirectory: configDir,
    })

    expect(
      firstTheme.buttonFrame({ children: null, state: 'idle' }).props[
        'data-marker'
      ],
    ).toBe('one')
    expect(
      secondTheme.buttonFrame({ children: null, state: 'idle' }).props[
        'data-marker'
      ],
    ).toBe('two')
    expect(secondTheme.filePaths).toEqual(
      expect.arrayContaining([
        join(customThemePath, 'manifest.yml'),
        join(customThemePath, 'index.js'),
      ]),
    )
  })

  it('loads a committed custom .tsx theme fixture through the real resolver path', async () => {
    const { resolveTheme } = await loadThemeModule()
    const themeRoot = join(phase25FixtureRoot, 'custom-tsx-theme')

    const theme = await resolveTheme(themeRoot)

    expect(theme.name).toBe('phase-25-custom')
    expect(theme.buttonFrame).toBeTypeOf('function')
    expect(theme.filePaths).toEqual(
      expect.arrayContaining([
        join(themeRoot, 'manifest.yml'),
        join(themeRoot, 'index.tsx'),
        join(themeRoot, 'frame.tsx'),
      ]),
    )
    expect(theme.tailwindSafelist).toEqual(['rounded-[17px]', 'outline-2'])
    expect(
      theme.buttonFrame({ children: null, state: 'hold' }).props,
    ).toMatchObject({
      'data-frame-source': 'phase-25-custom',
      'data-frame-state': 'hold',
    })
  })

  it('reuses a stable cache path instead of temp snapshot churn', async () => {
    const { resolveTheme } = await loadThemeModule()
    const snapshotsBefore = listThemeRuntimeSnapshots()

    await resolveTheme('dark')
    await resolveTheme('dark')

    expect(listThemeRuntimeSnapshots()).toEqual(snapshotsBefore)
  })

  it('fails clearly when a theme runtime import escapes the theme package root', async () => {
    const { resolveTheme } = await loadThemeModule()
    const themeRoot = join(phase25FixtureRoot, 'out-of-root-theme')

    await expect(resolveTheme(themeRoot)).rejects.toThrow(ConfigValidationError)
    await expect(resolveTheme(themeRoot)).rejects.toThrow(
      'runtime imports must stay inside the theme package root or ../utils',
    )
  })

  it('allows theme runtime imports from sibling ../utils', async () => {
    const configDir = join(tempDir, 'config')
    const customThemePath = join(configDir, 'custom-theme')
    const siblingUtilsPath = join(configDir, 'utils')

    mkdirSync(customThemePath, { recursive: true })
    mkdirSync(siblingUtilsPath, { recursive: true })
    writeFileSync(
      join(customThemePath, 'manifest.yml'),
      [
        'name: custom',
        'main: "./index.js"',
        ...colorTokensBlock,
        ...typographyBlock,
      ].join('\n'),
    )
    writeFileSync(
      join(customThemePath, 'index.js'),
      'export { buttonFrame } from "../utils/frame.js"\n',
    )
    writeFileSync(
      join(siblingUtilsPath, 'frame.js'),
      [
        'export function buttonFrame(props) {',
        '  return props.children',
        '}',
      ].join('\n'),
    )

    const { resolveTheme } = await loadThemeModule()
    const theme = await resolveTheme('./custom-theme', {
      baseDirectory: configDir,
    })

    expect(theme.buttonFrame({ children: null, state: 'idle' })).toBeNull()
    expect(theme.frame).toBe('#111827')
    expect(theme.filePaths).toEqual(
      expect.arrayContaining([
        join(customThemePath, 'manifest.yml'),
        join(customThemePath, 'index.js'),
        join(siblingUtilsPath, 'frame.js'),
      ]),
    )
  })

  it('uses the frame token from a theme manifest', async () => {
    const configDir = join(tempDir, 'config')
    const customThemePath = join(configDir, 'custom-theme')
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, 'manifest.yml'),
      [
        'name: custom',
        'main: "./index.js"',
        ...colorTokensBlock,
        ...typographyBlock,
      ].join('\n'),
    )
    writeFileSync(
      join(customThemePath, 'index.js'),
      [
        'export function buttonFrame(props) {',
        '  return props.children',
        '}',
        'export default { buttonFrame }',
      ].join('\n'),
    )

    const { resolveTheme } = await loadThemeModule()
    const theme = await resolveTheme('./custom-theme', {
      baseDirectory: configDir,
    })

    expect(theme.frame).toBe('#111827')
  })

  it('fails clearly when a theme reference does not exist', async () => {
    const { resolveTheme } = await loadThemeModule()

    await expect(
      resolveTheme('missing', { baseDirectory: tempDir }),
    ).rejects.toThrow(ConfigValidationError)
    await expect(
      resolveTheme('missing', { baseDirectory: tempDir }),
    ).rejects.toThrow("Theme 'missing' could not be resolved")
  })

  it('fails clearly when a theme package directory is missing manifest.yml', async () => {
    const { resolveTheme } = await loadThemeModule()
    const configDir = join(tempDir, 'config')
    const customThemePath = join(configDir, 'custom-theme')

    mkdirSync(customThemePath, { recursive: true })

    await expect(
      resolveTheme('./custom-theme', { baseDirectory: configDir }),
    ).rejects.toThrow('missing manifest.yml')
  })

  it('rejects a theme package manifest without the required typography roles', async () => {
    const configDir = join(tempDir, 'config')
    mkdirSync(configDir, { recursive: true })
    const customThemePath = join(configDir, 'missing-typography')
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, 'manifest.yml'),
      ['name: custom', 'main: "./index.js"', ...colorTokensBlock].join('\n'),
    )

    const { resolveTheme } = await loadThemeModule()

    await expect(
      resolveTheme('./missing-typography', { baseDirectory: configDir }),
    ).rejects.toThrow(ConfigValidationError)
    await expect(
      resolveTheme('./missing-typography', { baseDirectory: configDir }),
    ).rejects.toThrow('Required')
  })

  it('fails clearly when a theme stylesheet references a missing relative asset', async () => {
    const configDir = join(tempDir, 'config')
    const customThemePath = join(configDir, 'broken-theme')
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, 'manifest.yml'),
      [
        'name: broken',
        'main: "./index.js"',
        'assets:',
        '  styles: ["./theme.css"]',
        ...colorTokensBlock,
        ...typographyBlock,
      ].join('\n'),
    )
    writeFileSync(
      join(customThemePath, 'index.js'),
      'export const buttonFrame = (props) => props.children\nexport default { buttonFrame }',
    )
    writeFileSync(
      join(customThemePath, 'theme.css'),
      '@font-face { font-family: "Broken"; src: url("./missing.ttf"); }',
    )

    const { resolveTheme } = await loadThemeModule()

    await expect(
      resolveTheme('./broken-theme', { baseDirectory: configDir }),
    ).rejects.toThrow("Theme CSS asset './missing.ttf' was not found")
  })

  it('rewrites file-backed theme asset urls for browser-served transports', async () => {
    const { rewriteThemeStylesheetAssetUrls } = await loadThemeModule()

    const rewrittenCss = rewriteThemeStylesheetAssetUrls(
      '@font-face { font-family: "IBM Plex Sans"; src: url("file:///tmp/fonts/plex.ttf"); }',
      (filePath) => `/__sireno/assets?path=${encodeURIComponent(filePath)}`,
    )

    expect(rewrittenCss).toContain(
      '/__sireno/assets?path=%2Ftmp%2Ffonts%2Fplex.ttf',
    )
    expect(rewrittenCss).not.toContain('file:///tmp/fonts/plex.ttf')
  })

  it('loads a theme-provided mediaPlayer.surface override and exposes it on the resolved theme', async () => {
    const { resolveTheme } = await loadThemeModule()
    const themeRoot = join(phase39FixtureRoot, 'theme-with-media-player-surface')

    const theme = await resolveTheme(themeRoot)

    expect(theme.name).toBe('phase-39-media-player-surface')
    expect(theme.mediaPlayerSurface).toBeTypeOf('function')
    expect(theme.filePaths).toEqual(
      expect.arrayContaining([
        join(themeRoot, 'manifest.yml'),
        join(themeRoot, 'index.ts'),
        join(themeRoot, 'surface.tsx'),
      ]),
    )
  })

  it('leaves mediaPlayerSurface undefined when the manifest does not declare one', async () => {
    const { resolveTheme } = await loadThemeModule()

    const theme = await resolveTheme('dark')

    expect(theme.mediaPlayerSurface).toBeUndefined()
  })

  it('hard-fails when a manifest declares a mediaPlayer.surface pointing at a missing file', async () => {
    const configDir = join(tempDir, 'config')
    const customThemePath = join(configDir, 'broken-surface-theme')
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, 'manifest.yml'),
      [
        'name: broken-surface',
        'main: "./index.js"',
        'mediaPlayer:',
        '  surface: "./missing-surface.tsx"',
        ...colorTokensBlock,
        ...typographyBlock,
      ].join('\n'),
    )
    writeFileSync(
      join(customThemePath, 'index.js'),
      'export const buttonFrame = (props) => props.children\nexport default { buttonFrame }',
    )

    const { resolveTheme } = await loadThemeModule()

    await expect(
      resolveTheme('./broken-surface-theme', { baseDirectory: configDir }),
    ).rejects.toThrow()
  })
})
