import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '@/render/dom-host'

import {
  internalSettingsBrightnessUpButton,
  InternalSettingsBrightnessUpButtonSchema,
  nextBrightnessUp,
} from '../../buttons/brightness-up'

describe('InternalSettingsBrightnessUpButtonSchema', () => {
  it('parses an empty config', () => {
    expect(InternalSettingsBrightnessUpButtonSchema.parse({})).toEqual({})
  })
})

describe('internalSettingsBrightnessUpButton', () => {
  it('has the expected type and configSchema', () => {
    expect(internalSettingsBrightnessUpButton.type).toBe(
      '__sireno_internal_settings_brightness_up',
    )
    expect(internalSettingsBrightnessUpButton.configSchema).toBe(
      InternalSettingsBrightnessUpButtonSchema,
    )
  })

  it('renders the brighter surface with sun icon and label', () => {
    const html = renderReactNodeToHtml(
      (internalSettingsBrightnessUpButton.render as () => ReactElement)({
        config: {},
        full: false,
        position: 0,
      }),
    )
    expect(html).toContain('data-sireno-settings-button="brightness-up"')
    expect(html).toContain('Brighter')
    expect(html).toContain('sun')
  })
})

describe('nextBrightnessUp', () => {
  it('steps up by 10', () => {
    expect(nextBrightnessUp(0)).toBe(10)
    expect(nextBrightnessUp(50)).toBe(60)
    expect(nextBrightnessUp(80)).toBe(90)
  })

  it('clamps to 100', () => {
    expect(nextBrightnessUp(95)).toBe(100)
    expect(nextBrightnessUp(100)).toBe(100)
  })
})
