import type { ReactElement } from "react"

import { useAddonChannel } from "@/api/react"

import {
  SYSTEM_METRIC_IDS,
  toDisplayMetric,
  type SystemMetricId,
  type SystemMetricSnapshot,
} from "../../domain"

export interface MetricPayload {
  available: boolean
  id?: SystemMetricId
  label?: string
  max?: number
  percentage?: number
  unit?: string
  value?: number
}

export type MetricRowVariant = "bars" | "kpis"

interface MetricRowProps {
  formatter?: string
  label?: string
  metricId: SystemMetricId
  variant: MetricRowVariant
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
    ...(payload.percentage !== undefined
      ? { percentage: payload.percentage }
      : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.value !== undefined ? { value: payload.value } : {}),
  }
}

function computePercentage(
  display: ReturnType<typeof toDisplayMetric>,
): number {
  if (display.percentage !== undefined) return display.percentage
  if (display.max && display.value !== undefined) {
    return Math.min(
      100,
      Math.max(0, Math.round((display.value / display.max) * 100)),
    )
  }
  return 0
}

export function MetricRow({
  formatter,
  label,
  metricId,
  variant,
}: MetricRowProps): ReactElement {
  const { data } = useAddonChannel<MetricPayload>(
    `runtime:system-status:${metricId}`,
  )
  const snapshot = readSnapshot(data, metricId)
  const display = toDisplayMetric(snapshot, formatter)
  const resolvedLabel = label ?? display.label
  // ponytail: formattedValue already carries units for percent / bytes /
  // uptime. Only append `unit` when it carries extra context (°C, GHz,
  // procs, interfaces) that formattedValue leaves out.
  const formattedAlreadyHasUnit = /[%a-z]$/i.test(display.formattedValue)
  const valueText = display.available
    ? formattedAlreadyHasUnit || !display.unit
      ? display.formattedValue
      : `${display.formattedValue} ${display.unit}`
    : display.formattedValue

  if (variant === "bars") {
    const pct = display.available ? computePercentage(display) : 0
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between text-[10px] uppercase tracking-widest">
          <span className="text-neutral-500">{resolvedLabel}</span>
          <span className="font-mono text-neutral-300">{valueText}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-neutral-200 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-baseline justify-between gap-1.5 px-1">
      <span className="min-w-0 flex-1 truncate text-xs font-medium uppercase text-neutral-500">
        {resolvedLabel}
      </span>
      <span className="shrink-0 font-mono text-sm text-neutral-100">
        {valueText}
      </span>
    </div>
  )
}

export function metricIdOf(entry: unknown): SystemMetricId | null {
  if (typeof entry === "string") return isMetricId(entry) ? entry : null
  if (entry && typeof entry === "object" && "id" in entry) {
    const id = (entry as { id: unknown }).id
    if (typeof id === "string" && isMetricId(id)) return id
  }
  return null
}
