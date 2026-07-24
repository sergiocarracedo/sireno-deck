import { describe, expect, it } from "vitest"

import { toDisplayMetric } from "../domain/display-metrics"
import type { SystemMetricSnapshot } from "../domain/metric-ids"

function snap(value: number): SystemMetricSnapshot {
  return {
    available: true,
    id: "cpu",
    label: "cpu",
    percentage: value,
    unit: "%",
    value,
  }
}

describe("toDisplayMetric: percent formatter", () => {
  it("rounds to integer when value >= 10 — value-only, unit in .unit", () => {
    expect(toDisplayMetric(snap(21)).formattedValue).toBe("21")
    expect(toDisplayMetric(snap(21)).unit).toBe("%")
    expect(toDisplayMetric(snap(69.4)).formattedValue).toBe("69")
    expect(toDisplayMetric(snap(100)).formattedValue).toBe("100")
  })

  it("shows one decimal when value < 10", () => {
    expect(toDisplayMetric(snap(5.4)).formattedValue).toBe("5.4")
    expect(toDisplayMetric(snap(5.4)).unit).toBe("%")
    expect(toDisplayMetric(snap(0.4)).formattedValue).toBe("0.4")
    expect(toDisplayMetric(snap(9.9)).formattedValue).toBe("9.9")
  })

  it("boundary at 10 stays integer", () => {
    expect(toDisplayMetric(snap(10)).formattedValue).toBe("10")
    expect(toDisplayMetric(snap(9.99)).formattedValue).toBe("10.0")
  })
})
