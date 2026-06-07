import type { CSSProperties, ReactElement, ReactNode } from 'react'

import { cn } from '@/themes/utils/cn'
import { Text } from './Text'

export interface LabelValueListLine {
  color?: string
  icon?: ReactNode
  label: string
  units?: string
  value: string
}

type LabelValueListLines =
  | readonly [LabelValueListLine]
  | readonly [LabelValueListLine, LabelValueListLine]
  | readonly [LabelValueListLine, LabelValueListLine, LabelValueListLine]
  | readonly [LabelValueListLine, LabelValueListLine, LabelValueListLine, LabelValueListLine]

export interface LabelValueListProps {
  className?: string
  lines: LabelValueListLines
  style?: CSSProperties
}

type LabelValueLayout = 'single' | 'double' | 'stack'

function getLayout(lines: LabelValueListLines): LabelValueLayout {
  if (lines.length === 1) {
    return 'single'
  }

  if (lines.length === 2) {
    return 'double'
  }

  return 'stack'
}

function renderValue(line: LabelValueListLine, layout: LabelValueLayout): ReactElement {
  const valueTone = layout === 'stack' ? 'foreground' : 'primary'

  return (
    <div className={cn('min-w-0', layout === 'single' ? 'mt-1' : 'text-right')}>
      <Text
        align={layout === 'single' ? 'center' : 'right'}
        className={cn(layout === 'single' ? 'tracking-tight' : 'whitespace-nowrap')}
        size={layout === 'single' ? '2xl' : layout === 'double' ? 'xl' : 'md'}
        style={line.color ? { color: line.color } : undefined}
        tone={valueTone}
      >
        {line.value}
      </Text>
      {line.units ? (
        <Text
          align={layout === 'single' ? 'center' : 'right'}
          className="block opacity-70"
          size={layout === 'single' ? 'sm' : 'xs'}
          style={line.color ? { color: line.color } : undefined}
          typography="aux"
        >
          {line.units}
        </Text>
      ) : (
        <></>
      )}
    </div>
  )
}

export function LabelValueList(props: LabelValueListProps): ReactElement {
  if (props.lines.length < 1 || props.lines.length > 4) {
    throw new Error(`LabelValueList supports 1-4 lines. Received ${props.lines.length}.`)
  }

  const layout = getLayout(props.lines)

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full',
        layout === 'single' && 'items-center justify-center',
        layout === 'double' && 'flex-col justify-center gap-3',
        layout === 'stack' && 'flex-col justify-center gap-2',
        props.className,
      )}
      data-sireno-label-value-layout={layout}
      data-sireno-ui-label-value-list="true"
      style={props.style}
    >
      {props.lines.map((line, index) => {
        const label = (
          <div
            className={cn(
              'flex min-w-0 items-center gap-2',
              layout === 'single' && 'justify-center',
              layout !== 'single' && 'flex-1',
            )}
          >
            {line.icon ? (
              <span className="inline-flex shrink-0 items-center justify-center">{line.icon}</span>
            ) : null}
            <Text
              align={layout === 'single' ? 'center' : 'left'}
              className="min-w-0 uppercase opacity-75"
              size={layout === 'single' ? 'sm' : 'xs'}
              style={line.color ? { color: line.color } : undefined}
              typography="aux"
            >
              {line.label}
            </Text>
          </div>
        )

        return (
          <div
            className={cn(
              'min-w-0',
              layout === 'single' && 'flex w-full flex-col items-center justify-center text-center',
              layout !== 'single' && 'flex items-center justify-between gap-3',
            )}
            key={`${line.label}-${index}`}
          >
            {label}
            {renderValue(line, layout)}
          </div>
        )
      })}
    </div>
  )
}
