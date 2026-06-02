import si from 'systeminformation'

export const SYSTEM_METRIC_IDS = [
  'cpu_frequency',
  'cpu_max_frequency',
  'cpu_usage',
  'fan_speed',
  'memory_usage',
  'swap_usage',
  'system_load',
  'uptime',
] as const

export type SystemMetricId = (typeof SYSTEM_METRIC_IDS)[number]

export interface CanonicalSystemMetricSnapshot {
  available: boolean
  id: SystemMetricId
  label: string
  max?: number
  percentage?: number
  source?: string
  unit?: string
  value?: number
}

interface CpuSnapshot {
  speed?: number
  speedMax?: number
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
  cpu: typeof si.cpu
  currentLoad: typeof si.currentLoad
  graphics: typeof si.graphics
  mem: typeof si.mem
  time: typeof si.time
}

const defaultClient: LiveMetricsClient = {
  cpu: si.cpu,
  currentLoad: si.currentLoad,
  graphics: si.graphics,
  mem: si.mem,
  time: si.time,
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

function createUnavailableMetric(
  id: SystemMetricId,
  options: {
    label?: string
    source?: string
    unit?: string
  } = {},
): CanonicalSystemMetricSnapshot {
  return {
    available: false,
    id,
    label: options.label ?? 'Unavailable',
    ...(options.source ? { source: options.source } : {}),
    ...(options.unit ? { unit: options.unit } : {}),
  }
}

function createAvailableMetric(
  id: SystemMetricId,
  options: {
    label: string
    max?: number
    percentage?: number
    source?: string
    unit?: string
    value: number
  },
): CanonicalSystemMetricSnapshot {
  return {
    available: true,
    id,
    label: options.label,
    ...(options.max !== undefined ? { max: options.max } : {}),
    ...(options.percentage !== undefined ? { percentage: options.percentage } : {}),
    ...(options.source ? { source: options.source } : {}),
    ...(options.unit ? { unit: options.unit } : {}),
    value: options.value,
  }
}

async function getCpuUsageMetric(
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot> {
  const load = await client.currentLoad()
  const percentage = clampPercentage(load.currentLoad)

  return createAvailableMetric('cpu_usage', {
    label: `${percentage}%`,
    max: 100,
    percentage,
    unit: '%',
    value: percentage,
  })
}

async function getMemoryUsageMetric(
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot> {
  const memory = await client.mem()
  const percentage = memory.total > 0
    ? clampPercentage((memory.active / memory.total) * 100)
    : 0

  return createAvailableMetric('memory_usage', {
    label: `${percentage}%`,
    max: memory.total > 0 ? memory.total : undefined,
    percentage,
    unit: 'B',
    value: memory.active,
  })
}

async function getSwapUsageMetric(
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot> {
  const memory = await client.mem()
  if (memory.swaptotal <= 0) {
    return createUnavailableMetric('swap_usage', { unit: 'B' })
  }

  const percentage = clampPercentage((memory.swapused / memory.swaptotal) * 100)

  return createAvailableMetric('swap_usage', {
    label: `${percentage}%`,
    max: memory.swaptotal,
    percentage,
    unit: 'B',
    value: memory.swapused,
  })
}

async function getFanMetric(client: LiveMetricsClient = defaultClient): Promise<{
  available: boolean
  label?: string
  source?: string
}> {
  let graphics: GraphicsSnapshot

  try {
    graphics = await client.graphics() as GraphicsSnapshot
  } catch {
    return { available: false }
  }

  const controller = graphics.controllers?.find((candidate) => (
    typeof candidate.fanSpeed === 'number'
    && Number.isFinite(candidate.fanSpeed)
    && candidate.fanSpeed >= 0
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

async function getFanSpeedMetric(
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot> {
  const fan = await getFanMetric(client)
  if (!fan.available || !fan.label) {
    return createUnavailableMetric('fan_speed', {
      ...(fan.source ? { source: fan.source } : {}),
      unit: 'rpm',
    })
  }

  const value = Number.parseInt(fan.label, 10)
  if (!Number.isFinite(value)) {
    return createUnavailableMetric('fan_speed', {
      ...(fan.source ? { source: fan.source } : {}),
      unit: 'rpm',
    })
  }

  return createAvailableMetric('fan_speed', {
    label: fan.label,
    ...(fan.source ? { source: fan.source } : {}),
    unit: 'rpm',
    value,
  })
}

async function getCpuFrequencyMetric(
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot> {
  const cpu = await client.cpu() as CpuSnapshot
  if (typeof cpu.speed !== 'number' || !Number.isFinite(cpu.speed) || cpu.speed <= 0) {
    return createUnavailableMetric('cpu_frequency', { unit: 'GHz' })
  }

  return createAvailableMetric('cpu_frequency', {
    label: `${cpu.speed.toFixed(2)} GHz`,
    unit: 'GHz',
    value: cpu.speed,
  })
}

async function getCpuMaxFrequencyMetric(
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot> {
  const cpu = await client.cpu() as CpuSnapshot
  if (typeof cpu.speedMax !== 'number' || !Number.isFinite(cpu.speedMax) || cpu.speedMax <= 0) {
    return createUnavailableMetric('cpu_max_frequency', { unit: 'GHz' })
  }

  return createAvailableMetric('cpu_max_frequency', {
    label: `${cpu.speedMax.toFixed(2)} GHz`,
    unit: 'GHz',
    value: cpu.speedMax,
  })
}

async function getSystemLoadMetric(
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot> {
  const load = await client.currentLoad()
  const value = Number.isFinite(load.avgLoad) ? Number(load.avgLoad.toFixed(2)) : 0

  return createAvailableMetric('system_load', {
    label: value.toFixed(2),
    value,
  })
}

async function getUptimeMetric(
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot> {
  const time = await client.time()
  if (typeof time.uptime !== 'number' || !Number.isFinite(time.uptime) || time.uptime < 0) {
    return createUnavailableMetric('uptime', { unit: 'seconds' })
  }

  return createAvailableMetric('uptime', {
    label: `${Math.round(time.uptime)}s`,
    unit: 'seconds',
    value: time.uptime,
  })
}

async function getCanonicalSystemMetric(
  metricId: SystemMetricId,
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot> {
  switch (metricId) {
    case 'cpu_frequency':
      return getCpuFrequencyMetric(client)
    case 'cpu_max_frequency':
      return getCpuMaxFrequencyMetric(client)
    case 'cpu_usage':
      return getCpuUsageMetric(client)
    case 'fan_speed':
      return getFanSpeedMetric(client)
    case 'memory_usage':
      return getMemoryUsageMetric(client)
    case 'swap_usage':
      return getSwapUsageMetric(client)
    case 'system_load':
      return getSystemLoadMetric(client)
    case 'uptime':
      return getUptimeMetric(client)
  }
}

export async function getCanonicalSystemMetrics(
  metricIds: readonly SystemMetricId[],
  client: LiveMetricsClient = defaultClient,
): Promise<CanonicalSystemMetricSnapshot[]> {
  return Promise.all(metricIds.map((metricId) => getCanonicalSystemMetric(metricId, client)))
}
