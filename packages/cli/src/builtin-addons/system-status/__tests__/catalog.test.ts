import { describe, expect, it } from "vitest"

import {
  METRICS_CATALOG,
  resolveThresholdColor,
  SYSTEM_METRIC_IDS,
  thresholdColorHex,
} from "../domain/catalog"

describe("METRICS_CATALOG", () => {
  it("covers every SystemMetricId", () => {
    expect(Object.keys(METRICS_CATALOG).sort()).toEqual(
      [...SYSTEM_METRIC_IDS].sort(),
    )
  })

  it("every metric has a defaultLabel and formatter", () => {
    for (const id of SYSTEM_METRIC_IDS) {
      const def: import("../domain/catalog").MetricDef = METRICS_CATALOG[id]
      expect(def.defaultLabel.length).toBeGreaterThan(0)
      expect(def.formatter.length).toBeGreaterThan(0)
    }
  })

  it("metrics without maxValue are kpis-only", () => {
    const kpisOnly = ["processes", "network", "uptime"] as const
    for (const id of kpisOnly) {
      const def = METRICS_CATALOG[id]
      expect(def.views).toEqual(["kpis"])
      expect(def.maxValue).toBeUndefined()
    }
  })
})

describe("resolveThresholdColor", () => {
  it("returns default when no thresholds", () => {
    expect(resolveThresholdColor(50)).toBe("default")
    expect(resolveThresholdColor(50, [])).toBe("default")
  })

  it("both bounds inclusive — value at edge matches", () => {
    const t = [
      { minValue: 90, maxValue: 100, color: "danger" as const },
      { maxValue: 90, color: "default" as const },
    ]
    expect(resolveThresholdColor(90, t)).toBe("default")
    expect(resolveThresholdColor(89, t)).toBe("default")
    expect(resolveThresholdColor(91, t)).toBe("danger")
    expect(resolveThresholdColor(100, t)).toBe("danger")
  })

  it("last matching threshold wins (later entry overrides earlier)", () => {
    const t = [
      { maxValue: 100, color: "default" as const },
      { minValue: 90, maxValue: 100, color: "danger" as const },
    ]
    expect(resolveThresholdColor(95, t)).toBe("danger")
    expect(resolveThresholdColor(50, t)).toBe("default")
  })

  it("missing minValue defaults to -Infinity", () => {
    const t = [{ maxValue: 50, color: "warning" as const }]
    expect(resolveThresholdColor(-9999, t)).toBe("warning")
    expect(resolveThresholdColor(0, t)).toBe("warning")
  })

  it("missing maxValue defaults to +Infinity", () => {
    const t = [{ minValue: 90, color: "danger" as const }]
    expect(resolveThresholdColor(95, t)).toBe("danger")
    expect(resolveThresholdColor(9999, t)).toBe("danger")
  })

  it("falls through to default when nothing matches", () => {
    const t = [{ minValue: 100, maxValue: 200, color: "danger" as const }]
    expect(resolveThresholdColor(0, t)).toBe("default")
    expect(resolveThresholdColor(50, t)).toBe("default")
  })
})

describe("thresholdColorHex", () => {
  it("returns hex for danger/warning/success, undefined for default", () => {
    expect(thresholdColorHex("danger")).toBe("#ef4444")
    expect(thresholdColorHex("warning")).toBe("#f59e0b")
    expect(thresholdColorHex("success")).toBe("#22c55e")
    expect(thresholdColorHex("default")).toBeUndefined()
  })
})
