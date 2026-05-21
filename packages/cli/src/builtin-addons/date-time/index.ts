import { createElement } from 'react'
import { z } from 'zod'

import { createDomButtonRender, type SirenoAddon } from '../../addon/api.js'

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
const CALENDAR_MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const

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

function getDigitalDateTimeLines(
  config: z.infer<typeof BuiltinDisplayDateTimeButtonSchema>,
  date = new Date(),
): string[] {
  if (config.variant === 'date') {
    return [formatDigitalDateTimePattern(config.date_format, date)]
  }

  if (config.variant === 'time') {
    return [formatDigitalDateTimePattern(config.time_format, date)]
  }

  return [
    formatDigitalDateTimePattern(config.date_format, date),
    formatDigitalDateTimePattern(config.time_format, date),
  ]
}

function createDigitalDateTimeContent(
  config: z.infer<typeof BuiltinDisplayDateTimeButtonSchema>,
  date = new Date(),
) {
  const lines = getDigitalDateTimeLines(config, date)

  return createElement('div', {
    'data-sireno-date-time': 'digital',
    style: {
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      justifyContent: 'center',
      width: '100%',
    },
  }, ...lines.map((line, index) => createElement('span', {
    style: {
      color: '#eef2f7',
      display: 'block',
      fontFamily: 'IBM Plex Sans, sans-serif',
      fontSize: lines.length === 1 ? '16px' : index === 0 ? '13px' : '12px',
      fontWeight: 700,
      letterSpacing: index === 0 ? '0.06em' : '0.02em',
      lineHeight: 1.05,
      opacity: index === 0 ? 1 : 0.84,
      textAlign: 'center',
    },
  }, line)))
}

function createAnalogClockContent(date = new Date()) {
  const hours = date.getHours() % 12
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const hourRotation = hours * 30 + minutes * 0.5
  const minuteRotation = minutes * 6 + seconds * 0.1
  const secondRotation = seconds * 6

  const createHand = (rotation: number, options: { color: string; height: string; width: string }) => createElement('div', {
    style: {
      background: options.color,
      borderRadius: '999px',
      height: options.height,
      left: '50%',
      position: 'absolute',
      top: '50%',
      transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
      transformOrigin: '50% 100%',
      width: options.width,
    },
  })

  const clockFace = createElement(
    'div',
    {
      style: {
        background: 'radial-gradient(circle at 30% 30%, #314254 0%, #17202b 70%)',
        border: '1.5px solid #476074',
        borderRadius: '999px',
        boxSizing: 'border-box',
        height: '46px',
        position: 'relative',
        width: '46px',
      },
    },
    createHand(hourRotation, { color: '#eef2f7', height: '12px', width: '3px' }),
    createHand(minuteRotation, { color: '#cbd5e1', height: '16px', width: '2px' }),
    createHand(secondRotation, { color: '#7dd3fc', height: '18px', width: '1px' }),
    createElement('div', {
      style: {
        background: '#eef2f7',
        borderRadius: '999px',
        height: '5px',
        left: '50%',
        position: 'absolute',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '5px',
      },
    }),
  )

  return createElement('div', {
    'data-sireno-date-time': 'analog-clock',
    style: {
      alignItems: 'center',
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
    },
  }, clockFace)
}

function createCalendarSheetContent(date = new Date()) {
  const tearSheet = createElement(
    'div',
    {
      style: {
        background: '#f8fafc',
        borderRadius: '12px',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.24)',
        color: '#0f172a',
        overflow: 'hidden',
        width: '48px',
      },
    },
    createElement('div', {
      style: {
        background: '#ef4444',
        color: '#fff7ed',
        fontFamily: 'IBM Plex Sans, sans-serif',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        padding: '4px 0',
        textAlign: 'center',
      },
    }, CALENDAR_MONTH_LABELS[date.getMonth()]),
    createElement('div', {
      style: {
        color: '#0f172a',
        fontFamily: 'IBM Plex Sans, sans-serif',
        fontSize: '24px',
        fontWeight: 700,
        lineHeight: 1,
        padding: '8px 0 9px',
        textAlign: 'center',
      },
    }, String(date.getDate())),
  )

  return createElement('div', {
    'data-sireno-date-time': 'calendar-sheet',
    style: {
      alignItems: 'stretch',
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
    },
  }, tearSheet)
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
      createDomButtonRender({
        content: createDigitalDateTimeContent(config),
        keyIndex: button.position,
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
      createDomButtonRender({
        content: createAnalogClockContent(),
        keyIndex: button.position,
      }),
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
    render: () =>
      createDomButtonRender({
        content: createCalendarSheetContent(),
        keyIndex: button.position,
      }),
  }),
  type: 'calendar-sheet',
}

const datetimeButtonsAddon: SirenoAddon = {
  apiVersion: 1,
  buttons: [builtinDisplayDateTimeButton, builtinAnalogClockButton, builtinCalendarSheetButton] as SirenoAddon['buttons'],
  name: 'date-time',
}

export default datetimeButtonsAddon

export {
  ANALOG_CLOCK_INTERVAL_MS,
  CALENDAR_SHEET_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  formatDigitalDateTimeLabel,
}
