import { z } from 'zod'

import { AddonButtonActionConfigSchema } from '@/addon/api'
import { SystemStatusFormatterSchema } from '../system-status/schemas'

const ValueEntrySchema = z
  .object({
    command: z.string().min(1),
    formatter: SystemStatusFormatterSchema.optional(),
    icon: z.string().min(1).optional(),
    label: z.string().min(1),
    timeout_ms: z.number().int().positive().optional(),
    units: z.string().min(1).optional(),
  })
  .strict()

export const ValueDisplayButtonSchema = z
  .object({
    ...AddonButtonActionConfigSchema.shape,
    values: z
      .array(ValueEntrySchema)
      .min(1)
      .max(
        3,
        'value-display supports 1–3 values per button; for 4+ values use multiple buttons',
      ),
    poll_interval_ms: z.number().int().min(500).default(1_000),
    render_interval_ms: z.number().int().min(500).default(1_000),
  })
  .strict()

export type ValueDisplayButtonConfig = z.infer<typeof ValueDisplayButtonSchema>
export type ValueEntry = ValueDisplayButtonConfig['values'][number]