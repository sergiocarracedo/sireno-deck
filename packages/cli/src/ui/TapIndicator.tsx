import { cn } from '@/themes/utils/cn'
import { useMemo } from 'react'
import { Text, TextTone } from './Text'
import { useThemeUiPresentation } from './theme-presentation'

type TapIndicatorType = 'tap' | 'dbltap' | 'hold'

export type TapIndicatorProps = {
  type?: TapIndicatorType
  size?: 'xs' | 'sm' | 'md'
}

export const TapIndicator = (props: TapIndicatorProps) => {
  const tapType = props.type || 'tap'
  const themeUi = useThemeUiPresentation()

  if (themeUi?.tapIndicator) {
    return themeUi.tapIndicator(props)
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
    { textTone: TextTone; bg: string }
  > = {
    tap: {
      textTone: 'foreground',
      bg: '',
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
      className={cn(
        'border-px border-accent border-solid inline-block px-1 rounded-sm',
        themeType.bg,
      )}
    >
      <Text size={props.size} tone={themeType.textTone}>
        {label}
      </Text>
    </span>
  )
}
