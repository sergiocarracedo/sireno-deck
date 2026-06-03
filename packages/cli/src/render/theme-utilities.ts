import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import type { Theme, ThemeTypographyRole } from '@/config/theme'

interface ThemeCssVariable {
  name: string
  value: string
}

const CSS_VAR_PREFIX = '--sireno'
const TAILWIND_BROWSER_STYLESHEET_PATH = fileURLToPath(
  new URL('../../tailwind.browser.generated.css', import.meta.url),
)

function toFontFamilyValue(fontFamily: string): string {
  return fontFamily.includes(',')
    ? fontFamily
    : `'${fontFamily.replace(/'/g, "\\'")}'`
}

function formatTypographyRoleVariables(
  roleName: string,
  role: ThemeTypographyRole,
): ThemeCssVariable[] {
  return [
    {
      name: `${CSS_VAR_PREFIX}-font-${roleName}-family`,
      value: toFontFamilyValue(role.font_family),
    },
    {
      name: `${CSS_VAR_PREFIX}-font-${roleName}-size`,
      value: `${role.fontSize}px`,
    },
    {
      name: `${CSS_VAR_PREFIX}-font-${roleName}-weight`,
      value: String(role.font_weight),
    },
    {
      name: `${CSS_VAR_PREFIX}-font-${roleName}-tracking`,
      value: `${role.letter_spacing ?? 0}px`,
    },
  ]
}

export function getThemeCssVariables(theme: Theme): ThemeCssVariable[] {
  const variables: ThemeCssVariable[] = [
    { name: `${CSS_VAR_PREFIX}-color-background`, value: theme.background },
    { name: `${CSS_VAR_PREFIX}-color-frame`, value: theme.frame },
    { name: `${CSS_VAR_PREFIX}-color-foreground`, value: theme.foreground },
    { name: `${CSS_VAR_PREFIX}-color-primary`, value: theme.primary },
    { name: `${CSS_VAR_PREFIX}-color-accent`, value: theme.accent },
    { name: `${CSS_VAR_PREFIX}-color-success`, value: theme.success },
    { name: `${CSS_VAR_PREFIX}-color-danger`, value: theme.danger },
    { name: '--color-background', value: theme.background },
    { name: '--color-frame', value: theme.frame },
    { name: '--color-foreground', value: theme.foreground },
    { name: '--color-primary', value: theme.primary },
    { name: '--color-accent', value: theme.accent },
    { name: '--color-success', value: theme.success },
    { name: '--color-danger', value: theme.danger },
  ]

  if (theme.typography) {
    variables.push(
      ...formatTypographyRoleVariables('main', theme.typography.main_text),
      ...formatTypographyRoleVariables('aux', theme.typography.auxiliary_text),
      ...formatTypographyRoleVariables('mono', theme.typography.monospace),
    )
  }

  return variables
}

export function renderThemeCssVariables(theme: Theme): string {
  return getThemeCssVariables(theme)
    .map((entry) => `${entry.name}:${entry.value};`)
    .join('')
}

export function getTailwindBrowserStylesheet(): string {
  try {
    return readFileSync(TAILWIND_BROWSER_STYLESHEET_PATH, 'utf8')
  } catch (error) {
    throw new Error(
      `Missing generated Tailwind browser stylesheet at ${TAILWIND_BROWSER_STYLESHEET_PATH}. Run \`pnpm --filter sireno-deck-cli run build:tailwind-browser\` before rendering browser decks.`,
      { cause: error },
    )
  }
}

export function getSirenoRuntimeStylesheet(): string {
  return [
    ':root{color-scheme:light dark;}',
    '#deck-root{color:var(--sireno-color-foreground);}',
    '.sireno-rich-text-break{display:block;height:0;}',
    '.sireno-rich-text-strong{font-weight:700;}',
    '.sireno-rich-text-blink{animation:sireno-rich-text-blink 1s steps(1,end) infinite;}',
    '.sireno-text-fit-shrink{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}',
    '@keyframes sireno-rich-text-blink{0%,49.999%{opacity:1;}50%,100%{opacity:0;}}',
  ].join('')
}

export function getThemeUtilityStylesheet(): string {
  return `${getTailwindBrowserStylesheet()}${getSirenoRuntimeStylesheet()}`
}
