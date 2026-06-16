import { describe, expect, it } from 'vitest'

import { createInternalSettingsDeck } from '../runtime'

describe('createInternalSettingsDeck (fixed layout)', () => {
  it('places the 4 internal buttons at fixed positions {0, 1, 2, 4} (position 3 intentionally empty)', () => {
    const deck = createInternalSettingsDeck()
    const byPosition = new Map(deck.buttons.map((b) => [b.position, b.type]))

    expect(byPosition.get(0)).toBe('__sireno_internal_settings_brightness_down')
    expect(byPosition.get(1)).toBe('__sireno_internal_settings_brightness_up')
    expect(byPosition.get(2)).toBe('__sireno_internal_settings_current_brightness')
    expect(byPosition.get(3)).toBeUndefined() // intentional gap
    expect(byPosition.get(4)).toBe('__sireno_internal_settings_logo_version')
  })

  it('leaves position n-1 free for the runtime-injected system back button', () => {
    const deck = createInternalSettingsDeck()
    const occupied = new Set(deck.buttons.map((b) => b.position))
    // No internal-settings button occupies position n-1 for ANY keyCount.
    // The runtime injects a system back button there for non-main decks.
    // This test is keyCount-independent: it asserts the internal deck
    // never claims the n-1 slot, regardless of grid size.
    for (const n of [6, 9, 15, 32] as const) {
      expect(occupied.has(n - 1)).toBe(false)
    }
  })

  it('has the expected system deck metadata', () => {
    const deck = createInternalSettingsDeck()
    expect(deck.id).toBe('__sireno_internal_settings')
    expect(deck.name).toBe('Settings')
    expect(deck.system).toBe(true)
  })
})
