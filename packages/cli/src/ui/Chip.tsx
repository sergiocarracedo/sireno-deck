import { type ReactElement, type ReactNode } from 'react'

import { cn } from '@/themes/utils/cn'
import { useThemeUiPresentation } from './theme-presentation'

const TONE_CLASS = {
  accent: 'border-accent text-accent',
  danger: 'border-danger text-danger',
  foreground: 'border-foreground text-foreground',
  primary: 'border-primary text-primary',
  success: 'border-success text-success',
  muted: 'border-grey text-grey',
} as const

export type ChipTone = keyof typeof TONE_CLASS

export interface ChipProps {
  children: ReactNode
  tone?: ChipTone
}

export function Chip(props: ChipProps): ReactElement {
  const tone = props.tone ?? 'foreground'
  const themeUi = useThemeUiPresentation()

  if (themeUi?.chip) {
    return themeUi.chip({ children: props.children, tone })
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border px-2 py-0.5 font-aux text-sm uppercase tracking-wide',
        TONE_CLASS[tone],
      )}
      data-sireno-ui-chip="true"
    >
      {props.children}
    </span>
  )
}
