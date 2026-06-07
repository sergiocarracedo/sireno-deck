import {
  AddonButtonActionConfigSchema,
  defineMountedButton,
} from '@/addon/api'

import {
  EMOJI_ICON_ASSETS,
  EmojiEntryButtonSchema,
  getEmojiFallbackLabel,
  getEmojiShortcode,
  renderEmojiGlyph,
} from '../support'
import { createButtonNode } from '../support'

const EmojiEntryButtonWithActionsSchema = EmojiEntryButtonSchema.extend(
  AddonButtonActionConfigSchema.shape,
)

function resolveTapCommand(config: z.infer<typeof EmojiEntryButtonWithActionsSchema>): string | undefined {
  if (config.select_command) {
    return config.select_command
      .replaceAll('{{emoji}}', config.emoji)
      .replaceAll('{{label}}', config.label)
  }
  return undefined
}

import { z } from 'zod'

const emojiEntryButton = defineMountedButton({
  configSchema: EmojiEntryButtonWithActionsSchema,
  onDblTap: async ({ config, methods }) => {
    const shortcode = getEmojiShortcode(config.emoji)
    if (shortcode) {
      await methods.pasteText(`:${shortcode}:`)
    }
  },
  onTap: async ({ config, methods }) => {
    const cmd = resolveTapCommand(config)
    if (cmd) {
      await methods.runCommand(cmd)
    } else {
      await methods.pasteText(config.emoji)
    }
  },
  render: ({ config }) =>
    EMOJI_ICON_ASSETS[config.emoji] !== undefined
      ? createButtonNode(
          getEmojiFallbackLabel(config.emoji),
          EMOJI_ICON_ASSETS[config.emoji],
        )
      : renderEmojiGlyph(config.emoji),
  type: 'emoji-emoji-button',
})

export { emojiEntryButton, EmojiEntryButtonWithActionsSchema }
