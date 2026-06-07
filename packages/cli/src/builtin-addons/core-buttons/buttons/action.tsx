import { z } from 'zod'

import {
  AddonButtonActionConfigSchema,
  defineMountedButton,
  useButtonActionCommand,
} from '@/addon/api'
import { Icon, Text } from '@/ui/index'

const BuiltinActionButtonSchema = z
  .object({
    ...AddonButtonActionConfigSchema.shape,
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
  })
  .strict()

const builtinActionButton = defineMountedButton({
  configSchema: BuiltinActionButtonSchema,
  ...useButtonActionCommand(({ config }) => config.commands),
  render: ({ config }) => (
    <div className="flex flex-col items-center justify-center w-full gap-1.5">
      {config.icon ? <Icon size={24} src={config.icon} /> : null}
      <Text
        className="w-full text-balance"
        fit="wrap"
        tone="primary"
        typography="main"
      >
        {config.label}
      </Text>
    </div>
  ),
  type: 'action',
})

export { builtinActionButton, BuiltinActionButtonSchema }
