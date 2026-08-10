import { describe, expect, it } from "vitest"

import { toDisplayMetric } from "../domain/display-metrics"
import type { SystemMetricSnapshot } from "../shared/metrics-catalog"

function snap(value: number): SystemMetricSnapshot {
  return {
    available: true,
    id: "uptime",
    label: "uptime",
    value,
  }
}

describe("toDisplayMetric: uptime formatter", () => {
  it("emits hours with a separate unit", () => {
    const r = toDisplayMetric(snap(7320))
    expect(r.formattedValue).toBe("2")
    expect(r.unit).toBe("h")
    expect(r.unitLong).toBe("hours")
  })

  it("emits minutes when under one hour", () => {
    const r = toDisplayMetric(snap(540))
    expect(r.formattedValue).toBe("9")
    expect(r.unit).toBe("m")
    expect(r.unitLong).toBe("minutes")
  })

  it("emits 0m for sub-minute values", () => {
    const r = toDisplayMetric(snap(0))
    expect(r.formattedValue).toBe("0")
    expect(r.unit).toBe("m")
    expect(r.unitLong).toBe("minutes")
  })

  it("floors negative values to 0m", () => {
    const r = toDisplayMetric(snap(-1))
    expect(r.formattedValue).toBe("0")
    expect(r.unit).toBe("m")
    expect(r.unitLong).toBe("minutes")
  })

  it("emits days for multi-day values", () => {
    const r = toDisplayMetric(snap(3 * 24 * 3600 + 4 * 3600))
    expect(r.formattedValue).toBe("3")
    expect(r.unit).toBe("d")
    expect(r.unitLong).toBe("days")
  })

  it("never emits years or compound units", () => {
    const r = toDisplayMetric(snap(400 * 24 * 3600))
    expect(r.formattedValue).toMatch(/^\d+$/)
    expect(r.unit).toBe("d")
    expect(r.unitLong).toBe("days")
  })
})
