import { z } from "zod"

import { SYSTEM_METRIC_IDS, SystemMetricId } from "../../shared/metrics-catalog"

const MetricEntrySchema = z
  .union([
    z.enum(SYSTEM_METRIC_IDS),
    z
      .object({
        id: z.enum(SYSTEM_METRIC_IDS),
        label: z.string().min(1).optional(),
      })
      .strict(),
  ])
  .transform((entry): { id: SystemMetricId; label?: string } =>
    typeof entry === "string"
      ? { id: entry }
      : {
          id: entry.id,
          ...(entry.label !== undefined ? { label: entry.label } : {}),
        },
  )

export const ChartConfigSchema = z
  .object({
    metrics: z.array(MetricEntrySchema).min(1).max(2),
    windowSeconds: z.number().int().positive().max(60).default(60),
    pollInterval: z.number().int().positive().default(1000),
  })
  .strict()

export type ChartConfig = z.infer<typeof ChartConfigSchema>

export const ChartDefaults: ChartConfig = {
  metrics: [{ id: "cpu" }],
  windowSeconds: 60,
  pollInterval: 1000,
}
