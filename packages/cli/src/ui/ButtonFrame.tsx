import type {
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react"

export interface ButtonFrameProps {
  pressed?: boolean
  isTapping?: boolean
  isHolding?: boolean
  holdProgress?: number
  buttonType: string
  variant?: "default" | "error" | "blue" | "green" | "purple"
  onClick?: (event: MouseEvent<HTMLDivElement>) => void
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerLeave?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerCancel?: (event: PointerEvent<HTMLDivElement>) => void
  children: ReactNode
}

export const ButtonFrame = ({
  children,
  variant = "default",
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerLeave,
  onPointerCancel,
}: ButtonFrameProps) => {
  const variantClass = {
    default: "bg-bg border-frame",
    error: "bg-danger/15 border-danger/45 text-danger",
    blue: "bg-tint-blue/25 border-tint-blue/55",
    green: "bg-tint-green/25 border-tint-green/55",
    purple: "bg-tint-purple/25 border-tint-purple/55",
  }[variant]

  return (
    <div
      className={`flex h-full w-full items-center justify-center overflow-hidden rounded-2xl p-1 border-2 border-solid ${variantClass}`}
      data-sireno-button-frame="true"
      data-variant={variant}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
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
}
