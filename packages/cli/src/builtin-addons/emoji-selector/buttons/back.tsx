import { defineMountedButton } from '../../../addon/api.js'

import { createButtonNode, EmojiBackButtonSchema } from '../support.js'

const emojiBackButton = defineMountedButton({
  configSchema: EmojiBackButtonSchema,
  onTap: async ({ methods }) => {
    await methods.goBack()
  },
  render: ({ config }) => createButtonNode(config.label, config.icon),
  type: 'emoji-back-button',
})

export { emojiBackButton }
