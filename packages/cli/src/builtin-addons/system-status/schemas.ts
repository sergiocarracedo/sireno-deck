import { z } from 'zod'

import { AddonButtonActionConfigSchema } from '@/addon/api'
import { SYSTEM_METRIC_IDS } from './domain/live-metrics'

const SystemMetricIdSchema = z.enum(SYSTEM_METRIC_IDS)
export const SystemStatusFormatterSchema = z.enum([
  'bytes',
  'count',
  'frequency-ghz',
  'percent',
  'uptime',
])

const SystemStatusMetricOverrideSchema = z
  .object({
    color: z.string().min(1).optional(),
    formatter: SystemStatusFormatterSchema.optional(),
    icon: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    unavailable_label: z.string().min(1).optional(),
    units: z.string().min(1).optional(),
  })
  .strict()

const BarsMetricSchema = SystemStatusMetricOverrideSchema.extend({
  max_value: z.number().positive().optional(),
  metric: SystemMetricIdSchema,
}).strict()

const LabelValueMetricSchema = SystemStatusMetricOverrideSchema.extend({
  metric: SystemMetricIdSchema,
}).strict()

export const SystemStatusBarsButtonSchema = z
  .object({
    ...AddonButtonActionConfigSchema.shape,
    metrics: z.union([
      z.tuple([BarsMetricSchema]),
      z.tuple([BarsMetricSchema, BarsMetricSchema]),
      z.tuple([BarsMetricSchema, BarsMetricSchema, BarsMetricSchema]),
    ]),
    poll_interval_ms: z.number().int().min(500).default(1_000),
    render_interval_ms: z.number().int().min(500).default(1_000),
  })
  .strict()

export const SystemStatusLabelValuesButtonSchema = z
  .object({
    ...AddonButtonActionConfigSchema.shape,
    metrics: z
      .array(LabelValueMetricSchema)
      .min(1)
      .max(
        2,
        'system-status-label-values supports 1–2 metrics; for 3+ values use the value-display addon (FEAT-02)',
      ),
    poll_interval_ms: z.number().int().min(500).default(1_000),
    render_interval_ms: z.number().int().min(500).default(1_000),
  })
  .strict()

export type SystemStatusBarsButtonConfig = z.infer<
  typeof SystemStatusBarsButtonSchema
>

export type SystemStatusLabelValuesButtonConfig = z.infer<
  typeof SystemStatusLabelValuesButtonSchema
>

export type SystemStatusBarsMetricConfig =
  SystemStatusBarsButtonConfig['metrics'][number]

export type SystemStatusLabelValueMetricConfig =
  SystemStatusLabelValuesButtonConfig['metrics'][number]
