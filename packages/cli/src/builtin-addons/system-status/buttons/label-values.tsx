import {
  ButtonSurface,
  defineMountedButton,
  useButtonActionCommand,
} from '../../../addon/api.js'
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

const GENERIC_ICON_NAMES = new Set(['clock', 'sparkles', 'warning'])

type SystemStatusButtonStoreState = {
  metrics?: readonly CanonicalSystemMetricSnapshot[]
}

function getButtonStoreState(snapshot: unknown): SystemStatusButtonStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? snapshot as SystemStatusButtonStoreState
    : {}
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
