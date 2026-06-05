import type { ReactElement } from 'react'

import { Icon } from '@/ui'

const WMO_MAP: Record<number, string> = {
  0: 'sun',
  1: 'sun',
  2: 'cloud-sun',
  3: 'cloud',
  45: 'cloud-fog',
  48: 'cloud-fog',
  51: 'cloud-drizzle',
  53: 'cloud-drizzle',
  55: 'cloud-drizzle',
  61: 'cloud-rain',
  63: 'cloud-rain',
  65: 'cloud-rain',
  71: 'cloud-snow',
  73: 'cloud-snow',
  75: 'cloud-snow',
  80: 'cloud-rain',
  81: 'cloud-rain',
  82: 'cloud-rain',
  95: 'cloud-lightning',
  96: 'cloud-lightning',
  99: 'cloud-lightning',
}

export function WmoIcon({
  code,
  size = 28,
}: {
  code: number
  size?: number
}): ReactElement {
  return <Icon icon={WMO_MAP[code] ?? 'cloud'} size={size} tone="accent" />
}
