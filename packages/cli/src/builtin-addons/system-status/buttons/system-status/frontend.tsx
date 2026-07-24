import type { AddonFrontendButton } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import { BarsSurface, type BarsItem } from "@/ui/index"

import {
  METRICS_CATALOG,
  resolveThresholdColor,
  SYSTEM_METRIC_IDS,
  thresholdColorHex,
  toDisplayMetric,
  type MetricColor,
  type SystemMetricId,
  type SystemMetricSnapshot,
} from "../../domain"
import type { GenericSystemStatusConfig } from "./schemas"

interface MetricPayload {
  available: boolean
  value?: number
  percentage?: number
  max?: number
  unit?: string
}

function readSnapshot(
  payload: MetricPayload | undefined,
  id: SystemMetricId,
): SystemMetricSnapshot {
  if (!payload)
    return { available: false, id, label: METRICS_CATALOG[id].defaultLabel }
  return {
    available: payload.available,
    id,
    label: METRICS_CATALOG[id].defaultLabel,
    ...(payload.max !== undefined ? { max: payload.max } : {}),
    ...(payload.percentage !== undefined
      ? { percentage: payload.percentage }
      : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.value !== undefined ? { value: payload.value } : {}),
  }
}

function pctFromDisplay(
  value: number | undefined,
  percentage: number | undefined,
  maxValue: number,
): number {
  if (percentage !== undefined) return Math.min(100, Math.max(0, percentage))
  if (value === undefined || maxValue <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / maxValue) * 100)))
}

function useAllMetricChannels(): Record<SystemMetricId, MetricPayload | undefined> {
  const cpu = useAddonChannel<MetricPayload>("runtime:system-status:cpu")
  const ram = useAddonChannel<MetricPayload>("runtime:system-status:ram")
  const swap = useAddonChannel<MetricPayload>("runtime:system-status:swap")
  const disk = useAddonChannel<MetricPayload>("runtime:system-status:disk")
  const network = useAddonChannel<MetricPayload>(
    "runtime:system-status:network",
  )
  const battery = useAddonChannel<MetricPayload>(
    "runtime:system-status:battery",
  )
  const temperature = useAddonChannel<MetricPayload>(
    "runtime:system-status:temperature",
  )
  const uptime = useAddonChannel<MetricPayload>(
    "runtime:system-status:uptime",
  )
  const frequency = useAddonChannel<MetricPayload>(
    "runtime:system-status:frequency",
  )
  const load = useAddonChannel<MetricPayload>("runtime:system-status:load")
  const processes = useAddonChannel<MetricPayload>(
    "runtime:system-status:processes",
  )
  return {
    cpu: cpu.data,
    ram: ram.data,
    swap: swap.data,
    disk: disk.data,
    network: network.data,
    battery: battery.data,
    temperature: temperature.data,
    uptime: uptime.data,
    frequency: frequency.data,
    load: load.data,
    processes: processes.data,
  }
}

const isMetricId = (id: string): id is SystemMetricId =>
  (SYSTEM_METRIC_IDS as readonly string[]).includes(id)

function resolveMetricId(entry: unknown): SystemMetricId | null {
  if (typeof entry === "string") return isMetricId(entry) ? entry : null
  if (entry && typeof entry === "object" && "id" in entry) {
    const id = (entry as { id: unknown }).id
    if (typeof id === "string" && isMetricId(id)) return id
  }
  return null
}

function pickLabel(entry: unknown, fallback: string): string {
  if (entry && typeof entry === "object" && "label" in entry) {
    const value = (entry as { label?: unknown }).label
    if (typeof value === "string" && value.length > 0) return value
  }
  return fallback
}

const SystemStatusFrontend: AddonFrontendButton<GenericSystemStatusConfig> = ({
  config,
}) => {
  const channels = useAllMetricChannels()

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
    // ponytail: percent formatters (and `count` for °C/GHz) bake units into
    // `formattedValue`, so don't append `unit` again — `%` shows once.
    items.push({
      title: pickLabel(entry, def.defaultLabel),
      ...(def.icon ? { titleIcon: def.icon } : {}),
      value: pct,
      maxValue,
      displayValue: display.formattedValue,
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
