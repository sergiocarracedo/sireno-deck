import { z } from "zod"

export const VALUE_DISPLAY_DEFAULT_POLL_MS = 5000
export const VALUE_DISPLAY_DEFAULT_TIMEOUT_MS = 5000

const ValueEntrySchema = z
  .object({
    label: z.string().min(1),
    command: z.string().min(1),
    formatter: z.enum(["raw", "strip", "line"]).optional().default("raw"),
    units: z.string().optional(),
    timeout_ms: z.number().int().positive().optional(),
    icon: z.string().optional(),
  })
  .strict()

const ValueDisplayButtonSchema = z
  .object({
    values: z.array(ValueEntrySchema).min(1).max(4),
    poll_interval_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .default(VALUE_DISPLAY_DEFAULT_POLL_MS),
    timeout_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .default(VALUE_DISPLAY_DEFAULT_TIMEOUT_MS),
  })
  .strict()

export const configSchema = ValueDisplayButtonSchema
export type ConfigSchema = z.infer<typeof configSchema>
