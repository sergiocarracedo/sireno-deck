import { z } from 'zod'

import { defineMountedButton } from '../../../addon/api.js'
import { Icon, Text } from '../../../ui/index.js'

const BuiltinActionButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    command: z.string().min(1).optional(),
  })
  .strict()

const builtinActionButton = defineMountedButton({
  configSchema: BuiltinActionButtonSchema,
  onTap: async ({ config, methods }) => {
    if (config.command) {
      methods.invalidate()
      methods.runCommand(config.command)
    }
  },
  render: ({ config }) => (
    <div className="flex flex-col items-center justify-center w-full gap-1.5">
      {config.icon ? <Icon size={24} src={config.icon} /> : null}
      <span className="font-main text-primary">
        <Text
          className="w-full text-balance"
          fit="wrap"
          tone="primary"
          typography="main"
        >
          {config.label}
        </Text>
      </span>
    </div>
  ),
  type: 'action',
})

export { builtinActionButton, BuiltinActionButtonSchema }
