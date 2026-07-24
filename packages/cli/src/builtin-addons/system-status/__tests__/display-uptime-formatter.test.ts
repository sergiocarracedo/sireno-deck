import { describe, expect, it } from "vitest"

import { toDisplayMetric } from "../domain/display-metrics"
import type { SystemMetricSnapshot } from "../domain/metric-ids"

function snap(value: number): SystemMetricSnapshot {
  return {
    available: true,
    id: "uptime",
    label: "uptime",
    value,
  }
}

describe("toDisplayMetric: uptime formatter", () => {
  it("emits compound 'Xh Ym' with no unit", () => {
    const r = toDisplayMetric(snap(7320))
    expect(r.formattedValue).toBe("2h 2m")
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
