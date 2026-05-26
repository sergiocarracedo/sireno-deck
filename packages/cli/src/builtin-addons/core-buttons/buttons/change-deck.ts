import { createElement } from 'react'
import { z } from 'zod'

import { createDomIcon, createDomStack, createDomTextLabel, defineMountedButton } from '../../../addon/api.js'

const BuiltinChangeDeckButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    target_deck: z.string().min(1),
  })
  .strict()

const builtinChangeDeckButton = defineMountedButton({
  configSchema: BuiltinChangeDeckButtonSchema,
  onTap: async ({ config, methods }) => {
    await methods.navigateToDeck(config.target_deck)
  },
  render: ({ config }) =>
    createDomStack({
      children: [
        config.icon ? createDomIcon({ src: config.icon }) : null,
        createDomTextLabel({ children: config.label }),
      ],
    }),
  type: 'change-deck',
})

export { builtinChangeDeckButton, BuiltinChangeDeckButtonSchema }
