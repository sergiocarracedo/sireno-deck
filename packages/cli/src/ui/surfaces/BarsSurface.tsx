import type { CSSProperties, ReactElement } from "react"

import { Icon } from "../primitives/Icon"
import { Text } from "../primitives/Text"
import { useThemeUiPresentation } from "../theme-presentation"
import { cn } from "../utils/cn"

export interface BarsItem {
  color?: string
  displayValue?: string
  maxValue: number
  title: string
  titleIcon?: string
  units?: string
  value: number
}

type BarsItems =
  | readonly [BarsItem]
  | readonly [BarsItem, BarsItem]
  | readonly [BarsItem, BarsItem, BarsItem]

export interface BarsSurfaceProps {
  barMaxWidthClass?: string
  className?: string
  items: BarsItems
  style?: CSSProperties
}

const MUTED_TEXT_COLOR = "var(--sireno-color-foreground-contrast)"

function getBarFillRatio(item: BarsItem): number {
  if (item.maxValue <= 0) {
    return 0
  }
  return Math.max(0, Math.min(item.value / item.maxValue, 1))
}

interface BarsValueLayerProps {
  color: string
  fillPct: number
  side: "over" | "above"
  text: string
  units: string | undefined
}

function BarsValueLayer({
  color,
  fillPct,
  side,
  text,
  units,
}: BarsValueLayerProps): ReactElement {
  const clipPath =
    side === "over"
      ? `inset(${100 - fillPct}% 0 0 0)`
      : `inset(0 0 ${fillPct}% 0)`

  return (
    <div
      aria-hidden="true"
      className="sireno-bars-value-layer pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      data-sireno-bars-layer={side}
      style={{ clipPath, color }}
    >
      <div
        className="flex items-baseline gap-0.5 whitespace-nowrap"
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "center",
        }}
      >
        <Text
          align="center"
          fit="hidden"
          size="sm"
          style={{ color }}
          typography="mono"
          weight="bold"
          text={text}
        />
        {units ? (
          <Text
            align="center"
            fit="hidden"
            size="xs"
            style={{ color }}
            typography="mono"
            weight="bold"
            text={units}
          />
        ) : null}
      </div>
    </div>
  )
}

export function BarsSurface(props: BarsSurfaceProps): ReactElement {
  if (props.items.length < 1 || props.items.length > 3) {
    throw new Error(`Bars supports 1-3 items. Received ${props.items.length}.`)
  }

  const themeUi = useThemeUiPresentation()
  const barMaxWidthClass = props.barMaxWidthClass ?? "max-w-[60%]"

  if (themeUi?.surfaces?.bars) {
    return themeUi.surfaces.bars(props)
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full items-stretch justify-between gap-1",
        props.className,
      )}
      data-sireno-bars-count={props.items.length}
      data-sireno-ui-bars="true"
      style={props.style}
    >
      {props.items.map((item, index) => {
        const color = item.color ?? "var(--sireno-color-primary)"
        const fillPct = Math.round(getBarFillRatio(item) * 100)
        const text = item.displayValue ?? String(Math.round(item.value))
        const units = item.units

        return (
          <div
            className="flex min-w-0 flex-1 flex-col gap-0.5"
            key={`${item.title}-${index}`}
          >
            {props.items.length === 1 && item.titleIcon ? (
              <div className="flex items-center justify-center gap-1">
                <Icon source={item.titleIcon} size={12} />
                <Text
                  align="center"
                  fit="ellipsis"
                  size="xs"
                  tone="primary"
                  typography="main"
                  weight="bold"
                  text={item.title}
                />
              </div>
            ) : (
              <Text
                align="center"
                fit="ellipsis"
                size="xs"
                tone="primary"
                typography="main"
                weight="bold"
                text={item.title}
              />
            )}
            <div className="flex flex-1 items-stretch justify-center">
              <div
                aria-hidden="true"
                className={cn(
                  "relative flex-1 overflow-hidden rounded-md",
                  barMaxWidthClass,
                )}
                style={{
                  backgroundColor:
                    "color-mix(in oklab, currentColor 12%, transparent)",
                  minHeight: "24px",
                }}
              >
                <div
                  className="absolute inset-x-0 bottom-0 rounded-md"
                  data-sireno-bars-fill="true"
                  style={{
                    backgroundColor: color,
                    height: `${fillPct}%`,
                    minHeight: item.value > 0 ? "4px" : undefined,
                  }}
                />
                <BarsValueLayer
                  color={color}
                  fillPct={fillPct}
                  side="above"
                  text={text}
                  units={units}
                />
                <BarsValueLayer
                  color={MUTED_TEXT_COLOR}
                  fillPct={fillPct}
                  side="over"
                  text={text}
                  units={units}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
