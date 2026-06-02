import { z } from 'zod'

import { SYSTEM_METRIC_IDS } from './domain/live-metrics.js'

const SystemMetricIdSchema = z.enum(SYSTEM_METRIC_IDS)
const SystemStatusFormatterSchema = z.enum([
  'bytes',
  'count',
  'frequency-ghz',
  'percent',
  'uptime',
])

const OptionalActionSchema = z.string().min(1).optional()

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
    hold_command: OptionalActionSchema,
    metrics: z.union([
      z.tuple([BarsMetricSchema]),
      z.tuple([BarsMetricSchema, BarsMetricSchema]),
      z.tuple([BarsMetricSchema, BarsMetricSchema, BarsMetricSchema]),
    ]),
    poll_interval_ms: z.number().int().min(500).default(1_000),
    render_interval_ms: z.number().int().min(500).default(1_000),
    tap_command: OptionalActionSchema,
  })
  .strict()

export const SystemStatusLabelValuesButtonSchema = z
  .object({
    hold_command: OptionalActionSchema,
    metrics: z.union([
      z.tuple([LabelValueMetricSchema]),
      z.tuple([LabelValueMetricSchema, LabelValueMetricSchema]),
      z.tuple([
        LabelValueMetricSchema,
        LabelValueMetricSchema,
        LabelValueMetricSchema,
      ]),
      z.tuple([
        LabelValueMetricSchema,
        LabelValueMetricSchema,
        LabelValueMetricSchema,
        LabelValueMetricSchema,
      ]),
      ]),
    poll_interval_ms: z.number().int().min(500).default(1_000),
    render_interval_ms: z.number().int().min(500).default(1_000),
    tap_command: OptionalActionSchema,
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
