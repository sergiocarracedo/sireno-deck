import { describe, expect, it } from "vitest"

import { probeMetric, SYSTEM_METRIC_IDS } from "../domain/live-metrics"

describe("probeMetric: swap", () => {
  it("swap is registered in SYSTEM_METRIC_IDS", () => {
    expect(SYSTEM_METRIC_IDS).toContain("swap")
  })

  it("returns a snapshot with id='swap'", async () => {
    const snap = await probeMetric("swap")
    expect(snap.id).toBe("swap")
    // ponytail: on non-Linux platforms or missing /proc/meminfo, returns
    // available=false. We only assert the id is wired; availability is
    // platform-dependent.
    expect(typeof snap.available).toBe("boolean")
  })

  it("on Linux returns percentage in 0-100 when /proc/meminfo is readable", () => {
    if (process.platform !== "linux") return
    return probeMetric("swap").then((snap) => {
      if (!snap.available) return
      expect(snap.max).toBeGreaterThan(0)
      expect(snap.percentage).toBeGreaterThanOrEqual(0)
      expect(snap.percentage).toBeLessThanOrEqual(100)
    })
  })
})
