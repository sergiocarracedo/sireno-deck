import { createElement } from 'react'
import { z } from 'zod'

import { Icon, Text } from '../../../ui/index.js'
import { defineMountedButton } from '../../../addon/api.js'

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
  render: ({ config }) =>
    <div className="bg-background border border-accent rounded-lg flex items-center justify-center h-full w-full p-2">
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
    </div>,
  type: 'action',
})

export { builtinActionButton, BuiltinActionButtonSchema }
