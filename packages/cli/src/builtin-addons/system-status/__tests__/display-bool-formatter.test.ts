import { describe, expect, it } from "vitest"

import { toDisplayMetric } from "../domain/display-metrics"
import type { SystemMetricSnapshot } from "../shared/metrics-catalog"

function snap(value: number): SystemMetricSnapshot {
  return {
    available: true,
    id: "cpu-boost",
    label: "cpu-boost",
    value,
  }
}

describe("toDisplayMetric: bool formatter", () => {
  it("renders 1 as 'ON'", () => {
    expect(toDisplayMetric(snap(1)).formattedValue).toBe("ON")
  })

  it("renders 0 as 'OFF'", () => {
    expect(toDisplayMetric(snap(0)).formattedValue).toBe("OFF")
  })

  it("rounds non-binary numerics to nearest (0.5+ → ON)", () => {
    expect(toDisplayMetric(snap(0.7)).formattedValue).toBe("ON")
    expect(toDisplayMetric(snap(0.3)).formattedValue).toBe("OFF")
  })

  it("renders unavailable snapshot as '—' with no unit", () => {
    const s: SystemMetricSnapshot = {
      available: false,
      id: "cpu-boost",
      label: "cpu-boost",
    }
    const r = toDisplayMetric(s)
    expect(r.formattedValue).toBe("—")
    expect(r.unit).toBeUndefined()
  })
})
