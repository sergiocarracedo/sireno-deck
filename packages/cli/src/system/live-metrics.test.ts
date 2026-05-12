import { describe, expect, it } from "vitest"

import { getCpuMetric, getMemoryMetric } from "./live-metrics.js"

describe("live metrics", () => {
  it("normalizes cpu load into a rounded percentage snapshot", async () => {
    const metric = await getCpuMetric({
      currentLoad: async () => ({ currentLoad: 43.6 }) as Awaited<ReturnType<typeof import("systeminformation").default.currentLoad>>,
      mem: async () => ({}) as Awaited<ReturnType<typeof import("systeminformation").default.mem>>,
    })

    expect(metric).toEqual({ label: "44%", percentage: 44 })
  })

  it("derives memory usage from active over total memory", async () => {
    const metric = await getMemoryMetric({
      currentLoad: async () => ({}) as Awaited<ReturnType<typeof import("systeminformation").default.currentLoad>>,
      mem: async () => ({ active: 3, total: 8 }) as Awaited<ReturnType<typeof import("systeminformation").default.mem>>,
    })

    expect(metric).toEqual({ label: "38%", percentage: 38 })
  })
})
