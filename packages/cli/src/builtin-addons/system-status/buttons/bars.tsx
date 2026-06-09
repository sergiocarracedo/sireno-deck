import {
  ButtonSurface,
  defineMountedButton,
  useButtonActionCommand,
} from '@/addon/api'
import { Bars } from '@/ui/index'
import { toSystemStatusDisplayMetric } from '../domain/display-metrics'
import {
  getCanonicalSystemMetrics,
  type CanonicalSystemMetricSnapshot,
} from '../domain/live-metrics'
import {
  SystemStatusBarsButtonSchema,
  type SystemStatusBarsButtonConfig,
} from '../schemas'

type SystemStatusButtonStoreState = {
  metrics?: readonly CanonicalSystemMetricSnapshot[]
}

function getButtonStoreState(snapshot: unknown): SystemStatusButtonStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as SystemStatusButtonStoreState)
    : {}
}

function createUnavailableMetric(
  id: SystemStatusBarsButtonConfig['metrics'][number]['metric'],
) {
  return {
    available: false,
    id,
    label: 'Unavailable',
  } as const
}

async function refreshMetrics(
  config: SystemStatusBarsButtonConfig,
): Promise<readonly CanonicalSystemMetricSnapshot[]> {
  return getCanonicalSystemMetrics(
    config.metrics.map((metric) => metric.metric),
  )
}

function getBarValue(
  metric: CanonicalSystemMetricSnapshot,
  configuredMax?: number,
): { maxValue: number; value: number } {
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

const builtinSystemStatusBarsButton = defineMountedButton({
  configSchema: SystemStatusBarsButtonSchema,
  defaultPollIntervalMs: ({ config }) => config.poll_interval_ms,
  defaultRenderIntervalMs: ({ config }) => config.render_interval_ms,
  onActivate: async ({ config, store }) => {
    const metrics = await refreshMetrics(config)
    store.button.update((snapshot) => ({
      ...getButtonStoreState(snapshot),
      metrics,
    }))
  },
  ...useButtonActionCommand(({ config }) => config.commands),
  poll: async ({ config }) => ({
    metrics: await refreshMetrics(config),
  }),
  render: ({ config, payload, store }) => {
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
    const barsItems = metrics.map((metric, index) => {
      const metricConfig = config.metrics[index]
      const displayMetric = displayMetrics[index]!
      const barValue = getBarValue(metric, metricConfig?.max_value)

      return {
        color: displayMetric.color,
        displayValue: displayMetric.formattedValue,
        maxValue: barValue.maxValue,
        title: displayMetric.label,
        value: barValue.value,
      }
    }) as SystemStatusBarsButtonConfig['metrics'] extends readonly [unknown]
      ? never
      : Parameters<typeof Bars>[0]['items']

    return (
      <ButtonSurface>
        <div className="h-full w-full min-h-0 overflow-hidden p-0.5">
          <Bars items={barsItems} />
        </div>
      </ButtonSurface>
    )
  },
  type: 'system-status-bars',
})

export { builtinSystemStatusBarsButton }
