import { z } from "zod"

import {
  SYSTEM_METRIC_IDS,
  type SystemMetricId,
} from "../../shared/metrics-catalog"

const MetricEntrySchema = z
  .union([
    z.enum(SYSTEM_METRIC_IDS),
    z
      .object({
        id: z.enum(SYSTEM_METRIC_IDS),
        label: z.string().min(1).optional(),
        shortLabel: z.string().min(1).max(3).optional(),
      })
      .strict(),
  ])
  .transform(
    (entry): { id: SystemMetricId; label?: string; shortLabel?: string } =>
      typeof entry === "string"
        ? { id: entry }
        : {
            id: entry.id,
            ...(entry.label !== undefined ? { label: entry.label } : {}),
            ...(entry.shortLabel !== undefined
              ? { shortLabel: entry.shortLabel }
              : {}),
          },
  )

export const GenericSystemStatusSchema = z
  .object({
    metrics: z.array(MetricEntrySchema).min(1).max(3),
    pollInterval: z.number().int().positive().default(1000),
    renderInterval: z.number().int().positive().default(1000),
    formatters: z.record(z.string(), z.string()).optional(),
    labels: z.record(z.string(), z.string()).optional(),
  })
  .strict()

export type GenericSystemStatusConfig = z.infer<
  typeof GenericSystemStatusSchema
>

export const GenericSystemStatusDefaults: GenericSystemStatusConfig = {
  metrics: [{ id: "cpu" }],
  pollInterval: 1000,
  renderInterval: 1000,
}
