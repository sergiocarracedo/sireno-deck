import { describe, expect, it } from "vitest"

import { probeMetric } from "../domain/live-metrics"

describe("probeMetric: temperature", () => {
  it("returns a snapshot with id='temperature' and unit '°C'", async () => {
    const snap = await probeMetric("temperature")
    expect(snap.id).toBe("temperature")
    expect(typeof snap.available).toBe("boolean")
    expect(snap.unit).toBe("°C")
  })

  it("on Linux, when available returns a plausible CPU temperature", async () => {
    if (process.platform !== "linux") return
    const snap = await probeMetric("temperature")
    if (!snap.available) return
    expect(Number.isFinite(snap.value)).toBe(true)
    expect(snap.value).toBeGreaterThan(0)
    expect(snap.value).toBeLessThan(150)
  })
})
