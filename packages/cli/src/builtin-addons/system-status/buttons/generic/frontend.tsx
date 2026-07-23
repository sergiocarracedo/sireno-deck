import { useEffect, useState } from "react"

import { useAddonChannel } from "@/api/react"
import type { AddonFrontendButton } from "@/addon/api"

import { SYSTEM_METRIC_IDS } from "../../domain"
import type {
  SystemMetricId,
  SystemMetricSnapshot,
} from "../../domain/live-metrics"
import { toDisplayMetric } from "../../domain/display-metrics"
import type { GenericSystemStatusConfig } from "./schemas"

interface MetricPayload {
  available: boolean
  id?: SystemMetricId
  label?: string
  max?: number
  percentage?: number
  unit?: string
  value?: number
}

const isMetricId = (id: string): id is SystemMetricId =>
  (SYSTEM_METRIC_IDS as readonly string[]).includes(id)

function readSnapshot(
  payload: MetricPayload | undefined,
  metricId: SystemMetricId,
): SystemMetricSnapshot {
  if (!payload) return { available: false, id: metricId, label: metricId }
  return {
    available: payload.available,
    id: metricId,
    label: metricId,
    ...(payload.max !== undefined ? { max: payload.max } : {}),
    ...(payload.percentage !== undefined ? { percentage: payload.percentage } : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.value !== undefined ? { value: payload.value } : {}),
  }
}

const TextRows: AddonFrontendButton<GenericSystemStatusConfig> = ({
  config,
}) => {
  const metrics = config.metrics.slice(0, 3)
  const labels = config.labels ?? {}
  const formatters = config.formatters ?? {}

  return (
    <div className="flex h-full w-full flex-col items-stretch justify-center gap-1 p-2">
      {metrics.map((entry) => (
        <MetricRow
          key={entry.id}
          metricId={entry.id}
          label={entry.label ?? labels[entry.id]}
          formatter={formatters[entry.id]}
        />
      ))}
    </div>
  )
}

interface MetricRowProps {
  metricId: SystemMetricId
  label?: string
  formatter?: string
}

function MetricRow({ metricId, label, formatter }: MetricRowProps): JSX.Element {
  const { data } = useAddonChannel<MetricPayload>(
    `runtime:system-status:${metricId}`,
  )
  const snapshot = readSnapshot(data, metricId)
  const display = toDisplayMetric(snapshot, formatter)
  const resolvedLabel = label ?? display.label
  return (
    <div className="flex items-baseline justify-between gap-2 px-1">
      <span className="text-[10px] uppercase tracking-widest text-neutral-500">
        {resolvedLabel}
      </span>
      <span className="truncate font-mono text-sm text-neutral-100">
        {display.formattedValue}
        {display.unit && display.available ? ` ${display.unit}` : ""}
      </span>
    </div>
  )
}

const BarsView: AddonFrontendButton<GenericSystemStatusConfig> = ({
  config,
}) => {
  const metrics = config.metrics.slice(0, 3)
  const labels = config.labels ?? {}
  const formatters = config.formatters ?? {}

  return (
    <div className="flex h-full w-full flex-col items-stretch justify-center gap-1 p-2">
      {metrics.map((entry) => (
        <BarRow
          key={entry.id}
          metricId={entry.id}
          label={entry.label ?? labels[entry.id]}
          formatter={formatters[entry.id]}
        />
      ))}
    </div>
  )
}

function BarRow({ metricId, label, formatter }: MetricRowProps): JSX.Element {
  const { data } = useAddonChannel<MetricPayload>(
    `runtime:system-status:${metricId}`,
  )
  const snapshot = readSnapshot(data, metricId)
  const display = toDisplayMetric(snapshot, formatter)
  const resolvedLabel = label ?? display.label
  const pct = display.percentage ?? (
    display.max && display.value !== undefined
      ? Math.min(100, Math.max(0, Math.round((display.value / display.max) * 100)))
      : 0
  )
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest">
        <span className="text-neutral-500">{resolvedLabel}</span>
        <span className="font-mono text-neutral-300">
          {display.formattedValue}
          {display.unit && display.available ? ` ${display.unit}` : ""}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-neutral-200 transition-[width] duration-300"
          style={{ width: `${display.available ? pct : 0}%` }}
        />
      </div>
    </div>
  )
}

// ponytail: renderInterval is the only manual poll — event-driven push wins
// when an event arrives sooner. The interval just guarantees the bars refresh
// even if a probe takes longer than expected.
const GenericSystemStatusButton: AddonFrontendButton<GenericSystemStatusConfig> = (
  props,
) => {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), props.config.renderInterval)
    return () => clearInterval(id)
  }, [props.config.renderInterval])
  // touch tick to keep React render-pure after interval; data is read inside child hooks
  void tick
  if (!isMetricId(props.config.metrics[0]?.id ?? "")) return null
  return props.config.display === "bars" ? (
    <BarsView {...props} />
  ) : (
    <TextRows {...props} />
  )
}

export default GenericSystemStatusButton