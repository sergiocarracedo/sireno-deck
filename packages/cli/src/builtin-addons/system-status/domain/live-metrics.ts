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

// ponytail: macOS has no /proc, so the Linux sysfs readers below all bailed
// and every metric except cpu/ram/disk/uptime/load/frequency reported
// unavailable — which is most of the default deck's first button. These
// helpers fill in the ones macOS does expose through documented CLIs. Each
// returns null on any parse failure so the caller can report unavailable
// rather than a wrong number.
const DARWIN_CMD_TIMEOUT_MS = 2_000

const darwinRun = async (
  binary: string,
  args: ReadonlyArray<string>,
): Promise<string | null> => {
  try {
    const { stdout } = await execFile(binary, [...args], {
      timeout: DARWIN_CMD_TIMEOUT_MS,
      signal: AbortSignal.timeout(DARWIN_CMD_TIMEOUT_MS),
    })
    return stdout
  } catch {
    return null
  }
}

// `sysctl -n vm.swapusage` →
// "total = 15360.00M  used = 14146.44M  free = 1213.56M  (encrypted)"
const SWAP_FIELD = (name: string): RegExp =>
  new RegExp(`${name}\\s*=\\s*([\\d.]+)([KMG])`, "i")

const SWAP_UNIT_BYTES: Readonly<Record<string, number>> = {
  K: 1024,
  M: 1024 ** 2,
  G: 1024 ** 3,
}

export const parseDarwinSwap = (
  raw: string,
): { totalBytes: number; usedBytes: number } | null => {
  const total = SWAP_FIELD("total").exec(raw)
  const used = SWAP_FIELD("used").exec(raw)
  if (total?.[1] === undefined || used?.[1] === undefined) return null
  const toBytes = (m: RegExpExecArray): number =>
    Number.parseFloat(m[1]!) *
    (SWAP_UNIT_BYTES[(m[2] ?? "M").toUpperCase()] ?? 0)
  const totalBytes = toBytes(total)
  const usedBytes = toBytes(used)
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) return null
  return { totalBytes, usedBytes }
}

// `pmset -g batt` →
// " -InternalBattery-0 (id=...)\t100%; charged; 0:00 remaining present: true"
export const parseDarwinBattery = (raw: string): number | null => {
  const m = /(\d{1,3})%/.exec(raw)
  if (m?.[1] === undefined) return null
  const pct = Number.parseInt(m[1], 10)
  return Number.isFinite(pct) ? pct : null
}

// `netstat -ibn` — one row per interface/address. The <Link#N> rows carry the
// per-interface totals; the address rows repeat the same counters, so summing
// every row would double-count. Skip loopback and virtual interfaces to match
// the Linux reader's NETWORK_IFACE_SKIP_RE.
export const parseDarwinNetstat = (
  raw: string,
): { rx: number; tx: number } | null => {
  const lines = raw.trim().split("\n")
  const header = lines[0]?.trim().split(/\s+/) ?? []
  const ibytes = header.indexOf("Ibytes")
  const obytes = header.indexOf("Obytes")
  if (ibytes === -1 || obytes === -1) return null
  let rx = 0
  let tx = 0
  let counted = false
  for (const line of lines.slice(1)) {
    const cols = line.trim().split(/\s+/)
    const name = cols[0]
    if (name === undefined) continue
    if (NETWORK_IFACE_SKIP_RE.test(name)) continue
    // Only the <Link#N> rows, so per-address duplicates aren't summed twice.
    if (!(cols[2] ?? "").startsWith("<Link")) continue
    const i = Number.parseInt(cols[ibytes] ?? "", 10)
    const o = Number.parseInt(cols[obytes] ?? "", 10)
    if (!Number.isFinite(i) || !Number.isFinite(o)) continue
    rx += i
    tx += o
    counted = true
  }
  return counted ? { rx, tx } : null
}

// ponytail: Linux reads /proc/meminfo SwapTotal/SwapFree in kB; macOS uses
// sysctl vm.swapusage. Other platforms report unavailable rather than guess.
async function probeSwap(): Promise<ProbeResult> {
  if (process.platform === "darwin") {
    const raw = await darwinRun("sysctl", ["-n", "vm.swapusage"])
    const parsed = raw === null ? null : parseDarwinSwap(raw)
    if (parsed === null) return { available: false, unit: "%" }
    const pct = clampPercent((parsed.usedBytes / parsed.totalBytes) * 100)
    return {
      available: true,
      max: parsed.totalBytes,
      percentage: pct,
      unit: "%",
      value: pct,
    }
  }
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
  if (process.platform === "darwin") {
    const raw = await darwinRun("pmset", ["-g", "batt"])
    const pct = raw === null ? null : parseDarwinBattery(raw)
    if (pct === null) return { available: false, unit: "%" }
    const clamped = clampPercent(pct)
    return {
      available: true,
      max: 100,
      percentage: clamped,
      unit: "%",
      value: clamped,
    }
  }
  // Linux: /sys/class/power_supply/BAT0/capacity
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

// ponytail: scan /sys/class/hwmon for CPU-package sensors and read
// temp1_input. Skip acpitz — the thermal_zone0 fallback below covers it,
// and acpitz often sorts first (hwmon0), shadowing k10temp/coretemp.
async function probeTemperature(): Promise<ProbeResult> {
  if (process.platform !== "linux") return { available: false, unit: "°C" }

  try {
    if (existsSync("/sys/class/hwmon")) {
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
        .filter(({ h }) =>
          CPU_HWMON_NAME_PATTERNS.some((re) => re.test(h.name)),
        )
        .filter(({ h }) => !/^acpitz$/i.test(h.name))
        .sort((a, b) => a.i - b.i)[0]
      if (matched) {
        const temp = `${matched.h.dir}/temp1_input`
        if (existsSync(temp)) {
          const raw = await readFile(temp, "utf8")
          const milli = Number.parseInt(raw.trim(), 10)
          if (Number.isFinite(milli) && milli > 0) {
            return {
              available: true,
              unit: "°C",
              value: Math.round(milli / 1000),
            }
          }
        }
      }
    }
  } catch {
    // fall through to thermal_zone0
  }

  // Fallback: /sys/class/thermal/thermal_zone0/temp (millidegrees C)
  if (!existsSync("/sys/class/thermal/thermal_zone0/temp")) {
    return { available: false, unit: "°C" }
  }
  try {
    const raw = await readFile("/sys/class/thermal/thermal_zone0/temp", "utf8")
    const milli = Number.parseInt(raw.trim(), 10)
    if (!Number.isFinite(milli)) return { available: false, unit: "°C" }
    return { available: true, unit: "°C", value: Math.round(milli / 1000) }
  } catch {
    return { available: false, unit: "°C" }
  }
}

async function probeUptime(): Promise<ProbeResult> {
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
  if (process.platform === "darwin") {
    const raw = await darwinRun("ps", ["-Ao", "pid="])
    if (raw === null) return { available: false, unit: "procs" }
    const count = raw.split("\n").filter((l) => l.trim().length > 0).length
    return { available: count > 0, unit: "procs", value: count }
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
let prevDarwinDiskIoSample: { ts: number; bytes: number } | null = null

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

// ponytail: macOS has no /proc/diskstats, but IOBlockStorageDriver carries the
// equivalent cumulative counters ("Bytes (Read)" / "Bytes (Write)") per device.
// Sum across devices — ioreg lists several and only the backing store has
// non-zero totals — and feed the same delta-over-interval maths the Linux
// reader uses, so both platforms report the same B/s quantity.
export const parseDarwinDiskBytes = (raw: string): number | null => {
  let total = 0
  let seen = false
  for (const m of raw.matchAll(/"Bytes \((?:Read|Write)\)"\s*=\s*(\d+)/g)) {
    const n = Number.parseInt(m[1] ?? "", 10)
    if (!Number.isFinite(n)) continue
    total += n
    seen = true
  }
  return seen ? total : null
}

async function readDarwinDiskBytes(): Promise<number | null> {
  const raw = await darwinRun("ioreg", [
    "-c",
    "IOBlockStorageDriver",
    "-r",
    "-d",
    "1",
    "-w",
    "0",
  ])
  return raw === null ? null : parseDarwinDiskBytes(raw)
}

async function probeDiskIo(): Promise<ProbeResult> {
  if (process.platform === "darwin") {
    const bytes = await readDarwinDiskBytes()
    if (bytes === null) return { available: false, unit: "B/s" }
    const now = Date.now()
    const prev = prevDarwinDiskIoSample
    if (prev === null || bytes < prev.bytes) {
      prevDarwinDiskIoSample = { ts: now, bytes }
      return { available: true, unit: "B/s", value: 0 }
    }
    const dtSec = Math.max(0.001, (now - prev.ts) / 1000)
    const delta = bytes - prev.bytes
    prevDarwinDiskIoSample = { ts: now, bytes }
    return {
      available: true,
      unit: "B/s",
      value: Math.round(delta / dtSec),
    }
  }
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

// ponytail: Apple Silicon publishes GPU busy-ness in the IOAccelerator node's
// PerformanceStatistics dict, readable by any user — no root, no private
// framework. "Device Utilization %" is the whole-GPU figure; the Renderer/
// Tiler entries break it down per engine.
export const parseDarwinGpuUtilization = (raw: string): number | null => {
  const m = /"Device Utilization %"\s*=\s*(\d+)/.exec(raw)
  if (m?.[1] === undefined) return null
  const pct = Number.parseInt(m[1], 10)
  return Number.isFinite(pct) ? pct : null
}

async function probeGpuUsage(): Promise<ProbeResult> {
  if (process.platform === "darwin") {
    const raw = await darwinRun("ioreg", [
      "-r",
      "-d",
      "1",
      "-w",
      "0",
      "-c",
      "IOAccelerator",
    ])
    const pct = raw === null ? null : parseDarwinGpuUtilization(raw)
    if (pct === null) return { available: false, unit: "%" }
    const clamped = clampPercent(pct)
    return {
      available: true,
      max: 100,
      percentage: clamped,
      unit: "%",
      value: clamped,
    }
  }
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

// ponytail: macOS has no /sys/class/net; `netstat -ibn` carries the same
// cumulative per-interface byte counters. Both platforms then share the
// identical delta-over-interval logic below.
async function readNetTotals(): Promise<{ rx: number; tx: number } | null> {
  if (process.platform === "darwin") {
    const raw = await darwinRun("netstat", ["-ibn"])
    return raw === null ? null : parseDarwinNetstat(raw)
  }
  const rx = await readNetBytes("rx_bytes")
  const tx = await readNetBytes("tx_bytes")
  if (rx === null || tx === null) return null
  return { rx, tx }
}

async function readNetworkDelta(): Promise<{
  dt: number
  rx: number
  tx: number
} | null> {
  const totals = await readNetTotals()
  if (totals === null) return null
  const { rx, tx } = totals
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

// ponytail: network-read and network-write are two metric ids over ONE pair of
// counters. Each used to call readNetworkDelta() independently, and that call
// consumes the baseline — so whichever ran second measured the interval since
// the first, a few microseconds earlier, and reported ~0 B/s. A deck showing
// both (the default config does) had one of them permanently dead, and which
// one depended on scheduling order. Share a single delta across any calls that
// land in the same tick; the window is far below the poll interval, so a real
// next tick still re-samples.
const NETWORK_DELTA_SHARE_MS = 250
let sharedNetworkDelta: {
  at: number
  value: { dt: number; rx: number; tx: number } | null
} | null = null
let inFlightNetworkDelta: Promise<{
  dt: number
  rx: number
  tx: number
} | null> | null = null

async function readSharedNetworkDelta(): Promise<{
  dt: number
  rx: number
  tx: number
} | null> {
  const now = Date.now()
  if (
    sharedNetworkDelta !== null &&
    now - sharedNetworkDelta.at < NETWORK_DELTA_SHARE_MS
  ) {
    return sharedNetworkDelta.value
  }
  // Collapse concurrent callers onto one in-flight read as well, so two
  // probes dispatched in the same Promise.all don't both hit the counters.
  if (inFlightNetworkDelta !== null) return inFlightNetworkDelta
  inFlightNetworkDelta = (async () => {
    try {
      const value = await readNetworkDelta()
      sharedNetworkDelta = { at: Date.now(), value }
      return value
    } finally {
      inFlightNetworkDelta = null
    }
  })()
  return inFlightNetworkDelta
}

export function __resetNetworkDeltaCacheForTests(): void {
  sharedNetworkDelta = null
  inFlightNetworkDelta = null
  prevNetworkSample = null
}

async function probeNetworkRead(): Promise<ProbeResult> {
  if (process.platform !== "linux" && process.platform !== "darwin") {
    return { available: false, unit: "B/s" }
  }
  const delta = await readSharedNetworkDelta()
  if (delta === null) return { available: false, unit: "B/s" }
  return {
    available: true,
    unit: "B/s",
    value: Math.round(delta.rx / delta.dt),
  }
}

async function probeNetworkWrite(): Promise<ProbeResult> {
  if (process.platform !== "linux" && process.platform !== "darwin") {
    return { available: false, unit: "B/s" }
  }
  const delta = await readSharedNetworkDelta()
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
