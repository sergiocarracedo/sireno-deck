import type { AddonFrontendButton } from "@/addon/api"
import type { LabelValueListLine } from "@/ui"
import { LabelValueListSurface } from "@/ui"

import {
  resolveThresholdColor,
  thresholdColorHex,
  toDisplayMetric,
} from "../../domain"
import { MetricColor, METRICS_CATALOG } from "../../shared/metrics-catalog"
import {
  pickLabel,
  readSnapshot,
  resolveMetricId,
  useAllMetricChannels,
} from "../_shared"
import type { GenericSystemStatusConfig } from "../system-status/schemas"

type LabelValueListLines =
  | readonly [LabelValueListLine]
  | readonly [LabelValueListLine, LabelValueListLine]
  | readonly [LabelValueListLine, LabelValueListLine, LabelValueListLine]

const KpisFrontend: AddonFrontendButton<GenericSystemStatusConfig> = ({
  config,
}) => {
  const channels = useAllMetricChannels()

  const lines: LabelValueListLine[] = []
  for (const entry of config.metrics) {
    const id = resolveMetricId(entry)
    if (id === null) continue
    const def = METRICS_CATALOG[id]
    const display = toDisplayMetric(readSnapshot(channels[id], id))
    const color = thresholdColorHex(
      resolveThresholdColor(display.value ?? 0, def.thresholds) as MetricColor,
    )
    lines.push({
      ...(def.icon ? { icon: def.icon } : {}),
      label: pickLabel(entry, def.defaultLabel),
      value: display.formattedValue,
      ...(display.unit ? { units: display.unit } : {}),
      ...(color ? { color } : {}),
    })
  }

  if (lines.length === 0) return <div className="h-full w-full" />
  const tuple: LabelValueListLines =
    lines.length === 1
      ? [lines[0]!]
      : lines.length === 2
        ? [lines[0]!, lines[1]!]
        : [lines[0]!, lines[1]!, lines[2]!]

  return <LabelValueListSurface lines={tuple} />
}

export default KpisFrontend
