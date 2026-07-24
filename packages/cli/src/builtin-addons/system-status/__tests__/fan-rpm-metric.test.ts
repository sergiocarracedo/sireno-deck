import { describe, expect, it } from "vitest"

import { probeMetric } from "../domain/live-metrics"

describe("probeMetric: fan-rpm", () => {
  it("returns a snapshot with id='fan-rpm'", async () => {
    const snap = await probeMetric("fan-rpm")
    expect(snap.id).toBe("fan-rpm")
    expect(typeof snap.available).toBe("boolean")
    expect(snap.unit).toBe("RPM")
  })

  it("on Linux, when available returns positive RPM", async () => {
    if (process.platform !== "linux") return
    const snap = await probeMetric("fan-rpm")
    if (!snap.available) return
    expect(snap.value).toBeGreaterThan(0)
  })
})
