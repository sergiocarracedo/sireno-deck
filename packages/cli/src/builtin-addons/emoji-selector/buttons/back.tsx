import { MainLabelSurface } from '@/ui'
import { defineMountedButton } from '@/addon/api'

import { EmojiBackButtonSchema } from '../support'

const emojiBackButton = defineMountedButton({
  configSchema: EmojiBackButtonSchema,
  onTap: async ({ methods }) => {
    await methods.goBack()
  },
  render: ({ config }) => (
    <MainLabelSurface label={config.label} main={config.icon} />
  ),
  type: 'emoji-back-button',
})

export { emojiBackButton }
