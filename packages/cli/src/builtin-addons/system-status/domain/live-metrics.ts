import { readFileSync } from "node:fs"

import type {
  SystemStatusMetricId,
  CanonicalSystemMetricSnapshot,
} from "../schemas"

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB", "TB"]
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

const readBatteryLinux = (): number | undefined => {
  try {
    const raw = readFileSync("/sys/class/power_supply/BAT0/capacity", "utf8")
    const pct = Number.parseInt(raw.trim(), 10)
    return Number.isFinite(pct) ? pct : undefined
  } catch {
    return undefined
  }
}

const collectMetric = (
  id: SystemStatusMetricId,
): CanonicalSystemMetricSnapshot => {
  switch (id) {
    case "cpu_usage": {
      const cpus = (
        globalThis as { os?: { cpus?: () => unknown[] } }
      ).os?.cpus?.()
      if (!cpus || cpus.length === 0) {
        return { id, available: false, formattedValue: "N/A" }
      }
      const usage =
        cpus.reduce((sum, cpu) => {
          const c = cpu as {
            times: {
              user: number
              nice: number
              sys: number
              idle: number
              irq: number
            }
          }
          const total =
            c.times.user +
            c.times.nice +
            c.times.sys +
            c.times.idle +
            c.times.irq
          const idle = c.times.idle
          return sum + (total > 0 ? ((total - idle) / total) * 100 : 0)
        }, 0) / cpus.length
      return {
        id,
        available: true,
        percentage: Math.round(usage),
        formattedValue: `${Math.round(usage)}%`,
      }
    }
    case "memory_usage": {
      const os = (
        globalThis as {
          os?: { totalmem?: () => number; freemem?: () => number }
        }
      ).os
      if (!os?.totalmem || !os?.freemem) {
        return { id, available: false, formattedValue: "N/A" }
      }
      const total = os.totalmem()
      const free = os.freemem()
      const used = total - free
      const pct = total > 0 ? (used / total) * 100 : 0
      return {
        id,
        available: true,
        value: used,
        max: total,
        percentage: Math.round(pct),
        formattedValue: formatBytes(used),
      }
    }
    case "swap_usage":
      return { id, available: false, formattedValue: "N/A" }
    case "fan_speed":
      return { id, available: false, formattedValue: "N/A" }
    case "uptime": {
      const os = (globalThis as { os?: { uptime?: () => number } }).os
      if (!os?.uptime) {
        return { id, available: false, formattedValue: "N/A" }
      }
      const secs = Math.floor(os.uptime())
      const h = Math.floor(secs / 3600)
      const m = Math.floor((secs % 3600) / 60)
      return { id, available: true, value: secs, formattedValue: `${h}h ${m}m` }
    }
    case "battery": {
      const pct = readBatteryLinux()
      if (pct === undefined) {
        return { id, available: false, formattedValue: "N/A" }
      }
      return {
        id,
        available: true,
        percentage: pct,
        formattedValue: `${pct}%`,
      }
    }
    case "load_average_1m": {
      const os = (globalThis as { os?: { loadavg?: () => number[] } }).os
      const load = os?.loadavg?.()[0]
      return {
        id,
        available: typeof load === "number",
        ...(typeof load === "number"
          ? { value: load, formattedValue: load.toFixed(2) }
          : {}),
        formattedValue: typeof load === "number" ? load.toFixed(2) : "N/A",
      }
    }
  }
}

export const getCanonicalSystemMetrics = async (
  metricIds: readonly SystemStatusMetricId[],
): Promise<readonly CanonicalSystemMetricSnapshot[]> => {
  return Promise.resolve(metricIds.map(collectMetric))
}
