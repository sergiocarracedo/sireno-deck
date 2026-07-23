import type { SystemMetricId, SystemMetricSnapshot } from "./metric-ids"

export type SystemStatusFormatter =
  | "bytes"
  | "count"
  | "frequency-ghz"
  | "percent"
  | "uptime"

const DEFAULT_FORMATTERS: Record<SystemMetricId, SystemStatusFormatter | undefined> = {
  cpu: "percent",
  ram: "percent",
  disk: "percent",
  network: "count",
  battery: "percent",
  temperature: "count",
  uptime: "uptime",
  frequency: "frequency-ghz",
  load: "count",
  processes: "count",
}

const DEFAULT_LABELS: Record<SystemMetricId, string> = {
  cpu: "CPU",
  ram: "RAM",
  disk: "Disk",
  network: "Net",
  battery: "Battery",
  temperature: "Temp",
  uptime: "Uptime",
  frequency: "Freq",
  load: "Load",
  processes: "Procs",
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`
  if (value < 1024 ** 4) return `${(value / 1024 ** 3).toFixed(1)} GB`
  return `${(value / 1024 ** 4).toFixed(1)} TB`
}

function formatUptime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatValue(
  value: number,
  formatter: SystemStatusFormatter | undefined,
): string {
  switch (formatter) {
    case "bytes":
      return formatBytes(value)
    case "count":
      return value >= 100 ? String(Math.round(value)) : value.toFixed(1)
    case "frequency-ghz":
      return value.toFixed(2)
    case "percent":
      return `${Math.round(value)}%`
    case "uptime":
      return formatUptime(value)
    default:
      return String(value)
  }
}

export function resolveFormatter(
  name: string | undefined,
): SystemStatusFormatter | undefined {
  if (!name) return undefined
  const allowed: SystemStatusFormatter[] = [
    "bytes",
    "count",
    "frequency-ghz",
    "percent",
    "uptime",
  ]
  return (allowed as string[]).includes(name)
    ? (name as SystemStatusFormatter)
    : undefined
}

export interface DisplayMetric {
  id: SystemMetricId
  label: string
  available: boolean
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
  const id = snapshot.id
  const formatter = resolveFormatter(formatterName) ?? DEFAULT_FORMATTERS[id]
  const base = {
    id,
    label: DEFAULT_LABELS[id],
    available: snapshot.available,
    unit: snapshot.unit,
  }
  if (!snapshot.available || snapshot.value === undefined) {
    return { ...base, formattedValue: "—" }
  }
  return {
    ...base,
    formattedValue: formatValue(snapshot.value, formatter),
    value: snapshot.value,
    ...(snapshot.max !== undefined ? { max: snapshot.max } : {}),
    ...(snapshot.percentage !== undefined ? { percentage: snapshot.percentage } : {}),
  }
}