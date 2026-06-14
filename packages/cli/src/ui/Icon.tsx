import type { ReactElement } from 'react'

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
  size?: number
  tone?: IconTone
}

export type IconProps = IconCommonProps &
  (
    | { brand: BrandIconName; name?: never; src?: never }
    | { brand?: never; name: string; src?: never }
    | { brand?: never; name?: never; src: string }
  )

function renderLucide(
  props: IconCommonProps,
  LucideComponent: LucideIcon,
  source: 'brand' | 'generic',
): ReactElement {
  const size = props.size ?? 20

  return (
    <LucideComponent
      className={cn(
        'inline-block shrink-0',
        TONE_CLASS[props.tone ?? 'foreground'],
      )}
      data-sireno-icon-source={source}
      data-sireno-ui-icon="true"
      focusable="false"
      size={size}
      strokeWidth={1.8}
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

export type ResolvedIconSpec = { name: string } | { src: string } | undefined

export function resolveIconSpec(icon: string | undefined): ResolvedIconSpec {
  if (!icon) return undefined
  if (icon.startsWith('icon://')) {
    return { name: icon.slice('icon://'.length) }
  }
  return { src: icon }
}

export function iconConfigToProps(
  source: string,
  defaults?: { size?: number; tone?: IconTone },
): IconProps {
  if (source.startsWith('icon://')) {
    return { name: source.slice('icon://'.length), ...defaults }
  }
  return { src: source, ...defaults }
}

export function Icon(props: IconProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.icon) {
    return themeUi.icon(props)
  }

  if ('src' in props && props.src) {
    const size = props.size ?? 20

    return (
      <img
        className={cn('inline-block shrink-0')}
        data-sireno-icon-source="asset"
        data-sireno-ui-icon="true"
        src={resolveDomAssetSrc(props.src)}
        style={{
          height: `${size}px`,
          objectFit: 'contain',
          width: `${size}px`,
        }}
      />
    )
  }

  if ('brand' in props && props.brand) {
    return renderLucide(props, BRAND_ICON_REGISTRY[props.brand], 'brand')
  }

  if (!props.name) {
    console.error('Empty icon name')
    return <></>
  }

  return renderLucide(props, resolveLucideIcon(props.name), 'generic')
}
