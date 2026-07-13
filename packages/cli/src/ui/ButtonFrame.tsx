import type { MouseEvent, ReactNode } from "react"

export interface ButtonFrameProps {
  pressed?: boolean
  isTapping?: boolean
  isHolding?: boolean
  holdProgress?: number
  buttonType: string
  onClick?: (event: MouseEvent<HTMLDivElement>) => void
  children: ReactNode
}

export const ButtonFrame = ({ children, onClick }: ButtonFrameProps) => (
  <div
    className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-bg p-1 border-2 border-solid border-frame"
    data-sireno-button-frame="true"
    onClick={onClick}
    role={onClick !== undefined ? "button" : undefined}
    tabIndex={onClick !== undefined ? 0 : undefined}
    onKeyDown={
      onClick !== undefined
        ? (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onClick(event as unknown as MouseEvent<HTMLDivElement>)
            }
          }
        : undefined
    }
  >
    {children}
  </div>
)
