import { describe, expect, it } from "vitest"

import { toDisplayMetric } from "../domain/display-metrics"
import type { SystemMetricSnapshot } from "../shared/metrics-catalog"

function snap(value: number): SystemMetricSnapshot {
  return {
    available: true,
    id: "network-read",
    label: "network-read",
    value,
    unit: "B/s",
  }
}

describe("toDisplayMetric: rate-bytes formatter", () => {
  it("renders sub-KB values as bytes — value+unit separate", () => {
    const r = toDisplayMetric(snap(500))
    expect(r.formattedValue).toBe("500")
    expect(r.unit).toBe("B/s")
  })

  it("renders KB range with one decimal", () => {
    expect(toDisplayMetric(snap(5_242)).formattedValue).toBe("5.1")
    expect(toDisplayMetric(snap(5_242)).unit).toBe("KB/s")
    expect(toDisplayMetric(snap(1_048_576 / 2)).formattedValue).toBe("512.0")
  })

  it("renders MB range with one decimal", () => {
    expect(toDisplayMetric(snap(5_242_880)).formattedValue).toBe("5.0")
    expect(toDisplayMetric(snap(5_242_880)).unit).toBe("MB/s")
  })

  it("renders GB range with one decimal", () => {
    expect(toDisplayMetric(snap(2 * 1024 ** 3)).formattedValue).toBe("2.0")
    expect(toDisplayMetric(snap(2 * 1024 ** 3)).unit).toBe("GB/s")
  })

  it("floors to 0 B/s when value is 0", () => {
    const r = toDisplayMetric(snap(0))
    expect(r.formattedValue).toBe("0")
    expect(r.unit).toBe("B/s")
  })

  it("renders unavailable snapshot as '—' with no unit", () => {
    const s: SystemMetricSnapshot = {
      available: false,
      id: "network-read",
      label: "network-read",
      unit: "B/s",
    }
    const r = toDisplayMetric(s)
    expect(r.formattedValue).toBe("—")
    expect(r.unit).toBeUndefined()
  })
})
