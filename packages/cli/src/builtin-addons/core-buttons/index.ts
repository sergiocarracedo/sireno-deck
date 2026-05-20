import { fileURLToPath } from 'node:url'

import type { SirenoAddon } from '../../addon/api.js'
import { builtinActionButton } from './src/buttons/action.js'
import { builtinChangeDeckButton } from './src/buttons/change-deck.js'
import { builtinToggleButton } from './src/buttons/toggle.js'

const assets = {
  'clock.svg': fileURLToPath(new URL('../assets/clock.svg', import.meta.url)),
}

const wrappers = [{ name: 'shared-card', wrapper: 'shared' }] as const
const styles = [{ name: 'accent', shared: { tone: 'accent' } }] as const

const coreButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  assets,
  buttons: [builtinActionButton, builtinChangeDeckButton, builtinToggleButton],
  name: 'core-buttons',
  styles,
  wrappers,
}

export default coreButtonsAddon
