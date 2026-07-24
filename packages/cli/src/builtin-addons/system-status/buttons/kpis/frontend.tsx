import type { AddonFrontendButton } from "@/addon/api"

import type { GenericSystemStatusConfig } from "../system-status/schemas"
import { MetricRow, metricIdOf } from "../system-status/MetricRow"

const KpisFrontend: AddonFrontendButton<GenericSystemStatusConfig> = ({
  config,
}) => {
  const metrics = config.metrics.slice(0, 3)
  const labels = config.labels ?? {}
  const formatters = config.formatters ?? {}

  return (
    <div className="flex h-full w-full flex-col items-stretch justify-center gap-1 p-2">
      {metrics.map((entry) => {
        const id = metricIdOf(entry)
        if (id === null) return null
        const label =
          typeof entry === "string" ? labels[id] : (entry.label ?? labels[id])
        return (
          <MetricRow
            formatter={formatters[id]}
            key={id}
            label={label}
            metricId={id}
            variant="kpis"
          />
        )
      })}
    </div>
  )
}

export default KpisFrontend
