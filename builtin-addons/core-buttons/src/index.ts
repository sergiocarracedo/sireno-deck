import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { z } from 'zod'

import type { SirenoAddon } from '../../../packages/cli/src/addon/api.js'

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

const coreButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  assets,
  buttons: [builtinDisplayTextButton, builtinChangeDeckButton],
  name: 'core-buttons',
  styles,
  wrappers,
}

export default coreButtonsAddon
