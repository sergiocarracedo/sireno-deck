import dayjs from 'dayjs'

import type { BuiltinDisplayDateTimeButtonConfig } from './schemas.js'

function formatDigitalDateTimePattern(pattern: string, date: Date): string {
  return dayjs(date).format(pattern)
}

function formatDigitalDateTimeLabel(
  config: BuiltinDisplayDateTimeButtonConfig,
  date = new Date(),
): string {
  if (config.variant === 'date') {
    return formatDigitalDateTimePattern(config.date_format, date)
  }

  if (config.variant === 'time') {
    return formatDigitalDateTimePattern(config.time_format, date)
  }

  return [
    formatDigitalDateTimePattern(config.date_format, date),
    formatDigitalDateTimePattern(config.time_format, date),
  ].join(' ')
}

export { formatDigitalDateTimeLabel }
