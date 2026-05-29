import dayjs from 'dayjs'

import type { BuiltinDisplayDateTimeButtonConfig } from './schemas.js'

interface DateTimeFormatSegment {
  kind: 'markup' | 'text'
  value: string
}

function splitDateTimeFormat(pattern: string): DateTimeFormatSegment[] {
  const segments: DateTimeFormatSegment[] = []
  let cursor = 0

  while (cursor < pattern.length) {
    const tagStart = pattern.indexOf('<', cursor)

    if (tagStart === -1) {
      if (cursor < pattern.length) {
        segments.push({ kind: 'text', value: pattern.slice(cursor) })
      }
      break
    }

    if (tagStart > cursor) {
      segments.push({ kind: 'text', value: pattern.slice(cursor, tagStart) })
    }

    const tagEnd = pattern.indexOf('>', tagStart + 1)
    if (tagEnd === -1) {
      segments.push({ kind: 'text', value: pattern.slice(tagStart) })
      break
    }

    segments.push({ kind: 'markup', value: pattern.slice(tagStart, tagEnd + 1) })
    cursor = tagEnd + 1
  }

  return segments
}

function formatDigitalDateTimePattern(pattern: string, date: Date): string {
  return splitDateTimeFormat(pattern)
    .map((segment) =>
      segment.kind === 'markup' ? segment.value : dayjs(date).format(segment.value),
    )
    .join('')
}

function formatDigitalDateTimeLabel(
  config: BuiltinDisplayDateTimeButtonConfig,
  date = new Date(),
): string {
  return formatDigitalDateTimePattern(config.format, date)
}

export { formatDigitalDateTimeLabel }
