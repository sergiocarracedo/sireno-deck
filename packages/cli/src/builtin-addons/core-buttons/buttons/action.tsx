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
      createElement(
        'div',
        {
          className: 'flex flex-col items-center justify-center w-full',
          style: { gap: '6px' },
        },
        config.icon
          ? createElement(Icon, { size: 24, src: config.icon })
          : null,
        createElement(
          'span',
          { className: 'font-main text-primary' },
          createElement(Text, {
            className: 'w-full',
            fit: 'wrap',
            style: { textWrap: 'balance' },
            tone: 'primary',
            typography: 'main',
          }, config.label),
        ),
      ),
    ),
  type: 'action',
})

export { builtinActionButton, BuiltinActionButtonSchema }
