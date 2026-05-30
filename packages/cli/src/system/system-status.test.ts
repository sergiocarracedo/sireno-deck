import { describe, expect, it } from "vitest"

import {
  toSystemStatusDisplayMetric,
  toSystemStatusDisplayMetrics,
} from "./system-status.js"

describe("system status display mapping", () => {
  it("formats available metrics through the bounded numbro-backed support layer", () => {
    const metric = toSystemStatusDisplayMetric({
      available: true,
      id: "memory_usage",
      label: "38%",
      max: 8_000_000_000,
      percentage: 38,
      unit: "B",
      value: 3_040_000_000,
    }, {
      color: "#8ecae6",
      formatter: "bytes",
      label: "RAM",
      units: "used",
    })

    expect(metric).toMatchObject({
      available: true,
      color: "#8ecae6",
      formattedValue: "3GB",
      id: "memory_usage",
      label: "RAM",
      units: "used",
    })
  })

  it("keeps unavailable metrics visible in-place instead of collapsing them away", () => {
    const metric = toSystemStatusDisplayMetric({
      available: false,
      id: "fan_speed",
      label: "Unavailable",
      unit: "rpm",
    }, {
      icon: "sparkles",
      label: "Fan",
      unavailable_label: "N/A",
    })

    expect(metric).toMatchObject({
      available: false,
      formattedValue: "N/A",
      icon: "sparkles",
      id: "fan_speed",
      label: "Fan",
      units: "rpm",
    })
  })

  it("maps metric collections with per-metric overrides keyed by the canonical ids", () => {
    const metrics = toSystemStatusDisplayMetrics([
      {
        available: true,
        id: "cpu_usage",
        label: "45%",
        max: 100,
        percentage: 45,
        unit: "%",
        value: 45,
      },
      {
        available: false,
        id: "swap_usage",
        label: "Unavailable",
        unit: "B",
      },
    ], {
      cpu_usage: { label: "CPU" },
      swap_usage: { label: "Swap", unavailable_label: "--" },
    })

    expect(metrics.map((metric) => ({ formattedValue: metric.formattedValue, label: metric.label }))).toEqual([
      { formattedValue: "45%", label: "CPU" },
      { formattedValue: "--", label: "Swap" },
    ])
  })
})
