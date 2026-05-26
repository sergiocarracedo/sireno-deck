import { createBaseShapeTextContent, defineMountedButton } from '../../../addon/api.js'
import { z } from 'zod'

const DIGITAL_DATE_TIME_INTERVAL_MS = 1000

export const BuiltinDateTimeButtonSchema = z
  .object({
    variant: z.enum(['date', 'time', 'date-time']).default('date-time'),
    date_format: z.string().min(1).optional().default('MM/DD/YYYY'),
    time_format: z.string().min(1).optional().default('HH:mm:ss'),
  })
  .strict()

export const builtinDateTimeButton = defineMountedButton({
  configSchema: BuiltinDateTimeButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ button, config }) =>
    createBaseShapeTextContent({
      keyIndex: button.position,
      label: formatDigitalDateTimeLabel(config),
    }),
  type: 'date-time',
})

const DIGITAL_DATE_TIME_TOKENS = {
  DD: (date: Date) => String(date.getDate()).padStart(2, '0'),
  HH: (date: Date) => String(date.getHours()).padStart(2, '0'),
  MM: (date: Date) => String(date.getMonth() + 1).padStart(2, '0'),
  YYYY: (date: Date) => String(date.getFullYear()),
  mm: (date: Date) => String(date.getMinutes()).padStart(2, '0'),
  ss: (date: Date) => String(date.getSeconds()).padStart(2, '0'),
} as const

const DIGITAL_DATE_TIME_TOKEN_PATTERN = /YYYY|MM|DD|HH|mm|ss/g

function formatDigitalDateTimePattern(pattern: string, date: Date): string {
  return pattern.replace(DIGITAL_DATE_TIME_TOKEN_PATTERN, (token) =>
    DIGITAL_DATE_TIME_TOKENS[token as keyof typeof DIGITAL_DATE_TIME_TOKENS](date),
  )
}

function formatDigitalDateTimeLabel(
  config: z.infer<typeof BuiltinDateTimeButtonSchema>,
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
