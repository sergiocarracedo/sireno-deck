import { definePagedCategoryButton } from '@/core/pagination'

import { createButtonNode, EmojiCategoryButtonSchema } from '../support'

const emojiCategoryButton = definePagedCategoryButton({
  configSchema: EmojiCategoryButtonSchema,
  getTargetDeckId: (config) => config.target_deck,
  render: ({ config }) => createButtonNode(config.label, config.icon),
  type: 'emoji-category-button',
})

export { emojiCategoryButton }
