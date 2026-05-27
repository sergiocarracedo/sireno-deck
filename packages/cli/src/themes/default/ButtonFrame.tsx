import { cloneElement, type ReactElement, type ReactNode } from 'react'

import { cn } from '../utils/cn'

export interface ButtonFrameProps {
  children: ReactNode
}

export interface ThemeIconProps {
  children: ReactElement
  decorative: boolean
  source: 'asset' | 'brand' | 'generic'
  tone?: 'accent' | 'danger' | 'foreground' | 'primary' | 'success'
}

export interface ThemeChipProps {
  children: ReactElement
  tone: 'accent' | 'danger' | 'foreground' | 'primary' | 'success'
}

export interface ThemeTextProps {
  align: 'center' | 'left' | 'right'
  children: ReactElement
  fit: 'ellipsis' | 'marquee' | 'shrink' | 'wrap'
  tone: 'accent' | 'danger' | 'foreground' | 'primary' | 'success'
  typography: 'aux' | 'main' | 'mono'
}

export function ButtonFrame(props: ButtonFrameProps) {
  return (
    <div
      className={cn([
        'bg-background border-accent w-full h-full rounded-lg flex items-center justify-center p-1',
      ])}
      data-sireno-button-frame="true"
    >
      {props.children}
    </div>
  )
}

function addThemeClass(
  element: ReactElement,
  className: string,
  extraProps?: Record<string, string>,
): ReactElement {
  const currentProps = element.props as { className?: string }

  return cloneElement(element, {
    ...extraProps,
    className: cn(className, currentProps.className),
  })
}

export function ThemeIcon(props: ThemeIconProps): ReactElement {
  return addThemeClass(props.children, 'sireno-default-icon', {
    'data-sireno-default-icon-source': props.source,
  })
}

export function ThemeChip(props: ThemeChipProps): ReactElement {
  return addThemeClass(props.children, 'sireno-default-chip', {
    'data-sireno-default-chip-tone': props.tone,
  })
}

export function ThemeText(props: ThemeTextProps): ReactElement {
  return addThemeClass(props.children, 'sireno-default-text', {
    'data-sireno-default-text-fit': props.fit,
    'data-sireno-default-text-tone': props.tone,
    'data-sireno-default-text-typography': props.typography,
  })
}
