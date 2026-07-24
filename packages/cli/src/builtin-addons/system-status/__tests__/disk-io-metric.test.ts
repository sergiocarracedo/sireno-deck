import { describe, expect, it } from "vitest"

import { probeMetric } from "../domain/live-metrics"

describe("probeMetric: disk-io", () => {
  it("returns a snapshot with id='disk-io'", async () => {
    const snap = await probeMetric("disk-io")
    expect(snap.id).toBe("disk-io")
    expect(typeof snap.available).toBe("boolean")
    expect(snap.unit).toBe("B/s")
  })

  it("first sample re-baselines to 0", async () => {
    if (process.platform !== "linux") return
    const first = await probeMetric("disk-io")
    if (!first.available) return
    expect(first.value).toBe(0)
  })

  it("subsequent samples return a non-negative rate", async () => {
    if (process.platform !== "linux") return
    const a = await probeMetric("disk-io")
    await new Promise((r) => setTimeout(r, 50))
    const b = await probeMetric("disk-io")
    if (!a.available || !b.available) return
    expect(b.value).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(b.value)).toBe(true)
  })
})
