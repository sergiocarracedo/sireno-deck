import { z } from "zod"

export const VALUE_DISPLAY_DEFAULT_POLL_MS = 5000
export const VALUE_DISPLAY_DEFAULT_TIMEOUT_MS = 5000

const ValueEntrySchema = z
  .object({
    label: z.string().min(1).meta({ title: "Value label" }),
    command: z
      .string()
      .min(1)
      .meta({ title: "Shell command", "x-control": "shell" }),
    formatter: z
      .enum(["raw", "strip", "line"])
      .optional()
      .default("raw")
      .meta({ title: "Output format" }),
    units: z.string().optional().meta({ title: "Units" }),
    timeout_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .meta({ title: "Timeout (ms)" }),
    icon: z.string().optional().meta({ title: "Icon", "x-control": "icon" }),
  })
  .strict()

const ValueDisplayButtonSchema = z
  .object({
    values: z.array(ValueEntrySchema).min(1).max(4).meta({ title: "Values" }),
    poll_interval_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .default(VALUE_DISPLAY_DEFAULT_POLL_MS)
      .meta({ title: "Refresh interval (ms)" }),
    timeout_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .default(VALUE_DISPLAY_DEFAULT_TIMEOUT_MS)
      .meta({ title: "Command timeout (ms)" }),
  })
  .strict()

export const configSchema = ValueDisplayButtonSchema
export type ConfigSchema = z.infer<typeof configSchema>
