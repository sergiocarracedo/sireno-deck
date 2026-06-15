import type { SirenoAddon } from '@/addon/api'
import { internalSettingsBrightnessDownButton } from './buttons/brightness-down'
import { internalSettingsBrightnessUpButton } from './buttons/brightness-up'
import { internalSettingsCurrentBrightnessButton } from './buttons/current-brightness'
import { internalSettingsLogoVersionButton } from './buttons/logo-version'

const internalSettingsAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [
    internalSettingsBrightnessUpButton,
    internalSettingsBrightnessDownButton,
    internalSettingsCurrentBrightnessButton,
    internalSettingsLogoVersionButton,
  ] as SirenoAddon['buttons'],
  name: 'internal-settings',
  system: true,
}

export default internalSettingsAddon
