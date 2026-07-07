import { type ReactElement, type ReactNode } from 'react'

import { useThemeUiPresentation } from '../theme-presentation'
import { cn } from '../utils/cn'
import { Text, TextProps } from './Text'

const TONE_CLASS = {
  accent: 'border-accent text-accent bg-accent/20',
  danger: 'border-danger text-danger bg-danger/20',
  foreground: 'border-foreground text-foreground bg-foreground/20',
  primary: 'border-primary text-primary bg-primary/20',
  success: 'border-success text-success bg-success/20',
  muted: 'border-grey text-grey bg-grey/0',
} as const

export type ChipTone = keyof typeof TONE_CLASS

export interface ChipProps {
  children: ReactNode
  tone?: ChipTone
  size?: TextProps['size']
}

export function Chip(props: ChipProps): ReactElement {
  const tone = props.tone ?? 'foreground'
  const themeUi = useThemeUiPresentation()

  if (themeUi?.primitives?.chip) {
    return themeUi.primitives.chip({
      children: props.children,
      tone,
      size: props.size,
    })
  }

  return (
    <Text
      className={cn([
        'inline-flex items-center justify-center rounded-full border px-2 py-0 font-aux  uppercase tracking-wide font-bold',
        TONE_CLASS[tone],
      ])}
      size={props.size ?? 'sm'}
      data-sireno-ui-chip="true"
    >
      {props.children}
    </Text>
  )
}
