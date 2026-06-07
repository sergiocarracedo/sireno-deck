import type { SirenoAddon } from '@/addon/api'
import { builtinSystemStatusBarsButton } from './buttons/bars'
import { builtinSystemStatusLabelValuesButton } from './buttons/label-values'

const systemStatusAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [
    builtinSystemStatusBarsButton,
    builtinSystemStatusLabelValuesButton,
  ] as SirenoAddon['buttons'],
  name: 'system-status',
}

export default systemStatusAddon
