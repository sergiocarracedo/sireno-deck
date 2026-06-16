import { describe, expect, it } from 'vitest'

import { createInternalSettingsDeck } from '../runtime'

describe('createInternalSettingsDeck', () => {
  const expectedTypes = {
    logo: '__sireno_internal_settings_logo_version',
    darker: '__sireno_internal_settings_brightness_down',
    brighter: '__sireno_internal_settings_brightness_up',
    percent: '__sireno_internal_settings_current_brightness',
  } as const

  it.each([6, 9, 15, 32] as const)(
    'places the 4 settings buttons at positions {0, keyCount-3, keyCount-2, keyCount-1} for keyCount=%i',
    (keyCount) => {
      const deck = createInternalSettingsDeck(keyCount)
      const layout = deck.buttons
        .map((button) => ({ position: button.position, type: button.type }))
        .sort((a, b) => a.position - b.position)
      expect(layout).toEqual([
        { position: 0, type: expectedTypes.logo },
        { position: keyCount - 3, type: expectedTypes.darker },
        { position: keyCount - 2, type: expectedTypes.brighter },
        { position: keyCount - 1, type: expectedTypes.percent },
      ])
    },
  )

  it('places the 4 buttons at positions {0,1,2,3} for keyCount=4 (degenerate but legal)', () => {
    const deck = createInternalSettingsDeck(4)
    const layout = deck.buttons
      .map((button) => ({ position: button.position, type: button.type }))
      .sort((a, b) => a.position - b.position)
    expect(layout).toEqual([
      { position: 0, type: expectedTypes.logo },
      { position: 1, type: expectedTypes.darker },
      { position: 2, type: expectedTypes.brighter },
      { position: 3, type: expectedTypes.percent },
    ])
  })

  it.each([1, 3] as const)(
    'throws when keyCount=%i is below the minimum (keyCount >= 4)',
    (keyCount) => {
      expect(() => createInternalSettingsDeck(keyCount)).toThrow(
        /keyCount >= 4/,
      )
    },
  )
})
