import { ButtonSurface, defineMountedButton } from '../../../addon/api.js'
import {
  getCanonicalSystemMetrics,
  type CanonicalSystemMetricSnapshot,
} from '../domain/live-metrics.js'
import { toSystemStatusDisplayMetric } from '../domain/display-metrics.js'
import { Icon, LabelValueList } from '../../../ui/index.js'
import {
  SystemStatusLabelValuesButtonSchema,
  type SystemStatusLabelValuesButtonConfig,
} from '../schemas.js'

const HOLD_ACTION_DELAY_MS = 600
const GENERIC_ICON_NAMES = new Set(['clock', 'sparkles', 'warning'])

type SystemStatusButtonStoreState = {
  holdTriggered?: boolean
  holdTimer?: ReturnType<typeof globalThis.setTimeout>
  metrics?: readonly CanonicalSystemMetricSnapshot[]
}

function getButtonStoreState(snapshot: unknown): SystemStatusButtonStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? snapshot as SystemStatusButtonStoreState
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
  id: SystemStatusLabelValuesButtonConfig['metrics'][number]['metric'],
) {
  return {
    available: false,
    id,
    label: 'Unavailable',
  } as const
}

async function refreshMetrics(
  config: SystemStatusLabelValuesButtonConfig,
): Promise<readonly CanonicalSystemMetricSnapshot[]> {
  return getCanonicalSystemMetrics(
    config.metrics.map((metric) => metric.metric),
  )
}

function renderMetricIcon(icon?: string) {
  if (!icon) {
    return undefined
  }

  return GENERIC_ICON_NAMES.has(icon)
    ? <Icon icon={icon as 'clock' | 'sparkles' | 'warning'} size={16} />
    : <Icon size={16} src={icon} />
}

const builtinSystemStatusLabelValuesButton = defineMountedButton({
  configSchema: SystemStatusLabelValuesButtonSchema,
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
    const metrics = config.metrics.map((metricConfig, index) => (
      payloadMetrics?.[index]
      ?? state.metrics?.[index]
      ?? createUnavailableMetric(metricConfig.metric)
    ))
    const lines = metrics.map((metric, index) => {
      const displayMetric = toSystemStatusDisplayMetric(metric, config.metrics[index])

      return {
        color: displayMetric.color,
        icon: renderMetricIcon(displayMetric.icon),
        label: displayMetric.label,
        units: displayMetric.units,
        value: displayMetric.formattedValue,
      }
    }) as Parameters<typeof LabelValueList>[0]['lines']

    return (
      <ButtonSurface>
        <LabelValueList lines={lines} />
      </ButtonSurface>
    )
  },
  type: 'system-status-label-values',
})

export { builtinSystemStatusLabelValuesButton }
