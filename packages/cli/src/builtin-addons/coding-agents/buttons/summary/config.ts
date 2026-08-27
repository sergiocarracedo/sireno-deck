import { z } from "zod"

export const summaryConfigSchema = z
  .object({
    showCount: z.boolean().default(true),
    attentionOnly: z.boolean().default(false),
  })
  .strict()

export type SummaryConfig = z.infer<typeof summaryConfigSchema>
