import type { ReactElement } from "react"

import type { ButtonFrameProps } from "@sireno-deck/cli"
import type { LabelProps } from "@sireno-deck/cli"
import type { TapIndicatorProps } from "@sireno-deck/cli"
import type {
  TemporaryErrorSurfaceProps,
  SplitActionSurfaceProps,
} from "@sireno-deck/cli"

import { Label as DefaultLabel } from "@sireno-deck/cli"
import { Text } from "@sireno-deck/cli"
import { TemporaryErrorSurface as DefaultTemporaryErrorSurface } from "@sireno-deck/cli"
import { SplitActionSurface as DefaultSplitActionSurface } from "@sireno-deck/cli"

const TILE_BASE = "riptide-tile"
const FRAME_BASE = "riptide-tile-frame"
const HEADING_TEXT = "riptide-text-heading"
const LABEL_TEXT = "riptide-text-label"
const TAP_PILL = "riptide-tap-pill"

function RiptideButtonFrame(props: ButtonFrameProps): ReactElement {
  const variant = props.variant ?? "default"
  const tileClass = `${TILE_BASE} ${FRAME_BASE}`
  return (
    <div
      className={`flex h-full w-full items-center justify-center overflow-hidden rounded-2xl ${tileClass}`}
      data-sireno-button-frame="true"
      data-variant={variant}
      data-class={tileClass}
      data-pressed={props.pressed || props.isTapping ? "true" : "false"}
      data-holding={props.isHolding ? "true" : "false"}
      data-hold-progress={
        (props.holdProgress ?? 0) > 0
          ? (props.holdProgress ?? 0).toFixed(2)
          : undefined
      }
      style={props.style}
      onClick={props.onClick}
      onPointerDown={props.onPointerDown}
      onPointerUp={props.onPointerUp}
      onPointerMove={props.onPointerMove}
      onPointerLeave={props.onPointerLeave}
      onPointerCancel={props.onPointerCancel}
      role={props.onClick !== undefined ? "button" : undefined}
      tabIndex={props.onClick !== undefined ? 0 : undefined}
      onKeyDown={
        props.onClick !== undefined
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                props.onClick?.(
                  event as unknown as Parameters<
                    NonNullable<ButtonFrameProps["onClick"]>
                  >[0],
                )
              }
            }
          : undefined
      }
    >
      {props.children}
    </div>
  )
}

function RiptideTemporaryError(
  props: TemporaryErrorSurfaceProps,
): ReactElement {
  return (
    <DefaultTemporaryErrorSurface
      {...props}
      className={`riptide-tile riptide-tile-frame ${props.className ?? ""}`}
    />
  )
}

function RiptideSplitAction(props: SplitActionSurfaceProps): ReactElement {
  return (
    <div className={`riptide-tile riptide-tile-frame relative size-full`}>
      <DefaultSplitActionSurface {...props} />
    </div>
  )
}

function RiptideLabel(props: LabelProps): ReactElement {
  const heading = props.variant === "primary" || props.variant === "secondary"
  return (
    <DefaultLabel {...props} className={heading ? HEADING_TEXT : LABEL_TEXT} />
  )
}

function RiptideTapIndicator(props: TapIndicatorProps): ReactElement {
  const tapType = props.type ?? "tap"
  const size = props.size ?? "sm"
  const labelMap: Record<NonNullable<TapIndicatorProps["type"]>, string> = {
    tap: "TAP",
    dbltap: "DBL",
    hold: "HOLD",
  }
  const label = labelMap[tapType]
  return (
    <span className={`inline-block px-1 rounded-sm ${TAP_PILL}`}>
      <Text size={size} tone="foreground" text={label} />
    </span>
  )
}

export const components = {
  ButtonFrame: RiptideButtonFrame,
}

export const surfaces = {
  temporaryError: RiptideTemporaryError,
  splitAction: RiptideSplitAction,
}

export const primitives = {
  label: RiptideLabel,
  tapIndicator: RiptideTapIndicator,
}
