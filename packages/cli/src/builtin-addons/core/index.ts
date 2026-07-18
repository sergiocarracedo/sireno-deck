import type { AddonManifestV1 } from '@/addon/api'

import actionBackend from './buttons/action/backend'
import actionFrontend from './buttons/action/frontend'
import changeDeckBackend from './buttons/change-deck/backend'
import changeDeckFrontend from './buttons/change-deck/frontend'
import mediaSampleBackend from './buttons/media-sample/backend'
import mediaSampleFrontend from './buttons/media-sample/frontend'
import pageNavBackend from './buttons/page-nav/backend'
import pageNavFrontend from './buttons/page-nav/frontend'
import toggleBackend from './buttons/toggle/backend'
import toggleFrontend from './buttons/toggle/frontend'

export const manifest: AddonManifestV1 = {
  apiVersion: 1,
  name: 'core',
  buttonTypes: {
    'core:action': {
      frontend: actionFrontend,
      service: actionBackend,
    },
    'core:change-deck': {
      frontend: changeDeckFrontend,
      service: { ...changeDeckBackend, gestureHandlers: ['tap'] as const },
    },
    'core:toggle': {
      frontend: toggleFrontend,
      service: { ...toggleBackend, gestureHandlers: ['tap'] as const },
    },
    'core:page-nav': {
      frontend: pageNavFrontend,
      service: { ...pageNavBackend, gestureHandlers: ['tap', 'hold'] as const },
    },
    'core:media-sample': {
      frontend: mediaSampleFrontend,
      service: { ...mediaSampleBackend, gestureHandlers: ['tap'] as const },
    },
  },
  decks: {
    'core:lock': {
      type: 'core:lock',
      createDecks: ({ config, keyCount }) => {
        const userButtons = (
          config as { lockButtons?: ReadonlyArray<Record<string, unknown>> }
        ).lockButtons

        const centerButton = Math.floor(keyCount / 2)

        const defaultButtons = [
          {
            id: '0',
            type: 'date-time:date-time',
            config: { format: '<4xl>HH</4xl>' },
            position: centerButton - 1,
            full: true,
          },
          {
            id: '1',
            type: 'date-time:date-time',
            config: { format: '<4xl><blink>:</blink></4xl>' },
            position: centerButton,
            full: true,
          },
          {
            id: '2',
            type: 'date-time:date-time',
            config: { format: '<4xl>mm</4xl>' },
            position: centerButton + 1,
            full: true,
          },
        ]

        return {
          'core:lock': {
            name: 'Lock',
            buttons:
              userButtons !== undefined && userButtons.length > 0
                ? userButtons.map((b, i) => ({
                    id: b.position !== undefined ? String(b.position) : `b${i}`,
                    ...b,
                  }))
                : defaultButtons,
          },
        }
      },
    },
  },
}

export const coreAddon = manifest
export default manifest
export {
  actionBackend as actionButtonBackend,
  actionFrontend as ActionButtonFrontend,
  changeDeckBackend as changeDeckButtonBackend,
  changeDeckFrontend as ChangeDeckFrontend,
  mediaSampleBackend as mediaSampleButtonBackend,
  mediaSampleFrontend as MediaSampleButtonFrontend,
  pageNavBackend as pageNavButtonBackend,
  pageNavFrontend as PageNavFrontend,
  toggleBackend as toggleButtonBackend,
  toggleFrontend as ToggleButtonFrontend,
}
