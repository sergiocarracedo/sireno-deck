import type { SirenoAddon } from '@/addon/api'
import { builtinValueDisplayButton } from './buttons/value-display'

const valueDisplayAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [builtinValueDisplayButton] as SirenoAddon['buttons'],
  name: 'value-display',
}

export default valueDisplayAddon