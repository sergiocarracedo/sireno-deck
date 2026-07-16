import type { AddonManifestV1 } from '@/addon/api'

import appInfoBackend from './buttons/app-info/backend'
import appInfoFrontend from './buttons/app-info/frontend'
import brightnessDownBackend from './buttons/brightness-down/backend'
import brightnessDownFrontend from './buttons/brightness-down/frontend'
import brightnessUpBackend from './buttons/brightness-up/backend'
import brightnessUpFrontend from './buttons/brightness-up/frontend'
import settingsDeck from './decks/settings'

const withInternal = <T extends object>(impl: T): T & { internal: true } => ({
  ...impl,
  internal: true,
})

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: 'internal-settings',
  buttonTypes: {
    'internal-settings:brightness-down': {
      frontend: brightnessDownFrontend,
      service: {
        ...withInternal(brightnessDownBackend),
        gestureHandlers: ['tap', 'dbl-tap'] as const,
      },
    },
    'internal-settings:brightness-up': {
      frontend: brightnessUpFrontend,
      service: {
        ...withInternal(brightnessUpBackend),
        gestureHandlers: ['tap', 'dbl-tap'] as const,
      },
    },
    'internal-settings:app-info': {
      frontend: appInfoFrontend,
      service: {
        ...withInternal(appInfoBackend),
        full: true,
      },
    },
  },
  decks: {
    'internal-settings:settings': { deck: settingsDeck, internal: true },
  },
}

export const internalSettingsAddon = manifest
export default manifest
