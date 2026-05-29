import type { Theme, ThemeTypographyRole } from '../config/theme.js'

interface ThemeCssVariable {
  name: string
  value: string
}

const CSS_VAR_PREFIX = '--sireno'
const TEXT_SIZE_MULTIPLIERS = {
  '2xl': '1.5',
  lg: '1.125',
  md: '1',
  sm: '0.875',
  xl: '1.25',
  xs: '0.75',
} as const

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
      value: `${role.font_size}px`,
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

export function getThemeUtilityStylesheet(): string {
  return [
    ':root{color-scheme:light dark;}',
    '#deck-root{color:var(--sireno-color-foreground);}',
    '.contents{display:contents;}',
    '.absolute{position:absolute;}',
    '.relative{position:relative;}',
    '.block{display:block;}',
    '.inline-block{display:inline-block;}',
    '.inline-flex{display:inline-flex;}',
    '.inset-0{inset:0;}',
    '.pointer-events-none{pointer-events:none;}',
    '.flex{display:flex;}',
    '.grid{display:grid;}',
    '.flex-col{flex-direction:column;}',
    '.items-start{align-items:flex-start;}',
    '.items-center{align-items:center;}',
    '.items-stretch{align-items:stretch;}',
    '.justify-center{justify-content:center;}',
    '.overflow-hidden{overflow:hidden;}',
    '.isolate{isolation:isolate;}',
    '.gap-1{gap:4px;}',
    '.gap-1.5{gap:6px;}',
    '.min-w-0{min-width:0;}',
    '.max-w-full{max-width:100%;}',
    '.w-full{width:100%;}',
    '.h-full{height:100%;}',
    '.shrink-0{flex-shrink:0;}',
    '.border{border-style:solid;border-width:1px;}',
    '.rounded-full{border-radius:9999px;}',
    '.rounded-lg{border-radius:12px;}',
    '.rounded-xl{border-radius:16px;}',
    '.p-1{padding:4px;}',
    '.p-2{padding:8px;}',
    '.px-2{padding-left:8px;padding-right:8px;}',
    '.py-0\\.5{padding-top:2px;padding-bottom:2px;}',
    '.uppercase{text-transform:uppercase;}',
    '.tracking-wide{letter-spacing:0.08em;}',
    '.text-left{text-align:left;}',
    '.text-balance{text-wrap:balance;}',
    '.text-center{text-align:center;}',
    '.text-right{text-align:right;}',
    '.leading-tight{line-height:1.2;}',
    '.whitespace-normal{white-space:normal;}',
    '.whitespace-nowrap{white-space:nowrap;}',
    '.break-words{overflow-wrap:break-word;word-break:break-word;}',
    '.text-ellipsis{text-overflow:ellipsis;}',
    '.text-background{color:var(--sireno-color-background);}',
    '.text-foreground{color:var(--sireno-color-foreground);}',
    '.text-primary{color:var(--sireno-color-primary);}',
    '.text-accent{color:var(--sireno-color-accent);}',
    '.text-success{color:var(--sireno-color-success);}',
    '.text-danger{color:var(--sireno-color-danger);}',
    '.bg-background{background:var(--sireno-color-background);}',
    '.bg-foreground{background:var(--sireno-color-foreground);}',
    '.bg-primary{background:var(--sireno-color-primary);}',
    '.bg-accent{background:var(--sireno-color-accent);}',
    '.border-background{border-color:var(--sireno-color-background);}',
    '.border-foreground{border-color:var(--sireno-color-foreground);}',
    '.border-primary{border-color:var(--sireno-color-primary);}',
    '.border-accent{border-color:var(--sireno-color-accent);}',
    '.border-frame{border-color:var(--sireno-color-frame);}',
    '.fill-primary{fill:var(--sireno-color-primary);}',
    '.fill-foreground{fill:var(--sireno-color-foreground);}',
    '.stroke-accent{stroke:var(--sireno-color-accent);}',
    '.stroke-primary{stroke:var(--sireno-color-primary);}',
    '.font-main{--sireno-active-font-size:var(--sireno-font-main-size);font-family:var(--sireno-font-main-family);font-weight:var(--sireno-font-main-weight);letter-spacing:var(--sireno-font-main-tracking);}',
    '.font-aux{--sireno-active-font-size:var(--sireno-font-aux-size);font-family:var(--sireno-font-aux-family);font-weight:var(--sireno-font-aux-weight);letter-spacing:var(--sireno-font-aux-tracking);}',
    '.font-mono{--sireno-active-font-size:var(--sireno-font-mono-size);font-family:var(--sireno-font-mono-family);font-weight:var(--sireno-font-mono-weight);letter-spacing:var(--sireno-font-mono-tracking);}',
    `.text-xs{font-size:calc(var(--sireno-active-font-size, 16px) * ${TEXT_SIZE_MULTIPLIERS.xs});}`,
    `.text-sm{font-size:calc(var(--sireno-active-font-size, 16px) * ${TEXT_SIZE_MULTIPLIERS.sm});}`,
    `.text-md{font-size:calc(var(--sireno-active-font-size, 16px) * ${TEXT_SIZE_MULTIPLIERS.md});}`,
    `.text-lg{font-size:calc(var(--sireno-active-font-size, 16px) * ${TEXT_SIZE_MULTIPLIERS.lg});}`,
    `.text-xl{font-size:calc(var(--sireno-active-font-size, 16px) * ${TEXT_SIZE_MULTIPLIERS.xl});}`,
    `.text-2xl{font-size:calc(var(--sireno-active-font-size, 16px) * ${TEXT_SIZE_MULTIPLIERS['2xl']});}`,
    '.sireno-rich-text-node{display:inline;}',
    '.sireno-rich-text-break{display:block;height:0;}',
    '.sireno-rich-text-strong{font-weight:700;}',
    '.sireno-rich-text-blink{animation:sireno-rich-text-blink 1s steps(1,end) infinite;}',
    '.sireno-text-fit-shrink{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}',
    '.sireno-text-fit-marquee{position:relative;}',
    '.sireno-marquee-track{display:inline-block;min-width:max-content;padding-inline-end:100%;animation:sireno-marquee-scroll 8s linear infinite;}',
    '@keyframes sireno-rich-text-blink{0%,49.999%{opacity:1;}50%,100%{opacity:0;}}',
    '@keyframes sireno-marquee-scroll{0%{transform:translateX(0%);}100%{transform:translateX(-50%);}}',
  ].join('')
}
