import { createElement } from 'react'
import { z } from 'zod'

import { createDomIcon, createDomStack, createDomTextLabel } from '../../../addon/api.js'

const BuiltinActionButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    command: z.string().min(1).optional(),
  })
  .strict()

const isCommandFailure = (result: {
  code: number | null
  failed: boolean
  timedOut: boolean
}) => result.failed || result.timedOut || result.code !== 0

const builtinActionButton = {
  configSchema: BuiltinActionButtonSchema,
  createInstance: ({
    button,
    config,
    methods,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinActionButtonSchema>
    methods: {
      invalidate: () => void
      runCommand: (command: string) => Promise<{
        code: number | null
        failed: boolean
        stdout: string
        timedOut: boolean
      }>
    }
  }) => ({
    render: () =>
      createDomStack({
        children: [
          config.icon ? createDomIcon({ src: config.icon }) : null,
          createDomTextLabel({ children: config.label }),
        ],
      }),
    onTap: async () => {
      if (config.command) {
        methods.invalidate()
        methods.runCommand(config.command)
      }
    },
  }),
  type: 'action',
}

export { builtinActionButton, BuiltinActionButtonSchema }
