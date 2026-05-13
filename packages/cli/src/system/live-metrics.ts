import si from "systeminformation"

export interface MetricSnapshot {
  label: string
  percentage: number
}

export interface FanSnapshot {
  available: boolean
  label?: string
  source?: string
}

interface GraphicsControllerSnapshot {
  fanSpeed?: number
  model?: string
  vendor?: string
}

interface GraphicsSnapshot {
  controllers?: GraphicsControllerSnapshot[]
}

export interface LiveMetricsClient {
  currentLoad: typeof si.currentLoad
  graphics: typeof si.graphics
  mem: typeof si.mem
}

const defaultClient: LiveMetricsClient = {
  currentLoad: si.currentLoad,
  graphics: si.graphics,
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

export async function getFanMetric(client: LiveMetricsClient = defaultClient): Promise<FanSnapshot> {
  let graphics: GraphicsSnapshot

  try {
    graphics = await client.graphics() as GraphicsSnapshot
  } catch {
    return { available: false }
  }

  const controller = graphics.controllers?.find((candidate) => (
    typeof candidate.fanSpeed === "number" &&
    Number.isFinite(candidate.fanSpeed) &&
    candidate.fanSpeed >= 0
  ))

  if (!controller) {
    return { available: false }
  }

  const speed = Math.round(controller.fanSpeed ?? 0)
  const source = controller.model?.trim() || controller.vendor?.trim()

  return {
    available: true,
    label: `${speed} RPM`,
    source: source && source.length > 0 ? source : undefined,
  }
}
