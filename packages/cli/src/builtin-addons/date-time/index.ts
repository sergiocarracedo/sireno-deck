import { createElement } from 'react'
import { z } from 'zod'

import {
  ButtonSurface,
  defineMountedButton,
} from '../../addon/api.js'
import { Text } from '../../ui/index.js'
import { builtinDateTimeButton } from './buttons/date-time.js'

import type { SirenoAddon } from '../../addon/api.js'

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
    slot: z.enum([
      'hour-tens',
      'hour-ones',
      'separator',
      'minute-tens',
      'minute-ones',
    ]),
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
    DIGITAL_DATE_TIME_TOKENS[token as keyof typeof DIGITAL_DATE_TIME_TOKENS](
      date,
    ),
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

function formatLockedTimeCharacters(
  date = new Date(),
): [string, string, string, string, string] {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return [hours[0]!, hours[1]!, ':', minutes[0]!, minutes[1]!]
}

function formatLockedTimeTileCharacter(
  slot: z.infer<typeof LockedTimeTileButtonSchema>['slot'],
  date = new Date(),
): string {
  const [hourTens, hourOnes, separator, minuteTens, minuteOnes] =
    formatLockedTimeCharacters(date)

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

const DIGITAL_DATE_TIME_INTERVAL_MS = 1000

function renderLabel(
  label: string,
  options?: {
    className?: string
    fit?: 'marquee' | 'wrap'
    typography?: 'aux' | 'main' | 'mono'
    tone?: 'accent' | 'foreground' | 'primary'
  },
) {
  return createElement(
    'span',
    {
      className: options?.className,
      style: { display: 'block' },
    },
    createElement(
      Text,
      {
        className: 'w-full',
        fit: options?.fit ?? 'wrap',
        style: { lineHeight: 1.2 },
        tone: options?.tone,
        typography: options?.typography,
      },
      label,
    ),
  )
}

const builtinLockedTimeTileButton = defineMountedButton({
  configSchema: LockedTimeTileButtonSchema,
  defaultIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ button, config }) => {
    const character = formatLockedTimeTileCharacter(config.slot)

    return renderLabel(character, {
      className:
        character === ':'
          ? 'font-mono text-accent'
          : 'font-mono text-primary',
      tone: character === ':' ? 'accent' : 'primary',
      typography: 'mono',
    })
  },
  type: 'locked-time-tile',
})

const builtinAnalogClockButton = defineMountedButton({
  configSchema: BuiltinAnalogClockButtonSchema,
  defaultIntervalMs: ANALOG_CLOCK_INTERVAL_MS,
  render: () =>
    createElement(
      ButtonSurface,
      { full_surface: true },
      createElement(
        'div',
        {
          className: 'bg-background border-primary',
          style: {
            alignItems: 'center',
            border:
              '1px solid color-mix(in oklab, var(--sireno-color-primary) 58%, transparent)',
            borderRadius: '16px',
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
            padding: '10px',
            width: '100%',
          },
        },
        createElement(
          'div',
          {
            className: 'flex flex-col items-center justify-center w-full',
            style: { gap: '4px' },
          },
          renderLabel('Clock', {
            className: 'font-main text-primary',
            tone: 'primary',
            typography: 'main',
          }),
          renderLabel('LIVE', {
            className: 'font-aux text-foreground',
            tone: 'foreground',
            typography: 'aux',
          }),
        ),
      ),
    ),
  type: 'analog-clock',
})

const builtinCalendarSheetButton = defineMountedButton({
  configSchema: BuiltinCalendarSheetButtonSchema,
  defaultIntervalMs: CALENDAR_SHEET_INTERVAL_MS,
  render: () =>
    createElement(
      ButtonSurface,
      { full_surface: true },
      createElement(
        'div',
        {
          className: 'bg-background border-accent',
          style: {
            alignItems: 'center',
            border:
              '1px solid color-mix(in oklab, var(--sireno-color-accent) 54%, transparent)',
            borderRadius: '16px',
            display: 'flex',
            height: '100%',
            justifyContent: 'center',
            padding: '10px',
            width: '100%',
          },
        },
        createElement(
          'div',
          {
            className: 'flex flex-col items-center justify-center w-full',
            style: { gap: '4px' },
          },
          renderLabel('Date', {
            className: 'font-main text-foreground',
            tone: 'foreground',
            typography: 'main',
          }),
          renderLabel('SHEET', {
            className: 'font-aux text-accent',
            tone: 'accent',
            typography: 'aux',
          }),
        ),
      ),
    ),
  type: 'calendar-sheet',
})

const datetimeButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [
    builtinDateTimeButton,
    builtinLockedTimeTileButton,
    builtinAnalogClockButton,
    builtinCalendarSheetButton,
  ] as SirenoAddon['buttons'],
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
