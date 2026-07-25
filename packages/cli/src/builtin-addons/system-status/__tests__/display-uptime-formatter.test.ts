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
  it("emits single largest unit with no unit", () => {
    const r = toDisplayMetric(snap(7320))
    expect(r.formattedValue).toBe("2h")
    expect(r.unit).toBeUndefined()
  })

  it("emits 'Xm' when under one hour", () => {
    const r = toDisplayMetric(snap(540))
    expect(r.formattedValue).toBe("9m")
    expect(r.unit).toBeUndefined()
  })

  it("emits 0m for sub-minute values", () => {
    expect(toDisplayMetric(snap(0)).formattedValue).toBe("0m")
  })

  it("floors negative values to 0", () => {
    expect(toDisplayMetric(snap(-1)).formattedValue).toBe("0m")
  })
})
