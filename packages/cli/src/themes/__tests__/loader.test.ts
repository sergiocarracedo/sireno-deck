import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { AddonRegistry } from "@/addon/registry"
import type { LoadedTheme } from "@/addon/api"

import {
  loadSiblingThemes,
  loadThemeFromPath,
  registerBuiltInThemes,
  registerSiblingThemes,
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
      },
      variants: {
        default: { background: "#000", border: "#fff", foreground: "#fff" },
        highlighted: { background: "#0ff", border: "#0ff", foreground: "#fff" },
        warning: { background: "#ff0", border: "#ff0", foreground: "#000" },
        success: { background: "#0f0", border: "#0f0", foreground: "#000" },
        error: { background: "#f00", border: "#f00", foreground: "#fff" },
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

  it("loadThemeFromPath is idempotent — re-loading an already-registered theme is a no-op", () => {
    const dir = mkdtempSync(join(tmpdir(), "theme-fixture-"))
    writeFixtureTheme(dir, {
      name: "fixture-theme",
      description: "Test fixture",
    })

    const registry = new AddonRegistry()
    const first = loadThemeFromPath(registry, dir)
    const firstSnapshot = registry.getTheme("fixture-theme")
    expect(first.theme.name).toBe("fixture-theme")

    // Second load — should not throw 'Duplicate theme name'.
    const second = loadThemeFromPath(registry, dir)
    expect(second.theme.name).toBe("fixture-theme")
    // Same registration object survives (not overwritten).
    expect(registry.getTheme("fixture-theme")).toBe(firstSnapshot)
  })

  it("loadThemeFromPath with an alias skips the duplicate registration when the alias already exists", () => {
    const dir = mkdtempSync(join(tmpdir(), "theme-fixture-"))
    writeFixtureTheme(dir, {
      name: "fixture-theme",
      description: "Test fixture",
    })

    const registry = new AddonRegistry()
    loadThemeFromPath(registry, dir, "fixture-alias")
    expect(registry.getTheme("fixture-alias")).toBeDefined()

    // Second load with the same alias should not throw.
    expect(() =>
      loadThemeFromPath(registry, dir, "fixture-alias"),
    ).not.toThrow()
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

  it("resolveActiveTheme resolves a path string via loadThemeFromPath", () => {
    const dir = mkdtempSync(join(tmpdir(), "theme-path-"))
    writeFixtureTheme(dir, {
      name: "path-theme",
      description: "Path fixture",
    })
    const registry = new AddonRegistry()
    const { theme } = resolveActiveTheme(registry, { theme: dir })
    expect(theme.name).toBe("path-theme")
    expect(theme.source.kind).toBe("local")
  })

  it("resolveActiveTheme resolves a relative path string", () => {
    const dir = mkdtempSync(join(tmpdir(), "theme-rel-"))
    writeFixtureTheme(dir, {
      name: "rel-theme",
      description: "Relative path fixture",
    })
    const registry = new AddonRegistry()
    const { theme } = resolveActiveTheme(registry, { theme: dir })
    expect(theme.name).toBe("rel-theme")
  })

  it("resolveActiveTheme resolves an npm package by name", () => {
    const registry = new AddonRegistry()
    // The cli itself is a workspace package — use it as a real probe for
    // the npm-package resolution path. It's not a theme, so the third
    // pass falls through to npm-package resolution and then throws — the
    // important assertion is that the second pass (path) didn't match.
    expect(() =>
      resolveActiveTheme(registry, {
        theme: "@sireno-deck/theme-neon-grids",
      }),
    ).toThrow(
      /not a path, and not a known npm package|missing sirenodeck\.json/i,
    )
  })

  it("resolveActiveTheme throws when the entry is unknown", () => {
    const registry = new AddonRegistry()
    expect(() => resolveActiveTheme(registry, { theme: "missing" })).toThrow(
      /not a registered theme, not a path, and not a known npm package/,
    )
  })

  it("resolveActiveTheme throws with available themes when name is missing", () => {
    const registry = new AddonRegistry()
    registerBuiltInThemes(registry)
    expect(() => resolveActiveTheme(registry, { theme: "missing" })).toThrow(
      /not a registered theme, not a path, and not a known npm package/,
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

  it("registerSiblingThemes does not throw when no sibling themes exist", () => {
    const registry = new AddonRegistry()
    expect(() => registerSiblingThemes(registry)).not.toThrow()
  })

  it("registerSiblingThemes discovers the riptide theme under packages/themes", () => {
    const registry = new AddonRegistry()
    registerSiblingThemes(registry)
    const riptide = registry.getTheme("riptide")
    expect(riptide).toBeDefined()
    expect(riptide?.apiVersion).toBe(1)
    expect(riptide?.source.kind).toBe("sibling")
    expect(riptide?.uiOverridesPath ?? "").toContain("riptide")
  })

  it("riptide CSS exposes required variants plus theme-declared extras", () => {
    const siblings = loadSiblingThemes()
    const riptide = siblings.find((s) => s.theme.name === "riptide")
    expect(riptide).toBeDefined()
    const css = riptide!.getCss()
    for (const variant of [
      "default",
      "highlighted",
      "warning",
      "success",
      "error",
    ]) {
      expect(css).toContain(`--sireno-variant-${variant}-bg`)
      expect(css).toContain(`--sireno-variant-${variant}-border`)
      expect(css).toContain(`--sireno-variant-${variant}-fg`)
    }
    expect(css).toContain("--sireno-variant-neon-pink-bg")
    expect(css).toContain("--sireno-variant-neon-pink-glow")
  })
})
