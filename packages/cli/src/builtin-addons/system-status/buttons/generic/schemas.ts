import { z } from "zod"
import { SYSTEM_METRIC_IDS } from "../../domain"

export const GenericSystemStatusSchema = z
  .object({
    metrics: z
      .array(z.enum(SYSTEM_METRIC_IDS))
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

export const GenericSystemStatusDefaults: GenericSystemStatusConfig = {
  metrics: ["cpu"],
  display: "text",
  pollInterval: 2000,
  renderInterval: 1000,
}