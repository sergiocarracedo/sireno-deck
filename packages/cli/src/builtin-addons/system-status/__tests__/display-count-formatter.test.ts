import { describe, expect, it } from "vitest"

import { toDisplayMetric } from "../domain/display-metrics"
import type { SystemMetricSnapshot } from "../shared/metrics-catalog"

function snap(value: number): SystemMetricSnapshot {
  return {
    available: true,
    id: "temperature",
    label: "temperature",
    value,
    unit: "°C",
  }
}

function snapFreq(value: number): SystemMetricSnapshot {
  return {
    available: true,
    id: "frequency",
    label: "frequency",
    value,
    unit: "GHz",
  }
}

describe("toDisplayMetric: count + frequency-ghz unit passthrough", () => {
  it("count keeps unit from snapshot/probe", () => {
    const r = toDisplayMetric(snap(17.0))
    expect(r.formattedValue).toBe("17.0")
    expect(r.unit).toBe("°C")
  })

  it("count rounds >= 100", () => {
    const r = toDisplayMetric({ ...snap(150), id: "fan-rpm", unit: "RPM" })
    expect(r.formattedValue).toBe("150")
    expect(r.unit).toBe("RPM")
  })

  it("frequency-ghz keeps unit from snapshot/probe", () => {
    const r = toDisplayMetric(snapFreq(3.4))
    expect(r.formattedValue).toBe("3.40")
    expect(r.unit).toBe("GHz")
  })

  it("unit defaults to def.unit when snapshot has none (e.g. load)", () => {
    const r = toDisplayMetric({
      available: true,
      id: "load",
      label: "load",
      value: 1.5,
    })
    expect(r.formattedValue).toBe("1.5")
    expect(r.unit).toBeUndefined()
  })
})
