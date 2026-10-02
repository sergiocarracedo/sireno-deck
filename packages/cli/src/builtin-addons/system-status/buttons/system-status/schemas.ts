import { z } from "zod"

import { pagesSchema } from "@/ui/index"

import {
  SYSTEM_METRIC_IDS,
  type SystemMetricId,
} from "../../shared/metrics-catalog"

export const MetricEntrySchema = z
  .union([
    z.enum(SYSTEM_METRIC_IDS),
    z
      .object({
        id: z.enum(SYSTEM_METRIC_IDS),
        label: z.string().min(1).optional().meta({ title: "Metric label" }),
        shortLabel: z
          .string()
          .min(1)
          .max(3)
          .optional()
          .meta({ title: "Short label" }),
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

export const BarPageSchema = z
  .object({
    type: z.literal("bars"),
    metrics: z
      .array(MetricEntrySchema)
      .min(1)
      .max(3)
      .meta({ title: "Metrics" }),
  })
  .strict()
  .meta({ title: "Bar gauges" })

export const KpiPageSchema = z
  .object({
    type: z.literal("kpis"),
    metrics: z
      .array(MetricEntrySchema)
      .min(1)
      .max(3)
      .meta({ title: "Metrics" }),
  })
  .strict()
  .meta({ title: "Key metrics" })

export const ChartPageSchema = z
  .object({
    type: z.literal("chart"),
    metrics: z
      .array(MetricEntrySchema)
      .min(1)
      .max(2)
      .meta({ title: "Metrics" }),
    windowSeconds: z
      .number()
      .int()
      .positive()
      .max(60)
      .default(60)
      .meta({ title: "History window (seconds)" }),
  })
  .strict()
  .meta({ title: "History chart" })

export const PageSchema = z.discriminatedUnion("type", [
  BarPageSchema,
  KpiPageSchema,
  ChartPageSchema,
])

export const SystemStatusConfigSchema = pagesSchema(PageSchema)

export type SystemStatusConfig = z.infer<typeof SystemStatusConfigSchema>
export type SystemPageConfig = z.infer<typeof PageSchema>

export const POLL_INTERVAL_MS = 1000 as const
