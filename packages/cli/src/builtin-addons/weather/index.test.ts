import { describe, expect, it } from 'vitest'

import weatherAddon from './index.js'

describe('weather addon', () => {
  it('exports a bundled weather button definition', () => {
    expect(weatherAddon.name).toBe('weather')
    expect(weatherAddon.apiVersion).toBe(1)
    expect(weatherAddon.buttons.map((b) => b.type)).toEqual(['weather'])
  })

  it('accepts a config with units: metric and unavailable_label', () => {
    const def = weatherAddon.buttons[0]!
    expect(
      def.configSchema.parse({ units: 'metric', unavailable_label: 'Hi' }),
    ).toEqual({
      poll_interval_min: 10,
      render_interval_ms: 600_000,
      unavailable_label: 'Hi',
      units: 'metric',
    })
  })
})
