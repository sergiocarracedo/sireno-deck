import { describe, expect, it } from "vitest"

import { buildThemeCss } from "../css"
import { ThemeJsonManifestSchema } from "../manifest"
import type { ThemeJsonManifest } from "../manifest"

const baseManifest: ThemeJsonManifest = ThemeJsonManifestSchema.parse({
  kind: "theme",
  apiVersion: 1,
  name: "test",
  colorTokens: {
    background: "#000",
    frame: "#fff",
    foreground: "#abc",
    "foreground-contrast": "#def",
    primary: "#0ff",
    accent: "#f0f",
    success: "#0f0",
    danger: "#f00",
  },
  typography: {
    main_text: { fontFamily: "A", fontSize: 12, fontWeight: 400 },
    auxiliary_text: { fontFamily: "A", fontSize: 8, fontWeight: 700 },
    monospace: { fontFamily: "M", fontSize: 10, fontWeight: 400 },
  },
  fonts: [],
  effects: {},
  variants: {
    default: { background: "#000", border: "#fff", foreground: "#abc" },
    highlighted: { background: "#00f26", border: "#00f8c", foreground: "#abc" },
    warning: { background: "#ff026", border: "#ff08c", foreground: "#abc" },
    success: { background: "#0f026", border: "#0f08c", foreground: "#abc" },
    error: { background: "#f0026", border: "#f0073", foreground: "#f00" },
  },
})

describe("themes/css", () => {
  it("emits effect tokens (glow/shadow/blur) on :root", () => {
    const css = buildThemeCss(baseManifest, [])
    expect(css).toContain("--sireno-glow-sm")
    expect(css).toContain("--sireno-glow-md")
    expect(css).toContain("--sireno-glow-lg")
    expect(css).toContain("--sireno-shadow-soft")
    expect(css).toContain("--sireno-shadow-hard")
    expect(css).toContain("--sireno-blur-sm")
    expect(css).toContain("--sireno-blur-md")
  })

  it("uses manifest values for effects when provided", () => {
    const custom: ThemeJsonManifest = {
      ...baseManifest,
      effects: {
        glow: {
          sm: "0 0 2px #f0f",
          md: "0 0 6px #f0f",
          lg: "0 0 12px #f0f",
        },
      },
    }
    const css = buildThemeCss(custom, [])
    expect(css).toContain("--sireno-glow-sm: 0 0 2px #f0f")
    expect(css).toContain("--sireno-glow-md: 0 0 6px #f0f")
    expect(css).toContain("--sireno-glow-lg: 0 0 12px #f0f")
  })

  it("derives format() from extension instead of forcing truetype", () => {
    const custom: ThemeJsonManifest = {
      ...baseManifest,
      fonts: [
        {
          fontFamily: "WOFF2",
          fontWeight: 400,
          fontStyle: "normal",
          src: "./assets/font.woff2",
        },
        {
          fontFamily: "TTF",
          fontWeight: 400,
          fontStyle: "normal",
          src: "./assets/font.ttf",
        },
        {
          fontFamily: "OTF",
          fontWeight: 400,
          fontStyle: "normal",
          src: "./assets/font.otf",
        },
      ],
    }
    const css = buildThemeCss(custom, [])
    expect(css).toContain("format('woff2')")
    expect(css).toContain("format('truetype')")
    expect(css).toContain("format('opentype')")
  })

  it("emits font-weight from..to range for variable fonts with axes", () => {
    const custom: ThemeJsonManifest = {
      ...baseManifest,
      fonts: [
        {
          fontFamily: "Variable",
          fontWeight: 400,
          fontStyle: "normal",
          src: "./assets/var.ttf",
          axes: { weight: [100, 900] },
        },
      ],
    }
    const css = buildThemeCss(custom, [])
    expect(css).toContain("font-weight: 100 900")
  })

  it("wraps stylesheets in @layer theme-override", () => {
    const css = buildThemeCss(baseManifest, [".tile { color: red; }"])
    expect(css).toContain("@layer theme-override")
    expect(css).toContain(".tile { color: red; }")
  })

  it("emits pressed/holding glow CSS vars on :root", () => {
    const css = buildThemeCss(baseManifest, [])
    expect(css).toContain("--sireno-pressed-glow")
    expect(css).toContain("--sireno-held-glow")
  })

  it.each(["cyan", "magenta", "amber", "lime"] as const)(
    "emits --sireno-variant-%s-* CSS vars for extra buttonColor variants",
    (name) => {
      const custom: ThemeJsonManifest = {
        ...baseManifest,
        variants: {
          ...baseManifest.variants,
          [name]: {
            background: `#${name}026`,
            border: `#${name}073`,
            foreground: `#${name}`,
          },
        },
      }
      const css = buildThemeCss(custom, [])
      expect(css).toContain(`--sireno-variant-${name}-bg:`)
      expect(css).toContain(`--sireno-variant-${name}-border:`)
      expect(css).toContain(`--sireno-variant-${name}-fg:`)
    },
  )

  it("emits --sireno-variant-*-muted for every variant when tokens block declares muted", () => {
    const custom: ThemeJsonManifest = {
      ...baseManifest,
      colorTokens: { ...baseManifest.colorTokens, muted: "#666" },
      variants: {
        ...baseManifest.variants,
        blue: {
          background: "#00f26",
          border: "#00f8c",
          foreground: "#abc",
          tokens: { primary: "#0ff", accent: "#f0f", muted: "#666" },
        },
      },
    }
    const css = buildThemeCss(custom, [])
    expect(css).toContain("--sireno-color-muted: #666;")
    expect(css).toContain("--sireno-variant-blue-muted: #666;")
  })

  it("falls back to theme-level muted when a variant omits the tokens block", () => {
    const custom: ThemeJsonManifest = {
      ...baseManifest,
      colorTokens: { ...baseManifest.colorTokens, muted: "#666" },
      variants: {
        ...baseManifest.variants,
        green: {
          background: "#0f026",
          border: "#0f08c",
          foreground: "#abc",
        },
      },
    }
    const css = buildThemeCss(custom, [])
    expect(css).toContain("--sireno-color-muted: #666;")
    expect(css).toContain("--sireno-variant-green-muted: #666;")
  })
})
