import { defineMountedButton } from '@/addon/api'

import { createButtonNode, EmojiCategoryButtonSchema } from '../support'

const emojiCategoryButton = defineMountedButton({
  configSchema: EmojiCategoryButtonSchema,
  onTap: async ({ config, methods }) => {
    await methods.navigateToDeck(config.target_deck)
  },
  render: ({ config }) => createButtonNode(config.label, config.icon),
  type: 'emoji-category-button',
})

export { emojiCategoryButton }
