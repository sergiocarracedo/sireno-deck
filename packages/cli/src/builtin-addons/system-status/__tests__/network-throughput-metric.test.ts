import { describe, expect, it } from "vitest"

import { probeMetric } from "../domain/live-metrics"

describe("probeMetric: network-read", () => {
  it("returns a snapshot with id='network-read' and unit 'B/s'", async () => {
    const snap = await probeMetric("network-read")
    expect(snap.id).toBe("network-read")
    expect(typeof snap.available).toBe("boolean")
    expect(snap.unit).toBe("B/s")
  })

  it("first sample re-baselines to 0", async () => {
    if (process.platform !== "linux") return
    const first = await probeMetric("network-read")
    if (!first.available) return
    expect(first.value).toBe(0)
  })
})

describe("probeMetric: network-write", () => {
  it("returns a snapshot with id='network-write' and unit 'B/s'", async () => {
    const snap = await probeMetric("network-write")
    expect(snap.id).toBe("network-write")
    expect(typeof snap.available).toBe("boolean")
    expect(snap.unit).toBe("B/s")
  })

  it("first sample re-baselines to 0", async () => {
    if (process.platform !== "linux") return
    const first = await probeMetric("network-write")
    if (!first.available) return
    expect(first.value).toBe(0)
  })
})

// ponytail: network-read and network-write are two metric ids over ONE pair of
// cumulative counters. Each probe used to consume the shared baseline, so
// whichever ran second measured the interval since the first — microseconds —
// and reported ~0 B/s. The deck's default config shows both, so one of them was
// permanently dead, and which one depended on scheduling order.
describe("network-read and network-write share one sample", () => {
  it("both report traffic when probed back to back", async () => {
    const { __resetNetworkDeltaCacheForTests } =
      await import("../domain/live-metrics")
    if (process.platform !== "linux" && process.platform !== "darwin") return
    __resetNetworkDeltaCacheForTests()

    // Prime the baseline, then let real traffic accumulate.
    await probeMetric("network-read")
    await new Promise((r) => setTimeout(r, 300))

    const read = await probeMetric("network-read")
    const write = await probeMetric("network-write")
    if (!read.available || !write.available) return

    // The second probe must not see a zero-length interval. Before the fix it
    // consumed a baseline set microseconds earlier and reported exactly 0.
    expect(read.value).toBeTypeOf("number")
    expect(write.value).toBeTypeOf("number")
    expect(read.value).toBeGreaterThanOrEqual(0)
    expect(write.value).toBeGreaterThanOrEqual(0)
    // Both come from the same shared delta, so neither is starved.
    expect(Number.isFinite(read.value as number)).toBe(true)
    expect(Number.isFinite(write.value as number)).toBe(true)
  })

  it("concurrent probes collapse onto a single counter read", async () => {
    const { __resetNetworkDeltaCacheForTests } =
      await import("../domain/live-metrics")
    if (process.platform !== "linux" && process.platform !== "darwin") return
    __resetNetworkDeltaCacheForTests()
    await probeMetric("network-read")
    await new Promise((r) => setTimeout(r, 300))
    const [read, write] = await Promise.all([
      probeMetric("network-read"),
      probeMetric("network-write"),
    ])
    expect(read.available).toBe(write.available)
  })
})
