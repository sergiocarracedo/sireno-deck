import {
  type DisplayMetric,
  FormattedValue,
  MetricFormatter,
  METRICS_CATALOG,
  type SystemMetricSnapshot,
} from "../shared/metrics-catalog"

function formatBytes(value: number): FormattedValue {
  if (value < 1024) return { value: String(value), unit: "B" }
  if (value < 1024 ** 2) return { value: (value / 1024).toFixed(1), unit: "KB" }
  if (value < 1024 ** 3)
    return { value: (value / 1024 ** 2).toFixed(1), unit: "MB" }
  if (value < 1024 ** 4)
    return { value: (value / 1024 ** 3).toFixed(1), unit: "GB" }
  return { value: (value / 1024 ** 4).toFixed(1), unit: "TB" }
}

function formatRateBytes(value: number): FormattedValue {
  const v = Math.max(0, value)
  if (v < 1024) return { value: String(Math.round(v)), unit: "B/s" }
  if (v < 1024 ** 2) return { value: (v / 1024).toFixed(1), unit: "KB/s" }
  if (v < 1024 ** 3) return { value: (v / 1024 ** 2).toFixed(1), unit: "MB/s" }
  if (v < 1024 ** 4) return { value: (v / 1024 ** 3).toFixed(1), unit: "GB/s" }
  return { value: (v / 1024 ** 4).toFixed(1), unit: "TB/s" }
}

function formatBool(value: number): FormattedValue {
  return { value: value >= 0.5 ? "ON" : "OFF" }
}

function formatUptime(totalSeconds: number): FormattedValue {
  const s = Math.max(0, Math.round(totalSeconds))
  const days = Math.floor(s / (24 * 60 * 60))
  const hours = Math.floor(s / (60 * 60))
  const minutes = Math.floor((s % 3600) / 60)

  if (days > 0) return { value: String(days), unit: "d", unitLong: "days" }
  if (hours > 0) return { value: String(hours), unit: "h", unitLong: "hours" }
  return { value: String(minutes), unit: "m", unitLong: "minutes" }
}

function formatValue(
  value: number,
  formatter: MetricFormatter | undefined,
): FormattedValue {
  switch (formatter) {
    case "bytes":
      return formatBytes(value)
    case "bool":
      return formatBool(value)
    case "count":
      return {
        value: value.toFixed(0),
      }
    case "frequency-ghz":
      return { value: value.toFixed(2) }
    case "percent":
      // ponytail: integers when stable, one decimal when low. High values
      // (10%+) hide <1% swing behind integer rounding; low values benefit
      // from precision so a 0.4% idle actually shows as movement.
      return value < 10
        ? { value: value.toFixed(1), unit: "%" }
        : { value: String(Math.round(value)), unit: "%" }
    case "rate-bytes":
      return formatRateBytes(value)
    case "uptime":
      return formatUptime(value)
    default:
      return { value: String(value) }
  }
}

export function resolveFormatter(
  name: string | undefined,
): MetricFormatter | undefined {
  if (!name) return undefined
  const allowed: MetricFormatter[] = [
    "bytes",
    "bool",
    "count",
    "frequency-ghz",
    "percent",
    "rate-bytes",
    "uptime",
  ]
  return (allowed as string[]).includes(name)
    ? (name as MetricFormatter)
    : undefined
}

export function toDisplayMetric(
  snapshot: SystemMetricSnapshot,
  formatterName?: string,
): DisplayMetric {
  const def = METRICS_CATALOG[snapshot.id]!
  const formatter = resolveFormatter(formatterName) ?? def.formatter
  if (!snapshot.available || snapshot.value === undefined) {
    // ponytail: a missing value goes with a missing unit — the renderer
    // shows "—" alone, never "— %" or "— °C".
    return {
      id: snapshot.id,
      label: def.defaultLabel,
      available: false,
      formattedValue: "—",
      unit: def.unit ?? snapshot.unit,
    }
  }
  const formatted = formatValue(snapshot.value, formatter)
  return {
    id: snapshot.id,
    label: def.defaultLabel,
    available: true,
    formattedValue: formatted.value,
    unit: formatted.unit ?? def.unit ?? snapshot.unit,
    ...(formatted.unitLong ? { unitLong: formatted.unitLong } : {}),
    value: snapshot.value,
    ...(snapshot.max !== undefined ? { max: snapshot.max } : {}),
    ...(snapshot.percentage !== undefined
      ? { percentage: snapshot.percentage }
      : {}),
  }
}
