import type { ThemeJsonManifest } from "./manifest";

function toFontFamilyValue(fontFamily: string): string {
  return fontFamily.includes(",")
    ? fontFamily
    : `'${fontFamily.replace(/'/g, "\\'")}'`;
}

function formatRoleName(name: string): string {
  if (name === "main_text") return "main";
  if (name === "auxiliary_text") return "aux";
  if (name === "monospace") return "mono";
  return name;
}

function formatTypographyRoleVariables(
  roleName: string,
  role: { fontFamily: string; fontSize: number; fontWeight: number; letterSpacing?: number },
): string[] {
  const cssRoleName = formatRoleName(roleName);
  return [
    `  --sireno-font-${cssRoleName}-family: ${toFontFamilyValue(role.fontFamily)};`,
    `  --sireno-font-${cssRoleName}-size: ${role.fontSize}px;`,
    `  --sireno-font-${cssRoleName}-weight: ${role.fontWeight};`,
    `  --sireno-font-${cssRoleName}-tracking: ${role.letterSpacing ?? 0}px;`,
  ];
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
};

export function buildThemeCss(
  manifest: ThemeJsonManifest,
  stylesheetContents: ReadonlyArray<string>,
): string {
  const { colorTokens, typography, fonts } = manifest;

  const parts: string[] = [];

  // Tailwind @theme block — emitted last so the @theme block is the
  // final block the Tailwind v4 PostCSS plugin sees. Empirically the
  // vite plugin truncates a leading @theme block to only the first
  // few entries; emitting it after @font-face / :root makes the full
  // set of variables land in @layer theme and produce utilities like
  // bg-frame, text-accent, font-mono, etc.
  const themeLines = ["@theme {"];
  for (const [token, value] of Object.entries(colorTokens)) {
    const cssToken = MANIFEST_TO_CSS_TOKEN[token] ?? token.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    themeLines.push(`  --color-${cssToken}: ${value};`);
  }
  for (const [roleName, role] of Object.entries(typography)) {
    const cssRoleName = formatRoleName(roleName);
    themeLines.push(`  --font-${cssRoleName}: ${toFontFamilyValue(role.fontFamily)}, ui-sans-serif, system-ui, sans-serif;`);
  }
  themeLines.push("}");

  // @font-face declarations
  if (fonts.length > 0) {
    const fontFaces = fonts.map((f) => {
      const weight =
        f.fontStyle === "italic"
          ? `${f.fontWeight} italic`
          : String(f.fontWeight);
      return `@font-face {\n  font-family: '${f.fontFamily}';\n  font-style: ${f.fontStyle};\n  font-weight: ${weight};\n  src: url('${f.src}') format('truetype');\n}`;
    });
    parts.push(fontFaces.join("\n\n"));
  }

  // :root CSS variables (runtime) — emit only the --sireno-color-* prefixed
  // runtime values. We deliberately avoid also setting the plain --color-*
  // names here, because Tailwind v4 will only keep a @theme variable in
  // @layer theme when it is the unique declaration of that name. If we
  // duplicate --color-frame in :root, Tailwind considers the @theme entry
  // redundant and silently drops it, leaving bg-frame / text-frame / etc.
  // utilities un-generated.
  const rootLines = [":root {"];
  for (const [token, value] of Object.entries(colorTokens)) {
    const cssToken = MANIFEST_TO_CSS_TOKEN[token] ?? token.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    rootLines.push(`  --sireno-color-${cssToken}: ${value};`);
  }
  for (const [roleName, role] of Object.entries(typography)) {
    rootLines.push(...formatTypographyRoleVariables(roleName, role));
  }
  rootLines.push("}");
  parts.push(rootLines.join("\n"));

  // Concatenated stylesheets
  if (stylesheetContents.length > 0) {
    parts.push(stylesheetContents.join("\n\n"));
  }

  // @theme block emitted last — see comment above the @theme block.
  parts.push(themeLines.join("\n"));

  return parts.join("\n\n");
}
