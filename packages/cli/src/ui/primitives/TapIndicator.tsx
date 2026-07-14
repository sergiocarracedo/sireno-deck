import { useMemo } from 'react'
import { useThemeUiPresentation } from '../theme-presentation'
import { cn } from '../utils/cn'
import { Text, TextTone } from './Text'

type TapIndicatorType = 'tap' | 'dbltap' | 'hold'

export type TapIndicatorProps = {
  type?: TapIndicatorType
  size?: 'xs' | 'sm' | 'md'
}

export const TapIndicator = (props: TapIndicatorProps) => {
  const tapType = props.type || 'tap'
  const themeUi = useThemeUiPresentation()

  if (themeUi?.primitives?.tapIndicator) {
    return themeUi.primitives.tapIndicator(props)
  }

  const label = useMemo(() => {
    const labelMap: Record<NonNullable<TapIndicatorType>, string> = {
      tap: 'TAP',
      dbltap: 'TAPx2',
      hold: 'HOLD',
    }

    return labelMap[tapType]
  }, [tapType])

  const themeTypes: Record<
    TapIndicatorType,
    { textTone: TextTone; bg: string; border?: string }
  > = {
    tap: {
      textTone: 'foreground',
      bg: '',
      border: 'border-[#f00]',
    },
    dbltap: {
      textTone: 'foreground-contrast',
      bg: 'bg-accent',
    },
    hold: {
      textTone: 'foreground-contrast',
      bg: 'bg-primary',
    },
  }

  const themeType = themeTypes[tapType]

  return (
    <span
      className={cn([
        'border-px border-accent border-solid inline-block px-1 rounded-sm',
        themeType.bg,
        themeType.border,
      ])}
    >
      <Text size={props.size} tone={themeType.textTone}>
        {label}
      </Text>
    </span>
  )
}
