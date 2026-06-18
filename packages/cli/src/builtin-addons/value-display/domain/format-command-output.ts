import numbro from 'numbro'

import type { SystemStatusFormatter } from '../../system-status/domain/display-metrics'

export interface FormattedCommandOutput {
  available: boolean
  units?: string
  value: string
}

function formatUptime(totalSeconds: number): string {
  const roundedSeconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(roundedSeconds / 3600)
  const minutes = Math.floor((roundedSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

export function formatCommandOutput(
  raw: string,
  formatter: SystemStatusFormatter | undefined,
  units: string | undefined,
): FormattedCommandOutput {
  const trimmed = raw.trim()

  if (trimmed.length === 0) {
    return {
      available: false,
      ...(units ? { units } : {}),
      value: 'N/A',
    }
  }

  const numeric = Number.parseFloat(trimmed)
  const useNumber = !Number.isNaN(numeric) && Number.isFinite(numeric)

  if (!formatter || !useNumber) {
    return {
      available: true,
      ...(units ? { units } : {}),
      value: trimmed,
    }
  }

  let value: string
  switch (formatter) {
    case 'bytes':
      value = numbro(numeric).format({
        average: true,
        base: 'decimal',
        mantissa: 1,
        output: 'byte',
        trimMantissa: true,
      })
      break
    case 'count':
      value = numbro(numeric).format({
        average: true,
        mantissa: numeric >= 100 ? 0 : 1,
        trimMantissa: true,
      })
      break
    case 'frequency-ghz':
      value = numbro(numeric).format({ mantissa: 2, trimMantissa: true })
      break
    case 'percent':
      value = numbro(numeric / 100).format({ mantissa: 0, output: 'percent' })
      break
    case 'uptime':
      value = formatUptime(numeric)
      break
  }

  return {
    available: true,
    ...(units ? { units } : {}),
    value,
  }
}