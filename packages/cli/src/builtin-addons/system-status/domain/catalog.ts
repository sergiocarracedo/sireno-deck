import type { SystemStatusFormatter } from "./display-metrics"
import { SYSTEM_METRIC_IDS, type SystemMetricId } from "./metric-ids"

export { SYSTEM_METRIC_IDS }

export type MetricView = "bars" | "kpis"
export type MetricColor = "default" | "success" | "warning" | "danger"

export interface MetricThreshold {
  /** Lower bound, inclusive. Omit for -Infinity. */
  minValue?: number
  /** Upper bound, inclusive. Omit for +Infinity. */
  maxValue?: number
  color: MetricColor
}

export interface MetricDef {
  readonly id: SystemMetricId
  readonly defaultLabel: string
  readonly icon?: string
  readonly unit?: string
  readonly formatter: SystemStatusFormatter
  readonly views: ReadonlyArray<MetricView>
  /** Upper bound for bar rendering. Omit when bars aren't supported. */
  readonly maxValue?: number
  readonly thresholds?: ReadonlyArray<MetricThreshold>
}

export const METRICS_CATALOG: Readonly<Record<SystemMetricId, MetricDef>> = {
  cpu: {
    id: "cpu",
    defaultLabel: "CPU",
    icon: "icon://cpu",
    unit: "%",
    formatter: "percent",
    views: ["bars", "kpis"],
    maxValue: 100,
    thresholds: [
      { maxValue: 70, color: "default" },
      { minValue: 70, maxValue: 90, color: "warning" },
      { minValue: 90, color: "danger" },
    ],
  },
  ram: {
    id: "ram",
    defaultLabel: "RAM",
    icon: "icon://memory-stick",
    unit: "%",
    formatter: "percent",
    views: ["bars", "kpis"],
    maxValue: 100,
    thresholds: [
      { maxValue: 70, color: "default" },
      { minValue: 70, maxValue: 90, color: "warning" },
      { minValue: 90, color: "danger" },
    ],
  },
  swap: {
    id: "swap",
    defaultLabel: "Swap",
    icon: "icon://repeat",
    unit: "%",
    formatter: "percent",
    views: ["bars", "kpis"],
    maxValue: 100,
    thresholds: [
      { maxValue: 50, color: "default" },
      { minValue: 50, maxValue: 80, color: "warning" },
      { minValue: 80, color: "danger" },
    ],
  },
  disk: {
    id: "disk",
    defaultLabel: "Disk",
    icon: "icon://hard-drive",
    unit: "%",
    formatter: "percent",
    views: ["bars", "kpis"],
    maxValue: 100,
    thresholds: [
      { maxValue: 70, color: "default" },
      { minValue: 70, maxValue: 90, color: "warning" },
      { minValue: 90, color: "danger" },
    ],
  },
  battery: {
    id: "battery",
    defaultLabel: "Battery",
    icon: "icon://battery",
    unit: "%",
    formatter: "percent",
    views: ["bars", "kpis"],
    maxValue: 100,
    thresholds: [
      { minValue: 40, color: "default" },
      { minValue: 20, maxValue: 40, color: "warning" },
      { maxValue: 20, color: "danger" },
    ],
  },
  temperature: {
    id: "temperature",
    defaultLabel: "Temp",
    icon: "icon://thermometer",
    unit: "°C",
    formatter: "count",
    views: ["bars", "kpis"],
    maxValue: 100,
    thresholds: [
      { maxValue: 70, color: "default" },
      { minValue: 70, maxValue: 85, color: "warning" },
      { minValue: 85, color: "danger" },
    ],
  },
  frequency: {
    id: "frequency",
    defaultLabel: "Freq",
    icon: "icon://activity",
    unit: "GHz",
    formatter: "frequency-ghz",
    views: ["bars", "kpis"],
    maxValue: 5,
    thresholds: [{ minValue: 4, color: "success" }],
  },
  load: {
    id: "load",
    defaultLabel: "Load",
    icon: "icon://gauge",
    formatter: "count",
    views: ["bars", "kpis"],
    maxValue: 100,
    thresholds: [
      { maxValue: 50, color: "default" },
      { minValue: 50, maxValue: 80, color: "warning" },
      { minValue: 80, color: "danger" },
    ],
  },
  // ponytail: these three have no meaningful `maxValue` — bars would lie.
  // Catalog pins them to kpis-only; the bars frontend renders nothing for
  // them if a config sneaks them in.
  processes: {
    id: "processes",
    defaultLabel: "Procs",
    icon: "icon://boxes",
    formatter: "count",
    views: ["kpis"],
  },
  network: {
    id: "network",
    defaultLabel: "Net",
    icon: "icon://network",
    formatter: "count",
    views: ["kpis"],
  },
  uptime: {
    id: "uptime",
    defaultLabel: "Uptime",
    icon: "icon://clock",
    formatter: "uptime",
    views: ["kpis"],
  },
  "cpu-boost": {
    id: "cpu-boost",
    defaultLabel: "Boost",
    icon: "icon://zap",
    formatter: "bool",
    views: ["kpis"],
    thresholds: [{ minValue: 1, maxValue: 1, color: "success" }],
  },
  "cpu-voltages": {
    id: "cpu-voltages",
    defaultLabel: "Vcore",
    icon: "icon://bolt",
    formatter: "count",
    unit: "V",
    views: ["kpis"],
  },
  "disk-io": {
    id: "disk-io",
    defaultLabel: "Disk I/O",
    icon: "icon://arrow-down-up",
    formatter: "rate-bytes",
    views: ["kpis"],
  },
  "fan-rpm": {
    id: "fan-rpm",
    defaultLabel: "Fan",
    icon: "icon://fan",
    formatter: "count",
    unit: "RPM",
    views: ["kpis"],
  },
  "gpu-temp": {
    id: "gpu-temp",
    defaultLabel: "GPU Temp",
    icon: "icon://thermometer-sun",
    formatter: "count",
    unit: "°C",
    views: ["bars", "kpis"],
    maxValue: 100,
    thresholds: [
      { maxValue: 70, color: "default" },
      { minValue: 70, maxValue: 85, color: "warning" },
      { minValue: 85, color: "danger" },
    ],
  },
  "gpu-usage": {
    id: "gpu-usage",
    defaultLabel: "GPU",
    icon: "icon://microchip",
    formatter: "percent",
    unit: "%",
    views: ["bars", "kpis"],
    maxValue: 100,
    thresholds: [
      { maxValue: 70, color: "default" },
      { minValue: 70, maxValue: 90, color: "warning" },
      { minValue: 90, color: "danger" },
    ],
  },
  "network-read": {
    id: "network-read",
    defaultLabel: "Net RX",
    icon: "icon://arrow-down",
    formatter: "rate-bytes",
    views: ["kpis"],
  },
  "network-write": {
    id: "network-write",
    defaultLabel: "Net TX",
    icon: "icon://arrow-up",
    formatter: "rate-bytes",
    views: ["kpis"],
  },
} as const

if (
  Object.keys(METRICS_CATALOG).sort().join(",") !==
  [...SYSTEM_METRIC_IDS].sort().join(",")
) {
  throw new Error(
    "METRICS_CATALOG drift: every SystemMetricId must have a MetricDef",
  )
}

/**
 * Resolve the threshold color for a given value. Both bounds are inclusive.
 * When multiple thresholds match, the **last defined** one wins — let users
 * stack thresholds from broad to narrow without surprise overrides.
 */
export function resolveThresholdColor(
  value: number,
  thresholds?: ReadonlyArray<MetricThreshold>,
): MetricColor {
  if (thresholds === undefined || thresholds.length === 0) return "default"
  let result: MetricColor = "default"
  for (const t of thresholds) {
    const min = t.minValue ?? -Infinity
    const max = t.maxValue ?? Infinity
    if (value >= min && value <= max) result = t.color
  }
  return result
}

/**
 * Convert a MetricColor to a CSS-color string for the UI surfaces.
 * `default` returns undefined — the surface keeps its own primary color.
 */
export function thresholdColorHex(color: MetricColor): string | undefined {
  switch (color) {
    case "danger":
      return "#ef4444"
    case "warning":
      return "#f59e0b"
    case "success":
      return "#22c55e"
    case "default":
      return undefined
  }
}
