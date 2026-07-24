import { describe, expect, it } from "vitest"

import { probeMetric } from "../domain/live-metrics"

describe("probeMetric: cpu-boost", () => {
  it("returns a snapshot with id='cpu-boost'", async () => {
    const snap = await probeMetric("cpu-boost")
    expect(snap.id).toBe("cpu-boost")
    expect(typeof snap.available).toBe("boolean")
  })

  it("on Linux with cpufreq/boost, value is 0 or 1", async () => {
    if (process.platform !== "linux") return
    const snap = await probeMetric("cpu-boost")
    if (!snap.available) return
    expect([0, 1]).toContain(snap.value)
    expect(snap.unit).toBe("")
  })
})
