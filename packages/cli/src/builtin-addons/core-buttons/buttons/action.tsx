import { z } from 'zod'

import {
  AddonButtonActionConfigSchema,
  defineMountedButton,
  useButtonActionCommand,
} from '@/addon/api'
import { IconLabelSurface } from '@/ui/index'

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
    <IconLabelSurface icon={{ src: config.icon }} label={config.label} />
  ),
  type: 'action',
})

export { builtinActionButton, BuiltinActionButtonSchema }
