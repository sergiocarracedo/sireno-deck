import type { CSSProperties, ReactElement } from 'react'

import * as lucideIcons from 'lucide-react'
import { Github, type LucideIcon } from 'lucide-react'

import { resolveDomAssetSrc } from '@/addon/api'
import { cn } from '@/themes/utils/cn'
import { useThemeUiPresentation } from './theme-presentation'

const BRAND_ICON_REGISTRY = {
  github: Github,
} as const satisfies Record<string, LucideIcon>

const TONE_CLASS = {
  accent: 'text-accent',
  danger: 'text-danger',
  foreground: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
} as const

export type BrandIconName = keyof typeof BRAND_ICON_REGISTRY
export type GenericIconName = string
export type IconTone = keyof typeof TONE_CLASS

interface IconCommonProps {
  className?: string
  label?: string
  size?: number
  style?: CSSProperties
  tone?: IconTone
}

export type IconProps = IconCommonProps &
  (
    | { brand: BrandIconName; icon?: never; src?: never }
    | { brand?: never; icon: string; src?: never }
    | { brand?: never; icon?: never; src: string }
  )

function renderLucide(
  props: IconCommonProps,
  LucideComponent: LucideIcon,
  source: 'brand' | 'generic',
): ReactElement {
  const size = props.size ?? 20
  const decorative = !props.label

  return (
    <LucideComponent
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={props.label}
      className={cn(
        'inline-block shrink-0',
        TONE_CLASS[props.tone ?? 'foreground'],
        props.className,
      )}
      data-sireno-icon-source={source}
      data-sireno-ui-icon="true"
      focusable="false"
      role={decorative ? undefined : 'img'}
      size={size}
      strokeWidth={1.8}
      style={props.style}
    />
  )
}

const LUCIDE_ICON_EXPORTS = Object.fromEntries(
  Object.entries(lucideIcons).filter((entry): entry is [string, LucideIcon] => {
    const [exportName, value] = entry
    return (
      typeof value === 'object' &&
      exportName[0] === exportName[0]?.toUpperCase()
    )
  }),
) satisfies Record<string, LucideIcon>

function toLucideExportName(name: string): string {
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(
      (segment) => segment[0]!.toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join('')
}

function resolveLucideIcon(name: string): LucideIcon {
  const exportName = toLucideExportName(name)
  const icon = LUCIDE_ICON_EXPORTS[exportName]

  if (!icon) {
    throw new Error(`Unknown Lucide icon: ${name}`)
  }

  return icon
}

export function Icon(props: IconProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if ('src' in props && props.src) {
    const size = props.size ?? 20
    const decorative = !props.label

    const element = (
      <img
        alt={props.label ?? ''}
        aria-hidden={decorative ? 'true' : undefined}
        className={cn('inline-block shrink-0', props.className)}
        data-sireno-icon-source="asset"
        data-sireno-ui-icon="true"
        src={resolveDomAssetSrc(props.src)}
        style={{
          height: `${size}px`,
          objectFit: 'contain',
          width: `${size}px`,
          ...props.style,
        }}
      />
    )

    return themeUi?.icon
      ? themeUi.icon({
          children: element,
          decorative,
          source: 'asset',
          tone: props.tone,
        })
      : element
  }

  if ('brand' in props && props.brand) {
    const element = renderLucide(
      props,
      BRAND_ICON_REGISTRY[props.brand],
      'brand',
    )

    return themeUi?.icon
      ? themeUi.icon({
          children: element,
          decorative: !props.label,
          source: 'brand',
          tone: props.tone,
        })
      : element
  }

  const element = renderLucide(props, resolveLucideIcon(props.icon!), 'generic')

  return themeUi?.icon
    ? themeUi.icon({
        children: element,
        decorative: !props.label,
        source: 'generic',
        tone: props.tone,
      })
    : element
}
