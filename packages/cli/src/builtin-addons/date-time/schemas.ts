import { z } from 'zod'

import { AddonButtonActionConfigSchema } from '@/addon/api'

export const DIGITAL_DATE_TIME_INTERVAL_MS = 1000
export const ANALOG_CLOCK_INTERVAL_MS = 1000
export const DATE_BUTTON_INTERVAL_MS = 60000

export const BuiltinDateTimeButtonSchema = z
  .object({
    ...AddonButtonActionConfigSchema.shape,
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

export const BuiltinAnalogClockButtonSchema = z
  .object({
    ...AddonButtonActionConfigSchema.shape,
  })
  .strict()
export const BuiltinDateButtonSchema = z
  .object({
    locale: z.string().min(2).max(35).optional(),
    time_zone: z.string().min(1).optional(),
  })
  .strict()

export type BuiltinDisplayDateTimeButtonConfig = z.infer<
  typeof BuiltinDateTimeButtonSchema
>

export type BuiltinTimePresetButtonConfig = z.infer<
  typeof BuiltinTimePresetButtonSchema
>

export type LockedTimeTileButtonConfig = z.infer<
  typeof LockedTimeTileButtonSchema
>

export type BuiltinAnalogClockButtonConfig = z.infer<
  typeof BuiltinAnalogClockButtonSchema
>

export type BuiltinDateButtonConfig = z.infer<
  typeof BuiltinDateButtonSchema
>
