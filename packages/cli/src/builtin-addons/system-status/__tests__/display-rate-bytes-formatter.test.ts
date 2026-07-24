import { describe, expect, it } from "vitest"

import { toDisplayMetric } from "../domain/display-metrics"
import type { SystemMetricSnapshot } from "../domain/metric-ids"

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
  it("renders sub-KB values as bytes", () => {
    expect(toDisplayMetric(snap(500)).formattedValue).toBe("500 B/s")
  })

  it("renders KB range with one decimal", () => {
    expect(toDisplayMetric(snap(5_242)).formattedValue).toBe("5.1 KB/s")
    expect(toDisplayMetric(snap(1_048_576 / 2)).formattedValue).toBe(
      "512.0 KB/s",
    )
  })

  it("renders MB range with one decimal", () => {
    expect(toDisplayMetric(snap(5_242_880)).formattedValue).toBe("5.0 MB/s")
  })

  it("renders GB range with one decimal", () => {
    expect(toDisplayMetric(snap(2 * 1024 ** 3)).formattedValue).toBe("2.0 GB/s")
  })

  it("floors to 0 B/s when value is 0", () => {
    expect(toDisplayMetric(snap(0)).formattedValue).toBe("0 B/s")
  })

  it("renders unavailable snapshot as '—'", () => {
    const s: SystemMetricSnapshot = {
      available: false,
      id: "network-read",
      label: "network-read",
      unit: "B/s",
    }
    expect(toDisplayMetric(s).formattedValue).toBe("—")
  })
})
