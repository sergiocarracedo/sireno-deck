import type { ReactElement } from "react"

import type { ButtonFrameProps } from "@sirenodeck/cli/ui/ButtonFrame"
import type { LabelProps } from "@sirenodeck/cli/ui/primitives/Label"
import type { TapIndicatorProps } from "@sirenodeck/cli/ui/primitives/TapIndicator"
import type { SplitActionSurfaceProps } from "@sirenodeck/cli/ui/surfaces/SplitActionSurface"
import type { TemporaryErrorSurfaceProps } from "@sirenodeck/cli/ui/surfaces/TemporaryErrorSurface"

import { buildVariantCascade } from "@sirenodeck/cli/ui/ButtonFrame"
import { Label as DefaultLabel } from "@sirenodeck/cli/ui/primitives/Label"
import { Text } from "@sirenodeck/cli/ui/primitives/Text"
import { SplitActionSurface as DefaultSplitActionSurface } from "@sirenodeck/cli/ui/surfaces/SplitActionSurface"
import { TemporaryErrorSurface as DefaultTemporaryErrorSurface } from "@sirenodeck/cli/ui/surfaces/TemporaryErrorSurface"

const TILE_BASE = "riptide-tile"
const FRAME_BASE = "riptide-tile-frame"
const HEADING_TEXT = "riptide-text-heading"
const LABEL_TEXT = "riptide-text-label"
const TAP_PILL = "riptide-tap-pill"

function RiptideButtonFrame(
  props: ButtonFrameProps,
  _ctx?: unknown,
  _base?: (props: ButtonFrameProps) => ReactElement,
): ReactElement {
  const variant = props.variant ?? "default"
  const tileClass = `${TILE_BASE} ${FRAME_BASE}`
  return (
    <div
      className={`flex h-full w-full items-center justify-center overflow-hidden rounded-2xl p-1 ${tileClass}`}
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
      style={
        {
          "--sireno-variant-bg": `var(--sireno-variant-${variant}-bg)`,
          "--sireno-variant-border": `var(--sireno-variant-${variant}-border)`,
          "--sireno-variant-fg": `var(--sireno-variant-${variant}-fg)`,
          "--sireno-variant-glow": `var(--sireno-variant-${variant}-glow)`,
          ...buildVariantCascade(variant),
        } as React.CSSProperties
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

function RiptideTemporaryError(
  props: TemporaryErrorSurfaceProps,
  _ctx?: unknown,
  base?: (props: TemporaryErrorSurfaceProps) => ReactElement,
): ReactElement {
  const className = `riptide-tile riptide-tile-frame ${props.className ?? ""}`
  return base ? (
    base({ ...props, className })
  ) : (
    <DefaultTemporaryErrorSurface {...props} className={className} />
  )
}

function RiptideSplitAction(
  props: SplitActionSurfaceProps,
  _ctx?: unknown,
  base?: (props: SplitActionSurfaceProps) => ReactElement,
): ReactElement {
  return (
    <div className={`riptide-tile riptide-tile-frame relative size-full`}>
      {base ? base(props) : <DefaultSplitActionSurface {...props} />}
    </div>
  )
}

function RiptideLabel(
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

function RiptideTapIndicator(
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
