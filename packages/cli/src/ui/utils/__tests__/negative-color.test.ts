import { describe, expect, it } from 'vitest'

import {
  computeNegativeColor,
  luma,
  parseHex,
  toHex,
} from '../utils/negative-color'

describe('parseHex', () => {
  it('parses a 6-digit hex', () => {
    expect(parseHex('#7dd3fc')).toEqual({ r: 125, g: 211, b: 252 })
  })

  it('parses a 3-digit hex', () => {
    expect(parseHex('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('is case-insensitive', () => {
    expect(parseHex('#7DD3FC')).toEqual({ r: 125, g: 211, b: 252 })
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseHex('  #7dd3fc  ')).toEqual({ r: 125, g: 211, b: 252 })
  })

  it('rejects non-hex strings', () => {
    expect(parseHex('not-a-color')).toBeNull()
  })

  it('rejects rgb() syntax (only hex is supported)', () => {
    expect(parseHex('rgb(0,0,0)')).toBeNull()
  })

  it('rejects CSS variables', () => {
    expect(parseHex('var(--sireno-color-primary)')).toBeNull()
  })

  it('rejects empty string', () => {
    expect(parseHex('')).toBeNull()
  })

  it('rejects hex with the wrong number of digits', () => {
    expect(parseHex('#7d')).toBeNull()
    expect(parseHex('#7d3fca1')).toBeNull()
  })
})

describe('toHex', () => {
  it('pads single-digit channels to two digits', () => {
    expect(toHex({ r: 0, g: 0, b: 0 })).toBe('#000000')
    expect(toHex({ r: 1, g: 2, b: 3 })).toBe('#010203')
  })

  it('clamps out-of-range values', () => {
    expect(toHex({ r: -1, g: 300, b: 128 })).toBe('#00ff80')
  })
})

describe('luma', () => {
  it('is 0 for pure black', () => {
    expect(luma({ r: 0, g: 0, b: 0 })).toBe(0)
  })

  it('is 255 for pure white (within floating-point precision)', () => {
    expect(luma({ r: 255, g: 255, b: 255 })).toBeCloseTo(255, 5)
  })

  it('weights green most heavily', () => {
    const greenLuma = luma({ r: 0, g: 255, b: 0 })
    const redLuma = luma({ r: 255, g: 0, b: 0 })
    const blueLuma = luma({ r: 0, g: 0, b: 255 })
    expect(greenLuma).toBeGreaterThan(redLuma)
    expect(redLuma).toBeGreaterThan(blueLuma)
  })
})

describe('computeNegativeColor', () => {
  it('returns the per-channel complement for a known color', () => {
    expect(computeNegativeColor('#7dd3fc', null)).toBe('#822c03')
  })

  it('returns black for white', () => {
    expect(computeNegativeColor('#ffffff', null)).toBe('#000000')
  })

  it('returns white for pure black (luma 0 is far from 128, so complement applies)', () => {
    expect(computeNegativeColor('#000000', null)).toBe('#ffffff')
  })

  it('falls back to white for a near-gray dark bar (luma 127)', () => {
    expect(computeNegativeColor('#7f7f7f', null)).toBe('#ffffff')
  })

  it('falls back to black for a near-gray bar at luma 128 exactly', () => {
    expect(computeNegativeColor('#808080', null)).toBe('#000000')
  })

  it('falls back to black for a near-gray light bar (luma 136)', () => {
    expect(computeNegativeColor('#888888', null)).toBe('#000000')
  })

  it('uses the theme primary when bar color is a CSS variable', () => {
    expect(computeNegativeColor('var(--sireno-color-primary)', '#7dd3fc')).toBe(
      '#822c03',
    )
  })

  it('uses the theme primary when bar color is an empty string', () => {
    expect(computeNegativeColor('', '#2563eb')).toBe('#da9c14')
  })

  it('returns the static white fallback when no color is resolvable', () => {
    expect(computeNegativeColor('', null)).toBe('#ffffff')
    expect(computeNegativeColor('not-a-color', null)).toBe('#ffffff')
  })

  it('handles a near-gray theme primary correctly via the fallback path', () => {
    expect(computeNegativeColor('', '#7f7f7f')).toBe('#ffffff')
  })
})
