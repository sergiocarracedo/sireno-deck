// ponytail: catalog + shape definitions live here so the frontend can import
// the metric id set without dragging node-only modules into the browser bundle.
// `live-metrics.ts` re-uses these and adds the server-side probe functions.
export const SYSTEM_METRIC_IDS = [
  "cpu",
  "ram",
  "swap",
  "disk",
  "network",
  "battery",
  "temperature",
  "uptime",
  "frequency",
  "load",
  "processes",
  "cpu-boost",
  "cpu-voltages",
  "disk-io",
  "fan-rpm",
  "gpu-temp",
  "gpu-usage",
  "network-read",
  "network-write",
] as const

export type SystemMetricId = (typeof SYSTEM_METRIC_IDS)[number]

export interface SystemMetricSnapshot {
  available: boolean
  id: SystemMetricId
  label: string
  max?: number
  percentage?: number
  unit?: string
  value?: number
}

export interface MetricConfig {
  id: SystemMetricId
  label?: string
}
