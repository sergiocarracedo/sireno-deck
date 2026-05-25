import { createElement } from 'react'
import { z } from 'zod'

import {
  ButtonSurface,
  createBaseShapeTextContent,
  createDomStack,
  createDomTextLabel,
} from '../../addon/api.js'

import type { SirenoAddon } from '../../addon/api.js'

const DIGITAL_DATE_TIME_INTERVAL_MS = 1000
const ANALOG_CLOCK_INTERVAL_MS = 1000
const CALENDAR_SHEET_INTERVAL_MS = 60000

const BuiltinDisplayDateTimeButtonSchema = z
  .object({
    variant: z.enum(['date', 'time', 'date-time']).default('date-time'),
    date_format: z.string().min(1).optional().default('MM/DD/YYYY'),
    time_format: z.string().min(1).optional().default('HH:mm:ss'),
  })
  .strict()

const LockedTimeTileButtonSchema = z
  .object({
    slot: z.enum(['hour-tens', 'hour-ones', 'separator', 'minute-tens', 'minute-ones']),
  })
  .strict()

const BuiltinAnalogClockButtonSchema = z.object({}).strict()
const BuiltinCalendarSheetButtonSchema = z.object({}).strict()

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

function formatLockedTimeCharacters(date = new Date()): [string, string, string, string, string] {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return [hours[0]!, hours[1]!, ':', minutes[0]!, minutes[1]!]
}

function formatLockedTimeTileCharacter(
  slot: z.infer<typeof LockedTimeTileButtonSchema>['slot'],
  date = new Date(),
): string {
  const [hourTens, hourOnes, separator, minuteTens, minuteOnes] = formatLockedTimeCharacters(date)

  switch (slot) {
    case 'hour-tens':
      return hourTens
    case 'hour-ones':
      return hourOnes
    case 'separator':
      return separator
    case 'minute-tens':
      return minuteTens
    case 'minute-ones':
      return minuteOnes
  }
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
    render: () => createBaseShapeTextContent({
      keyIndex: button.position,
      label: formatDigitalDateTimeLabel(config),
    }),
  }),
  type: 'date-time',
}

const builtinLockedTimeTileButton = {
  configSchema: LockedTimeTileButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  createInstance: ({
    button,
    config,
  }: {
    button: { position: number }
    config: z.infer<typeof LockedTimeTileButtonSchema>
  }) => ({
    render: () => {
      const character = formatLockedTimeTileCharacter(config.slot)

      return createBaseShapeTextContent({
        keyIndex: button.position,
        label: character,
        labelClassName: character === ':' ? 'font-mono text-accent' : 'font-mono text-primary',
      })
    },
  }),
  type: 'locked-time-tile',
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
    render: () => createElement(ButtonSurface, { full_surface: true }, createElement(
      'div',
      {
        className: 'bg-background border-primary',
        style: {
          alignItems: 'center',
          border: '1px solid color-mix(in oklab, var(--sireno-color-primary) 58%, transparent)',
          borderRadius: '16px',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: '10px',
          width: '100%',
        },
      },
      createDomStack({
        gap: 4,
        children: [
          createElement('span', {
            children: 'Clock',
            className: 'font-main text-primary',
            style: {
              display: 'block',
              textAlign: 'center',
            },
          }),
          createElement('span', {
            children: 'LIVE',
            className: 'font-aux text-foreground',
            style: {
              display: 'block',
              opacity: 0.85,
              textAlign: 'center',
              textTransform: 'uppercase',
            },
          }),
        ],
      }),
    )),
  }),
  type: 'analog-clock',
}

const builtinCalendarSheetButton = {
  configSchema: BuiltinCalendarSheetButtonSchema,
  defaultIntervalMs: CALENDAR_SHEET_INTERVAL_MS,
  createInstance: ({
    button,
  }: {
    button: { position: number }
    config: z.infer<typeof BuiltinCalendarSheetButtonSchema>
  }) => ({
    render: () => createElement(ButtonSurface, { full_surface: true }, createElement(
      'div',
      {
        className: 'bg-background border-accent',
        style: {
          alignItems: 'center',
          border: '1px solid color-mix(in oklab, var(--sireno-color-accent) 54%, transparent)',
          borderRadius: '16px',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: '10px',
          width: '100%',
        },
      },
      createDomStack({
        gap: 4,
        children: [
          createElement('span', {
            children: 'Date',
            className: 'font-main text-foreground',
            style: {
              display: 'block',
              textAlign: 'center',
            },
          }),
          createElement('span', {
            children: 'SHEET',
            className: 'font-aux text-accent',
            style: {
              display: 'block',
              textAlign: 'center',
              textTransform: 'uppercase',
            },
          }),
        ],
      }),
    )),
  }),
  type: 'calendar-sheet',
}

const datetimeButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [builtinDisplayDateTimeButton, builtinLockedTimeTileButton, builtinAnalogClockButton, builtinCalendarSheetButton] as SirenoAddon['buttons'],
  name: 'date-time',
}

export default datetimeButtonsAddon

export {
  ANALOG_CLOCK_INTERVAL_MS,
  CALENDAR_SHEET_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  formatDigitalDateTimeLabel,
  formatLockedTimeCharacters,
  formatLockedTimeTileCharacter,
}
