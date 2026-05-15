import { createElement } from 'react'
import { z } from 'zod'

import type { SirenoAddon } from '../../../packages/cli/src/addon/api.js'

const DIGITAL_DATE_TIME_INTERVAL_MS = 1000
const ANALOG_CLOCK_INTERVAL_MS = 1000

const BuiltinDisplayDateTimeButtonSchema = z
  .object({
    variant: z.enum(['date', 'time', 'date-time']).default('date-time'),
    date_format: z.string().min(1).optional().default('MM/DD/YYYY'),
    time_format: z.string().min(1).optional().default('HH:mm:ss'),
  })
  .strict()

const BuiltinAnalogClockButtonSchema = z.object({}).strict()

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
  config: z.infer<typeof BuiltinDisplayDateTimeButtonSchema>,
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

const builtinDisplayDateTimeButton = {
  configSchema: BuiltinDisplayDateTimeButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  createInstance: ({
    button,
    config,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinDisplayDateTimeButtonSchema>
  }) => ({
    render: () =>
      createElement('deck-button', {
        keyIndex: button.position,
        label: formatDigitalDateTimeLabel(config),
      }),
  }),
  type: 'date-time',
}

const builtinAnalogClockButton = {
  configSchema: BuiltinAnalogClockButtonSchema,
  defaultIntervalMs: ANALOG_CLOCK_INTERVAL_MS,
  createInstance: ({
    button,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinAnalogClockButtonSchema>
  }) => ({
    render: () =>
      createElement('deck-button', {
        keyIndex: button.position,
        variant: 'analog-clock',
      }),
  }),
  type: 'analog-clock',
}

const datetimeButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [builtinDisplayDateTimeButton, builtinAnalogClockButton] as SirenoAddon['buttons'],
  name: 'date-time',
}

export default datetimeButtonsAddon

export { ANALOG_CLOCK_INTERVAL_MS, DIGITAL_DATE_TIME_INTERVAL_MS, formatDigitalDateTimeLabel }
