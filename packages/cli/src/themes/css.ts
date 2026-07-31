import type { ThemeJsonManifest } from "./manifest"

function toFontFamilyValue(fontFamily: string): string {
  return fontFamily.includes(",")
    ? fontFamily
    : `'${fontFamily.replace(/'/g, "\\'")}'`
}

function formatRoleName(name: string): string {
  if (name === "main_text") return "main"
  if (name === "auxiliary_text") return "aux"
  if (name === "monospace") return "mono"
  return name
}

function formatTypographyRoleVariables(
  roleName: string,
  role: {
    fontFamily: string
    fontSize: number
    fontWeight: number
    letterSpacing?: number
  },
): string[] {
  const cssRoleName = formatRoleName(roleName)
  return [
    `  --sireno-font-${cssRoleName}-family: ${toFontFamilyValue(role.fontFamily)};`,
    `  --sireno-font-${cssRoleName}-size: ${role.fontSize}px;`,
    `  --sireno-font-${cssRoleName}-weight: ${role.fontWeight};`,
    `  --sireno-font-${cssRoleName}-tracking: ${role.letterSpacing ?? 0}px;`,
  ]
}

const FORMAT_BY_EXT: Record<string, string> = {
  ".woff2": "woff2",
  ".woff": "woff",
  ".ttf": "truetype",
  ".otf": "opentype",
}

/**
 * Derive the CSS `format()` token from the font src extension. Falls back to
 * truetype for unknown / extensionless paths so legacy manifests keep working.
 */
function fontFormatForSrc(src: string): string {
  const match = src.match(/\.[a-z0-9]+(?:\?.*)?$/i)
  if (match === null) return "truetype"
  return FORMAT_BY_EXT[match[0].toLowerCase()] ?? "truetype"
}

const MANIFEST_TO_CSS_TOKEN: Record<string, string> = {
  background: "bg",
  foreground: "fg",
  "foreground-contrast": "foreground-contrast",
  frame: "frame",
  primary: "primary",
  accent: "accent",
  success: "success",
  danger: "danger",
}

export function buildThemeCss(
  manifest: ThemeJsonManifest,
  stylesheetContents: ReadonlyArray<string>,
): string {
  const { colorTokens, typography, fonts } = manifest

  const parts: string[] = []

  // Tailwind @theme block — emitted last so the @theme block is the
  // final block the Tailwind v4 PostCSS plugin sees. Empirically the
  // vite plugin truncates a leading @theme block to only the first
  // few entries; emitting it after @font-face / :root makes the full
  // set of variables land in @layer theme and produce utilities like
  // bg-frame, text-accent, font-mono, etc.
  const themeLines = ["@theme {"]
  for (const [token, value] of Object.entries(colorTokens)) {
    const cssToken =
      MANIFEST_TO_CSS_TOKEN[token] ??
      token.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
    themeLines.push(`  --color-${cssToken}: ${value};`)
  }
  for (const [roleName, role] of Object.entries(typography)) {
    const cssRoleName = formatRoleName(roleName)
    themeLines.push(
      `  --font-${cssRoleName}: ${toFontFamilyValue(role.fontFamily)}, ui-sans-serif, system-ui, sans-serif;`,
    )
  }
  themeLines.push("}")

  // @font-face declarations
  if (fonts.length > 0) {
    const fontFaces = fonts.map((f) => {
      // Variable fonts — emit a single @font-face with from..to range when
      // the manifest declares axes. Otherwise preserve the single weight.
      const axes = f.axes
      const weightRange = axes?.weight
      const weight =
        weightRange !== undefined
          ? `${weightRange[0]} ${weightRange[1]}`
          : f.fontStyle === "italic"
            ? `${f.fontWeight} italic`
            : String(f.fontWeight)
      const format = fontFormatForSrc(f.src)
      return `@font-face {\n  font-family: '${f.fontFamily}';\n  font-style: ${f.fontStyle};\n  font-weight: ${weight};\n  src: url('${f.src}') format('${format}');\n}`
    })
    parts.push(fontFaces.join("\n\n"))
  }

  // :root CSS variables (runtime) — emit only the --sireno-color-* prefixed
  // runtime values. We deliberately avoid also setting the plain --color-*
  // names here, because Tailwind v4 will only keep a @theme variable in
  // @layer theme when it is the unique declaration of that name. If we
  // duplicate --color-frame in :root, Tailwind considers the @theme entry
  // redundant and silently drops it, leaving bg-frame / text-frame / etc.
  // utilities un-generated.
  const rootLines = [":root {"]
  for (const [token, value] of Object.entries(colorTokens)) {
    const cssToken =
      MANIFEST_TO_CSS_TOKEN[token] ??
      token.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
    rootLines.push(`  --sireno-color-${cssToken}: ${value};`)
  }
  for (const [roleName, role] of Object.entries(typography)) {
    rootLines.push(...formatTypographyRoleVariables(roleName, role))
  }
  // Variant tokens — every theme must declare the 5 required keys; themes
  // may add extras. ButtonFrame reads --sireno-variant-<name>-{bg,border,fg,glow}
  // directly, so addons and themes both go through one surface.
  for (const [variantName, styles] of Object.entries(manifest.variants)) {
    rootLines.push(
      `  --sireno-variant-${variantName}-bg: ${styles.background};`,
    )
    rootLines.push(
      `  --sireno-variant-${variantName}-border: ${styles.border};`,
    )
    rootLines.push(
      `  --sireno-variant-${variantName}-fg: ${styles.foreground};`,
    )
    rootLines.push(
      `  --sireno-variant-${variantName}-glow: ${styles.glow ?? "0 0 0 transparent"};`,
    )
  }
  // Effect tokens — glow / shadow / blur, optional. Themes without effects
  // still get sane defaults so component CSS never reads `undefined` for a
  // token.
  const effects = manifest.effects
  rootLines.push(
    `  --sireno-glow-sm: ${effects?.glow?.sm ?? "0 0 4px transparent"};`,
  )
  rootLines.push(
    `  --sireno-glow-md: ${effects?.glow?.md ?? "0 0 12px transparent"};`,
  )
  rootLines.push(
    `  --sireno-glow-lg: ${effects?.glow?.lg ?? "0 0 24px transparent"};`,
  )
  rootLines.push(
    `  --sireno-shadow-soft: ${effects?.shadow?.soft ?? "0 1px 2px transparent"};`,
  )
  rootLines.push(
    `  --sireno-shadow-hard: ${effects?.shadow?.hard ?? "0 4px 12px transparent"};`,
  )
  rootLines.push(`  --sireno-blur-sm: ${effects?.blur?.sm ?? "4px"};`)
  rootLines.push(`  --sireno-blur-md: ${effects?.blur?.md ?? "10px"};`)
  // Default pressed / holding glow hooks — every theme gets these for free
  // (Gaps 10). Themes can override in their own stylesheet under @layer.
  rootLines.push(`  --sireno-pressed-glow: var(--sireno-glow-md);`)
  rootLines.push(`  --sireno-held-glow: var(--sireno-glow-lg);`)
  rootLines.push("}")
  parts.push(rootLines.join("\n"))

  // Concatenated stylesheets — wrap in @layer so theme styles override
  // built-in styles predictably (Tailwind v4 layer order is fixed:
  // theme < base < components < utilities < user-overrides).
  if (stylesheetContents.length > 0) {
    parts.push(`@layer theme-override {\n${stylesheetContents.join("\n\n")}\n}`)
  }

  // @theme block emitted last — see comment above the @theme block.
  parts.push(themeLines.join("\n"))

  return parts.join("\n\n")
}
