export type MetricFormatter =
  | "bytes"
  | "bool"
  | "count"
  | "frequency-ghz"
  | "percent"
  | "rate-bytes"
  | "uptime"

// ponytail: formatters emit value-only; the unit lives in `DisplayMetric.unit`
// so the renderer can style the value and the unit independently (e.g. bigger
// digits + smaller "%" suffix). When the unit is magnitude-dependent (bytes,
// rate-bytes) the formatter picks the right scale and returns both halves.
export interface FormattedValue {
  value: string
  unit?: string
}

export type MetricView = "bars" | "chart" | "kpis"
export type MetricColor = "default" | "success" | "warning" | "danger"

export interface MetricThreshold {
  /** Lower bound, inclusive. Omit for -Infinity. */
  minValue?: number
  /** Upper bound, inclusive. Omit for +Infinity. */
  maxValue?: number
  color: MetricColor
}

export interface DisplayMetric {
  id: SystemMetricId
  label: string
  available: boolean
  // ponytail: numeric/digit portion only — units live in `unit` so the
  // renderer can style them independently. Magnitude-dependent formatters
  // (bytes, rate-bytes) emit a scale-aware unit; static formatters (percent)
  // emit "%"; magnitude-independent formatters (count, frequency-ghz,
  // uptime, bool) emit no unit and let the probe/catalog supply it.
  formattedValue: string
  unit?: string
  value?: number
  max?: number
  percentage?: number
}

export interface MetricDef {
  readonly id: SystemMetricId
  readonly defaultLabel: string
  readonly defaultShortLabel?: string
  readonly icon?: string
  readonly unit?: string
  readonly formatter: MetricFormatter
  readonly views: ReadonlyArray<MetricView>
  /** Upper bound for bar rendering. Omit when bars aren't supported. */
  readonly maxValue?: number
  readonly thresholds?: ReadonlyArray<MetricThreshold>
}

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

export const METRICS_CATALOG: Readonly<Record<string, MetricDef>> = {
  cpu: {
    id: "cpu",
    defaultLabel: "CPU",
    defaultShortLabel: "CPU",
    icon: "icon://cpu",
    unit: "%",
    formatter: "percent",
    views: ["bars", "chart", "kpis"],
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
    views: ["bars", "chart", "kpis"],
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
    defaultShortLabel: "SWP",
    icon: "icon://repeat",
    unit: "%",
    formatter: "percent",
    views: ["bars", "chart", "kpis"],
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
    defaultShortLabel: "DSK",
    icon: "icon://hard-drive",
    unit: "%",
    formatter: "percent",
    views: ["bars", "chart", "kpis"],
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
    defaultShortLabel: "BAT",
    icon: "icon://battery",
    unit: "%",
    formatter: "percent",
    views: ["bars", "chart", "kpis"],
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
    defaultShortLabel: "TMP",
    icon: "icon://thermometer",
    unit: "°C",
    formatter: "count",
    views: ["bars", "chart", "kpis"],
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
    defaultShortLabel: "FRQ",
    icon: "icon://activity",
    unit: "GHz",
    formatter: "frequency-ghz",
    views: ["bars", "chart", "kpis"],
    maxValue: 5,
    thresholds: [{ minValue: 4, color: "success" }],
  },
  load: {
    id: "load",
    defaultLabel: "Load",
    defaultShortLabel: "LD",
    icon: "icon://gauge",
    formatter: "count",
    views: ["bars", "chart", "kpis"],
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
    defaultShortLabel: "GTT",
    icon: "icon://thermometer-sun",
    formatter: "count",
    unit: "°C",
    views: ["bars", "chart", "kpis"],
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
    defaultShortLabel: "GPU",
    icon: "icon://microchip",
    formatter: "percent",
    unit: "%",
    views: ["bars", "chart", "kpis"],
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

export const SYSTEM_METRIC_IDS = Object.keys(
  METRICS_CATALOG,
) as SystemMetricId[]

export type SystemMetricId = keyof typeof METRICS_CATALOG
