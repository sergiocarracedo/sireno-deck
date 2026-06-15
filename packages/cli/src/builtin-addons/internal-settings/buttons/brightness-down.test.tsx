import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import { renderReactNodeToHtml } from '@/render/dom-host'

import {
  internalSettingsBrightnessDownButton,
  InternalSettingsBrightnessDownButtonSchema,
  nextBrightnessDown,
} from './brightness-down'

describe('InternalSettingsBrightnessDownButtonSchema', () => {
  it('parses an empty config', () => {
    expect(InternalSettingsBrightnessDownButtonSchema.parse({})).toEqual({})
  })
})

describe('internalSettingsBrightnessDownButton', () => {
  it('has the expected type and configSchema', () => {
    expect(internalSettingsBrightnessDownButton.type).toBe(
      '__sireno_internal_settings_brightness_down',
    )
    expect(internalSettingsBrightnessDownButton.configSchema).toBe(
      InternalSettingsBrightnessDownButtonSchema,
    )
  })

  it('renders the dimmer surface with moon icon and label', () => {
    const html = renderReactNodeToHtml(
      (internalSettingsBrightnessDownButton.render as () => ReactElement)({
        config: {},
        full: false,
        position: 1,
      }),
    )
    expect(html).toContain('data-sireno-settings-button="brightness-down"')
    expect(html).toContain('Dimmer')
    expect(html).toContain('moon')
  })
})

describe('nextBrightnessDown', () => {
  it('steps down by 10', () => {
    expect(nextBrightnessDown(50)).toBe(40)
    expect(nextBrightnessDown(30)).toBe(20)
  })

  it('clamps to MIN_BRIGHTNESS (10)', () => {
    expect(nextBrightnessDown(15)).toBe(10)
    expect(nextBrightnessDown(10)).toBe(10)
    expect(nextBrightnessDown(0)).toBe(10)
  })
})
