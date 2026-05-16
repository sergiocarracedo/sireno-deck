import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { ConfigValidationError } from "../core/schemas.js"

const loadThemeModule = async () => import("./theme.js")

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
  const originalCwd = process.cwd()
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "sireno-theme-"))
    mkdirSync(join(tempDir, "themes"), { recursive: true })
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("loads a built-in theme by name", async () => {
    writeFileSync(
      join(tempDir, "themes", "dark.yml"),
      [
        "name: dark",
        'background: "#10161f"',
        'foreground: "#eef2f7"',
        'primary: "#7dd3fc"',
        'accent: "#f59e0b"',
        'success: "#34d399"',
        'danger: "#fb7185"',
        ...typographyBlock,
      ].join("\n"),
    )

    const { resolveTheme } = await loadThemeModule()
    const theme = resolveTheme("dark")

    expect(theme.name).toBe("dark")
    expect(theme.foreground).toBe("#eef2f7")
    expect(theme.typography?.main_text.font_family).toBe("IBM Plex Sans")
  })

  it("loads a custom theme from a filesystem path", async () => {
    const customThemePath = join(tempDir, "custom-theme.yml")
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
        ...typographyBlock,
      ].join("\n"),
    )

    const { resolveTheme } = await loadThemeModule()
    const theme = resolveTheme("./custom-theme.yml")

    expect(theme.name).toBe("custom")
    expect(theme.accent).toBe("#14b8a6")
    expect(theme.typography?.monospace.font_family).toBe("IBM Plex Mono")
  })

  it("fails clearly when a theme reference does not exist", async () => {
    const { resolveTheme } = await loadThemeModule()

    expect(() => resolveTheme("missing")).toThrow(ConfigValidationError)
    expect(() => resolveTheme("missing")).toThrow("Theme 'missing' could not be resolved")
  })

  it("rejects themes without the required typography roles", async () => {
    const customThemePath = join(tempDir, "missing-typography.yml")
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

    expect(() => resolveTheme("./missing-typography.yml")).toThrow(ConfigValidationError)
    expect(() => resolveTheme("./missing-typography.yml")).toThrow("Required")
  })
})
