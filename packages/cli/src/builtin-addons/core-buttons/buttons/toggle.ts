import { createElement } from 'react'
import { z } from 'zod'
import { BuiltinToggleButtonConfigSchema } from '../../../../packages/cli/src/core/schemas'

const COMMAND_DRIVEN_TOGGLE_INTERVAL_MS = 1_000

const builtinToggleButton = {
  configSchema: BuiltinToggleButtonConfigSchema,
  createInstance: ({
    button,
    config,
    methods,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinToggleButtonConfigSchema>
    methods: {
      invalidate: () => void
      runCommand: (command: string) => Promise<{
        code: number | null
        failed: boolean
        stdout: string
        timedOut: boolean
      }>
    }
  }) => {
    const getStateProps = (currentState?: 'off' | 'on') => {
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

    if (config.mode === 'internal') {
      let currentState = config.initial_state ?? 'off'

      return {
        onTap: async () => {
          currentState = currentState === 'on' ? 'off' : 'on'
          methods.invalidate()
        },
        render: () =>
          createElement('deck-button', {
            keyIndex: button.position,
            ...getStateProps(currentState),
            toggle_mode: 'internal',
            variant: 'toggle',
          }),
      }
    }

    const fallbackOffTokens = ['off', 'false', '0']
    const fallbackOnTokens = ['on', 'true', '1']
    let displayState: 'error' | 'known-off' | 'known-on' | 'pending' = 'pending'
    let lastKnownState: 'off' | 'on' | undefined

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
        displayState = 'error'
        return
      }

      const nextState = mapCommandState(result.stdout)
      if (!nextState) {
        displayState = 'error'
        return
      }

      lastKnownState = nextState
      displayState = nextState === 'on' ? 'known-on' : 'known-off'
    }

    const syncAndInvalidate = async () => {
      await syncAuthoritativeState()
      methods.invalidate()
    }

    return {
      defaultIntervalMs: COMMAND_DRIVEN_TOGGLE_INTERVAL_MS,
      onActivate: () => {
        void syncAndInvalidate()
      },
      onTap: async () => {
        if (config.mode === 'get-set' && !lastKnownState) {
          return
        }

        displayState = 'pending'
        methods.invalidate()

        const command =
          config.mode === 'get-set'
            ? lastKnownState === 'on'
              ? config.set_off_command
              : config.set_on_command
            : config.toggle_command
        const result = await methods.runCommand(command)
        if (isCommandFailure(result)) {
          displayState = 'error'
          methods.invalidate()
          return
        }

        await syncAuthoritativeState()
        methods.invalidate()
      },
      refresh: async () => {
        await syncAuthoritativeState()
      },
      render: () =>
        createElement('deck-button', {
          keyIndex: button.position,
          ...getStateProps(lastKnownState),
          subtitle:
            displayState === 'pending'
              ? 'PENDING'
              : displayState === 'error'
                ? 'ERROR'
                : getStateProps(lastKnownState).subtitle,
          toggle_mode: config.mode,
          variant: 'toggle',
        }),
    }
  },
  type: 'toggle',
}

export { builtinToggleButton }
