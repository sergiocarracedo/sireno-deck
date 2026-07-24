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
