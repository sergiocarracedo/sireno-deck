import { type ReactElement } from 'react'

import { useThemeUiPresentation } from '../theme-presentation'
import { cn } from '../utils/cn'
import { Text, TextSize, TextWeight } from './Text'

export const labelVariants = ['primary', 'secondary', 'small'] as const
export type LabelVariant = (typeof labelVariants)[number]

export interface LabelProps {
  text: string
  variant?: LabelVariant
}

export function Label(props: LabelProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.primitives?.label) {
    return themeUi.primitives.label(props)
  }

  const variantsStyle: Record<
    LabelVariant,
    {
      size: TextSize
      className?: string
      weight: TextWeight
    }
  > = {
    primary: {
      size: 'md',
      className: 'uppercase',
      weight: 'bold',
    },
    secondary: {
      size: 'sm',
      className: 'uppercase',
      weight: 'bold',
    },
    small: {
      size: 'xs',
      weight: 'bold',
    },
  }

  const variantStyle = variantsStyle[props.variant ?? 'primary']

  return (
    <Text
      data-sireno-ui-label="true"
      size={variantStyle.size}
      className={cn('leading-tight tracking-tight', variantStyle.className)}
      fit="ellipsis"
      tone="primary"
      typography="main"
      text={props.text}
      weight={variantStyle.weight}
    />
  )
}
