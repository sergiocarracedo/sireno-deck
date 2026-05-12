import si from "systeminformation"

export interface MetricSnapshot {
  label: string
  percentage: number
}

export interface LiveMetricsClient {
  currentLoad: typeof si.currentLoad
  mem: typeof si.mem
}

const defaultClient: LiveMetricsClient = {
  currentLoad: si.currentLoad,
  mem: si.mem,
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

export async function getCpuMetric(client: LiveMetricsClient = defaultClient): Promise<MetricSnapshot> {
  const load = await client.currentLoad()
  const percentage = clampPercentage(load.currentLoad)

  return {
    label: `${percentage}%`,
    percentage,
  }
}

export async function getMemoryMetric(client: LiveMetricsClient = defaultClient): Promise<MetricSnapshot> {
  const memory = await client.mem()
  const percentage = memory.total > 0
    ? clampPercentage((memory.active / memory.total) * 100)
    : 0

  return {
    label: `${percentage}%`,
    percentage,
  }
}
