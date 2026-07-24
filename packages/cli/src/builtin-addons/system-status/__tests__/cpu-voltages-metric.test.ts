import { describe, expect, it } from "vitest"

import { probeMetric } from "../domain/live-metrics"

describe("probeMetric: cpu-voltages", () => {
  it("returns a snapshot with id='cpu-voltages'", async () => {
    const snap = await probeMetric("cpu-voltages")
    expect(snap.id).toBe("cpu-voltages")
    expect(typeof snap.available).toBe("boolean")
    expect(snap.unit).toBe("V")
  })

  it("on Linux with a CPU hwmon, returns volts in 0..5", async () => {
    if (process.platform !== "linux") return
    const snap = await probeMetric("cpu-voltages")
    if (!snap.available) return
    expect(snap.value).toBeGreaterThan(0)
    expect(snap.value).toBeLessThan(5)
  })
})
