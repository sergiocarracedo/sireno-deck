import { SIRENO_ADDON_API_VERSION, type SirenoAddon } from '@/addon/api'

import { builtinWeatherButton } from './buttons/weather'

const weatherAddon: SirenoAddon = {
  apiVersion: SIRENO_ADDON_API_VERSION,
  buttons: [builtinWeatherButton] as SirenoAddon['buttons'],
  name: 'weather',
}

export default weatherAddon
