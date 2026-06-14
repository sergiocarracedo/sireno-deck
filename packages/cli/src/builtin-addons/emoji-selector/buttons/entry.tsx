import { z } from 'zod'

import {
  AddonButtonActionConfigSchema,
  defineMountedButton,
} from '@/addon/api'
import { MainLabelSurface } from '@/ui'

import {
  EMOJI_ICON_ASSETS,
  EmojiEntryButtonSchema,
  getEmojiFallbackLabel,
  getEmojiShortcode,
} from '../support'

const EmojiEntryButtonWithActionsSchema = EmojiEntryButtonSchema.extend(
  AddonButtonActionConfigSchema.shape,
)

const emojiEntryButton = defineMountedButton({
  configSchema: EmojiEntryButtonWithActionsSchema,
  onDblTap: async ({ config, methods }) => {
    const shortcode = getEmojiShortcode(config.emoji)
    if (shortcode) {
      await methods.pasteText(`:${shortcode}:`)
    }
  },
  onTap: async ({ config, methods }) => {
    await methods.pasteText(config.emoji)
  },
  render: ({ config }) => {
    const emojiAsset = EMOJI_ICON_ASSETS[config.emoji]
    return (
      <MainLabelSurface
        label={getEmojiFallbackLabel(config.emoji)}
        main={emojiAsset ?? config.emoji}
      />
    )
  },
  type: 'emoji-emoji-button',
})

export { emojiEntryButton, EmojiEntryButtonWithActionsSchema }
