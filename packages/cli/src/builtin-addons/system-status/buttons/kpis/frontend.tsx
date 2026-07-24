import type { ReactElement } from "react"

import type { AddonFrontendButton } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import { Icon, cn } from "@/ui/index"

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
import type { GenericSystemStatusConfig } from "../system-status/schemas"

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

interface KpiItem {
  id: SystemMetricId
  label: string
  icon: string | undefined
  value: string
  units: string | undefined
  color: string | undefined
}

function buildItems(
  config: GenericSystemStatusConfig,
  channels: Record<SystemMetricId, MetricPayload | undefined>,
): KpiItem[] {
  const out: KpiItem[] = []
  for (const entry of config.metrics) {
    const id = resolveMetricId(entry)
    if (id === null) continue
    const def = METRICS_CATALOG[id]
    const display = toDisplayMetric(readSnapshot(channels[id], id))
    const color = thresholdColorHex(
      resolveThresholdColor(display.value ?? 0, def.thresholds) as MetricColor,
    )
    out.push({
      id,
      label: pickLabel(entry, def.defaultLabel),
      icon: def.icon,
      value: display.formattedValue,
      units: display.unit,
      color,
    })
  }
  return out
}

// ponytail: the user-spec layout — 1 metric gets a tall 2-row layout
// (`[icon | value]` over `[label · units]`), 2 metrics stack vertically
// as two of those 2-row tiles, and 3-4 metrics are icon-only rows (no
// label/units) because there isn't room without truncation.
function KpiRowTile({
  item,
  showLabel,
}: {
  item: KpiItem
  showLabel: boolean
}): ReactElement {
  const colorStyle = item.color ? { color: item.color } : undefined
  return (
    <div
      className="flex h-full min-w-0 flex-1 flex-col text-center overflow-hidden"
      style={colorStyle}
    >
      <div className="flex-1 flex items-center justify-center gap-1.5 min-h-0">
        {item.icon ? <Icon source={item.icon} size={14} /> : null}
        <span
          className="font-mono text-lg font-bold leading-none truncate"
          style={{ minWidth: 0 }}
        >
          {item.value}
        </span>
      </div>
      {showLabel ? (
        <div
          className={cn(
            "flex items-center justify-center gap-1 truncate",
            "opacity-75 uppercase tracking-wide text-[9px] font-bold",
          )}
        >
          <span className="truncate">{item.label}</span>
          {item.units ? <span>{item.units}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

const KpisFrontend: AddonFrontendButton<GenericSystemStatusConfig> = ({
  config,
}) => {
  const channels = useAllMetricChannels()
  const items = buildItems(config, channels)
  if (items.length === 0) return <div className="h-full w-full" />

  // 1-2 metrics: 2-row tile each (icon+value on top, label+units bottom).
  // 3-4 metrics: icon-only rows.
  const showLabel = items.length <= 2
  const orientation = items.length <= 2 ? "flex-col" : "flex-row flex-wrap"
  const tagWidth = items.length <= 2 ? "h-full" : "basis-1/2"
  const tile = (item: KpiItem) => (
    <KpiRowTile key={item.id} item={item} showLabel={showLabel} />
  )

  return (
    <div
      className={cn(
        "flex w-full gap-1 p-1 items-stretch",
        orientation === "flex-col" ? "flex-col h-full" : orientation,
      )}
      style={{ color: "var(--sireno-color-fg)" }}
    >
      {items.map((item) =>
        items.length <= 2 ? (
          tile(item)
        ) : (
          <div
            key={item.id}
            className={cn("min-h-[28px] flex-1 flex", tagWidth)}
          >
            {tile(item)}
          </div>
        ),
      )}
    </div>
  )
}

export default KpisFrontend
