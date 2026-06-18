import { describe, expect, it } from 'vitest'

import internalSettingsAddon from '..'

describe('internal-settings addon', () => {
  it('exports a SirenoAddon with the expected shape', () => {
    expect(internalSettingsAddon.name).toBe('internal-settings')
    expect(internalSettingsAddon.apiVersion).toBe(1)
    expect(internalSettingsAddon.system).toBe(true)
    expect(internalSettingsAddon.buttons.map((button) => button.type)).toEqual([
      '__sireno_internal_settings_brightness_up',
      '__sireno_internal_settings_brightness_down',
      '__sireno_internal_settings_current_brightness',
      '__sireno_internal_settings_logo_version',
    ])
  })
})
