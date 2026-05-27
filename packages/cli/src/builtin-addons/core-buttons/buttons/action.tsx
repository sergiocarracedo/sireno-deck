import { createElement } from 'react'
import { z } from 'zod'

import { createDomIcon, createDomStack, defineMountedButton } from '../../../addon/api.js'

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
    createElement(
      'div',
      {
        className: 'bg-background border-accent',
        style: {
          alignItems: 'center',
          border: '1px solid var(--sireno-color-accent)',
          borderRadius: '12px',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: '8px',
          width: '100%',
        },
      },
      createDomStack({
        children: [
          config.icon ? createDomIcon({ src: config.icon }) : null,
          createElement('span', {
            children: config.label,
            className: 'font-main text-primary',
            style: {
              display: 'block',
              lineHeight: 1.2,
              textAlign: 'center',
              textWrap: 'balance',
            },
          }),
        ],
      }),
    ),
  type: 'action',
})

export { builtinActionButton, BuiltinActionButtonSchema }
