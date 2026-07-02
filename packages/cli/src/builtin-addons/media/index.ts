import type { AddonManifestV1 } from '@/addon/api'

import { globalBackend } from './backend'
import mediaMuteBackend from './buttons/media-mute/backend'
import mediaMuteFrontend from './buttons/media-mute/frontend'
import mediaPlayerBackend from './buttons/media-player/backend'
import mediaPlayerFrontend from './buttons/media-player/frontend'
import mediaVolumeBackend from './buttons/media-volume/backend'
import mediaVolumeFrontend from './buttons/media-volume/frontend'

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: 'media',
  buttonTypes: {
    'media:player': {
      frontend: mediaPlayerFrontend,
      backend: mediaPlayerBackend,
    },
    'media:mute': {
      frontend: mediaMuteFrontend,
      backend: mediaMuteBackend,
    },
    'media:volume': {
      frontend: mediaVolumeFrontend,
      backend: mediaVolumeBackend,
    },
  },
  globalBackend,
}

export default manifest
