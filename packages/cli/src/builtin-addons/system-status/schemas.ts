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

const MetricSchema = z
  .object({
    color: z.string().min(1).optional(),
    formatter: SystemStatusFormatterSchema.optional(),
    icon: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    unavailable_label: z.string().min(1).optional(),
    units: z.string().min(1).optional(),
    max_value: z.number().positive().optional(),
    metric: SystemMetricIdSchema,
  })
  .strict()

export const SystemStatusButtonSchema = z
  .object({
    ...AddonButtonActionConfigSchema.shape,
    variant: z.enum(['bars', 'text']).default('text'),
    metrics: z.array(MetricSchema).max(3),
    poll_interval_ms: z.number().int().min(500).default(1_000),
    render_interval_ms: z.number().int().min(500).default(1_000),
  })
  .strict()

export type SystemStatusButtonConfig = z.infer<typeof SystemStatusButtonSchema>

export type SystemStatusMetricConfig =
  SystemStatusButtonConfig['metrics'][number]
