import { cloneElement, type ReactElement } from 'react'

import {
  ThemeButtonFrameProps,
  ThemeChipPresentationProps,
  ThemeIconPresentationProps,
  ThemeTextPresentationProps,
} from '@/config/theme'

import { cn } from '../utils/cn'

export function ButtonFrame(props: ThemeButtonFrameProps) {
  return (
    <div
      className={cn([
        'bg-background border-frame border-2 border-solid w-full h-full rounded-2xl flex items-center justify-center p-1 overflow-hidden',
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
  const newProps: Record<string, string> = {
    ...extraProps,
    className: cn(className, currentProps.className),
  }

  return cloneElement(element, newProps)
}

export function ThemeIcon(props: ThemeIconPresentationProps): ReactElement {
  return addThemeClass(props.children, 'sireno-default-icon', {
    'data-sireno-default-icon-source': props.source,
  })
}

export function ThemeChip(props: ThemeChipPresentationProps): ReactElement {
  return addThemeClass(props.children, 'sireno-default-chip', {
    'data-sireno-default-chip-tone': props.tone,
  })
}

export function ThemeText(props: ThemeTextPresentationProps): ReactElement {
  return addThemeClass(props.children, 'sireno-default-text', {
    'data-sireno-default-text-fit': props.fit,
    'data-sireno-default-text-size': props.size,
    'data-sireno-default-text-tone': props.tone,
    'data-sireno-default-text-typography': props.typography,
  })
}
