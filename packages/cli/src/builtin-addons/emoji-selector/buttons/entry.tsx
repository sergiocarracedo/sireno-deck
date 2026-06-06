import {
  AddonButtonActionConfigSchema,
  defineMountedButton,
  useButtonActionCommand,
} from '../../../addon/api.js'

import {
  resolveEmojiShortcodeCommand,
  resolveEmojiTypeCommand,
} from '../os-shims.js'
import {
  createButtonNode,
  EMOJI_ICON_ASSETS,
  EmojiEntryButtonSchema,
  getEmojiFallbackLabel,
  getEmojiShortcode,
  renderEmojiText,
} from '../support.js'

const EmojiEntryButtonWithActionsSchema = EmojiEntryButtonSchema.extend(
  AddonButtonActionConfigSchema.shape,
)

const emojiEntryButton = defineMountedButton({
  configSchema: EmojiEntryButtonWithActionsSchema,
  ...useButtonActionCommand(({ config, hostContext }) => {
    const emoji = config.emoji
    const label = config.label
    const selectCommand = config.select_command

    const tapResolved = resolveEmojiTypeCommand(emoji, hostContext)
    const tap =
      tapResolved.kind === 'supported'
        ? tapResolved.command
        : selectCommand
            .replaceAll('{{emoji}}', emoji)
            .replaceAll('{{label}}', label)

    const shortcode = getEmojiShortcode(emoji)
    let doubleTap: string | undefined
    if (config.select_command_shortcode) {
      doubleTap = config.select_command_shortcode
        .replaceAll('{{shortcode}}', shortcode ?? '')
        .replaceAll('{{emoji}}', emoji)
    } else if (shortcode !== undefined) {
      const shortcodePayload = `:${shortcode}:`
      const doubleTapResolved = resolveEmojiShortcodeCommand(
        shortcodePayload,
        hostContext,
      )
      if (doubleTapResolved.kind === 'supported') {
        doubleTap = doubleTapResolved.command
      }
    }

    return {
      tap,
      ...(doubleTap !== undefined ? { 'double-tap': doubleTap } : {}),
    }
  }),
  render: ({ config }) =>
    EMOJI_ICON_ASSETS[config.emoji] !== undefined
      ? createButtonNode(
          getEmojiFallbackLabel(config.emoji),
          EMOJI_ICON_ASSETS[config.emoji],
        )
      : renderEmojiText(getEmojiFallbackLabel(config.emoji)),
  type: 'emoji-entry-button',
})

export { emojiEntryButton, EmojiEntryButtonWithActionsSchema }
