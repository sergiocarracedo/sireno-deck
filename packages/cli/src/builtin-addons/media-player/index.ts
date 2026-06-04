import { SIRENO_ADDON_API_VERSION, type SirenoAddon } from '../../addon/api.js'

import { createMediaPlayerButton } from './media-player-button.js'

const mediaPlayerAddon: SirenoAddon = {
  apiVersion: SIRENO_ADDON_API_VERSION,
  buttons: [createMediaPlayerButton()],
  name: 'media-player',
}

export default mediaPlayerAddon
