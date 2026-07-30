import type { MouseEvent, PointerEvent, ReactNode } from "react"

import { useThemeUiPresentation } from "./theme-presentation"

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
  pressed = false,
  isTapping = false,
  isHolding = false,
  holdProgress = 0,
  buttonType,
  variant = "default",
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerMove,
  onPointerLeave,
  onPointerCancel,
}: ButtonFrameProps) => {
  const themeUi = useThemeUiPresentation()
  if (themeUi?.buttonFrame) {
    return themeUi.buttonFrame({
      pressed,
      isTapping,
      isHolding,
      holdProgress,
      buttonType,
      variant,
      onClick,
      onPointerDown,
      onPointerUp,
      onPointerMove,
      onPointerLeave,
      onPointerCancel,
      children,
    })
  }
  const variantClass = {
    default: "bg-bg border-frame",
    error: "bg-danger/15 border-danger/45 text-danger",
    blue: "bg-tint-blue/25 border-tint-blue/55",
    green: "bg-tint-green/25 border-tint-green/55",
    purple: "bg-tint-purple/25 border-tint-purple/55",
  }[variant]
  const pressedClass = pressed || isTapping ? "scale-[0.98] opacity-90 " : ""
  const holdingClass = isHolding ? "ring-2 ring-tint-blue/70 " : ""

  return (
    <div
      className={`${pressedClass}${holdingClass}flex h-full w-full items-center justify-center overflow-hidden rounded-2xl p-1 border-2 border-solid ${variantClass}`}
      data-sireno-button-frame="true"
      data-variant={variant}
      data-button-type={buttonType}
      data-pressed={pressed || isTapping ? "true" : "false"}
      data-holding={isHolding ? "true" : "false"}
      data-held={isHolding ? "true" : undefined}
      data-hold-progress={
        holdProgress > 0 ? holdProgress.toFixed(2) : undefined
      }
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
