import { defineMountedButton } from '../../../addon/api.js'
import { Text } from '../../../ui/index.js'
import {
  BuiltinDisplayDateTimeButtonSchema,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  type BuiltinDisplayDateTimeButtonConfig,
} from '../schemas.js'

export const BuiltinDateTimeButtonSchema = BuiltinDisplayDateTimeButtonSchema

export const builtinDateTimeButton = defineMountedButton({
  configSchema: BuiltinDateTimeButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ button, config }) => (
    <div className="font-main text-foreground">
      <Text className="w-full fit-wrap leading-1">
        {formatDigitalDateTimeLabel(config)}
      </Text>
    </div>
  ),
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
    DIGITAL_DATE_TIME_TOKENS[token as keyof typeof DIGITAL_DATE_TIME_TOKENS](
      date,
    ),
  )
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
