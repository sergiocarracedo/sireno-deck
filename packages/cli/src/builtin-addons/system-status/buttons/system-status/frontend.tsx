import type { AddonFrontendButton } from "@/addon/api"

import type { GenericSystemStatusConfig } from "./schemas"
import { MetricRow, metricIdOf } from "./MetricRow"

const SystemStatusFrontend: AddonFrontendButton<GenericSystemStatusConfig> = ({
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
            variant="bars"
          />
        )
      })}
    </div>
  )
}

export default SystemStatusFrontend
