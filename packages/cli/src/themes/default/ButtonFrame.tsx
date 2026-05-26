import { createElement, type ReactNode } from 'react'

export interface ButtonFrameProps {
  children: ReactNode
}

export function ButtonFrame(props: ButtonFrameProps) {
  return createElement(
    'div',
    {
      className: 'bg-background border-accent w-full h-full rounded-lg flex items-center justify-center p-1',
      'data-sireno-button-frame': 'true',
    },
    props.children,
  )
}
