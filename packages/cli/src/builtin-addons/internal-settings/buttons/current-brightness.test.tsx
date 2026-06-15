import { beforeEach, describe, expect, it } from 'vitest'

import { _resetDeviceRegistryForTests, getCurrentBrightness } from '@/device/registry'
import { renderReactNodeToHtml } from '@/render/dom-host'

import {
  internalSettingsCurrentBrightnessButton,
  InternalSettingsCurrentBrightnessButtonSchema,
} from './current-brightness'

describe('InternalSettingsCurrentBrightnessButtonSchema', () => {
  it('parses an empty config', () => {
    expect(InternalSettingsCurrentBrightnessButtonSchema.parse({})).toEqual({})
  })
})

describe('internalSettingsCurrentBrightnessButton', () => {
  beforeEach(() => {
    _resetDeviceRegistryForTests()
  })

  it('has the expected type and configSchema', () => {
    expect(internalSettingsCurrentBrightnessButton.type).toBe(
      '__sireno_internal_settings_current_brightness',
    )
    expect(internalSettingsCurrentBrightnessButton.configSchema).toBe(
      InternalSettingsCurrentBrightnessButtonSchema,
    )
  })

  it('re-renders every second via defaultRenderIntervalMs', () => {
    const interval = (
      internalSettingsCurrentBrightnessButton.defaultRenderIntervalMs as () => number
    )()
    expect(interval).toBe(1_000)
  })

  it('renders the current device brightness and a label', () => {
    const html = renderReactNodeToHtml(
      (internalSettingsCurrentBrightnessButton.render as never)({
        config: {},
        full: false,
        position: 2,
      }),
    )
    expect(html).toContain('data-sireno-settings-button="current-brightness"')
    expect(html).toContain('Brightness')
    expect(html).toContain(`${getCurrentBrightness()}%`)
  })
})
