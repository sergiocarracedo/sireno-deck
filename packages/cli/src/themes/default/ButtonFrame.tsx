import type { ReactNode } from 'react'

export interface ButtonFrameProps {
  children: ReactNode
}

export function ButtonFrame(props: ButtonFrameProps) {
  return (
    <div
      className="bg-background border-accent w-full h-full rounded-lg flex items-center justify-center p-1"
      data-sireno-button-frame="true"
    >
      <div className="bg-background rounded-lg flex items-center justify-center p-2 w-full h-full">
        {props.children}
      </div>
    </div>
  )
}
