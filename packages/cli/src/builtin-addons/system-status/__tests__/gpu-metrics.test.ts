import { describe, expect, it } from "vitest"

import { probeMetric } from "../domain/live-metrics"

describe("probeMetric: gpu-temp", () => {
  it("returns a snapshot with id='gpu-temp' and unit '°C'", async () => {
    const snap = await probeMetric("gpu-temp")
    expect(snap.id).toBe("gpu-temp")
    expect(typeof snap.available).toBe("boolean")
    expect(snap.unit).toBe("°C")
  })

  it("on Linux, when available returns a finite temperature", async () => {
    if (process.platform !== "linux") return
    const snap = await probeMetric("gpu-temp")
    if (!snap.available) return
    expect(Number.isFinite(snap.value)).toBe(true)
  })
})

describe("probeMetric: gpu-usage", () => {
  it("returns a snapshot with id='gpu-usage' and unit '%'", async () => {
    const snap = await probeMetric("gpu-usage")
    expect(snap.id).toBe("gpu-usage")
    expect(typeof snap.available).toBe("boolean")
    expect(snap.unit).toBe("%")
  })

  it("on Linux, when available returns percentage in 0..100", async () => {
    if (process.platform !== "linux") return
    const snap = await probeMetric("gpu-usage")
    if (!snap.available) return
    expect(snap.percentage).toBeGreaterThanOrEqual(0)
    expect(snap.percentage).toBeLessThanOrEqual(100)
  })
})
