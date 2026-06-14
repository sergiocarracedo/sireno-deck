import { MainLabelSurface } from '@/ui'
import { definePagedCategoryButton } from '@/core/pagination'

import { EmojiCategoryButtonSchema } from '../support'

const emojiCategoryButton = definePagedCategoryButton({
  configSchema: EmojiCategoryButtonSchema,
  getTargetDeckId: (config) => config.target_deck,
  render: ({ config }) => (
    <MainLabelSurface label={config.label} main={config.icon} />
  ),
  type: 'emoji-category-button',
})

export { emojiCategoryButton }
