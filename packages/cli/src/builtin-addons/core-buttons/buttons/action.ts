import { extname } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

import { createElement } from 'react'
import { z } from 'zod'

import { ButtonSurface, createDomTextLabel } from '../../../addon/api.js'

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

const BuiltinActionButtonSchema = z
  .object({
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    command: z.string().min(1).optional(),
  })
  .strict()

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
        createElement(ButtonSurface, null, createElement('div', {
          children: [
            getInlineImageSource(config.icon)
              ? createElement('img', { alt: '', key: 'icon', src: getInlineImageSource(config.icon), style: { height: '24px', objectFit: 'contain', width: '24px' } })
              : null,
            createElement('span', { key: 'label' }, createDomTextLabel({ children: config.label })),
          ],
          style: { alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center', width: '100%' },
          })),
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
