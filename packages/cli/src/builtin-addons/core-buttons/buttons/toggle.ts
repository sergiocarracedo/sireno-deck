import { existsSync, readFileSync } from 'node:fs'
import { extname } from 'node:path'

import { createElement } from 'react'
import { z } from 'zod'

import { createDomTextLabel } from '../../../addon/api.js'
import { BuiltinToggleButtonConfigSchema } from '../../../core/schemas.js'

const COMMAND_DRIVEN_TOGGLE_INTERVAL_MS = 1_000

function getMimeType(iconPath: string): string {
  switch (extname(iconPath).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.svg':
      return 'image/svg+xml'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

function getInlineImageSource(iconPath: string | undefined): string | undefined {
  if (!iconPath || !existsSync(iconPath)) {
    return undefined
  }

  return `data:${getMimeType(iconPath)};base64,${readFileSync(iconPath).toString('base64')}`
}

function createToggleContent(options: {
  icon?: string
  label?: string
  mode: 'get-set' | 'internal' | 'toggle-status'
  state: 'error' | 'off' | 'on' | 'pending'
  subtitle?: string
}) {
  const stateTone =
    options.state === 'on'
      ? '#34d399'
      : options.state === 'off'
        ? '#64748b'
        : options.state === 'error'
          ? '#fb7185'
          : '#7dd3fc'

  return createElement('div', {
    'data-sireno-toggle-mode': options.mode,
    'data-sireno-toggle-state': options.state,
    style: {
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      justifyContent: 'center',
      width: '100%',
    },
  },
  createElement('div', {
    style: {
      background: stateTone,
      borderRadius: '999px',
      boxShadow: `0 0 0 3px color-mix(in srgb, ${stateTone} 24%, transparent)`,
      height: '10px',
      width: '10px',
    },
  }),
  getInlineImageSource(options.icon)
    ? createElement('img', {
      alt: '',
      src: getInlineImageSource(options.icon),
      style: { height: '20px', objectFit: 'contain', width: '20px' },
    })
    : null,
  options.label
    ? createElement('span', null, createDomTextLabel({ children: options.label }))
    : null,
  options.subtitle
    ? createElement('span', {
      style: {
        color: stateTone,
        display: 'block',
        fontFamily: 'IBM Plex Sans, sans-serif',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        lineHeight: 1,
        textAlign: 'center',
      },
    }, options.subtitle)
    : null)
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
        render: () => {
          const stateProps = getStateProps(currentState)

          return createToggleContent({
            icon: stateProps.icon,
            label: stateProps.label,
            mode: 'internal',
            state: currentState,
            subtitle: stateProps.subtitle,
          })
        },
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
      render: () => {
        const stateProps = getStateProps(lastKnownState)
        const visualState =
          displayState === 'known-on'
            ? 'on'
            : displayState === 'known-off'
              ? 'off'
              : displayState

        return createToggleContent({
          icon: stateProps.icon,
          label: stateProps.label,
          mode: config.mode,
          state: visualState,
          subtitle:
            displayState === 'pending'
              ? 'PENDING'
              : displayState === 'error'
                ? 'ERROR'
                : stateProps.subtitle,
        })
      },
    }
  },
  type: 'toggle',
}

export { builtinToggleButton }
