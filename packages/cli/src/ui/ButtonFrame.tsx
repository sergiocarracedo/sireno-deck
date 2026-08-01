import type {
  CSSProperties,
  MouseEvent,
  PointerEvent,
  ReactElement,
  ReactNode,
} from "react"

import { useThemeUiPresentation } from "./theme-presentation"

export interface ButtonFrameProps {
  pressed?: boolean
  isTapping?: boolean
  isHolding?: boolean
  holdProgress?: number
  buttonType: string
  variant?: string
  onClick?: (event: MouseEvent<HTMLDivElement>) => void
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerLeave?: (event: PointerEvent<HTMLDivElement>) => void
  onPointerCancel?: (event: PointerEvent<HTMLDivElement>) => void
  children: ReactNode
}

const warnedVariants = new Set<string>()

const warnUnknownVariant = (variant: string): void => {
  if (warnedVariants.has(variant)) return
  warnedVariants.add(variant)
  console.warn(
    `[sireno-deck] ButtonFrame: unknown variant "${variant}", falling back to "default". Add this variant to your theme's manifest.`,
  )
}

const variantVar = (
  variant: string,
  slot: "bg" | "border" | "fg" | "glow",
): string =>
  `var(--sireno-variant-${variant}-${slot}, var(--sireno-variant-default-${slot}))`

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
    return themeUi.buttonFrame(
      {
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
      },
      undefined,
      buttonFrameBase,
    )
  }
  warnUnknownVariant(variant)
  return buttonFrameBase({
    children,
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
  })
}

export function buttonFrameBase(props: ButtonFrameProps): ReactElement {
  const {
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
  } = props
  warnUnknownVariant(variant)
  const pressedClass = pressed || isTapping ? "scale-[0.98] opacity-90 " : ""
  const holdingClass = isHolding ? "ring-2 ring-frame/70 " : ""
  const style: CSSProperties = {
    backgroundColor: variantVar(variant, "bg"),
    borderColor: variantVar(variant, "border"),
    color: variantVar(variant, "fg"),
    boxShadow:
      pressed || isTapping || isHolding
        ? `0 0 12px ${variantVar(variant, "glow")}`
        : undefined,
  }

  return (
    <div
      className={`${pressedClass}${holdingClass}flex h-full w-full items-center justify-center overflow-hidden rounded-2xl p-1 border-2 border-solid`}
      data-sireno-button-frame="true"
      data-variant={variant}
      data-button-type={buttonType}
      data-pressed={pressed || isTapping ? "true" : "false"}
      data-holding={isHolding ? "true" : "false"}
      data-held={isHolding ? "true" : undefined}
      data-hold-progress={
        holdProgress > 0 ? holdProgress.toFixed(2) : undefined
      }
      style={style}
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
