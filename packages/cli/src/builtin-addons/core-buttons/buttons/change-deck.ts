import { createElement } from 'react'
import { z } from 'zod'

import { createDomTextLabel } from '../../../addon/api.js'

const BuiltinChangeDeckButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    target_deck: z.string().min(1),
  })
  .strict()

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
      createElement('div', {
        style: {
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          justifyContent: 'center',
          width: '100%',
        },
      },
      config.icon
        ? createElement('img', { alt: '', src: config.icon, style: { height: '24px', objectFit: 'contain', width: '24px' } })
        : null,
      createDomTextLabel({ children: config.label })),
  }),
  type: 'change-deck',
}

export { builtinChangeDeckButton, BuiltinChangeDeckButtonSchema }
