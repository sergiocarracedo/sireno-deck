import { type CSSProperties, type ReactElement, type ReactNode } from 'react'

import { cn } from '../themes/utils/cn.js'
import { useThemeUiPresentation } from './theme-presentation.js'

const ALIGN_CLASS = {
  center: 'text-center',
  left: 'text-left',
  right: 'text-right',
} as const

const TONE_CLASS = {
  accent: 'text-accent',
  danger: 'text-danger',
  foreground: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
} as const

const TYPOGRAPHY_CLASS = {
  aux: 'font-aux',
  main: 'font-main',
  mono: 'font-mono',
} as const

const SIZE_CLASS = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-md',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
} as const

export type TextAlign = keyof typeof ALIGN_CLASS
export type TextFit = 'ellipsis' | 'marquee' | 'shrink' | 'wrap'
export type TextTone = keyof typeof TONE_CLASS
export type TextTypography = keyof typeof TYPOGRAPHY_CLASS
export type TextSize = keyof typeof SIZE_CLASS

export interface TextProps {
  align?: TextAlign
  children: ReactNode
  className?: string
  fit?: TextFit
  style?: CSSProperties
  tone?: TextTone
  typography?: TextTypography
  size?: TextSize
}

export function Text(props: TextProps): ReactElement {
  const fit = props.fit ?? 'wrap'
  const align = props.align ?? 'center'
  const tone = props.tone ?? 'foreground'
  const typography = props.typography ?? 'main'
  const size = props.size ?? 'md'
  const themeUi = useThemeUiPresentation()

  const element = (
    <span
      className={cn([
        'block max-w-full min-w-0 leading-tight',
        TYPOGRAPHY_CLASS[typography],
        TONE_CLASS[tone],
        ALIGN_CLASS[align],
        SIZE_CLASS[size],
        fit === 'wrap' && 'whitespace-normal break-words',
        fit === 'ellipsis' && 'overflow-hidden whitespace-nowrap text-ellipsis',
        fit === 'shrink' &&
          'sireno-text-fit-shrink whitespace-normal break-words',
        fit === 'marquee' &&
          'sireno-text-fit-marquee overflow-hidden whitespace-nowrap',
        props.className,
      ])}
      data-sireno-text-fit={fit}
      data-sireno-ui-text="true"
      style={props.style}
    >
      {fit === 'marquee' ? (
        <span className="sireno-marquee-track inline-block">
          {props.children}
        </span>
      ) : (
        props.children
      )}
    </span>
  )

  return themeUi?.text
    ? themeUi.text({
        align,
        children: element,
        fit,
        tone,
        typography,
        size: size,
      })
    : element
}
