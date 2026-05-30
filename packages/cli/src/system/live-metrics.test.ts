import { describe, expect, it } from "vitest"

import {
  getCanonicalSystemMetric,
  getCpuMetric,
  getFanMetric,
  getMemoryMetric,
  getSwapUsageMetric,
  type LiveMetricsClient,
} from "./live-metrics.js"

type LiveMetricsStub = Pick<LiveMetricsClient, "cpu" | "currentLoad" | "graphics" | "mem" | "time">

function createCurrentLoad(currentLoad: number) {
  return {
    avgLoad: 0,
    cpus: [],
    currentLoad,
    currentLoadGuest: 0,
    currentLoadIdle: 0,
    currentLoadIrq: 0,
    currentLoadNice: 0,
    currentLoadSteal: 0,
    currentLoadSystem: 0,
    currentLoadUser: 0,
    rawCurrentLoad: 0,
    rawCurrentLoadGuest: 0,
    rawCurrentLoadIdle: 0,
    rawCurrentLoadIrq: 0,
    rawCurrentLoadNice: 0,
    rawCurrentLoadSteal: 0,
    rawCurrentLoadSystem: 0,
    rawCurrentLoadUser: 0,
  }
}

function createGraphics(controllers: Array<{ fanSpeed?: number; model?: string; vendor?: string }>) {
  return {
    controllers: controllers.map((controller) => ({
      bus: "pci",
      model: controller.model ?? "GPU",
      vendor: controller.vendor ?? "Vendor",
      vram: null,
      vramDynamic: false,
      ...controller,
    })),
    displays: [],
  }
}

function createMem(active: number, total: number) {
  return {
    active,
    available: 0,
    buffcache: 0,
    buffers: 0,
    cached: 0,
    dirty: null,
    free: 0,
    reclaimable: 0,
    slab: 0,
    swaptotal: 0,
    swapfree: 0,
    swapused: 0,
    total,
    used: active,
    writeback: null,
  }
}

describe("live metrics", () => {
  const baseStub = {
    cpu: async () => ({ speed: 4.2, speedMax: 5.1 }),
    time: async () => ({ current: 0, timezone: "UTC", timezoneName: "UTC", uptime: 7265 }),
  }

  it("normalizes cpu load into a rounded percentage snapshot", async () => {
    const metric = await getCpuMetric({
      ...baseStub,
      currentLoad: async () => createCurrentLoad(43.6),
      graphics: async () => createGraphics([]),
      mem: async () => createMem(0, 0),
    } satisfies LiveMetricsStub)

    expect(metric).toEqual({ label: "44%", percentage: 44 })
  })

  it("derives memory usage from active over total memory", async () => {
    const metric = await getMemoryMetric({
      ...baseStub,
      currentLoad: async () => createCurrentLoad(0),
      graphics: async () => createGraphics([]),
      mem: async () => createMem(3, 8),
    } satisfies LiveMetricsStub)

    expect(metric).toEqual({ label: "38%", percentage: 38 })
  })

  it("returns the first readable fan sensor as an rpm snapshot", async () => {
    const metric = await getFanMetric({
      ...baseStub,
      currentLoad: async () => createCurrentLoad(0),
      graphics: async () => createGraphics([
        { fanSpeed: 0, model: "Idle Fan" },
        { fanSpeed: 1468.2, model: "RTX 4090" },
      ]),
      mem: async () => createMem(0, 0),
    } satisfies LiveMetricsStub)

    expect(metric).toEqual({ available: true, label: "0 RPM", source: "Idle Fan" })
  })

  it("returns later readable fan sensors when earlier controllers are missing data", async () => {
    const metric = await getFanMetric({
      ...baseStub,
      currentLoad: async () => createCurrentLoad(0),
      graphics: async () => createGraphics([
        { model: "Missing Sensor" },
        { fanSpeed: 1468.2, model: "RTX 4090" },
      ]),
      mem: async () => createMem(0, 0),
    } satisfies LiveMetricsStub)

    expect(metric).toEqual({ available: true, label: "1468 RPM", source: "RTX 4090" })
  })

  it("normalizes missing fan sensors into an unavailable state", async () => {
    const metric = await getFanMetric({
      ...baseStub,
      currentLoad: async () => createCurrentLoad(0),
      graphics: async () => createGraphics([{ model: "No Sensor" }]),
      mem: async () => createMem(0, 0),
    } satisfies LiveMetricsStub)

    expect(metric).toEqual({ available: false })
  })

  it("degrades fan metric failures into an unavailable state", async () => {
    const metric = await getFanMetric({
      ...baseStub,
      currentLoad: async () => createCurrentLoad(0),
      graphics: async () => {
        throw new Error("no graphics access")
      },
      mem: async () => createMem(0, 0),
    } satisfies LiveMetricsStub)

    expect(metric).toEqual({ available: false })
  })

  it("exposes canonical cpu usage snapshots through the shared metric catalog", async () => {
    const metric = await getCanonicalSystemMetric("cpu_usage", {
      ...baseStub,
      currentLoad: async () => createCurrentLoad(43.6),
      graphics: async () => createGraphics([]),
      mem: async () => createMem(0, 0),
    } satisfies LiveMetricsStub)

    expect(metric).toEqual({
      available: true,
      id: "cpu_usage",
      label: "44%",
      max: 100,
      percentage: 44,
      unit: "%",
      value: 44,
    })
  })

  it("keeps swap usage honestly unavailable when the host exposes no swap", async () => {
    const metric = await getSwapUsageMetric({
      ...baseStub,
      currentLoad: async () => createCurrentLoad(0),
      graphics: async () => createGraphics([]),
      mem: async () => createMem(3, 8),
    } satisfies LiveMetricsStub)

    expect(metric).toEqual({
      available: false,
      id: "swap_usage",
      label: "Unavailable",
      unit: "B",
    })
  })
})
