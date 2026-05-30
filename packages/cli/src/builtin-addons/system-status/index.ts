import type { SirenoAddon } from '../../addon/api.js'
import { builtinSystemStatusBarsButton } from './buttons/bars.js'
import { builtinSystemStatusLabelValuesButton } from './buttons/label-values.js'

const systemStatusAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [
    builtinSystemStatusBarsButton,
    builtinSystemStatusLabelValuesButton,
  ] as SirenoAddon['buttons'],
  name: 'system-status',
}

export default systemStatusAddon
