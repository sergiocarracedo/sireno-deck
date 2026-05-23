import type { Theme, ThemeTypographyRole } from "../config/theme.js"

interface ThemeCssVariable {
  name: string
  value: string
}

const CSS_VAR_PREFIX = "--sireno"

function toFontFamilyValue(fontFamily: string): string {
  return fontFamily.includes(",") ? fontFamily : `'${fontFamily.replace(/'/g, "\\'")}'`
}

function formatTypographyRoleVariables(roleName: string, role: ThemeTypographyRole): ThemeCssVariable[] {
  return [
    { name: `${CSS_VAR_PREFIX}-font-${roleName}-family`, value: toFontFamilyValue(role.font_family) },
    { name: `${CSS_VAR_PREFIX}-font-${roleName}-size`, value: `${role.font_size}px` },
    { name: `${CSS_VAR_PREFIX}-font-${roleName}-weight`, value: String(role.font_weight) },
    { name: `${CSS_VAR_PREFIX}-font-${roleName}-tracking`, value: `${role.letter_spacing ?? 0}px` },
  ]
}

export function getThemeCssVariables(theme: Theme): ThemeCssVariable[] {
  const variables: ThemeCssVariable[] = [
    { name: `${CSS_VAR_PREFIX}-color-background`, value: theme.background },
    { name: `${CSS_VAR_PREFIX}-color-foreground`, value: theme.foreground },
    { name: `${CSS_VAR_PREFIX}-color-primary`, value: theme.primary },
    { name: `${CSS_VAR_PREFIX}-color-accent`, value: theme.accent },
    { name: `${CSS_VAR_PREFIX}-color-success`, value: theme.success },
    { name: `${CSS_VAR_PREFIX}-color-danger`, value: theme.danger },
  ]

  if (theme.typography) {
    variables.push(
      ...formatTypographyRoleVariables("main", theme.typography.main_text),
      ...formatTypographyRoleVariables("aux", theme.typography.auxiliary_text),
      ...formatTypographyRoleVariables("mono", theme.typography.monospace),
    )
  }

  return variables
}

export function renderThemeCssVariables(theme: Theme): string {
  return getThemeCssVariables(theme)
    .map((entry) => `${entry.name}:${entry.value};`)
    .join("")
}

export function getThemeUtilityStylesheet(): string {
  return [
    ":root{color-scheme:light dark;}",
    "#deck-root{color:var(--sireno-color-foreground);}",
    ".text-background{color:var(--sireno-color-background);}",
    ".text-foreground{color:var(--sireno-color-foreground);}",
    ".text-primary{color:var(--sireno-color-primary);}",
    ".text-accent{color:var(--sireno-color-accent);}",
    ".text-success{color:var(--sireno-color-success);}",
    ".text-danger{color:var(--sireno-color-danger);}",
    ".bg-background{background:var(--sireno-color-background);}",
    ".bg-foreground{background:var(--sireno-color-foreground);}",
    ".bg-primary{background:var(--sireno-color-primary);}",
    ".bg-accent{background:var(--sireno-color-accent);}",
    ".border-background{border-color:var(--sireno-color-background);}",
    ".border-foreground{border-color:var(--sireno-color-foreground);}",
    ".border-primary{border-color:var(--sireno-color-primary);}",
    ".border-accent{border-color:var(--sireno-color-accent);}",
    ".fill-primary{fill:var(--sireno-color-primary);}",
    ".fill-foreground{fill:var(--sireno-color-foreground);}",
    ".stroke-accent{stroke:var(--sireno-color-accent);}",
    ".stroke-primary{stroke:var(--sireno-color-primary);}",
    ".font-main{font-family:var(--sireno-font-main-family);font-size:var(--sireno-font-main-size);font-weight:var(--sireno-font-main-weight);letter-spacing:var(--sireno-font-main-tracking);}",
    ".font-aux{font-family:var(--sireno-font-aux-family);font-size:var(--sireno-font-aux-size);font-weight:var(--sireno-font-aux-weight);letter-spacing:var(--sireno-font-aux-tracking);}",
    ".font-mono{font-family:var(--sireno-font-mono-family);font-size:var(--sireno-font-mono-size);font-weight:var(--sireno-font-mono-weight);letter-spacing:var(--sireno-font-mono-tracking);}",
  ].join("")
}
