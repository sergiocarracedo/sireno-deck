import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ConfigValidationError } from "../core/schemas.js"

const loadThemeModule = async () => import("./theme.js")
const phase25FixtureRoot = resolve(import.meta.dirname, "../../fixtures/phase-25")

const typographyBlock = [
  "typography:",
  "  main_text:",
  '    font_family: "IBM Plex Sans"',
  "    font_size: 12",
  "    font_weight: 700",
  "  auxiliary_text:",
  '    font_family: "IBM Plex Sans"',
  "    font_size: 8",
  "    font_weight: 600",
  "    letter_spacing: 1.2",
  "  monospace:",
  '    font_family: "IBM Plex Mono"',
  "    font_size: 10",
  "    font_weight: 700",
  "    letter_spacing: 0.4",
]

describe("resolveTheme", () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "sireno-theme-"))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("loads a built-in theme by name", async () => {
    const { resolveTheme } = await loadThemeModule()
    const theme = await resolveTheme("dark")
    const frame = theme.buttonFrame({ children: null, state: "idle" })

    expect(theme.name).toBe("dark")
    expect(theme.foreground).toBe("#eef2f7")
    expect(theme.typography?.main_text.font_family).toBe("IBM Plex Sans")
    expect(theme.buttonFrame).toBeTypeOf("function")
    expect(frame.props["data-sireno-button-frame"]).toBe("true")
    expect(theme.filePaths.some((filePath) => filePath.endsWith("themes/default/manifest.yml"))).toBe(true)
    expect(theme.filePaths).toEqual(expect.arrayContaining([
      expect.stringMatching(/themes\/default\/index\.ts$/),
      expect.stringMatching(/themes\/default\/ButtonFrame\.tsx$/),
    ]))
    expect(theme.stylesheets).toHaveLength(1)
    expect(theme.stylesheets[0]).toContain("@font-face")
    expect(theme.stylesheets[0]).toContain('font-family: "IBM Plex Sans"')
    expect(theme.stylesheets[0]).toContain('font-family: "IBM Plex Mono"')
    expect(theme.stylesheets[0]).toContain("file://")
  })

  it("loads a custom theme package from a filesystem path", async () => {
    const configDir = join(tempDir, "config")
    const customThemePath = join(configDir, "custom-theme")
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, "manifest.yml"),
      [
        "name: custom",
        'main: "./index.js"',
        'background: "#20252d"',
        'foreground: "#f5f7fa"',
        'primary: "#8b5cf6"',
        'accent: "#14b8a6"',
        'success: "#22c55e"',
        'danger: "#ef4444"',
        ...typographyBlock,
      ].join("\n"),
    )
    writeFileSync(
      join(customThemePath, "index.js"),
      [
        'export function buttonFrame(props) {',
        '  return props.children',
        '}',
        'export default { buttonFrame }',
      ].join("\n"),
    )

    const { resolveTheme } = await loadThemeModule()
    const theme = await resolveTheme("./custom-theme", { baseDirectory: configDir })

    expect(theme.name).toBe("custom")
    expect(theme.accent).toBe("#14b8a6")
    expect(theme.typography?.monospace.font_family).toBe("IBM Plex Mono")
    expect(theme.buttonFrame).toBeTypeOf("function")
    expect(theme.filePaths).toEqual(expect.arrayContaining([
      join(customThemePath, "manifest.yml"),
      join(customThemePath, "index.js"),
    ]))
    expect(theme.stylesheets).toEqual([])
  })

  it("reloads updated theme runtime exports instead of returning a cached buttonFrame", async () => {
    const configDir = join(tempDir, "config")
    const customThemePath = join(configDir, "custom-theme")
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, "manifest.yml"),
      [
        "name: custom",
        'main: "./index.js"',
        'background: "#20252d"',
        'foreground: "#f5f7fa"',
        'primary: "#8b5cf6"',
        'accent: "#14b8a6"',
        'success: "#22c55e"',
        'danger: "#ef4444"',
        ...typographyBlock,
      ].join("\n"),
    )
    writeFileSync(
      join(customThemePath, "index.js"),
      [
        'import { createElement } from "react"',
        'export function buttonFrame(props) {',
        '  return createElement("div", { "data-marker": "one" }, props.children)',
        '}',
        'export default { buttonFrame }',
      ].join("\n"),
    )

    const { resolveTheme } = await loadThemeModule()
    const firstTheme = await resolveTheme("./custom-theme", { baseDirectory: configDir })

    writeFileSync(
      join(customThemePath, "index.js"),
      [
        'import { createElement } from "react"',
        'export function buttonFrame(props) {',
        '  return createElement("div", { "data-marker": "two" }, props.children)',
        '}',
        'export default { buttonFrame }',
      ].join("\n"),
    )

    const secondTheme = await resolveTheme("./custom-theme", { baseDirectory: configDir })

    expect(firstTheme.buttonFrame({ children: null, state: "idle" }).props["data-marker"]).toBe("one")
    expect(secondTheme.buttonFrame({ children: null, state: "idle" }).props["data-marker"]).toBe("two")
    expect(secondTheme.filePaths).toEqual(expect.arrayContaining([
      join(customThemePath, "manifest.yml"),
      join(customThemePath, "index.js"),
    ]))
  })

  it("loads a committed custom .tsx theme fixture through the real resolver path", async () => {
    const { resolveTheme } = await loadThemeModule()
    const themeRoot = join(phase25FixtureRoot, "custom-tsx-theme")

    const theme = await resolveTheme(themeRoot)

    expect(theme.name).toBe("phase-25-custom")
    expect(theme.buttonFrame).toBeTypeOf("function")
    expect(theme.filePaths).toEqual(expect.arrayContaining([
      join(themeRoot, "manifest.yml"),
      join(themeRoot, "index.tsx"),
      join(themeRoot, "frame.tsx"),
    ]))
    expect(theme.buttonFrame({ children: null, state: "hold" }).props).toMatchObject({
      "data-frame-source": "phase-25-custom",
      "data-frame-state": "hold",
    })
  })

  it("fails clearly when a theme runtime import escapes the theme package root", async () => {
    const { resolveTheme } = await loadThemeModule()
    const themeRoot = join(phase25FixtureRoot, "out-of-root-theme")

    await expect(resolveTheme(themeRoot)).rejects.toThrow(ConfigValidationError)
    await expect(resolveTheme(themeRoot)).rejects.toThrow("runtime imports must stay inside the theme package root")
  })

  it("fails clearly when a theme reference does not exist", async () => {
    const { resolveTheme } = await loadThemeModule()

    await expect(resolveTheme("missing", { baseDirectory: tempDir })).rejects.toThrow(ConfigValidationError)
    await expect(resolveTheme("missing", { baseDirectory: tempDir })).rejects.toThrow("Theme 'missing' could not be resolved")
  })

  it("fails clearly when a theme package directory is missing manifest.yml", async () => {
    const { resolveTheme } = await loadThemeModule()
    const configDir = join(tempDir, "config")
    const customThemePath = join(configDir, "custom-theme")

    mkdirSync(customThemePath, { recursive: true })

    await expect(resolveTheme("./custom-theme", { baseDirectory: configDir })).rejects.toThrow("missing manifest.yml")
  })

  it("rejects themes without the required typography roles", async () => {
    const configDir = join(tempDir, "config")
    mkdirSync(configDir, { recursive: true })
    const customThemePath = join(configDir, "missing-typography.yml")
    writeFileSync(
      customThemePath,
      [
        "name: custom",
        'background: "#20252d"',
        'foreground: "#f5f7fa"',
        'primary: "#8b5cf6"',
        'accent: "#14b8a6"',
        'success: "#22c55e"',
        'danger: "#ef4444"',
      ].join("\n"),
    )

    const { resolveTheme } = await loadThemeModule()

    await expect(resolveTheme("./missing-typography.yml", { baseDirectory: configDir })).rejects.toThrow(ConfigValidationError)
    await expect(resolveTheme("./missing-typography.yml", { baseDirectory: configDir })).rejects.toThrow("Required")
  })

  it("fails clearly when a theme stylesheet references a missing relative asset", async () => {
    const configDir = join(tempDir, "config")
    const customThemePath = join(configDir, "broken-theme")
    mkdirSync(customThemePath, { recursive: true })
    writeFileSync(
      join(customThemePath, "manifest.yml"),
      [
        "name: broken",
        'main: "./index.js"',
        "assets:",
        '  styles: ["./theme.css"]',
        'background: "#20252d"',
        'foreground: "#f5f7fa"',
        'primary: "#8b5cf6"',
        'accent: "#14b8a6"',
        'success: "#22c55e"',
        'danger: "#ef4444"',
        ...typographyBlock,
      ].join("\n"),
    )
    writeFileSync(join(customThemePath, "index.js"), 'export const buttonFrame = (props) => props.children\nexport default { buttonFrame }')
    writeFileSync(join(customThemePath, "theme.css"), '@font-face { font-family: "Broken"; src: url("./missing.ttf"); }')

    const { resolveTheme } = await loadThemeModule()

    await expect(resolveTheme("./broken-theme", { baseDirectory: configDir })).rejects.toThrow("Theme CSS asset './missing.ttf' was not found")
  })

  it("rewrites file-backed theme asset urls for browser-served transports", async () => {
    const { rewriteThemeStylesheetAssetUrls } = await loadThemeModule()

    const rewrittenCss = rewriteThemeStylesheetAssetUrls(
      '@font-face { font-family: "IBM Plex Sans"; src: url("file:///tmp/fonts/plex.ttf"); }',
      (filePath) => `/__sireno/assets?path=${encodeURIComponent(filePath)}`,
    )

    expect(rewrittenCss).toContain('/__sireno/assets?path=%2Ftmp%2Ffonts%2Fplex.ttf')
    expect(rewrittenCss).not.toContain('file:///tmp/fonts/plex.ttf')
  })
})
