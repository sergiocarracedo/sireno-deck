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

  // Tailwind @theme block
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
  parts.push(themeLines.join("\n"));

  // :root CSS variables (runtime)
  const rootLines = [":root {"];
  for (const [token, value] of Object.entries(colorTokens)) {
    const cssToken = MANIFEST_TO_CSS_TOKEN[token] ?? token.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    rootLines.push(`  --sireno-color-${cssToken}: ${value};`);
    rootLines.push(`  --color-${cssToken}: ${value};`);
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

  return parts.join("\n\n");
}
