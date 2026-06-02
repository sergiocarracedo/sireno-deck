import type { CSSProperties, ReactElement } from 'react'

import {
  CircleAlert,
  Clock3,
  Github,
  Play,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { resolveDomAssetSrc } from '../addon/api.js'
import { cn } from '../themes/utils/cn.js'
import { useThemeUiPresentation } from './theme-presentation.js'

const GENERIC_ICON_REGISTRY = {
  clock: Clock3,
  play: Play,
  sparkles: Sparkles,
  warning: CircleAlert,
} as const satisfies Record<string, LucideIcon>

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

export type GenericIconName = keyof typeof GENERIC_ICON_REGISTRY
export type BrandIconName = keyof typeof BRAND_ICON_REGISTRY
export type IconTone = keyof typeof TONE_CLASS

interface IconCommonProps {
  className?: string
  label?: string
  size?: number
  style?: CSSProperties
  tone?: IconTone
}

export type IconProps = IconCommonProps & (
  | { brand: BrandIconName; icon?: never; src?: never }
  | { brand?: never; icon: GenericIconName; src?: never }
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

export function Icon(props: IconProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if ('src' in props) {
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

  if ('brand' in props) {
    const element = renderLucide(props, BRAND_ICON_REGISTRY[props.brand], 'brand')

    return themeUi?.icon
      ? themeUi.icon({
          children: element,
          decorative: !props.label,
          source: 'brand',
          tone: props.tone,
        })
      : element
  }

  const element = renderLucide(props, GENERIC_ICON_REGISTRY[props.icon], 'generic')

  return themeUi?.icon
    ? themeUi.icon({
        children: element,
        decorative: !props.label,
        source: 'generic',
        tone: props.tone,
      })
    : element
}
