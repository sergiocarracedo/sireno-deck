import { METRICS_CATALOG } from "./catalog"
import type { SystemMetricSnapshot } from "./metric-ids"

export type SystemStatusFormatter =
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
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  // ponytail: uptime is a compound format (h + m) with no separable unit —
  // emit the whole string as value and let `unit` stay undefined so the
  // renderer doesn't append a stray "s".
  return { value: h > 0 ? `${h}h ${m}m` : `${m}m` }
}

function formatValue(
  value: number,
  formatter: SystemStatusFormatter | undefined,
): FormattedValue {
  switch (formatter) {
    case "bytes":
      return formatBytes(value)
    case "bool":
      return formatBool(value)
    case "count":
      return {
        value: value >= 100 ? String(Math.round(value)) : value.toFixed(1),
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
): SystemStatusFormatter | undefined {
  if (!name) return undefined
  const allowed: SystemStatusFormatter[] = [
    "bytes",
    "bool",
    "count",
    "frequency-ghz",
    "percent",
    "rate-bytes",
    "uptime",
  ]
  return (allowed as string[]).includes(name)
    ? (name as SystemStatusFormatter)
    : undefined
}

export interface DisplayMetric {
  id: import("./metric-ids").SystemMetricId
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

export function toDisplayMetric(
  snapshot: SystemMetricSnapshot,
  formatterName?: string,
): DisplayMetric {
  const def = METRICS_CATALOG[snapshot.id]
  const formatter = resolveFormatter(formatterName) ?? def.formatter
  if (!snapshot.available || snapshot.value === undefined) {
    // ponytail: a missing value goes with a missing unit — the renderer
    // shows "—" alone, never "— %" or "— °C".
    return {
      id: snapshot.id,
      label: def.defaultLabel,
      available: false,
      formattedValue: "—",
    }
  }
  const formatted = formatValue(snapshot.value, formatter)
  return {
    id: snapshot.id,
    label: def.defaultLabel,
    available: true,
    formattedValue: formatted.value,
    unit: formatted.unit ?? def.unit ?? snapshot.unit,
    value: snapshot.value,
    ...(snapshot.max !== undefined ? { max: snapshot.max } : {}),
    ...(snapshot.percentage !== undefined
      ? { percentage: snapshot.percentage }
      : {}),
  }
}
