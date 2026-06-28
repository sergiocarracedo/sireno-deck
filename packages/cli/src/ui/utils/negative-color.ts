export interface Rgb {
  r: number
  g: number
  b: number
}

export function parseHex(hex: string): Rgb | null {
  if (typeof hex !== 'string') return null
  const trimmed = hex.trim()
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed)
  if (!match) return null
  const raw = match[1]!
  if (raw.length === 3) {
    return {
      r: parseInt(raw[0]! + raw[0]!, 16),
      g: parseInt(raw[1]! + raw[1]!, 16),
      b: parseInt(raw[2]! + raw[2]!, 16),
    }
  }
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  }
}

function clampChannel(value: number): number {
  if (value < 0) return 0
  if (value > 255) return 255
  return Math.round(value)
}

export function toHex(rgb: Rgb): string {
  const r = clampChannel(rgb.r).toString(16).padStart(2, '0')
  const g = clampChannel(rgb.g).toString(16).padStart(2, '0')
  const b = clampChannel(rgb.b).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

export function luma(rgb: Rgb): number {
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b
}

export function computeNegativeColor(barColor: string, themePrimaryHex: string | null): string {
  const barParsed = typeof barColor === 'string' && barColor.length > 0 ? parseHex(barColor) : null
  const themeParsed = themePrimaryHex ? parseHex(themePrimaryHex) : null
  const effective = barParsed ?? themeParsed
  if (!effective) {
    return '#ffffff'
  }
  const lum = luma(effective)
  if (Math.abs(lum - 128) < 32) {
    return lum < 128 ? '#ffffff' : '#000000'
  }
  return toHex({
    r: 255 - effective.r,
    g: 255 - effective.g,
    b: 255 - effective.b,
  })
}
