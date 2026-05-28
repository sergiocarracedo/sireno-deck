import dayjs from 'dayjs'

import type { BuiltinDisplayDateTimeButtonConfig } from './schemas.js'

function formatDigitalDateTimePattern(pattern: string, date: Date): string {
  return dayjs(date).format(pattern)
}

function formatDigitalDateTimeLabel(
  config: BuiltinDisplayDateTimeButtonConfig,
  date = new Date(),
): string {
  return formatDigitalDateTimePattern(config.format, date)
}

export { formatDigitalDateTimeLabel }
