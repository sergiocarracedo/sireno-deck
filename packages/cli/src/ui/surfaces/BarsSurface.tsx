import type { CSSProperties, ReactElement } from 'react'

import { Text } from '../primitives/Text'
import { useThemeUiPresentation } from '../theme-presentation'
import { cn } from '../utils/cn'
import { computeNegativeColor } from '../utils/negative-color'

export interface BarsItem {
  color?: string
  displayValue?: string
  maxValue: number
  title: string
  value: number
}

type BarsItems =
  | readonly [BarsItem]
  | readonly [BarsItem, BarsItem]
  | readonly [BarsItem, BarsItem, BarsItem]

export interface BarsSurfaceProps {
  className?: string
  items: BarsItems
  style?: CSSProperties
  themePrimaryHex?: string
  useSharpPath?: boolean
}

function getBarFillHeight(item: BarsItem): string {
  if (item.maxValue <= 0) {
    return '0%'
  }

  const ratio = Math.max(0, Math.min(item.value / item.maxValue, 1))
  return `${Math.round(ratio * 100)}%`
}

export function BarsSurface(props: BarsSurfaceProps): ReactElement {
  if (props.items.length < 1 || props.items.length > 3) {
    throw new Error(`Bars supports 1-3 items. Received ${props.items.length}.`)
  }

  const themeUi = useThemeUiPresentation()

  if (themeUi?.surfaces?.bars) {
    return themeUi.surfaces.bars(props)
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full items-stretch justify-between gap-1',
        props.className,
      )}
      data-sireno-bars-count={props.items.length}
      data-sireno-ui-bars="true"
      style={props.style}
    >
      {props.items.map((item, index) => {
        const color = item.color ?? 'var(--sireno-color-primary)'
        const valueText = item.displayValue ?? String(Math.round(item.value))
        const valueTextStyle: CSSProperties = props.useSharpPath
          ? {
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
              color: computeNegativeColor(
                item.color ?? '',
                props.themePrimaryHex ?? null,
              ),
            }
          : {
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
              mixBlendMode: 'difference',
            }

        return (
          <div
            className="flex min-w-0 flex-1 flex-col gap-0.5"
            key={`${item.title}-${index}`}
          >
            <Text
              align="center"
              size="xs"
              tone="primary"
              typography="main"
              fit="hidden"
            >
              {item.title}
            </Text>
            <div
              aria-hidden="true"
              className="relative flex-1 overflow-hidden rounded-xs"
              style={{
                backgroundColor:
                  'color-mix(in oklab, currentColor 12%, transparent)',
                minHeight: '24px',
              }}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-xs"
                data-sireno-bars-fill="true"
                style={{
                  backgroundColor: color,
                  height: getBarFillHeight(item),
                  minHeight: item.value > 0 ? '4px' : undefined,
                }}
              />
              <Text
                align="center"
                className="sireno-bars-value pointer-events-none absolute inset-0 flex items-center justify-center whitespace-nowrap"
                size="md"
                style={valueTextStyle}
                tone={props.useSharpPath ? undefined : 'foreground'}
                typography="mono"
              >
                {valueText}
              </Text>
            </div>
          </div>
        )
      })}
    </div>
  )
}
