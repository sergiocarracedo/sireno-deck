import { execFile as execFileCb } from "node:child_process"
import { existsSync } from "node:fs"
import { readFile, readdir, statfs } from "node:fs/promises"
import { cpus, freemem, loadavg, totalmem, uptime as osUptime } from "node:os"
import { promisify } from "node:util"

import {
  SYSTEM_METRIC_IDS,
  type SystemMetricId,
  type SystemMetricSnapshot,
} from "../shared/metrics-catalog"

// ponytail: vite-plugin-oxc (vitest transform) doesn't recognise
// `node:child_process/promises` as a built-in module specifier. The
// promisify path works on every Node ≥14 with zero extra deps.
const execFile = promisify(execFileCb)

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
  return { available: count > 0, unit: "inter.", value: count }
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
  // ponytail: uptime formats as "2h" — single largest unit.
  const sec = Math.round(osUptime())
  return { available: true, value: sec }
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

// ponytail: cpu-boost has two kernel interfaces. cpufreq/boost is the modern
// unified path (1 = enabled, 0 = disabled). Older Intel systems use
// intel_pstate/no_turbo with inverted semantics (0 = boost on). Either
// wins; otherwise the platform just doesn't expose boost and we return
// unavailable rather than guess.
async function probeCpuBoost(): Promise<ProbeResult> {
  if (process.platform !== "linux") {
    return { available: false, unit: "" }
  }
  try {
    if (existsSync("/sys/devices/system/cpu/cpufreq/boost")) {
      const raw = await readFile(
        "/sys/devices/system/cpu/cpufreq/boost",
        "utf8",
      )
      const n = Number.parseInt(raw.trim(), 10)
      if (n === 0 || n === 1) {
        return { available: true, unit: "", value: n }
      }
    }
    if (existsSync("/sys/devices/system/cpu/intel_pstate/no_turbo")) {
      const raw = await readFile(
        "/sys/devices/system/cpu/intel_pstate/no_turbo",
        "utf8",
      )
      const n = Number.parseInt(raw.trim(), 10)
      if (n === 0 || n === 1) {
        return { available: true, unit: "", value: n === 0 ? 1 : 0 }
      }
    }
  } catch {
    // fall through
  }
  return { available: false, unit: "" }
}

const CPU_HWMON_NAME_PATTERNS = [
  /^k10temp$/i,
  /^zenpower$/i,
  /^coretemp$/i,
  /^cpu\b/i,
  /^acpitz$/i,
]

// ponytail: scanning /sys/class/hwmon and matching by name keeps us vendor-
// agnostic. AMD (k10temp/zenpower), Intel (coretemp), and ACPI thermal
// zones all expose CPU voltage on `in0_input` (millivolts). Pick the first
// match by preference order; if the system has none, report unavailable
// rather than guess.
async function probeCpuVoltages(): Promise<ProbeResult> {
  if (process.platform !== "linux") {
    return { available: false, unit: "V" }
  }
  if (!existsSync("/sys/class/hwmon")) {
    return { available: false, unit: "V" }
  }
  try {
    const entries = await readdir("/sys/class/hwmon")
    const hwmons: Array<{ dir: string; name: string }> = []
    for (const e of entries) {
      const namePath = `/sys/class/hwmon/${e}/name`
      if (!existsSync(namePath)) continue
      const name = (await readFile(namePath, "utf8")).trim()
      hwmons.push({ dir: `/sys/class/hwmon/${e}`, name })
    }
    const matched = hwmons
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => CPU_HWMON_NAME_PATTERNS.some((re) => re.test(h.name)))
      .sort((a, b) => a.i - b.i)[0]
    if (!matched) return { available: false, unit: "V" }
    const in0 = `${matched.h.dir}/in0_input`
    if (!existsSync(in0)) return { available: false, unit: "V" }
    const raw = await readFile(in0, "utf8")
    const mv = Number.parseInt(raw.trim(), 10)
    if (!Number.isFinite(mv) || mv <= 0) {
      return { available: false, unit: "V" }
    }
    return {
      available: true,
      unit: "V",
      value: Number((mv / 1000).toFixed(2)),
    }
  } catch {
    return { available: false, unit: "V" }
  }
}

// ponytail: /proc/diskstats sectors are cumulative per whole disk. We sum
// across all whole disks (skip partitions, loop, ram, dm-, md, sr*) and
// report a delta-over-poll-interval byte rate. Same trick as probeCpu —
// the first sample has no baseline, so it returns 0 to avoid a misleading
// "all disks went from 0 → N MB in zero seconds" spike.
const DISKSTATS_SKIP_RE =
  /^(loop|ram|dm-|md|drbd)\d*|^(sr|nbd)\d+$|^[a-z]+\d+_|^dm-/
let prevDiskIoSample: { ts: number; sectors: number } | null = null

async function readDiskstatsSectors(): Promise<number | null> {
  if (!existsSync("/proc/diskstats")) return null
  try {
    const raw = await readFile("/proc/diskstats", "utf8")
    let totalSectors = 0
    for (const line of raw.split("\n")) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 14) continue
      const name = parts[2]
      if (!name || DISKSTATS_SKIP_RE.test(name)) continue
      if (/^(nvme\d+n\d+)p\d+$/.test(name)) continue
      const readSectors = Number.parseInt(parts[5] ?? "", 10)
      const writtenSectors = Number.parseInt(parts[9] ?? "", 10)
      if (!Number.isFinite(readSectors) || !Number.isFinite(writtenSectors)) {
        continue
      }
      totalSectors += readSectors + writtenSectors
    }
    return totalSectors
  } catch {
    return null
  }
}

async function probeDiskIo(): Promise<ProbeResult> {
  if (process.platform !== "linux") {
    return { available: false, unit: "B/s" }
  }
  const sectors = await readDiskstatsSectors()
  if (sectors === null) return { available: false, unit: "B/s" }
  const now = Date.now()
  const prev = prevDiskIoSample
  if (prev === null || sectors < prev.sectors) {
    prevDiskIoSample = { ts: now, sectors }
    return { available: true, unit: "B/s", value: 0 }
  }
  const dtSec = Math.max(0.001, (now - prev.ts) / 1000)
  const dSectors = sectors - prev.sectors
  prevDiskIoSample = { ts: now, sectors }
  const bytesPerSec = Math.round((dSectors * 512) / dtSec)
  return { available: true, unit: "B/s", value: bytesPerSec }
}

// ponytail: hwmon fans expose `fan<N>_input` (RPM). Many systems have none
// (laptops with passive cooling). Pick the first hwmon with any non-zero
// fan reading — keeps the metric meaningful (a "0 RPM" fan isn't a fan).
async function probeFanRpm(): Promise<ProbeResult> {
  if (process.platform !== "linux") {
    return { available: false, unit: "RPM" }
  }
  if (!existsSync("/sys/class/hwmon")) {
    return { available: false, unit: "RPM" }
  }
  try {
    const entries = await readdir("/sys/class/hwmon")
    for (const e of entries) {
      const dir = `/sys/class/hwmon/${e}`
      const files = await readdir(dir).catch(() => [])
      const fans = files.filter((f) => /^fan\d+_input$/.test(f)).sort()
      for (const f of fans) {
        const raw = await readFile(`${dir}/${f}`, "utf8").catch(() => "")
        const rpm = Number.parseInt(raw.trim(), 10)
        if (Number.isFinite(rpm) && rpm > 0) {
          return { available: true, unit: "RPM", value: rpm }
        }
      }
    }
    return { available: false, unit: "RPM" }
  } catch {
    return { available: false, unit: "RPM" }
  }
}

// ponytail: amd/amdgpu publishes busy% on /sys/class/drm/card*/device/
// gpu_busy_percent and temp on the card's hwmon temp1_input. Both are
// first-match across cards. NVIDIA users get a one-shot fallback to
// nvidia-smi (stdlib execFile with a 1.5s ceiling so a missing binary
// doesn't stall the poller). Other vendors (Intel i915, nouveau) report
// unavailable rather than spawn a shell — YAGNI on coverage we can't
// validate in CI.
async function readAmdGpuBusyPercent(): Promise<number | null> {
  if (!existsSync("/sys/class/drm")) return null
  const cards = (await readdir("/sys/class/drm").catch(() => [])).filter((c) =>
    /^card\d+$/.test(c),
  )
  for (const card of cards) {
    const p = `/sys/class/drm/${card}/device/gpu_busy_percent`
    if (!existsSync(p)) continue
    const raw = await readFile(p, "utf8").catch(() => "")
    const pct = Number.parseInt(raw.trim(), 10)
    if (Number.isFinite(pct) && pct >= 0 && pct <= 100) return pct
  }
  return null
}

async function readAmdGpuTempMilliC(): Promise<number | null> {
  if (!existsSync("/sys/class/drm")) return null
  const cards = (await readdir("/sys/class/drm").catch(() => [])).filter((c) =>
    /^card\d+$/.test(c),
  )
  for (const card of cards) {
    const devDir = `/sys/class/drm/${card}/device`
    if (!existsSync(devDir)) continue
    const entries = await readdir(devDir).catch(() => [])
    const hwmons = entries.filter((e) => /^hwmon\d+$/.test(e))
    for (const h of hwmons) {
      const t = `${devDir}/${h}/temp1_input`
      if (!existsSync(t)) continue
      const raw = await readFile(t, "utf8").catch(() => "")
      const milli = Number.parseInt(raw.trim(), 10)
      if (Number.isFinite(milli) && milli > 0) return milli
    }
  }
  return null
}

async function tryNvidiaSmi(field: string): Promise<number | null> {
  try {
    const { stdout } = await execFile(
      "nvidia-smi",
      [`--query-gpu=${field}`, "--format=csv,noheader,nounits"],
      { timeout: 1500, signal: AbortSignal.timeout(1500) },
    )
    const first = stdout.trim().split("\n")[0]?.trim() ?? ""
    const n = Number.parseInt(first, 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

async function probeGpuUsage(): Promise<ProbeResult> {
  if (process.platform !== "linux") {
    return { available: false, unit: "%" }
  }
  const pct = await readAmdGpuBusyPercent()
  if (pct !== null) {
    return {
      available: true,
      max: 100,
      percentage: clampPercent(pct),
      unit: "%",
      value: clampPercent(pct),
    }
  }
  const nvidia = await tryNvidiaSmi("utilization.gpu")
  if (nvidia !== null) {
    return {
      available: true,
      max: 100,
      percentage: clampPercent(nvidia),
      unit: "%",
      value: clampPercent(nvidia),
    }
  }
  return { available: false, unit: "%" }
}

async function probeGpuTemp(): Promise<ProbeResult> {
  if (process.platform !== "linux") {
    return { available: false, unit: "°C" }
  }
  const milli = await readAmdGpuTempMilliC()
  if (milli !== null) {
    return {
      available: true,
      unit: "°C",
      value: Math.round(milli / 1000),
    }
  }
  const nvidia = await tryNvidiaSmi("temperature.gpu")
  if (nvidia !== null && nvidia > 0) {
    return { available: true, unit: "°C", value: nvidia }
  }
  return { available: false, unit: "°C" }
}

// ponytail: /sys/class/net/<iface>/statistics/{rx,tx}_bytes is cumulative
// per interface. Sum across non-loopback, non-virtual ifaces (skip lo,
// docker*, veth*, br-*, tun*, tap*) and report Δbytes / Δt as a rate. The
// first sample re-baselines to 0 to avoid a "100 GB/s on boot" spike.
const NETWORK_IFACE_SKIP_RE =
  /^(lo|docker|veth|br-|tun|tap|virbr|vmnet|vboxnet|awdl|llw|bridge|ipv6tnl|sit|gre|ip6gre|ipip|gretap|erspan)/

let prevNetworkSample: { ts: number; rx: number; tx: number } | null = null

async function readNetBytes(
  field: "rx_bytes" | "tx_bytes",
): Promise<number | null> {
  if (!existsSync("/sys/class/net")) return null
  const ifaces = await readdir("/sys/class/net").catch(() => [])
  let total = 0
  let counted = false
  for (const iface of ifaces) {
    if (NETWORK_IFACE_SKIP_RE.test(iface)) continue
    const p = `/sys/class/net/${iface}/statistics/${field}`
    if (!existsSync(p)) continue
    const raw = await readFile(p, "utf8").catch(() => "")
    const n = Number.parseInt(raw.trim(), 10)
    if (Number.isFinite(n) && n >= 0) {
      total += n
      counted = true
    }
  }
  return counted ? total : null
}

async function readNetworkDelta(): Promise<{
  dt: number
  rx: number
  tx: number
} | null> {
  const rx = await readNetBytes("rx_bytes")
  const tx = await readNetBytes("tx_bytes")
  if (rx === null || tx === null) return null
  const now = Date.now()
  const prev = prevNetworkSample
  if (prev === null || rx < prev.rx || tx < prev.tx) {
    prevNetworkSample = { ts: now, rx, tx }
    return null
  }
  const dt = Math.max(0.001, (now - prev.ts) / 1000)
  prevNetworkSample = { ts: now, rx, tx }
  return { dt, rx: rx - prev.rx, tx: tx - prev.tx }
}

async function probeNetworkRead(): Promise<ProbeResult> {
  if (process.platform !== "linux") {
    return { available: false, unit: "B/s" }
  }
  const delta = await readNetworkDelta()
  if (delta === null) return { available: false, unit: "B/s" }
  return {
    available: true,
    unit: "B/s",
    value: Math.round(delta.rx / delta.dt),
  }
}

async function probeNetworkWrite(): Promise<ProbeResult> {
  if (process.platform !== "linux") {
    return { available: false, unit: "B/s" }
  }
  const delta = await readNetworkDelta()
  if (delta === null) return { available: false, unit: "B/s" }
  return {
    available: true,
    unit: "B/s",
    value: Math.round(delta.tx / delta.dt),
  }
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
  "cpu-boost": probeCpuBoost,
  "cpu-voltages": probeCpuVoltages,
  "disk-io": probeDiskIo,
  "fan-rpm": probeFanRpm,
  "gpu-temp": probeGpuTemp,
  "gpu-usage": probeGpuUsage,
  "network-read": probeNetworkRead,
  "network-write": probeNetworkWrite,
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
