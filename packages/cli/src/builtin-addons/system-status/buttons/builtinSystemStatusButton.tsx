import {
  ButtonSurface,
  defineMountedButton,
  useButtonActionCommand,
} from '@/addon/api'
import { Bars, LabelValueList } from '@/ui'
import { ReactElement } from 'react'
import {
  SystemStatusDisplayMetric,
  toSystemStatusDisplayMetric,
} from '../domain/display-metrics'
import {
  CanonicalSystemMetricSnapshot,
  getCanonicalSystemMetrics,
} from '../domain/live-metrics'
import { SystemStatusButtonConfig, SystemStatusButtonSchema } from '../schemas'

type SystemStatusButtonStoreState = {
  metrics?: readonly CanonicalSystemMetricSnapshot[]
}

function getButtonStoreState(snapshot: unknown): SystemStatusButtonStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as SystemStatusButtonStoreState)
    : {}
}

async function refreshMetrics(
  config: SystemStatusButtonConfig,
): Promise<readonly CanonicalSystemMetricSnapshot[]> {
  return getCanonicalSystemMetrics(
    config.metrics.map((metric) => metric.metric),
  )
}

function createUnavailableMetric(
  id: SystemStatusButtonConfig['metrics'][number]['metric'],
) {
  return {
    available: false,
    id,
    label: 'Unavailable',
  } as const
}

type VariantArgs = {
  metrics: (SystemStatusDisplayMetric & {
    max_value?: number
  })[]
}

const textVariant = ({ metrics }: VariantArgs) => {
  const lines = metrics.map((metric) => {
    return {
      color: metric.color,
      icon: metric.icon,
      label: metric.label,
      units: metric.units,
      value: metric.formattedValue,
    }
  })

  return (
    <ButtonSurface>
      <LabelValueList lines={lines} />
    </ButtonSurface>
  )
}

const barsVariant = ({ metrics }: VariantArgs) => {
  const getBarValue = (
    metric: CanonicalSystemMetricSnapshot,
    configuredMax?: number,
  ): { maxValue: number; value: number } => {
    if (!metric.available) {
      return { maxValue: configuredMax ?? 100, value: 0 }
    }

    if (configuredMax !== undefined && metric.value !== undefined) {
      return {
        maxValue: configuredMax,
        value: Math.max(0, metric.value),
      }
    }

    if (metric.max !== undefined && metric.value !== undefined) {
      return {
        maxValue: metric.max,
        value: Math.max(0, metric.value),
      }
    }

    if (metric.percentage !== undefined) {
      return {
        maxValue: 100,
        value: Math.max(0, metric.percentage),
      }
    }

    return { maxValue: configuredMax ?? 100, value: 0 }
  }

  const barsItems = metrics.map((metric, index) => {
    const barValue = getBarValue(metric.raw, metric.max_value)

    return {
      color: metric.color,
      displayValue: metric.formattedValue,
      maxValue: barValue.maxValue,
      title: metric.label,
      value: barValue.value,
    }
  })

  return (
    <ButtonSurface>
      <div className="h-full w-full min-h-0 overflow-hidden p-0.5">
        <Bars items={barsItems} />
      </div>
    </ButtonSurface>
  )
}

const builtinSystemStatusButton = defineMountedButton({
  configSchema: SystemStatusButtonSchema,
  defaultPollIntervalMs: ({ config }) => config.poll_interval_ms,
  defaultRenderIntervalMs: ({ config }) => config.render_interval_ms,
  onActivate: async ({ config, store }) => {
    const metrics = await refreshMetrics(config)
    store.button.update((snapshot) => ({
      ...getButtonStoreState(snapshot),
      metrics,
    }))
  },
  ...useButtonActionCommand<SystemStatusButtonConfig>(
    ({ config }) => config.commands,
  ),
  poll: async ({ config }) => ({
    metrics: await refreshMetrics(config),
  }),
  render: ({ config, payload, store }) => {
    const variantsRender: Record<
      SystemStatusButtonConfig['variant'],
      (args: VariantArgs) => ReactElement
    > = {
      text: textVariant,
      bars: barsVariant,
    }

    const variant = config.variant ?? 'text'
    const state = getButtonStoreState(store.button.snapshot)
    const payloadMetrics = payload?.metrics
    const metrics = config.metrics.map(
      (metricConfig, index) =>
        payloadMetrics?.[index] ??
        state.metrics?.[index] ??
        createUnavailableMetric(metricConfig.metric),
    )

    const displayMetrics = metrics.map((metric, index) =>
      toSystemStatusDisplayMetric(metric, config.metrics[index]),
    )

    return variantsRender[variant]({ metrics: displayMetrics })
  },
  type: 'system-status',
})

export { builtinSystemStatusButton }
