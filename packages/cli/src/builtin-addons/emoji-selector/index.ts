import type { AddonManifestV1 } from '@/addon/api'

import categoryBackend from './buttons/category/backend'
import categoryFrontend from './buttons/category/frontend'
import emojiBackend from './buttons/emoji/backend'
import emojiFrontend from './buttons/emoji/frontend'
import launcherBackend from './buttons/launcher/backend'
import launcherFrontend from './buttons/launcher/frontend'
import emojiSelectorDeckEntry from './decks'

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: 'emoji-selector',
  buttonTypes: {
    'emoji-selector:category': {
      frontend: categoryFrontend,
      service: categoryBackend,
    },
    'emoji-selector:emoji': { frontend: emojiFrontend, service: emojiBackend },
    'emoji-selector:launcher': {
      frontend: launcherFrontend,
      service: { ...launcherBackend, gestureHandlers: ['tap'] as const },
    },
  },
  decks: [emojiSelectorDeckEntry],
}

export const emojiSelectorAddon = manifest
export default manifest
