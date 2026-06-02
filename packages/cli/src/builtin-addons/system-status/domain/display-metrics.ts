import numbro from 'numbro'

import type {
  CanonicalSystemMetricSnapshot,
  SystemMetricId,
} from './live-metrics.js'

export type SystemStatusFormatter =
  | 'bytes'
  | 'count'
  | 'frequency-ghz'
  | 'percent'
  | 'uptime'

export interface SystemStatusMetricOverride {
  color?: string
  formatter?: SystemStatusFormatter
  icon?: string
  label?: string
  unavailable_label?: string
  units?: string
}

export interface SystemStatusDisplayMetric {
  available: boolean
  color?: string
  formattedValue: string
  icon?: string
  id: SystemMetricId
  label: string
  raw: CanonicalSystemMetricSnapshot
  units?: string
}

function formatUptime(totalSeconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(roundedSeconds / 3600)
  const minutes = Math.floor((roundedSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

function formatMetricValue(
  metric: CanonicalSystemMetricSnapshot,
  formatter?: SystemStatusFormatter,
): string {
  if (!metric.available || metric.value === undefined) {
    return '--'
  }

  switch (formatter) {
    case 'bytes':
      return numbro(metric.value).format({
        average: true,
        base: 'decimal',
        mantissa: 1,
        output: 'byte',
        trimMantissa: true,
      })
    case 'count':
      return numbro(metric.value).format({
        average: true,
        mantissa: metric.value >= 100 ? 0 : 1,
        trimMantissa: true,
      })
    case 'frequency-ghz':
      return numbro(metric.value).format({ mantissa: 2, trimMantissa: true })
    case 'percent':
      return numbro(metric.value / 100).format({ mantissa: 0, output: 'percent' })
    case 'uptime':
      return formatUptime(metric.value)
    default:
      return metric.label
  }
}

function getDefaultFormatter(metricId: SystemMetricId):
  | SystemStatusFormatter
  | undefined {
  switch (metricId) {
    case 'cpu_usage':
    case 'memory_usage':
    case 'swap_usage':
      return 'percent'
    case 'cpu_frequency':
    case 'cpu_max_frequency':
      return 'frequency-ghz'
    case 'fan_speed':
    case 'system_load':
      return 'count'
    case 'uptime':
      return 'uptime'
  }
}

function getDefaultLabel(metricId: SystemMetricId): string {
  switch (metricId) {
    case 'cpu_frequency':
      return 'CPU Freq'
    case 'cpu_max_frequency':
      return 'CPU Max'
    case 'cpu_usage':
      return 'CPU'
    case 'fan_speed':
      return 'Fan'
    case 'memory_usage':
      return 'RAM'
    case 'swap_usage':
      return 'Swap'
    case 'system_load':
      return 'Load'
    case 'uptime':
      return 'Uptime'
  }
}

function getDefaultUnits(metric: CanonicalSystemMetricSnapshot):
  | string
  | undefined {
  switch (metric.id) {
    case 'cpu_usage':
    case 'memory_usage':
    case 'swap_usage':
      return '%'
    case 'cpu_frequency':
    case 'cpu_max_frequency':
      return 'GHz'
    case 'fan_speed':
      return 'RPM'
    default:
      return undefined
  }
}

export function toSystemStatusDisplayMetric(
  metric: CanonicalSystemMetricSnapshot,
  overrides: SystemStatusMetricOverride = {},
): SystemStatusDisplayMetric {
  if (!metric.available) {
    return {
      available: false,
      ...(overrides.color ? { color: overrides.color } : {}),
      formattedValue: overrides.unavailable_label ?? '--',
      ...(overrides.icon ? { icon: overrides.icon } : {}),
      id: metric.id,
      label: overrides.label ?? getDefaultLabel(metric.id),
      raw: metric,
      units: overrides.units ?? metric.unit,
    }
  }

  const formatter = overrides.formatter ?? getDefaultFormatter(metric.id)

  return {
    available: true,
    ...(overrides.color ? { color: overrides.color } : {}),
    formattedValue: formatMetricValue(metric, formatter),
    ...(overrides.icon ? { icon: overrides.icon } : {}),
    id: metric.id,
    label: overrides.label ?? getDefaultLabel(metric.id),
    raw: metric,
    units: overrides.units ?? getDefaultUnits(metric),
  }
}
