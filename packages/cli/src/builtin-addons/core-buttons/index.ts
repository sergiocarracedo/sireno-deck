import { fileURLToPath } from 'node:url'

import type { SirenoAddon } from '../../addon/api.js'
import { builtinActionButton } from './buttons/action.js'
import { builtinChangeDeckButton } from './buttons/change-deck.js'
import { builtinMediaSampleButton } from './buttons/media-sample.js'
import { builtinToggleButton } from './buttons/toggle.js'

const assets = {
  'clock.svg': fileURLToPath(new URL('./assets/clock.svg', import.meta.url)),
}

const coreButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  assets,
  buttons: [builtinActionButton, builtinChangeDeckButton, builtinMediaSampleButton, builtinToggleButton],
  name: 'core-buttons',
}

export default coreButtonsAddon
