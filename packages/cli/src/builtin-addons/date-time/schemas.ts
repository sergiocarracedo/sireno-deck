import { z } from 'zod'

export const DIGITAL_DATE_TIME_INTERVAL_MS = 1000
export const ANALOG_CLOCK_INTERVAL_MS = 1000
export const CALENDAR_SHEET_INTERVAL_MS = 60000

export const BuiltinDisplayDateTimeButtonSchema = z
  .object({
    variant: z.enum(['date', 'time', 'date-time']).default('date-time'),
    date_format: z.string().min(1).optional().default('MM/DD/YYYY'),
    time_format: z.string().min(1).optional().default('HH:mm:ss'),
  })
  .strict()

export const LockedTimeTileButtonSchema = z
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

export const BuiltinAnalogClockButtonSchema = z.object({}).strict()
export const BuiltinCalendarSheetButtonSchema = z.object({}).strict()

export type BuiltinDisplayDateTimeButtonConfig = z.infer<
  typeof BuiltinDisplayDateTimeButtonSchema
>

export type LockedTimeTileButtonConfig = z.infer<
  typeof LockedTimeTileButtonSchema
>
