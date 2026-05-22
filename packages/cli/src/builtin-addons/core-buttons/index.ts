import { fileURLToPath } from 'node:url'

import type { SirenoAddon } from '../../addon/api.js'
import { builtinActionButton } from './buttons/action.js'
import { builtinChangeDeckButton } from './buttons/change-deck.js'
import { builtinMediaDemoButton } from './buttons/media-demo.js'
import { builtinToggleButton } from './buttons/toggle.js'

const assets = {
  'clock.svg': fileURLToPath(new URL('../assets/clock.svg', import.meta.url)),
}

const wrappers = [{ name: 'shared-card', wrapper: 'shared' }] as const
const styles = [{ name: 'accent', shared: { tone: 'accent' } }] as const

const coreButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  assets,
  buttons: [builtinActionButton, builtinChangeDeckButton, builtinToggleButton, builtinMediaDemoButton],
  name: 'core-buttons',
  styles,
  wrappers,
}

export default coreButtonsAddon
