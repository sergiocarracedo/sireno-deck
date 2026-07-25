import type { AddonFrontendButton } from "@/addon/api"
import { BarsSurface, type BarsItem } from "@/ui/index"

import {
  resolveThresholdColor,
  thresholdColorHex,
  toDisplayMetric,
} from "../../domain"
import { MetricColor, METRICS_CATALOG } from "../../shared/metrics-catalog"
import {
  pickLabel,
  readSnapshot,
  resolveMetricId,
  useAllMetricChannels,
} from "../_shared"
import type { GenericSystemStatusConfig } from "./schemas"

function pctFromDisplay(
  value: number | undefined,
  percentage: number | undefined,
  maxValue: number,
): number {
  if (percentage !== undefined) return Math.min(100, Math.max(0, percentage))
  if (value === undefined || maxValue <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / maxValue) * 100)))
}

const SystemStatusFrontend: AddonFrontendButton<GenericSystemStatusConfig> = ({
  config,
}) => {
  const channels = useAllMetricChannels()
  const useIconInsteadOfTitle = config.metrics.length === 3

  const items: BarsItem[] = []
  for (const entry of config.metrics) {
    const id = resolveMetricId(entry)
    if (id === null) continue
    const def = METRICS_CATALOG[id]
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

  type BarsInput =
    | readonly [BarsItem]
    | readonly [BarsItem, BarsItem]
    | readonly [BarsItem, BarsItem, BarsItem]

  if (items.length === 0) return <div className="h-full w-full" />
  const tuple: BarsInput =
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

export default SystemStatusFrontend
