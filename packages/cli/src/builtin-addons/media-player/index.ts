import { SIRENO_ADDON_API_VERSION, type SirenoAddon } from '../../addon/api.js'

import { builtinMediaPlayerButton } from './button.js'

const mediaPlayerAddon: SirenoAddon = {
  apiVersion: SIRENO_ADDON_API_VERSION,
  buttons: [builtinMediaPlayerButton],
  name: 'media-player',
}

export default mediaPlayerAddon
