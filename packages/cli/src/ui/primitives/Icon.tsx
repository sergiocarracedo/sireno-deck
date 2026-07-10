import type { ReactElement } from 'react'

import * as lucideIcons from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

import { useAssetCache } from '../contexts/AssetCacheContext'
import { useThemeUiPresentation } from '../theme-presentation'
import { cn } from '../utils/cn'

const TONE_CLASS = {
  accent: 'text-accent',
  danger: 'text-danger',
  foreground: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  background: 'text-background',
  'foreground-contrast': 'text-foreground-contrast',
} as const

export type IconTone = keyof typeof TONE_CLASS

export interface IconProps {
  readonly source?: string
  readonly size?: number
  readonly tone?: IconTone
  readonly fill?: boolean
}

export type IconSpec =
  | { kind: 'generic'; name: string }
  | { kind: 'asset'; id: string }
  | undefined

export function resolveIconSpec(source: string | undefined): IconSpec {
  if (source === undefined || source === '') return undefined
  if (source.startsWith('icon://')) {
    return { kind: 'generic', name: source.slice('icon://'.length) }
  }
  if (source.startsWith('asset://')) {
    return { kind: 'asset', id: source.slice('asset://'.length) }
  }
  throw new Error(
    `Icon: unknown source "${source}" (expected icon://<name> or asset://<id>)`,
  )
}

function renderLucide(
  props: { size?: number; tone?: IconTone; fill?: boolean },
  LucideComponent: LucideIcon,
): ReactElement {
  const size = props.size ?? 20
  return (
    <LucideComponent
      className={cn([
        'inline-block shrink-0',
        TONE_CLASS[props.tone ?? 'foreground'],
      ])}
      data-sireno-icon-source="generic"
      data-sireno-ui-icon="true"
      focusable="false"
      size={size}
      strokeWidth={1.8}
      fill={props.fill ? 'currentColor' : 'none'}
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
  const cache = useAssetCache()

  if (themeUi?.primitives?.icon) {
    return themeUi.primitives.icon(props)
  }

  const spec = resolveIconSpec(props.source)
  if (spec === undefined) {
    return <></>
  }

  if (spec.kind === 'asset') {
    const src = cache.get(spec.id)
    if (!src) return <></>
    const size = props.size ?? 20
    return (
      <img
        alt=""
        className={cn(['inline-block shrink-0'])}
        data-sireno-icon-source="asset"
        data-sireno-ui-icon="true"
        src={src}
        style={{
          height: `${size}px`,
          objectFit: 'contain',
          width: `${size}px`,
        }}
      />
    )
  }

  return renderLucide(props, resolveLucideIcon(spec.name))
}