import type { AddonFrontendButton } from '@/addon/api'
import { IconLabelSurface } from '@/ui'
import { ConfigSchema } from './config'

const EmojiButtonFrontend: AddonFrontendButton<ConfigSchema> = ({ config }) => {
  const emoji = config.emoji
  const shortCode = `:${config.shortcode}:`
  return <IconLabelSurface source={emoji} label={shortCode} variant="small" />
}

export default EmojiButtonFrontend
