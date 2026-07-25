import { SystemMetricId } from "../shared/metrics-catalog"

export interface ChartSample {
  at: number
  value: number
}

export type ChartSamplerState = {
  samples: Partial<Record<SystemMetricId, ReadonlyArray<ChartSample>>>
}

export const RING_CAPACITY = 60
export const CHART_HISTORY_CHANNEL = "runtime:system-status:chart-history"

function createRingBuffer(): {
  feed: (id: SystemMetricId, value: number, at: number) => void
  state: () => ChartSamplerState
} {
  const buffers = new Map<SystemMetricId, ChartSample[]>()

  const feed = (id: SystemMetricId, value: number, at: number): void => {
    let buf = buffers.get(id)
    if (buf === undefined) {
      buf = []
      buffers.set(id, buf)
    }
    buf.push({ at, value })
    if (buf.length > RING_CAPACITY) buf.shift()
  }

  const state = (): ChartSamplerState => {
    const samples: Record<string, ReadonlyArray<ChartSample>> = {}
    for (const [id, buf] of buffers) samples[id] = buf
    return { samples }
  }

  return { feed, state }
}

let sampler: ReturnType<typeof createRingBuffer> | null = null

export function feedSampler(
  id: SystemMetricId,
  value: number,
  at: number,
): void {
  if (sampler === null) sampler = createRingBuffer()
  sampler.feed(id, value, at)
}

export function getSamplerState(): ChartSamplerState {
  if (sampler === null) return { samples: {} }
  return sampler.state()
}

export function resetSampler(): void {
  sampler = null
}
