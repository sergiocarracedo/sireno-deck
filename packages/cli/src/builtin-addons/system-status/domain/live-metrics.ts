import { cpus, loadavg, totalmem, freemem } from "node:os"
import { statfs, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"

import {
  SYSTEM_METRIC_IDS,
  type SystemMetricId,
  type SystemMetricSnapshot,
} from "./metric-ids"

export { SYSTEM_METRIC_IDS }

interface ProbeResult {
  available: boolean
  max?: number
  percentage?: number
  unit?: string
  value?: number
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

// ponytail: `c.times` from `node:os` are cumulative jiffies since boot — not
// instantaneous. Two back-to-back readings give nearly identical values
// because the ratio barely moves; the metric would look frozen. We cache
// the previous (idle, total) sample and report `(Δtotal - Δidle) / Δtotal`
// as instant CPU usage over the inter-poll window (~1s). First sample has
// no baseline → returns 0 to avoid a misleading one-shot.
let prevCpuSample: { idle: number; total: number } | null = null

async function probeCpu(): Promise<ProbeResult> {
  const list = cpus()
  if (list.length === 0) return { available: false }
  let idle = 0
  let total = 0
  for (const c of list) {
    idle += c.times.idle
    total +=
      c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq
  }
  const prev = prevCpuSample
  // Counter reset (boot, container restart) or first sample → re-baseline.
  if (prev === null || total <= prev.total) {
    prevCpuSample = { idle, total }
    return { available: true, max: 100, percentage: 0, unit: "%", value: 0 }
  }
  const dTotal = total - prev.total
  const dIdle = idle - prev.idle
  prevCpuSample = { idle, total }
  const pct = dTotal > 0 ? clampPercent((1 - dIdle / dTotal) * 100) : 0
  return { available: true, max: 100, percentage: pct, unit: "%", value: pct }
}

async function probeRam(): Promise<ProbeResult> {
  const total = totalmem()
  const used = total - freemem()
  if (total <= 0) return { available: false, unit: "%" }
  const pct = clampPercent((used / total) * 100)
  return { available: true, max: total, percentage: pct, unit: "%", value: pct }
}

// ponytail: Linux only — reads /proc/meminfo SwapTotal/SwapFree in kB.
// Other platforms report unavailable rather than guessing.
async function probeSwap(): Promise<ProbeResult> {
  if (process.platform !== "linux") return { available: false, unit: "%" }
  if (!existsSync("/proc/meminfo")) return { available: false, unit: "%" }
  try {
    const raw = await readFile("/proc/meminfo", "utf8")
    const totalKb = Number.parseInt(
      /SwapTotal:\s*(\d+)\s*kB/.exec(raw)?.[1] ?? "",
      10,
    )
    const freeKb = Number.parseInt(
      /SwapFree:\s*(\d+)\s*kB/.exec(raw)?.[1] ?? "",
      10,
    )
    if (!Number.isFinite(totalKb) || totalKb <= 0) {
      return { available: false, unit: "%" }
    }
    const totalBytes = totalKb * 1024
    const usedBytes = Math.max(0, (totalKb - freeKb) * 1024)
    const pct = clampPercent((usedBytes / totalBytes) * 100)
    return {
      available: true,
      max: totalBytes,
      percentage: pct,
      unit: "%",
      value: pct,
    }
  } catch {
    return { available: false, unit: "%" }
  }
}

async function probeDisk(): Promise<ProbeResult> {
  try {
    const stats = await statfs("/")
    const total = Number(stats.blocks) * Number(stats.bsize)
    const used =
      (Number(stats.blocks) - Number(stats.bfree)) * Number(stats.bsize)
    if (total <= 0) return { available: false, unit: "%" }
    const pct = clampPercent((used / total) * 100)
    return {
      available: true,
      max: total,
      percentage: pct,
      unit: "%",
      value: pct,
    }
  } catch {
    return { available: false, unit: "%" }
  }
}

async function probeNetwork(): Promise<ProbeResult> {
  // ponytail: cheap & portable. Real throughput needs /proc/net/dev per-interface counters.
  const count = cpus().length > 0 ? 1 : 0
  return { available: count > 0, unit: "interfaces", value: count }
}

async function probeBattery(): Promise<ProbeResult> {
  // Linux only: /sys/class/power_supply/BAT0/capacity
  if (process.platform !== "linux") return { available: false, unit: "%" }
  if (!existsSync("/sys/class/power_supply/BAT0/capacity")) {
    return { available: false, unit: "%" }
  }
  try {
    const raw = await readFile("/sys/class/power_supply/BAT0/capacity", "utf8")
    const pct = clampPercent(Number.parseInt(raw.trim(), 10))
    return { available: true, max: 100, percentage: pct, unit: "%", value: pct }
  } catch {
    return { available: false, unit: "%" }
  }
}

async function probeTemperature(): Promise<ProbeResult> {
  // Linux only: /sys/class/thermal/thermal_zone0/temp (millidegrees C)
  if (process.platform !== "linux") return { available: false, unit: "°C" }
  if (!existsSync("/sys/class/thermal/thermal_zone0/temp")) {
    return { available: false, unit: "°C" }
  }
  try {
    const raw = await readFile("/sys/class/thermal/thermal_zone0/temp", "utf8")
    const milli = Number.parseInt(raw.trim(), 10)
    if (!Number.isFinite(milli)) return { available: false, unit: "°C" }
    const celsius = Math.round(milli / 1000)
    return { available: true, unit: "°C", value: celsius }
  } catch {
    return { available: false, unit: "°C" }
  }
}

async function probeUptime(): Promise<ProbeResult> {
  const sec = Math.round(process.uptime())
  return { available: true, unit: "s", value: sec }
}

async function probeFrequency(): Promise<ProbeResult> {
  // ponytail: os.cpus()[i].speed is unreliable on Linux (often 0). Fall back to /proc/cpuinfo MHz.
  const list = cpus()
  const fromOs = list.find(
    (c) => typeof c.speed === "number" && c.speed > 0,
  )?.speed
  if (typeof fromOs === "number" && fromOs > 0) {
    const ghz = Number((fromOs / 1000).toFixed(2))
    return { available: true, unit: "GHz", value: ghz }
  }
  if (process.platform === "linux" && existsSync("/proc/cpuinfo")) {
    try {
      const raw = await readFile("/proc/cpuinfo", "utf8")
      const m = raw.match(/cpu MHz\s*:\s*([\d.]+)/)
      if (m && m[1]) {
        const mhz = Number.parseFloat(m[1])
        if (Number.isFinite(mhz) && mhz > 0) {
          const ghz = Number((mhz / 1000).toFixed(2))
          return { available: true, unit: "GHz", value: ghz }
        }
      }
    } catch {
      // fall through
    }
  }
  return { available: false, unit: "GHz" }
}

async function probeLoad(): Promise<ProbeResult> {
  const [one] = loadavg()
  if (one === undefined || !Number.isFinite(one)) {
    return { available: false }
  }
  return { available: true, value: Number(one.toFixed(2)) }
}

async function probeProcesses(): Promise<ProbeResult> {
  if (process.platform === "linux" && existsSync("/proc")) {
    try {
      const { readdir } = await import("node:fs/promises")
      const entries = await readdir("/proc")
      const count = entries.filter((e) => /^\d+$/.test(e)).length
      return { available: count > 0, unit: "procs", value: count }
    } catch {
      return { available: false, unit: "procs" }
    }
  }
  // ponytail: no portable process count without a dep; report unavailable elsewhere.
  return { available: false, unit: "procs" }
}

const PROBES: Record<SystemMetricId, () => Promise<ProbeResult>> = {
  cpu: probeCpu,
  ram: probeRam,
  swap: probeSwap,
  disk: probeDisk,
  network: probeNetwork,
  battery: probeBattery,
  temperature: probeTemperature,
  uptime: probeUptime,
  frequency: probeFrequency,
  load: probeLoad,
  processes: probeProcesses,
}

export async function probeMetric(
  id: SystemMetricId,
): Promise<SystemMetricSnapshot> {
  const probe = PROBES[id]
  try {
    const r = await probe()
    return {
      available: r.available,
      id,
      label: id,
      ...(r.max !== undefined ? { max: r.max } : {}),
      ...(r.percentage !== undefined ? { percentage: r.percentage } : {}),
      ...(r.unit !== undefined ? { unit: r.unit } : {}),
      ...(r.value !== undefined ? { value: r.value } : {}),
    }
  } catch {
    return { available: false, id, label: id }
  }
}

export async function probeMetrics(
  ids: readonly SystemMetricId[],
): Promise<SystemMetricSnapshot[]> {
  return Promise.all(ids.map(probeMetric))
}
