import internalSettingsAddon from '@/builtin-addons/internal-settings'
import { ButtonInstance, DeckConfig } from '@/core/schemas'
import { INTERNAL_SETTINGS_DECK_ID } from './consts'

const internalSettingsButtonDefinitions = new Map<
  string,
  ButtonInstance['definition']
>(internalSettingsAddon.buttons.map((button) => [button.type, button]))

export function createInternalSettingsDeck(): DeckConfig {
  const buttonSpecs = [
    {
      position: 0,
      type: '__sireno_internal_settings_brightness_down',
    },
    {
      position: 1,
      type: '__sireno_internal_settings_brightness_up',
    },
    {
      position: 2,
      type: '__sireno_internal_settings_current_brightness',
    },
    // position 3 intentionally left empty
    {
      position: 4,
      type: '__sireno_internal_settings_logo_version',
    },
  ] as const
  return {
    id: INTERNAL_SETTINGS_DECK_ID,
    name: 'Settings',
    system: true,
    buttons: buttonSpecs.map(({ position, type }) => {
      const definition = internalSettingsButtonDefinitions.get(type)
      if (!definition) {
        throw new Error(
          `Bundled internal-settings button definition is missing for type '${type}'`,
        )
      }
      return {
        config: {},
        definition,
        position,
        type,
      }
    }),
  }
}
