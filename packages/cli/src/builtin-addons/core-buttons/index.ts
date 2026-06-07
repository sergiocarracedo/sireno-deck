import { fileURLToPath } from 'node:url'

import type { SirenoAddon } from '@/addon/api'
import { builtinActionButton } from './buttons/action'
import { builtinChangeDeckButton } from './buttons/change-deck'
import { builtinMediaSampleButton } from './buttons/media-sample'
import { builtinToggleButton } from './buttons/toggle'

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
