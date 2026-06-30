import { z } from "zod";

export const SYSTEM_STATUS_DEFAULT_POLL_MS = 1000;

const SystemStatusMetricIdSchema = z.enum([
  "cpu_usage",
  "memory_usage",
  "swap_usage",
  "fan_speed",
  "uptime",
  "battery",
  "load_average_1m",
]);

const SystemStatusMetricConfigSchema = z
  .object({
    metric: SystemStatusMetricIdSchema,
    label: z.string().min(1),
    icon: z.string().optional(),
    max_value: z.number().optional(),
    color: z.string().optional(),
    unavailable_label: z.string().optional(),
  })
  .strict();

const SystemStatusButtonSchema = z
  .object({
    variant: z.enum(["text", "bars"]).optional().default("text"),
    metrics: z.array(SystemStatusMetricConfigSchema).min(1).max(6),
    poll_interval_ms: z
      .number()
      .int()
      .positive()
      .optional()
      .default(SYSTEM_STATUS_DEFAULT_POLL_MS),
  })
  .strict();

export default SystemStatusButtonSchema;