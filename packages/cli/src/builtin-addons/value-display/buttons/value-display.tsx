import {
  ButtonSurface,
  defineMountedButton,
  useButtonActionCommand,
} from '@/addon/api'
import {
  executeCommand,
  type CommandExecutionResult,
} from '@/action/executor'
import { LabelValueList } from '@/ui/index'
import { Icon } from '@/ui/Icon'
import { formatCommandOutput } from '../domain/format-command-output'
import {
  ValueDisplayButtonSchema,
  type ValueDisplayButtonConfig,
  type ValueEntry,
} from '../schemas'

interface ValueSnapshot {
  available: boolean
  raw: string
}

type ValueStoreState = {
  values?: readonly ValueSnapshot[]
}

function getButtonStoreState(snapshot: unknown): ValueStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as ValueStoreState)
    : {}
}

async function runValueCommand(entry: ValueEntry): Promise<ValueSnapshot> {
  try {
    const result: CommandExecutionResult = await executeCommand({
      command: entry.command,
      timeoutMs: entry.timeout_ms ?? 5_000,
    })
    if (result.failed || result.code !== 0) {
      return { available: false, raw: '' }
    }
    return { available: true, raw: result.stdout }
  } catch {
    return { available: false, raw: '' }
  }
}

async function refreshValues(
  config: ValueDisplayButtonConfig,
): Promise<readonly ValueSnapshot[]> {
  return Promise.all(config.values.map(runValueCommand))
}

function renderEntryIcon(icon?: string) {
  if (!icon) {
    return undefined
  }

  return icon.includes('://') ||
    icon.startsWith('.') ||
    icon.startsWith('/') ? (
    <Icon size={16} src={icon} />
  ) : (
    <Icon name={icon} size={16} />
  )
}

const builtinValueDisplayButton = defineMountedButton({
  configSchema: ValueDisplayButtonSchema,
  defaultPollIntervalMs: ({ config }) => config.poll_interval_ms,
  defaultRenderIntervalMs: ({ config }) => config.render_interval_ms,
  onActivate: async ({ config, store }) => {
    const values = await refreshValues(config)
    store.button.update((snapshot) => ({
      ...getButtonStoreState(snapshot),
      values,
    }))
  },
  ...useButtonActionCommand(({ config }) => config.commands),
  poll: async ({ config }) => ({ values: await refreshValues(config) }),
  render: ({ config, payload, store }) => {
    const state = getButtonStoreState(store.button.snapshot)
    const payloadValues = payload?.values
    const values = config.values.map(
      (_, index) =>
        payloadValues?.[index] ??
        state.values?.[index] ??
        { available: false, raw: '' },
    )
    const lines = config.values.map((entry, index) => {
      const snapshot = values[index] ?? { available: false, raw: '' }
      const formatted = snapshot.available
        ? formatCommandOutput(snapshot.raw, entry.formatter, entry.units)
        : {
            available: false as const,
            value: 'N/A' as const,
            ...(entry.units ? { units: entry.units } : {}),
          }
      return {
        icon: renderEntryIcon(entry.icon),
        label: entry.label,
        units: formatted.units,
        value: formatted.value,
      }
    }) as Parameters<typeof LabelValueList>[0]['lines']

    return (
      <ButtonSurface>
        <LabelValueList lines={lines} />
      </ButtonSurface>
    )
  },
  type: 'value-display',
})

export { builtinValueDisplayButton }