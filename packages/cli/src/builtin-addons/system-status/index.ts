import type { SirenoAddon } from '@/addon/api'
import { builtinSystemStatusButton } from './buttons/builtinSystemStatusButton'

const systemStatusAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [builtinSystemStatusButton] as SirenoAddon['buttons'],
  name: 'system-status',
}

export default systemStatusAddon
