import type { CSSProperties, ReactElement } from 'react'

import { cn } from '../themes/utils/cn.js'
import { Text } from './Text.js'

export interface BarsItem {
  color?: string
  maxValue: number
  title: string
  value: number
}

type BarsItems = readonly [BarsItem] | readonly [BarsItem, BarsItem] | readonly [BarsItem, BarsItem, BarsItem]

export interface BarsProps {
  className?: string
  items: BarsItems
  style?: CSSProperties
}

function getBarFillHeight(item: BarsItem): string {
  if (item.maxValue <= 0) {
    return '0%'
  }

  const ratio = Math.max(0, Math.min(item.value / item.maxValue, 1))
  return `${Math.round(ratio * 100)}%`
}

export function Bars(props: BarsProps): ReactElement {
  if (props.items.length < 1 || props.items.length > 3) {
    throw new Error(`Bars supports 1-3 items. Received ${props.items.length}.`)
  }

  return (
    <div
      className={cn('flex h-full min-h-0 w-full items-stretch justify-between gap-2', props.className)}
      data-sireno-bars-count={props.items.length}
      data-sireno-ui-bars="true"
      style={props.style}
    >
      {props.items.map((item, index) => {
        const color = item.color ?? 'var(--color-primary)'

        return (
          <div className="flex min-w-0 flex-1 flex-col gap-2" key={`${item.title}-${index}`}>
            <Text
              align="center"
              className="block whitespace-nowrap uppercase opacity-75"
              size="xs"
              style={{ color }}
              typography="aux"
            >
              {item.title}
            </Text>
            <div
              aria-hidden="true"
              className="relative flex-1 overflow-hidden rounded-[10px]"
              style={{
                backgroundColor: 'color-mix(in oklab, currentColor 12%, transparent)',
                minHeight: '24px',
              }}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-[10px]"
                data-sireno-bars-fill="true"
                style={{
                  backgroundColor: color,
                  height: getBarFillHeight(item),
                  minHeight: item.value > 0 ? '4px' : undefined,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
