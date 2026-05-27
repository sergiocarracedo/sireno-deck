import { z } from 'zod'

import { Icon, Text } from '../../../ui/index.js'
import { defineMountedButton } from '../../../addon/api.js'

function renderCenteredButtonContent(label: string, icon?: string) {
  return (
    <div className="flex flex-col items-center justify-center w-full gap-1.5">
      {icon ? <Icon size={24} src={icon} /> : null}
      <Text fit="wrap">{label}</Text>
    </div>
  )
}

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
  render: ({ config }) => renderCenteredButtonContent(config.label, config.icon),
  type: 'change-deck',
})

export { builtinChangeDeckButton, BuiltinChangeDeckButtonSchema }
