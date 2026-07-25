import type { CSSProperties, ReactElement } from "react"

import { Icon } from "../primitives/Icon"
import { Text } from "../primitives/Text"
import { useThemeUiPresentation } from "../theme-presentation"
import { cn } from "../utils/cn"

export interface ValueChartPoint {
  at: number
  value: number
}

export interface ValueChartSeries {
  id: string
  color: string
  icon: string
  label?: string
  unit?: string
  points: ReadonlyArray<ValueChartPoint>
  yMax: number
}

type ValueChartSeriesTuple =
  | readonly [ValueChartSeries]
  | readonly [ValueChartSeries, ValueChartSeries]

export interface ValueChartProps {
  series: ValueChartSeriesTuple
  windowSeconds: number
  resolution?: number
  className?: string
  style?: CSSProperties
}

const CHART_VIEWBOX_SIZE = 100

function clipPoints(
  points: ReadonlyArray<ValueChartPoint>,
  windowSeconds: number,
): ValueChartPoint[] {
  const cutoff = Date.now() - windowSeconds * 1000
  return points.filter((p) => p.at >= cutoff)
}

function downsample(
  points: ReadonlyArray<ValueChartPoint>,
  maxPoints: number,
): ValueChartPoint[] {
  if (points.length <= maxPoints) return [...points]
  const bucketSize = Math.ceil(points.length / maxPoints)
  const result: ValueChartPoint[] = []
  for (let i = 0; i < points.length; i += bucketSize) {
    const bucket = points.slice(i, i + bucketSize)
    const maxP = bucket.reduce((a, b) => (a.value > b.value ? a : b))
    result.push(maxP)
  }
  const last = points[points.length - 1]
  if (last && result[result.length - 1] !== last) result.push(last)
  return result
}

function buildAreaPath(
  points: ReadonlyArray<ValueChartPoint>,
  yMax: number,
): string {
  if (points.length === 0) return ""

  const minX = points[0]!.at
  const maxX = points[points.length - 1]!.at
  const rangeX = Math.max(maxX - minX, 1)
  const size = CHART_VIEWBOX_SIZE
  const normalY = (v: number) => ((1 - v / Math.max(yMax, 1)) * size).toFixed(1)

  const parts: string[] = []
  for (let i = 0; i < points.length; i++) {
    const x = (((points[i]!.at - minX) / rangeX) * size).toFixed(1)
    const y = normalY(points[i]!.value)
    parts.push(`${i === 0 ? "M" : "L"}${x},${y}`)
  }

  const lastX = (
    ((points[points.length - 1]!.at - minX) / rangeX) *
    size
  ).toFixed(1)
  parts.push(`L${lastX},${size} L0,${size} Z`)
  return parts.join(" ")
}

export function ValueChart(props: ValueChartProps): ReactElement {
  if (props.series.length < 1 || props.series.length > 2) {
    throw new Error(
      `ValueChart supports 1-2 series. Received ${props.series.length}.`,
    )
  }

  const themeUi = useThemeUiPresentation()
  if (themeUi?.surfaces?.valueChart) {
    return themeUi.surfaces.valueChart(props)
  }

  const clipped = props.series.map((s) => ({
    ...s,
    clipped: clipPoints(s.points, props.windowSeconds),
  }))

  const resolution = props.resolution ?? 120

  return (
    <div
      className={cn(
        "flex h-full min-h-[24px] min-w-0 w-full flex-col",
        props.className,
      )}
      data-sireno-ui-valuechart="true"
      style={props.style}
    >
      <div className="flex shrink-0 items-center justify-center gap-2">
        {clipped.map((s) => {
          const latest = s.points[s.points.length - 1]
          const displayValue =
            latest !== undefined ? String(Math.round(latest.value)) : "—"
          return (
            <div
              className="flex items-center gap-0.5 whitespace-nowrap"
              key={s.id}
            >
              <Icon source={s.icon} size={10} />
              <Text
                align="center"
                fit="hidden"
                size="xxs"
                typography="mono"
                weight="bold"
                text={displayValue}
                style={{ color: s.color }}
              />
              {s.unit ? (
                <Text
                  align="center"
                  fit="hidden"
                  size="xxs"
                  typography="mono"
                  text={s.unit}
                  style={{ color: s.color, opacity: 0.7 }}
                />
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="relative flex-1 min-w-0">
        <svg
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${CHART_VIEWBOX_SIZE} ${CHART_VIEWBOX_SIZE}`}
        >
          {clipped.map((s) => {
            const downsampled = downsample(s.clipped, resolution)
            if (downsampled.length === 0) {
              return (
                <line
                  key={s.id}
                  x1="0"
                  y1={CHART_VIEWBOX_SIZE}
                  x2={CHART_VIEWBOX_SIZE}
                  y2={CHART_VIEWBOX_SIZE}
                  stroke={s.color}
                  strokeWidth={1.5}
                  opacity={0.3}
                />
              )
            }
            return (
              <path
                key={s.id}
                d={buildAreaPath(downsampled, s.yMax)}
                fill={s.color}
                fillOpacity={0.3}
                stroke={s.color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )
          })}
        </svg>
      </div>
    </div>
  )
}
