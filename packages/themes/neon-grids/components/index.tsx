import type { ReactElement } from "react"

import type { ButtonFrameProps } from "@sireno-deck/cli/ui/ButtonFrame"
import type { IconLabelSurfaceProps } from "@sireno-deck/cli/ui/surfaces/IconLabelSurface"
import type { IconLabelProgressSurfaceProps } from "@sireno-deck/cli/ui/surfaces/IconLabelProgressSurface"
import type { TemporaryErrorSurfaceProps } from "@sireno-deck/cli/ui/surfaces/TemporaryErrorSurface"
import type { LabelProps } from "@sireno-deck/cli/ui/primitives/Label"
import type { TapIndicatorProps } from "@sireno-deck/cli/ui/primitives/TapIndicator"

import { IconLabelSurface as DefaultIconLabelSurface } from "@sireno-deck/cli/ui/surfaces/IconLabelSurface"
import { IconLabelProgressSurface as DefaultIconLabelProgressSurface } from "@sireno-deck/cli/ui/surfaces/IconLabelProgressSurface"
import { TemporaryErrorSurface as DefaultTemporaryErrorSurface } from "@sireno-deck/cli/ui/surfaces/TemporaryErrorSurface"
import { Label as DefaultLabel } from "@sireno-deck/cli/ui/primitives/Label"
import { Text } from "@sireno-deck/cli/ui/primitives/Text"

const TILE_BASE = "neon-grids-tile"
const HEADING_TEXT = "neon-grids-text-heading"
const LABEL_TEXT = "neon-grids-text-label"
const TAP_PILL = "neon-grids-tap-pill"

function NeonGridsButtonFrame(
  props: ButtonFrameProps,
  _ctx?: unknown,
  _base?: (props: ButtonFrameProps) => ReactElement,
): ReactElement {
  const variant = (props.variant ?? "default") as
    | "default"
    | "error"
    | "blue"
    | "green"
    | "purple"
  const errorClass = variant === "error" ? " neon-grids-tile-error" : ""
  const tileClass = `${TILE_BASE}${errorClass}`
  return (
    <div
      className={`flex h-full w-full items-center justify-center overflow-hidden rounded-2xl p-1 border-2 border-solid ${tileClass}`}
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

function NeonGridsIconLabel(
  props: IconLabelSurfaceProps,
  _ctx?: unknown,
  base?: (props: IconLabelSurfaceProps) => ReactElement,
): ReactElement {
  return base ? base(props) : <DefaultIconLabelSurface {...props} />
}

function NeonGridsIconLabelProgress(
  props: IconLabelProgressSurfaceProps,
  _ctx?: unknown,
  base?: (props: IconLabelProgressSurfaceProps) => ReactElement,
): ReactElement {
  return base ? base(props) : <DefaultIconLabelProgressSurface {...props} />
}

function NeonGridsTemporaryError(
  props: TemporaryErrorSurfaceProps,
  _ctx?: unknown,
  base?: (props: TemporaryErrorSurfaceProps) => ReactElement,
): ReactElement {
  return base ? base(props) : <DefaultTemporaryErrorSurface {...props} />
}

function NeonGridsLabel(
  props: LabelProps,
  _ctx?: unknown,
  base?: (props: LabelProps) => ReactElement,
): ReactElement {
  const heading = props.variant === "primary" || props.variant === "secondary"
  return base ? (
    base({ ...props, className: heading ? HEADING_TEXT : LABEL_TEXT })
  ) : (
    <DefaultLabel {...props} className={heading ? HEADING_TEXT : LABEL_TEXT} />
  )
}

function NeonGridsTapIndicator(
  props: TapIndicatorProps,
  _ctx?: unknown,
  _base?: (props: TapIndicatorProps) => ReactElement,
): ReactElement {
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
  ButtonFrame: NeonGridsButtonFrame,
}

export const surfaces = {
  iconLabel: NeonGridsIconLabel,
  iconLabelProgress: NeonGridsIconLabelProgress,
  temporaryError: NeonGridsTemporaryError,
}

export const primitives = {
  label: NeonGridsLabel,
  tapIndicator: NeonGridsTapIndicator,
}
