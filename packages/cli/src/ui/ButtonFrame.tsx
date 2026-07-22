import type { MouseEvent, ReactNode } from "react"

export interface ButtonFrameProps {
  pressed?: boolean
  isTapping?: boolean
  isHolding?: boolean
  holdProgress?: number
  buttonType: string
  variant?: "default" | "error" | "blue" | "green" | "purple"
  onClick?: (event: MouseEvent<HTMLDivElement>) => void
  children: ReactNode
}

export const ButtonFrame = ({
  children,
  variant = "default",
  onClick,
}: ButtonFrameProps) => {
  const variantClass = {
    default: "bg-bg border-frame",
    error: "bg-red-600 border-red-700 text-white",
    blue: "bg-blue-950 border-blue-700",
    green: "bg-emerald-950 border-emerald-700",
    purple: "bg-purple-950 border-purple-700",
  }[variant]

  return (
    <div
      className={`flex h-full w-full items-center justify-center overflow-hidden rounded-2xl p-1 border-2 border-solid ${variantClass}`}
      data-sireno-button-frame="true"
      data-variant={variant}
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
}
