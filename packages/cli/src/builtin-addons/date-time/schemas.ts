import { z } from 'zod'

export const DIGITAL_DATE_TIME_INTERVAL_MS = 1000
export const ANALOG_CLOCK_INTERVAL_MS = 1000
export const CALENDAR_SHEET_INTERVAL_MS = 60000

export const BuiltinDateTimeButtonSchema = z
  .object({
    format: z.string().min(1).optional().default('DD/MM/YYYY|HH:mm:ss'),
  })
  .strict()

export const BuiltinTimePresetButtonSchema = BuiltinDateTimeButtonSchema.omit({
  format: true,
}).extend({
  variant: z.enum(['default', 'big']).optional().default('default'),
})

export const LockedTimeTileButtonSchema = z
  .object({
    slot: z.enum([
      'hour',
      'hour-tens',
      'hour-ones',
      'separator',
      'minute',
      'minute-tens',
      'minute-ones',
    ]),
  })
  .strict()

export const BuiltinAnalogClockButtonSchema = z.object({}).strict()
export const BuiltinCalendarSheetButtonSchema = z.object({}).strict()

export type BuiltinDisplayDateTimeButtonConfig = z.infer<
  typeof BuiltinDateTimeButtonSchema
>

export type BuiltinTimePresetButtonConfig = z.infer<
  typeof BuiltinTimePresetButtonSchema
>

export type LockedTimeTileButtonConfig = z.infer<
  typeof LockedTimeTileButtonSchema
>
