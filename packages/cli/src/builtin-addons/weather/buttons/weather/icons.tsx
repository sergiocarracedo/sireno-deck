const WMO_ICONS: Record<number, string> = {
  0: '☀',
  1: '🌤',
  2: '⛅',
  3: '☁',
  45: '🌫',
  48: '🌫',
  51: '🌦',
  53: '🌦',
  55: '🌧',
  56: '🌧',
  57: '🌧',
  61: '🌧',
  63: '🌧',
  65: '🌧',
  66: '🌧',
  67: '🌧',
  71: '🌨',
  73: '🌨',
  75: '🌨',
  77: '🌨',
  80: '🌦',
  81: '🌦',
  82: '🌧',
  85: '🌨',
  86: '🌨',
  95: '⛈',
  96: '⛈',
  99: '⛈',
}

export const iconFor = (code?: number): string => {
  if (code === undefined) return '-'
  return WMO_ICONS[code] ?? '-'
}
