import { SIRENO_ADDON_API_VERSION, type SirenoAddon } from '../../addon/api.js'

import { builtinMediaMuteButton } from './buttons/media-mute.js'
import { builtinMediaVolumeButton } from './buttons/media-volume.js'
import { createMediaPlayerButton } from './media-player-button.js'

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
