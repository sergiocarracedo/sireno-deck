import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { z } from 'zod'

import type { SirenoAddon } from '../../../packages/cli/src/addon/api.js'
import { BuiltinToggleButtonConfigSchema } from '../../../packages/cli/src/core/schemas.js'

const BuiltinDisplayTextButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
  })
  .strict()

const BuiltinChangeDeckButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    target_deck: z.string().min(1),
  })
  .strict()

const assets = {
  'clock.svg': fileURLToPath(new URL('../assets/clock.svg', import.meta.url)),
}

const wrappers = [{ name: 'shared-card', wrapper: 'shared' }] as const
const styles = [{ name: 'accent', shared: { tone: 'accent' } }] as const

const builtinDisplayTextButton = {
  configSchema: BuiltinDisplayTextButtonSchema,
  createInstance: ({
    button,
    config,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinDisplayTextButtonSchema>
  }) => ({
    render: () =>
      createElement('deck-button', {
        ...(config.icon !== undefined ? { icon: config.icon } : {}),
        keyIndex: button.position,
        label: config.label,
      }),
  }),
  type: 'display-text',
}

const builtinChangeDeckButton = {
  configSchema: BuiltinChangeDeckButtonSchema,
  createInstance: ({
    button,
    config,
    methods,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinChangeDeckButtonSchema>
    methods: { navigateToDeck: (deckId: string) => Promise<void> | void }
  }) => ({
    onTap: async () => {
      await methods.navigateToDeck(config.target_deck)
    },
    render: () =>
      createElement('deck-button', {
        ...(config.icon !== undefined ? { icon: config.icon } : {}),
        keyIndex: button.position,
        label: config.label,
      }),
  }),
  type: 'change-deck',
}

const builtinToggleButton = {
  configSchema: BuiltinToggleButtonConfigSchema,
  createInstance: ({
    button,
    config,
    methods,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinToggleButtonConfigSchema>
    methods: { invalidate: () => void; runCommand: (command: string) => Promise<{ code: number | null; failed: boolean; stdout: string; timedOut: boolean }> }
  }) => {
    const getStateProps = (currentState?: 'off' | 'on') => {
      const stateOverride = currentState === 'on' ? config.on : currentState === 'off' ? config.off : undefined

      return {
        ...(config.icon !== undefined ? { icon: config.icon } : {}),
        ...(stateOverride?.icon !== undefined ? { icon: stateOverride.icon } : {}),
        ...(config.label !== undefined ? { label: config.label } : {}),
        ...(stateOverride?.label !== undefined ? { label: stateOverride.label } : {}),
        ...(config.subtitle !== undefined ? { subtitle: config.subtitle } : {}),
        ...(stateOverride?.subtitle !== undefined ? { subtitle: stateOverride.subtitle } : {}),
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
    const isCommandFailure = (result: { code: number | null; failed: boolean; timedOut: boolean }) => result.failed || result.timedOut || result.code !== 0
    const offTokens = (config.off_values ?? fallbackOffTokens).map(normalizeToken)
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

    const syncAuthoritativeState = async () => {
      const result = await methods.runCommand(config.get_state_command)
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
      onActivate: () => {
        void syncAndInvalidate()
      },
      onTap: async () => {
        if (!lastKnownState) {
          return
        }

        displayState = 'pending'
        methods.invalidate()

        const command = lastKnownState === 'on' ? config.set_off_command : config.set_on_command
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
          subtitle: displayState === 'pending' ? 'PENDING' : displayState === 'error' ? 'ERROR' : getStateProps(lastKnownState).subtitle,
          toggle_mode: 'get-set',
          variant: 'toggle',
        }),
    }
  },
  type: 'toggle',
}

const coreButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  assets,
  buttons: [builtinDisplayTextButton, builtinChangeDeckButton, builtinToggleButton],
  name: 'core-buttons',
  styles,
  wrappers,
}

export default coreButtonsAddon
