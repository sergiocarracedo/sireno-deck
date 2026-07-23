import { z } from "zod"
import { SYSTEM_METRIC_IDS, type SystemMetricId } from "../../domain"

// ponytail: each metric entry accepts either a plain string ("cpu") or an
// object ({id: "cpu", label: "CPU"}). The transform normalizes both into
// `{id, label?}`. Future fields (color, formatter, etc.) slot into the object
// form without breaking the string shorthand.
const MetricEntrySchema = z
  .union([
    z.enum(SYSTEM_METRIC_IDS),
    z
      .object({
        id: z.enum(SYSTEM_METRIC_IDS),
        label: z.string().min(1).optional(),
        color: z.string().optional(),
      })
      .strict(),
  ])
  .transform((entry): { id: SystemMetricId; label?: string } =>
    typeof entry === "string" ? { id: entry } : { id: entry.id, ...(entry.label !== undefined ? { label: entry.label } : {}) },
  )

export const GenericSystemStatusSchema = z
  .object({
    metrics: z
      .array(MetricEntrySchema)
      .min(1)
      .max(3),
    display: z.enum(["text", "bars"]).default("text"),
    pollInterval: z.number().int().positive().default(2000),
    renderInterval: z.number().int().positive().default(1000),
    formatters: z.record(z.string(), z.string()).optional(),
    commands: z.array(z.string()).optional(),
    labels: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export type GenericSystemStatusConfig = z.infer<typeof GenericSystemStatusSchema>
export type MetricConfig = { id: SystemMetricId; label?: string }

export const GenericSystemStatusDefaults: GenericSystemStatusConfig = {
  metrics: [{ id: "cpu" }],
  display: "text",
  pollInterval: 2000,
  renderInterval: 1000,
}