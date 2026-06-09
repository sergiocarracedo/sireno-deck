import { z } from 'zod'

import {
  AddonButtonActionConfigSchema,
  defineMountedButton,
} from '@/addon/api'
import { IconLabelSurface } from '@/ui/index'
import { resolveIconSpec } from '@/ui/Icon'

const BuiltinActionButtonSchema = z
  .object({
    ...AddonButtonActionConfigSchema.shape,
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.commands && value.key_macro) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot set both 'commands' and 'key_macro' on an action button",
        path: ['key_macro'],
      })
    }
  })

const builtinActionButton = defineMountedButton({
  configSchema: BuiltinActionButtonSchema,
  onTap: async ({ config, methods }) => {
    if (config.key_macro) {
      const macro = typeof config.key_macro === 'string'
        ? config.key_macro
        : config.key_macro.tap
      if (macro) await methods.keyMacro(macro)
      return
    }
    if (config.commands?.tap) {
      await methods.runCommand(config.commands.tap)
    }
  },
  onDblTap: async ({ config, methods }) => {
    if (config.key_macro) {
      const macro = typeof config.key_macro === 'string'
        ? undefined
        : config.key_macro['double-tap']
      if (macro) await methods.keyMacro(macro)
      return
    }
    if (config.commands?.['double-tap']) {
      await methods.runCommand(config.commands['double-tap'])
    }
  },
  onHold: async ({ config, methods }) => {
    if (config.key_macro) {
      const macro = typeof config.key_macro === 'string'
        ? undefined
        : config.key_macro.hold
      if (macro) await methods.keyMacro(macro)
      return
    }
    if (config.commands?.hold) {
      await methods.runCommand(config.commands.hold)
    }
  },
  render: ({ config }) => (
    <IconLabelSurface icon={resolveIconSpec(config.icon)} label={config.label} />
  ),
  type: 'action',
})

export { builtinActionButton, BuiltinActionButtonSchema }
