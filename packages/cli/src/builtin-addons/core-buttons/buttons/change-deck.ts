import { z } from 'zod'

import { createBaseShapeIconLabelContent } from '../../../addon/api.js'

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
      createBaseShapeIconLabelContent({
        ...(config.icon !== undefined ? { icon: config.icon } : {}),
        keyIndex: button.position,
        label: config.label,
      }),
  }),
  type: 'change-deck',
}

export { builtinChangeDeckButton, BuiltinChangeDeckButtonSchema }
