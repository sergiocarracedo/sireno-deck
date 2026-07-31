import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { AddonRegistry } from "@/addon/registry"
import type { LoadedTheme } from "@/addon/api"

import {
  loadThemeFromPath,
  registerBuiltInThemes,
  resolveActiveTheme,
} from "../loader"

const makeTheme = (name: string): LoadedTheme => ({
  name,
  apiVersion: 1,
  source: { kind: "local", resolvedPath: `/tmp/themes/${name}` },
  manifestPath: `/tmp/themes/${name}/sirenodeck.json`,
  uiOverridesPath: null,
  cssPath: "",
})

const writeFixtureTheme = (
  dir: string,
  options: {
    name: string
    description: string
    uiOverrides?: string
    styles?: string
  },
): void => {
  mkdirSync(join(dir, "components"), { recursive: true })
  writeFileSync(
    join(dir, "sirenodeck.json"),
    JSON.stringify({
      kind: "theme",
      apiVersion: 1,
      name: options.name,
      description: options.description,
      colorTokens: {
        background: "#000",
        frame: "#fff",
        foreground: "#fff",
        "foreground-contrast": "#000",
        primary: "#0ff",
        accent: "#f0f",
        success: "#0f0",
        danger: "#f00",
        tintBlue: "#00f",
        tintGreen: "#0f0",
        tintPurple: "#a0a",
      },
      typography: {
        main_text: { fontFamily: "A", fontSize: 12, fontWeight: 400 },
        auxiliary_text: { fontFamily: "A", fontSize: 8, fontWeight: 700 },
        monospace: { fontFamily: "M", fontSize: 10, fontWeight: 400 },
      },
      fonts: [],
      assets: { styles: options.styles ? [options.styles] : [] },
      ...(options.uiOverrides ? { "ui-overrides": options.uiOverrides } : {}),
    }),
    "utf8",
  )
}

describe("themes/loader", () => {
  it("registerBuiltInThemes registers the default and light themes", () => {
    const registry = new AddonRegistry()
    registerBuiltInThemes(registry)
    for (const name of ["default", "light"]) {
      const theme = registry.getTheme(name)
      expect(theme, `theme ${name} should be registered`).toBeDefined()
      expect(theme?.apiVersion).toBe(1)
      expect(theme?.source.kind).toBe("builtin")
    }
  })

  it("neon-grids is no longer auto-discovered (lives outside packages/cli/src/themes)", () => {
    const registry = new AddonRegistry()
    registerBuiltInThemes(registry)
    expect(registry.getTheme("neon-grids")).toBeUndefined()
  })

  it("loadThemeFromPath reads a 3rd-party theme from disk and registers it", () => {
    const dir = mkdtempSync(join(tmpdir(), "theme-fixture-"))
    writeFixtureTheme(dir, {
      name: "fixture-theme",
      description: "Test fixture",
      uiOverrides: "./components",
      styles: "./components.css",
    })
    writeFileSync(join(dir, "components.css"), ".tile { color: red; }", "utf8")
    writeFileSync(
      join(dir, "components", "index.ts"),
      "export const components = {};",
      "utf8",
    )

    const registry = new AddonRegistry()
    const { theme } = loadThemeFromPath(registry, dir, "fixture-alias")

    expect(theme.name).toBe("fixture-theme")
    expect(registry.getTheme("fixture-theme")).toBeDefined()
    expect(registry.getTheme("fixture-alias")).toBeDefined()
    expect(theme.uiOverridesPath).toContain("components")
  })

  it("resolveActiveTheme returns the default theme when name is undefined", () => {
    const registry = new AddonRegistry()
    registerBuiltInThemes(registry)
    const { theme } = resolveActiveTheme(registry, { theme: undefined })
    expect(theme.name).toBe("default")
  })

  it("resolveActiveTheme returns the requested theme when present", () => {
    const registry = new AddonRegistry()
    registry.loadTheme(makeTheme("custom"))
    const { theme } = resolveActiveTheme(registry, { theme: "custom" })
    expect(theme.name).toBe("custom")
  })

  it("resolveActiveTheme throws with available themes when name is missing", () => {
    const registry = new AddonRegistry()
    registerBuiltInThemes(registry)
    expect(() => resolveActiveTheme(registry, { theme: "missing" })).toThrow(
      /Theme 'missing' is not registered/,
    )
    expect(() => resolveActiveTheme(registry, { theme: "missing" })).toThrow(
      /default/,
    )
  })

  it("listThemes returns registered themes", () => {
    const registry = new AddonRegistry()
    registerBuiltInThemes(registry)
    registry.loadTheme(makeTheme("custom"))
    expect(
      registry
        .listThemes()
        .map((t) => t.name)
        .sort(),
    ).toEqual(["custom", "default", "light"])
  })
})
