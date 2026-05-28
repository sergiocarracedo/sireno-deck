import { z } from 'zod'
import { BuiltinToggleButtonConfigSchema } from '../../../core/schemas.js'

import { ButtonSurface, defineMountedButton } from '../../../addon/api.js'
import { Icon, Text } from '../../../ui/index.js'

const COMMAND_DRIVEN_TOGGLE_INTERVAL_MS = 1_000

type ToggleDisplayState = 'error' | 'known-off' | 'known-on' | 'pending'

type ToggleButtonStoreState = {
  currentState?: 'off' | 'on'
  displayState?: ToggleDisplayState
  lastKnownState?: 'off' | 'on'
}

function getToggleButtonStoreState(snapshot: unknown): ToggleButtonStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? snapshot as ToggleButtonStoreState
    : {}
}

function getStateProps(
  config: z.infer<typeof BuiltinToggleButtonConfigSchema>,
  currentState?: 'off' | 'on',
) {
  const stateOverride =
    currentState === 'on'
      ? config.on
      : currentState === 'off'
        ? config.off
        : undefined

  return {
    ...(config.icon !== undefined ? { icon: config.icon } : {}),
    ...(stateOverride?.icon !== undefined
      ? { icon: stateOverride.icon }
      : {}),
    ...(config.label !== undefined ? { label: config.label } : {}),
    ...(stateOverride?.label !== undefined
      ? { label: stateOverride.label }
      : {}),
    ...(config.subtitle !== undefined ? { subtitle: config.subtitle } : {}),
    ...(stateOverride?.subtitle !== undefined
      ? { subtitle: stateOverride.subtitle }
      : {}),
  }
}

function renderToggleSurface(props: {
  icon?: string
  primaryLabel: string
  secondaryLabel?: string
}) {
  return (
    <ButtonSurface>
      <div
        className={`flex flex-col items-center justify-center w-full ${props.secondaryLabel ? 'gap-1' : 'gap-1.5'}`}
      >
        {props.icon ? <Icon size={24} src={props.icon} /> : null}
        <Text fit="wrap">{props.primaryLabel}</Text>
        {props.secondaryLabel ? <Text fit="wrap">{props.secondaryLabel}</Text> : null}
      </div>
    </ButtonSurface>
  )
}

function syncCommandDrivenToggleState(
  store: {
    button: {
      snapshot: unknown
      update: (updater: (snapshot: unknown) => unknown) => void
    }
  },
  nextState: 'off' | 'on' | undefined,
): void {
  store.button.update((snapshot) => ({
    ...getToggleButtonStoreState(snapshot),
    ...(nextState
      ? {
          displayState: nextState === 'on' ? 'known-on' : 'known-off',
          lastKnownState: nextState,
        }
      : { displayState: 'error' }),
  }))
}

const builtinToggleButton = defineMountedButton({
  configSchema: BuiltinToggleButtonConfigSchema,
  defaultIntervalMs: ({ config }) => (
    config.mode === 'internal' ? undefined : COMMAND_DRIVEN_TOGGLE_INTERVAL_MS
  ),
  onActivate: async ({ config, methods, store }) => {
    if (config.mode === 'internal') {
      return
    }

    store.button.update((snapshot) => ({
      ...getToggleButtonStoreState(snapshot),
      displayState: 'pending',
    }))

    const fallbackOffTokens = ['off', 'false', '0']
    const fallbackOnTokens = ['on', 'true', '1']
    const normalizeToken = (value: string) => value.trim().toLowerCase()
    const isCommandFailure = (result: {
      code: number | null
      failed: boolean
      timedOut: boolean
    }) => result.failed || result.timedOut || result.code !== 0
    const offTokens = (config.off_values ?? fallbackOffTokens).map(
      normalizeToken,
    )
    const onTokens = (config.on_values ?? fallbackOnTokens).map(normalizeToken)

    const mapCommandState = (value: string): 'off' | 'on' | undefined => {
      const normalized = normalizeToken(value)
      if (normalized.length === 0) {
        return undefined
      }

      if (onTokens.includes(normalized)) {
        return 'on'
      }

      if (offTokens.includes(normalized)) {
        return 'off'
      }

      return undefined
    }

    const readCommand =
      config.mode === 'get-set'
        ? config.get_state_command
        : config.status_command

    const syncAuthoritativeState = async () => {
      const result = await methods.runCommand(readCommand)
      if (isCommandFailure(result)) {
        syncCommandDrivenToggleState(store, undefined)
        return
      }

      const nextState = mapCommandState(result.stdout)
      syncCommandDrivenToggleState(store, nextState)
    }

    await syncAuthoritativeState()
  },
  onTap: async ({ config, methods, store }) => {
    if (config.mode === 'internal') {
      const currentState = getToggleButtonStoreState(store.button.snapshot).currentState ?? config.initial_state ?? 'off'
      store.button.set({ currentState: currentState === 'on' ? 'off' : 'on' })
      return
    }

    const currentStoreState = getToggleButtonStoreState(store.button.snapshot)
    if (config.mode === 'get-set' && !currentStoreState.lastKnownState) {
      return
    }

    store.button.update((snapshot) => ({
      ...getToggleButtonStoreState(snapshot),
      displayState: 'pending',
    }))

    const command =
      config.mode === 'get-set'
        ? currentStoreState.lastKnownState === 'on'
          ? config.set_off_command
          : config.set_on_command
        : config.toggle_command
    const result = await methods.runCommand(command)
    if (result.failed || result.timedOut || result.code !== 0) {
      store.button.update((snapshot) => ({
        ...getToggleButtonStoreState(snapshot),
        displayState: 'error',
      }))
      return
    }

    const fallbackOffTokens = ['off', 'false', '0']
    const fallbackOnTokens = ['on', 'true', '1']
    const normalizeToken = (value: string) => value.trim().toLowerCase()
    const offTokens = (config.off_values ?? fallbackOffTokens).map(normalizeToken)
    const onTokens = (config.on_values ?? fallbackOnTokens).map(normalizeToken)
    const readCommand =
      config.mode === 'get-set'
        ? config.get_state_command
        : config.status_command

    const authoritativeResult = await methods.runCommand(readCommand)
    if (authoritativeResult.failed || authoritativeResult.timedOut || authoritativeResult.code !== 0) {
      syncCommandDrivenToggleState(store, undefined)
      return
    }

    const normalized = normalizeToken(authoritativeResult.stdout)
    const nextState = onTokens.includes(normalized)
      ? 'on'
      : offTokens.includes(normalized)
        ? 'off'
        : undefined

    syncCommandDrivenToggleState(store, nextState)
  },
  refresh: async ({ config, methods, store }) => {
    if (config.mode === 'internal') {
      return
    }

    const fallbackOffTokens = ['off', 'false', '0']
    const fallbackOnTokens = ['on', 'true', '1']
    const normalizeToken = (value: string) => value.trim().toLowerCase()
    const isCommandFailure = (result: {
      code: number | null
      failed: boolean
      timedOut: boolean
    }) => result.failed || result.timedOut || result.code !== 0
    const offTokens = (config.off_values ?? fallbackOffTokens).map(normalizeToken)
    const onTokens = (config.on_values ?? fallbackOnTokens).map(normalizeToken)
    const readCommand =
      config.mode === 'get-set'
        ? config.get_state_command
        : config.status_command
    const result = await methods.runCommand(readCommand)
    if (isCommandFailure(result)) {
      syncCommandDrivenToggleState(store, undefined)
      return
    }

    const normalized = normalizeToken(result.stdout)
    const nextState = onTokens.includes(normalized)
      ? 'on'
      : offTokens.includes(normalized)
        ? 'off'
        : undefined

    syncCommandDrivenToggleState(store, nextState)
  },
  render: ({ config, store }) => {
    if (config.mode === 'internal') {
      const currentState = getToggleButtonStoreState(store.button.snapshot).currentState ?? config.initial_state ?? 'off'
      const stateProps = getStateProps(config, currentState)
      const primaryLabel = stateProps.label ?? 'Toggle'
      const secondaryLabel = stateProps.subtitle

      return renderToggleSurface({
        icon: stateProps.icon,
        primaryLabel,
        secondaryLabel,
      })
    }

    const storeState = getToggleButtonStoreState(store.button.snapshot)
    const displayState = storeState.displayState ?? 'pending'
    const stateProps = getStateProps(config, storeState.lastKnownState)
    const statusLabel =
      displayState === 'pending'
        ? 'PENDING'
        : displayState === 'error'
          ? 'ERROR'
          : undefined
    const primaryLabel = stateProps.label ?? 'Toggle'
    const secondaryLabel = statusLabel ?? stateProps.subtitle

    return renderToggleSurface({
      icon: stateProps.icon,
      primaryLabel,
      secondaryLabel,
    })
  },
  type: 'toggle',
})

export { builtinToggleButton }
