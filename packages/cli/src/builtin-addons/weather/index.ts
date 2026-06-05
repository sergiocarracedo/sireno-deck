import { SIRENO_ADDON_API_VERSION, type SirenoAddon } from '@/addon/api'

import { builtinWeatherButton } from './buttons/weather.js'

const weatherAddon: SirenoAddon = {
  apiVersion: SIRENO_ADDON_API_VERSION,
  buttons: [builtinWeatherButton],
  name: 'weather',
}

export default weatherAddon
