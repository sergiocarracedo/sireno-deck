import type { AddonFrontendButton } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import {
  BarsSurface,
  LabelValueListSurface,
  PaginatedSurface,
  ValueChart,
  type BarsItem,
  type LabelValueListLine,
  type PaginatedPage,
  type ValueChartPoint,
  type ValueChartSeries,
} from "@/ui/index"
import type { ReactElement } from "react"

import {
  CHART_HISTORY_CHANNEL,
  resolveThresholdColor,
  thresholdColorHex,
  toDisplayMetric,
  type ChartSamplerState,
} from "../../domain"
import { MetricColor, METRICS_CATALOG } from "../../shared/metrics-catalog"
import {
  pickLabel,
  readSnapshot,
  resolveMetricId,
  useAllMetricChannels,
} from "../_shared"
import type { SystemPageConfig, SystemStatusConfig } from "./schemas"

function pctFromDisplay(
  value: number | undefined,
  percentage: number | undefined,
  maxValue: number,
): number {
  if (percentage !== undefined) return Math.min(100, Math.max(0, percentage))
  if (value === undefined || maxValue <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / maxValue) * 100)))
}

function BarsPage({ metrics }: Extract<SystemPageConfig, { type: "bars" }>) {
  const channels = useAllMetricChannels()
  const useIconInsteadOfTitle = metrics.length === 3

  const items: BarsItem[] = []
  for (const entry of metrics) {
    const id = resolveMetricId(entry)
    if (id === null) continue
    const def = METRICS_CATALOG[id]
    if (!def) continue
    if (!def.views.includes("bars")) continue
    const maxValue = def.maxValue ?? 100
    const display = toDisplayMetric(readSnapshot(channels[id], id))
    const color = thresholdColorHex(
      resolveThresholdColor(display.value ?? 0, def.thresholds) as MetricColor,
    )
    const pct = pctFromDisplay(display.value, display.percentage, maxValue)
    items.push({
      title: useIconInsteadOfTitle ? "" : pickLabel(entry, def.defaultLabel),
      ...(def.icon ? { titleIcon: def.icon } : {}),
      value: pct,
      maxValue,
      displayValue: display.formattedValue,
      ...(display.unit ? { units: display.unit } : {}),
      color,
    })
  }

  type BarsTuple =
    | readonly [BarsItem]
    | readonly [BarsItem, BarsItem]
    | readonly [BarsItem, BarsItem, BarsItem]

  if (items.length === 0) return <div className="h-full w-full" />
  const tuple: BarsTuple =
    items.length === 1
      ? [items[0]!]
      : items.length === 2
        ? [items[0]!, items[1]!]
        : [items[0]!, items[1]!, items[2]!]

  return (
    <div className="h-full w-full p-1">
      <BarsSurface items={tuple} barMaxWidthClass="max-w-[40px]" />
    </div>
  )
}

function KpisPage({ metrics }: Extract<SystemPageConfig, { type: "kpis" }>) {
  const channels = useAllMetricChannels()

  const lines: LabelValueListLine[] = []
  for (const entry of metrics) {
    const id = resolveMetricId(entry)
    if (id === null) continue
    const def = METRICS_CATALOG[id]
    if (!def) continue
    const display = toDisplayMetric(readSnapshot(channels[id], id))
    const color = thresholdColorHex(
      resolveThresholdColor(display.value ?? 0, def.thresholds) as MetricColor,
    )
    lines.push({
      ...(def.icon ? { icon: def.icon } : {}),
      label: pickLabel(entry, def.defaultLabel),
      value: display.formattedValue,
      ...(display.unit ? { units: display.unit } : {}),
      ...(color ? { color } : {}),
    })
  }

  type LinesTuple =
    | readonly [LabelValueListLine]
    | readonly [LabelValueListLine, LabelValueListLine]
    | readonly [LabelValueListLine, LabelValueListLine, LabelValueListLine]

  if (lines.length === 0) return <div className="h-full w-full" />
  const tuple: LinesTuple =
    lines.length === 1
      ? [lines[0]!]
      : lines.length === 2
        ? [lines[0]!, lines[1]!]
        : [lines[0]!, lines[1]!, lines[2]!]

  return <LabelValueListSurface lines={tuple} />
}

function ChartPage({
  metrics,
  windowSeconds,
}: Extract<SystemPageConfig, { type: "chart" }>) {
  const { data: history } = useAddonChannel<ChartSamplerState>(
    CHART_HISTORY_CHANNEL,
  )
  const channels = useAllMetricChannels()

  const series: ValueChartSeries[] = metrics.flatMap((entry) => {
    const id = resolveMetricId(entry)
    if (id === null) return []
    const def = METRICS_CATALOG[id]
    if (!def) return []
    if (!def.views.includes("chart")) return []

    const rawSamples = history?.samples[id] ?? []
    const now = Date.now()
    const windowMs = windowSeconds * 1000
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

  type ChartTuple =
    | readonly [ValueChartSeries]
    | readonly [ValueChartSeries, ValueChartSeries]

  if (series.length === 0) return <div className="h-full w-full" />
  const tuple: ChartTuple =
    series.length === 1 ? [series[0]!] : [series[0]!, series[1]!]

  return (
    <div className="h-full -mx-1">
      <ValueChart series={tuple} windowSeconds={windowSeconds} />
    </div>
  )
}

const PAGE_COMPONENTS: {
  [K in SystemPageConfig["type"]]: (
    props: Extract<SystemPageConfig, { type: K }>,
  ) => ReactElement
} = {
  bars: BarsPage,
  kpis: KpisPage,
  chart: ChartPage,
}

const SystemStatusFrontend: AddonFrontendButton<SystemStatusConfig> = ({
  config,
  gesture,
}) => {
  const rawPages = (
    Array.isArray(config.pages)
      ? config.pages
      : config.pages != null
        ? [config.pages]
        : [config as unknown as SystemPageConfig]
  ) as SystemPageConfig[]

  const pages: PaginatedPage<SystemPageConfig>[] = rawPages.map((page) => ({
    render: PAGE_COMPONENTS[page.type] as (
      props: SystemPageConfig,
    ) => ReactElement,
    config: page,
  }))

  return <PaginatedSurface pages={pages} gesture={gesture} />
}

export default SystemStatusFrontend
