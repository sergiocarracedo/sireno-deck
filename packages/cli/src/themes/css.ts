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

export function projectThemeVariables(manifest: ThemeJsonManifest): string {
  const { colorTokens, typography } = manifest;

  const lines: string[] = [":root {"];

  for (const [token, value] of Object.entries(colorTokens)) {
    const cssToken = token.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    lines.push(`  --sireno-color-${cssToken}: ${value};`);
    lines.push(`  --color-${cssToken}: ${value};`);
  }

  for (const [roleName, role] of Object.entries(typography)) {
    lines.push(...formatTypographyRoleVariables(roleName, role));
  }

  lines.push("}");
  return lines.join("\n");
}

export function buildThemeCssBundle(
  manifest: ThemeJsonManifest,
  stylesheetContents: ReadonlyArray<string>,
): string {
  const variables = projectThemeVariables(manifest);
  const sheets = stylesheetContents.join("\n\n");
  return `${variables}\n\n${sheets}`;
}
