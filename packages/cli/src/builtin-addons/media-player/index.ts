import { SIRENO_ADDON_API_VERSION, type SirenoAddon } from '@/addon/api'

import { builtinMediaMuteButton } from './buttons/media-mute'
import { builtinMediaVolumeButton } from './buttons/media-volume'
import { createMediaPlayerButton } from './media-player-button'

const mediaPlayerAddon: SirenoAddon = {
  apiVersion: SIRENO_ADDON_API_VERSION,
  buttons: [
    createMediaPlayerButton(),
    builtinMediaMuteButton,
    builtinMediaVolumeButton,
  ],
  name: 'media-player',
}

export default mediaPlayerAddon
