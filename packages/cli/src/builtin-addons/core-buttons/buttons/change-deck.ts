import { extname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

import { createElement } from 'react'
import { z } from 'zod'

import { createDomButtonRender, createDomTextLabel } from '../../../addon/api.js'

function getMimeType(iconPath: string): string {
  switch (extname(iconPath).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.svg':
      return 'image/svg+xml'
    case '.webp':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

function getInlineImageSource(iconPath: string | undefined): string | undefined {
  if (!iconPath || !existsSync(iconPath)) {
    return undefined
  }

  return `data:${getMimeType(iconPath)};base64,${readFileSync(iconPath).toString('base64')}`
}

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
      createDomButtonRender({
        content: createElement('div', {
          children: [
            getInlineImageSource(config.icon)
              ? createElement('img', { alt: '', key: 'icon', src: getInlineImageSource(config.icon), style: { height: '24px', objectFit: 'contain', width: '24px' } })
              : null,
            createElement('span', { key: 'label' }, createDomTextLabel({ children: config.label })),
          ],
          style: { alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center', width: '100%' },
        }),
        fallback: {
          ...(config.icon !== undefined ? { icon: config.icon } : {}),
          label: config.label,
        },
        keyIndex: button.position,
      }),
  }),
  type: 'change-deck',
}

export { builtinChangeDeckButton, BuiltinChangeDeckButtonSchema }
