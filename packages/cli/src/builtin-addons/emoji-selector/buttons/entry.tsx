import { defineMountedButton } from '../../../addon/api.js'

import {
  createButtonNode,
  EMOJI_ICON_ASSETS,
  EmojiEntryButtonSchema,
  getEmojiFallbackLabel,
  renderEmojiText,
} from '../support.js'

const emojiEntryButton = defineMountedButton({
  configSchema: EmojiEntryButtonSchema,
  onTap: async ({ config, methods }) => {
    await methods.runCommand(
      config.select_command
        .replaceAll('{{emoji}}', config.emoji)
        .replaceAll('{{label}}', config.label),
    )
  },
  render: ({ config }) =>
    EMOJI_ICON_ASSETS[config.emoji] !== undefined
      ? createButtonNode(
          getEmojiFallbackLabel(config.emoji),
          EMOJI_ICON_ASSETS[config.emoji],
        )
      : renderEmojiText(getEmojiFallbackLabel(config.emoji)),
  type: 'emoji-entry-button',
})

export { emojiEntryButton }
