import {
  METRICS_CATALOG,
  SYSTEM_METRIC_IDS,
  type MetricColor,
  type MetricThreshold,
} from "../shared/metrics-catalog"

export { SYSTEM_METRIC_IDS }

if (
  Object.keys(METRICS_CATALOG).sort().join(",") !==
  [...SYSTEM_METRIC_IDS].sort().join(",")
) {
  throw new Error(
    "METRICS_CATALOG drift: every SystemMetricId must have a MetricDef",
  )
}

/**
 * Resolve the threshold color for a given value. Both bounds are inclusive.
 * When multiple thresholds match, the **last defined** one wins — let users
 * stack thresholds from broad to narrow without surprise overrides.
 */
export function resolveThresholdColor(
  value: number,
  thresholds?: ReadonlyArray<MetricThreshold>,
): MetricColor {
  if (thresholds === undefined || thresholds.length === 0) return "default"
  let result: MetricColor = "default"
  for (const t of thresholds) {
    const min = t.minValue ?? -Infinity
    const max = t.maxValue ?? Infinity
    if (value >= min && value <= max) result = t.color
  }
  return result
}

/**
 * Convert a MetricColor to a CSS-color string for the UI surfaces.
 * `default` returns undefined — the surface keeps its own primary color.
 */
export function thresholdColorHex(color: MetricColor): string | undefined {
  switch (color) {
    case "danger":
      return "#ef4444"
    case "warning":
      return "#f59e0b"
    case "success":
      return "#22c55e"
    case "default":
      return undefined
  }
}
