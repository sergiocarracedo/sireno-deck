import { z } from "zod";

export const SYSTEM_STATUS_DEFAULT_POLL_MS = 1000;

export const SystemStatusMetricIdSchema = z.enum([
  "cpu_usage",
  "memory_usage",
  "swap_usage",
  "fan_speed",
  "uptime",
  "battery",
  "load_average_1m",
]);

export const SystemStatusMetricConfigSchema = z
  .object({
    metric: SystemStatusMetricIdSchema,
    label: z.string().min(1),
    icon: z.string().optional(),
    max_value: z.number().optional(),
    color: z.string().optional(),
    unavailable_label: z.string().optional(),
  })
  .strict();

export const SystemStatusButtonSchema = z
  .object({
    variant: z.enum(["text", "bars"]).optional().default("text"),
    metrics: z.array(SystemStatusMetricConfigSchema).min(1).max(6),
    poll_interval_ms: z.number().int().positive().optional().default(SYSTEM_STATUS_DEFAULT_POLL_MS),
  })
  .strict();

export type SystemStatusMetricId = z.infer<typeof SystemStatusMetricIdSchema>;
export type SystemStatusMetricConfig = z.infer<typeof SystemStatusMetricConfigSchema>;
export type SystemStatusButtonConfig = z.infer<typeof SystemStatusButtonSchema>;

export interface CanonicalSystemMetricSnapshot {
  id: SystemStatusMetricId;
  available: boolean;
  value?: number;
  max?: number;
  percentage?: number;
  formattedValue: string;
}