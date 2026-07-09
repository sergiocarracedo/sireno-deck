import type { ReactNode } from "react"

export interface ButtonFrameProps {
  pressed?: boolean
  isTapping?: boolean
  isHolding?: boolean
  holdProgress?: number
  buttonType: string
  children: ReactNode
}

export const ButtonFrame = ({ children }: ButtonFrameProps) => (
  <div
    className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-bg p-1 border-2 border-solid border-frame"
    data-sireno-button-frame="true"
  >
    {children}
  </div>
)
