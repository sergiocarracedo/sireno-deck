import { useAddonChannel } from "@/api/react"

import {
  METRICS_CATALOG,
  SYSTEM_METRIC_IDS,
  type SystemMetricId,
  type SystemMetricSnapshot,
} from "../domain"

export interface MetricPayload {
  available: boolean
  value?: number
  percentage?: number
  max?: number
  unit?: string
}

export function readSnapshot(
  payload: MetricPayload | undefined,
  id: SystemMetricId,
): SystemMetricSnapshot {
  if (!payload)
    return { available: false, id, label: METRICS_CATALOG[id].defaultLabel }
  return {
    available: payload.available,
    id,
    label: METRICS_CATALOG[id].defaultLabel,
    ...(payload.max !== undefined ? { max: payload.max } : {}),
    ...(payload.percentage !== undefined
      ? { percentage: payload.percentage }
      : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.value !== undefined ? { value: payload.value } : {}),
  }
}

export function useAllMetricChannels(): Record<
  SystemMetricId,
  MetricPayload | undefined
> {
  const cpu = useAddonChannel<MetricPayload>("runtime:system-status:cpu")
  const ram = useAddonChannel<MetricPayload>("runtime:system-status:ram")
  const swap = useAddonChannel<MetricPayload>("runtime:system-status:swap")
  const disk = useAddonChannel<MetricPayload>("runtime:system-status:disk")
  const network = useAddonChannel<MetricPayload>(
    "runtime:system-status:network",
  )
  const battery = useAddonChannel<MetricPayload>(
    "runtime:system-status:battery",
  )
  const temperature = useAddonChannel<MetricPayload>(
    "runtime:system-status:temperature",
  )
  const uptime = useAddonChannel<MetricPayload>("runtime:system-status:uptime")
  const frequency = useAddonChannel<MetricPayload>(
    "runtime:system-status:frequency",
  )
  const load = useAddonChannel<MetricPayload>("runtime:system-status:load")
  const processes = useAddonChannel<MetricPayload>(
    "runtime:system-status:processes",
  )
  const cpuBoost = useAddonChannel<MetricPayload>(
    "runtime:system-status:cpu-boost",
  )
  const cpuVoltages = useAddonChannel<MetricPayload>(
    "runtime:system-status:cpu-voltages",
  )
  const diskIo = useAddonChannel<MetricPayload>("runtime:system-status:disk-io")
  const fanRpm = useAddonChannel<MetricPayload>("runtime:system-status:fan-rpm")
  const gpuTemp = useAddonChannel<MetricPayload>(
    "runtime:system-status:gpu-temp",
  )
  const gpuUsage = useAddonChannel<MetricPayload>(
    "runtime:system-status:gpu-usage",
  )
  const networkRead = useAddonChannel<MetricPayload>(
    "runtime:system-status:network-read",
  )
  const networkWrite = useAddonChannel<MetricPayload>(
    "runtime:system-status:network-write",
  )
  return {
    cpu: cpu.data,
    ram: ram.data,
    swap: swap.data,
    disk: disk.data,
    network: network.data,
    battery: battery.data,
    temperature: temperature.data,
    uptime: uptime.data,
    frequency: frequency.data,
    load: load.data,
    processes: processes.data,
    "cpu-boost": cpuBoost.data,
    "cpu-voltages": cpuVoltages.data,
    "disk-io": diskIo.data,
    "fan-rpm": fanRpm.data,
    "gpu-temp": gpuTemp.data,
    "gpu-usage": gpuUsage.data,
    "network-read": networkRead.data,
    "network-write": networkWrite.data,
  }
}

const isMetricId = (id: string): id is SystemMetricId =>
  (SYSTEM_METRIC_IDS as readonly string[]).includes(id)

export function resolveMetricId(entry: unknown): SystemMetricId | null {
  if (typeof entry === "string") return isMetricId(entry) ? entry : null
  if (entry && typeof entry === "object" && "id" in entry) {
    const id = (entry as { id: unknown }).id
    if (typeof id === "string" && isMetricId(id)) return id
  }
  return null
}

export function pickLabel(entry: unknown, fallback: string): string {
  if (entry && typeof entry === "object" && "label" in entry) {
    const value = (entry as { label?: unknown }).label
    if (typeof value === "string" && value.length > 0) return value
  }
  return fallback
}
