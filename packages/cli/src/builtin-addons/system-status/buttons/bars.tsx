import { ButtonSurface, defineMountedButton } from '../../../addon/api.js'
import {
  getCanonicalSystemMetrics,
  type CanonicalSystemMetricSnapshot,
} from '../domain/live-metrics.js'
import { toSystemStatusDisplayMetric } from '../domain/display-metrics.js'
import { Bars, Text } from '../../../ui/index.js'
import {
  SystemStatusBarsButtonSchema,
  type SystemStatusBarsButtonConfig,
} from '../schemas.js'

const HOLD_ACTION_DELAY_MS = 600

type SystemStatusButtonStoreState = {
  holdTriggered?: boolean
  holdTimer?: ReturnType<typeof globalThis.setTimeout>
  metrics?: readonly CanonicalSystemMetricSnapshot[]
}

function getButtonStoreState(snapshot: unknown): SystemStatusButtonStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as SystemStatusButtonStoreState)
    : {}
}

function clearHoldTimer(snapshot: unknown): SystemStatusButtonStoreState {
  const state = getButtonStoreState(snapshot)
  if (state.holdTimer) {
    globalThis.clearTimeout(state.holdTimer)
  }

  return {
    ...state,
    holdTimer: undefined,
  }
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
  dispose: ({ store }) => {
    store.button.set(clearHoldTimer(store.button.snapshot))
  },
  onActivate: async ({ config, store }) => {
    const metrics = await refreshMetrics(config)
    store.button.update((snapshot) => ({
      ...getButtonStoreState(snapshot),
      metrics,
    }))
  },
  onPress: ({ config, methods, store }) => {
    if (!config.hold_command) {
      return
    }

    store.button.update((snapshot) => {
      const nextState = clearHoldTimer(snapshot)
      const holdTimer = globalThis.setTimeout(() => {
        void methods.runCommand(config.hold_command!)
        store.button.update((currentSnapshot) => ({
          ...clearHoldTimer(currentSnapshot),
          holdTriggered: true,
        }))
        methods.invalidate()
      }, HOLD_ACTION_DELAY_MS)

      return {
        ...nextState,
        holdTimer,
        holdTriggered: false,
      }
    })
  },
  onRelease: ({ store }) => {
    store.button.set(clearHoldTimer(store.button.snapshot))
  },
  onTap: async ({ config, methods, store }) => {
    const state = getButtonStoreState(store.button.snapshot)
    if (state.holdTriggered) {
      store.button.update((snapshot) => ({
        ...clearHoldTimer(snapshot),
        holdTriggered: false,
      }))
      return
    }

    if (!config.tap_command) {
      return
    }

    await methods.runCommand(config.tap_command)
  },
  poll: async ({ config }) => ({
    metrics: await refreshMetrics(config),
  }),
  render: ({ config, payload, store }) => {
    const state = getButtonStoreState(store.button.snapshot)
    const payloadMetrics = payload?.metrics
    const metrics = config.metrics.map(
      (metricConfig, index) =>
        payloadMetrics?.[index]
        ?? state.metrics?.[index]
        ?? createUnavailableMetric(metricConfig.metric),
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
        maxValue: barValue.maxValue,
        title: displayMetric.label,
        value: barValue.value,
      }
    }) as SystemStatusBarsButtonConfig['metrics'] extends readonly [unknown]
      ? never
      : Parameters<typeof Bars>[0]['items']

    return (
      <ButtonSurface>
        <div className="flex h-full w-full min-h-0 flex-col justify-between gap-2">
          <div className="min-h-0 flex-1 overflow-hidden">
            <Bars items={barsItems} />
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${displayMetrics.length}, minmax(0, 1fr))` }}>
            {displayMetrics.map((metric) => (
              <Text
                align="center"
                className="block whitespace-nowrap"
                key={metric.id}
                size="xs"
                style={metric.color ? { color: metric.color } : undefined}
                typography="aux"
              >
                {metric.formattedValue}
              </Text>
            ))}
          </div>
        </div>
      </ButtonSurface>
    )
  },
  type: 'system-status-bars',
})

export { builtinSystemStatusBarsButton }
