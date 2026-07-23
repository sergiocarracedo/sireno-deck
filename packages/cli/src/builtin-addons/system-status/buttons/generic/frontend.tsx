import { useEffect, useState } from 'react'

import type { AddonFrontendButton } from '@/addon/api'
import { useAddonChannel } from '@/api/react'

import { SYSTEM_METRIC_IDS } from '../../domain'
import { toDisplayMetric } from '../../domain/display-metrics'
import type {
  SystemMetricId,
  SystemMetricSnapshot,
} from '../../domain/metric-ids'
import type { GenericSystemStatusConfig } from './schemas'

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

const metricIdOf = (entry: unknown): SystemMetricId | null => {
  if (typeof entry === 'string') return isMetricId(entry) ? entry : null
  if (entry && typeof entry === 'object' && 'id' in entry) {
    const id = (entry as { id: unknown }).id
    if (typeof id === 'string' && isMetricId(id)) return id
  }
  return null
}

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
    ...(payload.percentage !== undefined
      ? { percentage: payload.percentage }
      : {}),
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
      {metrics.map((entry) => {
        const id = metricIdOf(entry)
        if (id === null) return null
        const label =
          typeof entry === 'string' ? labels[id] : (entry.label ?? labels[id])
        return (
          <MetricRow
            key={id}
            metricId={id}
            label={label}
            formatter={formatters[id]}
          />
        )
      })}
    </div>
  )
}

interface MetricRowProps {
  metricId: SystemMetricId
  label?: string
  formatter?: string
}

function MetricRow({
  metricId,
  label,
  formatter,
}: MetricRowProps): JSX.Element {
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
        {display.unit && display.available ? ` ${display.unit}` : ''}
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
      asdas
      {metrics.map((entry) => {
        const id = metricIdOf(entry)
        if (id === null) return null
        const label =
          typeof entry === 'string' ? labels[id] : (entry.label ?? labels[id])
        return (
          <BarRow
            key={id}
            metricId={id}
            label={label}
            formatter={formatters[id]}
          />
        )
      })}
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
  const pct =
    display.percentage ??
    (display.max && display.value !== undefined
      ? Math.min(
          100,
          Math.max(0, Math.round((display.value / display.max) * 100)),
        )
      : 0)
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest">
        <span className="text-neutral-500">{resolvedLabel}</span>
        <span className="font-mono text-neutral-300">
          {display.formattedValue}
          {display.unit && display.available ? ` ${display.unit}` : ''}
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
const GenericSystemStatusButton: AddonFrontendButton<
  GenericSystemStatusConfig
> = (props) => {
  return 'KKK'

  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(
      () => setTick((n) => n + 1),
      props.config.renderInterval,
    )
    return () => clearInterval(id)
  }, [props.config.renderInterval])
  console.log('asdasd')
  // touch tick to keep React render-pure after interval; data is read inside child hooks
  void tick
  if (metricIdOf(props.config.metrics[0]) === null) {
    return null
  }
  return props.config.display === 'bars' ? (
    <BarsView {...props} />
  ) : (
    <TextRows {...props} />
  )
}

export default GenericSystemStatusButton
