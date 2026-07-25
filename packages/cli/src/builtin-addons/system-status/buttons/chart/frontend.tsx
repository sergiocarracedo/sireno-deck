import type { AddonFrontendButton } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import {
  ValueChart,
  type ValueChartPoint,
  type ValueChartSeries,
} from "@/ui/index"

import {
  CHART_HISTORY_CHANNEL,
  resolveThresholdColor,
  thresholdColorHex,
  toDisplayMetric,
  type ChartSamplerState,
} from "../../domain"
import { MetricColor, METRICS_CATALOG } from "../../shared/metrics-catalog"
import { readSnapshot, resolveMetricId, useAllMetricChannels } from "../_shared"
import type { ChartConfig } from "./schemas"

type ChartSeriesTuple =
  | readonly [ValueChartSeries]
  | readonly [ValueChartSeries, ValueChartSeries]

const ChartFrontend: AddonFrontendButton<ChartConfig> = ({ config }) => {
  const { data: history } = useAddonChannel<ChartSamplerState>(
    CHART_HISTORY_CHANNEL,
  )
  const channels = useAllMetricChannels()

  const series: ValueChartSeries[] = config.metrics.flatMap((entry) => {
    const id = resolveMetricId(entry)
    if (id === null) return []
    const def = METRICS_CATALOG[id]
    if (!def.views.includes("chart")) return []

    const rawSamples = history?.samples[id] ?? []
    const now = Date.now()
    const windowMs = config.windowSeconds * 1000
    const clipped: ValueChartPoint[] = []
    for (const s of rawSamples) {
      if (s.at >= now - windowMs) clipped.push(s)
    }

    const latest = toDisplayMetric(readSnapshot(channels[id], id))
    const yMax = Math.max(def.maxValue ?? 0, ...clipped.map((p) => p.value), 1)

    return [
      {
        id,
        color:
          thresholdColorHex(
            resolveThresholdColor(
              latest.value ?? 0,
              def.thresholds,
            ) as MetricColor,
          ) ?? "var(--sireno-color-primary)",
        icon: def.icon ?? "icon://activity",
        ...(typeof entry === "object" && entry.label
          ? { label: entry.label }
          : {}),
        ...(latest.unit ? { unit: latest.unit } : {}),
        points: clipped,
        yMax,
      },
    ]
  })

  if (series.length === 0) return <div className="h-full w-full" />
  const tuple: ChartSeriesTuple =
    series.length === 1 ? [series[0]!] : [series[0]!, series[1]!]

  return (
    <div className="h-full w-full p-1">
      <ValueChart series={tuple} windowSeconds={config.windowSeconds} />
    </div>
  )
}

export default ChartFrontend
